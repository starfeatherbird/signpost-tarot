import { useCallback, useEffect, useRef, useState, type Dispatch } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Notice } from '../../components/Notice';
import { HELP_QUESTION_ID } from '../../config/helpModes';
import { AnalysisError, analysisService } from '../../services/analysis';
import {
  getContentVersion,
  getDrawnCards,
  getSaveStatus,
  hasProgress,
  type SaveStatus,
  type SessionAction,
  type SessionState,
} from '../../state/session';
import type { RecordsApi } from '../../state/useRecords';
import { AnalyzingStep } from './AnalyzingStep';
import { CardsStep } from './CardsStep';
import { DeepIntroStep } from './DeepIntroStep';
import { DeepResultStep } from './DeepResultStep';
import { InputStep } from './InputStep';
import { PlanStep } from './PlanStep';
import { QuestionsStep } from './QuestionsStep';
import { ResultStep, type SaveFeedback } from './ResultStep';

interface Props {
  state: SessionState;
  dispatch: Dispatch<SessionAction>;
  records: RecordsApi;
  /** 기록장 탭으로 이동. id 를 주면 그 기록을 바로 엽니다. */
  onOpenRecords: (recordId?: string) => void;
}

/** 상담실 탭. 단계 화면을 고르고, 분석 실행·저장·새 상담 같은 흐름 제어를 맡습니다. */
export function CounselScreen({ state, dispatch, records, onOpenRecords }: Props) {
  const inFlight = useRef(false);
  const requestSeq = useRef(0);
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedback | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  // 저장했던 기록이 기록장에서 삭제되었으면 다시 '미저장'으로 봅니다.
  const savedRecordExists = !!state.savedRecordId && records.records.some((r) => r.id === state.savedRecordId);
  const saveStatus: SaveStatus = savedRecordExists ? getSaveStatus(state) : 'unsaved';

  // 토스트는 3초 뒤 사라집니다.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  /** 현재 상품에 맞는 분석 실행. 무료 → analyze, 심층 → analyzeDeep */
  const runAnalysis = useCallback(() => {
    if (inFlight.current) return; // 중복 실행 방지
    const cards = getDrawnCards(state);
    if (cards.length < 3) return;
    inFlight.current = true;
    const seq = ++requestSeq.current;
    setSaveFeedback(null);
    dispatch({ type: 'analysisStarted' });

    const baseInput = {
      concern: state.concern,
      answers: state.answers,
      cards,
      supplement: state.supplement.trim() || undefined,
    };
    const request = state.plan === 'deep'
      ? analysisService.analyzeDeep({ ...baseInput, deepAnswers: state.deepAnswers }).then((result) => {
          if (seq === requestSeq.current) dispatch({ type: 'deepAnalysisSucceeded', result });
        })
      : analysisService.analyze(baseInput).then((result) => {
          if (seq === requestSeq.current) dispatch({ type: 'analysisSucceeded', result });
        });

    request
      .catch((err: unknown) => {
        if (seq !== requestSeq.current) return;
        const message = err instanceof Error ? err.message : '문제가 생겼어요. 다시 시도해 주세요.';
        if (err instanceof AnalysisError && err.code === 'rate_limited') {
          const until = new Date(Date.now() + (err.retryAfterSeconds ?? 3600) * 1000).toISOString();
          dispatch({ type: 'setRateLimited', until });
        }
        dispatch({ type: 'analysisFailed', message });
      })
      .finally(() => {
        if (seq === requestSeq.current) inFlight.current = false;
      });
  }, [state, dispatch]);

  // 분석 도중 새로고침한 경우: 진행 중 표시가 남지 않도록 자동으로 이어서 실행합니다.
  useEffect(() => {
    if (state.step === 'analyzing' && state.analysisStatus === 'idle') runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 무료 결과에서 심층으로 전환한 경우: 심층 질문이 끝나면 카드는 이미 있으므로 바로 분석합니다.
  useEffect(() => {
    if (state.step === 'cards' && state.plan === 'deep' && state.revealed && !!state.result && !state.deepResult && state.analysisStatus === 'idle') {
      runAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.step]);

  const askFollowUp = async (question: string) => {
    if (!state.deepResult) return;
    const { answer, isSample } = await analysisService.askFollowUp({
      concern: state.concern,
      answers: state.answers,
      deepAnswers: state.deepAnswers,
      cards: getDrawnCards(state),
      supplement: state.supplement.trim() || undefined,
      deepResult: state.deepResult,
      question,
    });
    dispatch({ type: 'addFollowUp', followUp: { question, answer, isSample, askedAt: new Date().toISOString() } });
  };

  /** 기록 저장. 성공하면 true */
  const save = (): boolean => {
    if (!state.result && !state.deepResult) return false;
    const outcome = records.save({
      consultationId: state.consultationId,
      plan: state.plan,
      concern: state.concern,
      answers: state.answers,
      deepAnswers: state.deepAnswers,
      cards: getDrawnCards(state),
      supplement: state.supplement.trim() || undefined,
      result: state.result,
      deepResult: state.deepResult,
      followUps: state.followUps,
      actionChecks: state.actionChecks,
      isSample: !!(state.result?.isSample || state.deepResult?.isSample),
    });
    if (outcome.ok && outcome.record) {
      dispatch({ type: 'markSaved', recordId: outcome.record.id, version: getContentVersion(state) });
      setSaveFeedback(null);
      setToast(outcome.isNew ? '기록장에 저장했어요.' : '기록을 업데이트했어요.');
      return true;
    }
    if (!outcome.ok) setSaveFeedback({ ok: false, message: `저장하지 못했어요. ${outcome.reason}` });
    return false;
  };

  const requestNew = () => {
    const unsaved = hasProgress(state) && saveStatus !== 'saved';
    if (unsaved) setConfirmNew(true);
    else startNew();
  };

  const startNew = () => {
    setConfirmNew(false);
    setSaveFeedback(null);
    requestSeq.current += 1; // 진행 중인 분석 응답이 있더라도 새 세션에 반영되지 않게 합니다.
    inFlight.current = false;
    dispatch({ type: 'reset' });
    window.scrollTo({ top: 0 });
  };

  /** 상담 취소: 적은 것이 없으면 바로, 있으면 확인 뒤 상담실 첫 화면으로 */
  const requestCancel = () => {
    if (hasProgress(state)) setConfirmCancel(true);
    else startNew();
  };

  const hasResult = !!(state.result || state.deepResult);
  // 지난 상담에서 고른 "원하는 도움"을 미리 골라 둡니다 (가장 최근 기록 기준, 바꿀 수 있음).
  const lastHelp = records.records[0]?.answers.find((a) => a.questionId === HELP_QUESTION_ID)?.value;
  const lastHelpDefault = lastHelp ? { [HELP_QUESTION_ID]: lastHelp } : undefined;
  const commonResultProps = { state, dispatch, onSave: () => { save(); }, onReanalyze: runAnalysis, onNew: requestNew, saveFeedback, saveStatus };

  let content;
  switch (state.step) {
    case 'plan':
      content = <PlanStep dispatch={dispatch} records={records.records} onOpenRecord={onOpenRecords} />;
      break;
    case 'deepIntro':
      content = <DeepIntroStep state={state} dispatch={dispatch} />;
      break;
    case 'input':
      content = <InputStep state={state} dispatch={dispatch} onOpenRecords={onOpenRecords} onCancel={requestCancel} />;
      break;
    case 'questions':
      content = <QuestionsStep state={state} dispatch={dispatch} variant="basic" onCancel={requestCancel} defaults={lastHelpDefault} />;
      break;
    case 'deepQuestions':
      content = <QuestionsStep state={state} dispatch={dispatch} variant="deep" onCancel={state.result ? undefined : requestCancel} />;
      break;
    case 'cards':
      content = <CardsStep state={state} dispatch={dispatch} onAnalyze={runAnalysis} onCancel={requestCancel} />;
      break;
    case 'analyzing':
      content = (
        <AnalyzingStep
          status={state.analysisStatus}
          deep={state.plan === 'deep'}
          error={state.analysisError}
          onRetry={runAnalysis}
          onBack={() => dispatch({ type: 'goToStep', step: state.result && state.plan === 'deep' ? 'deepQuestions' : 'cards' })}
        />
      );
      break;
    case 'result':
      content = <ResultStep {...commonResultProps} />;
      break;
    case 'deepResult':
      content = <DeepResultStep {...commonResultProps} onAskFollowUp={askFollowUp} />;
      break;
  }

  return (
    <>
      {content}
      {toast && (
        <div className="toast">
          <Notice kind="success" role="status">{toast}</Notice>
        </div>
      )}
      <ConfirmDialog
        open={confirmCancel}
        title="상담을 그만둘까요?"
        description="지금까지 적은 내용과 고른 카드가 사라지고 상담실 첫 화면으로 돌아가요."
        actions={[
          { label: '그만두기', kind: 'danger', onClick: () => { setConfirmCancel(false); startNew(); } },
          { label: '계속하기', kind: 'secondary', onClick: () => setConfirmCancel(false) },
        ]}
        onDismiss={() => setConfirmCancel(false)}
      />
      <ConfirmDialog
        open={confirmNew}
        title="새 상담을 시작할까요?"
        description={hasResult ? '지금 결과는 저장하지 않으면 사라져요. 먼저 기록장에 남겨 둘 수도 있어요.' : '지금 진행 중인 고민과 카드는 저장되지 않았어요. 새로 시작하면 사라져요.'}
        actions={[
          ...(hasResult ? [{ label: '저장하고 새 상담', kind: 'primary' as const, onClick: () => { if (save()) startNew(); else setConfirmNew(false); } }] : []),
          { label: hasResult ? '저장 없이 시작' : '새로 시작', kind: hasResult ? ('secondary' as const) : ('danger' as const), onClick: startNew },
          { label: '취소', kind: 'text', onClick: () => setConfirmNew(false) },
        ]}
        onDismiss={() => setConfirmNew(false)}
      />
    </>
  );
}
