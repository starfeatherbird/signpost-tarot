import { useState, type Dispatch } from 'react';
import { ConcernBox } from '../../components/ConcernBox';
import { Notice } from '../../components/Notice';
import { ReadingView } from '../../components/ReadingView';
import { SUPPLEMENT_MAX_LENGTH } from '../../config/appConfig';
import { PLANS } from '../../config/products';
import { isRemoteAnalysis } from '../../services/analysis';
import { getDrawnCards, type SaveStatus, type SessionAction, type SessionState } from '../../state/session';
import { formatDateTime } from '../../utils/format';
import { buildShareText, shareText } from '../../utils/share';

export interface SaveFeedback {
  ok: boolean;
  message: string;
}

export interface ResultProps {
  state: SessionState;
  dispatch: Dispatch<SessionAction>;
  onSave: () => void;
  onReanalyze: () => void;
  onNew: () => void;
  saveFeedback: SaveFeedback | null;
  saveStatus: SaveStatus;
}

/** 결과 화면 상단: 태그 + 날짜 + 고민 인용 */
export function ResultHeader({ plan, isSample, generatedAt, concern }: { plan: 'basic' | 'deep'; isSample: boolean; generatedAt: string; concern: string }) {
  return (
    <>
      <div className="row-between">
        <div className="tag-row">
          <span className="tag">{PLANS[plan].name}</span>
          <span className="tag tag--strong">{isSample ? '예시 결과' : '분석 결과'}</span>
        </div>
        <span className="caption">{formatDateTime(generatedAt)}</span>
      </div>
      <ConcernBox text={concern} />
    </>
  );
}

/** 무료 기본 상담 결과 */
export function ResultStep(props: ResultProps) {
  const { state, dispatch } = props;
  const result = state.result;

  if (!result) {
    return (
      <div className="screen">
        <Notice kind="error" role="alert">표시할 결과가 없어요.</Notice>
        <button type="button" className="btn btn--secondary" onClick={() => dispatch({ type: 'goToStep', step: 'cards' })}>카드 화면으로</button>
      </div>
    );
  }

  return (
    <div className="screen">
      <ResultHeader plan="basic" isSample={result.isSample} generatedAt={result.generatedAt} concern={state.concern} />

      <ReadingView
        result={result}
        cards={getDrawnCards(state)}
        actionChecks={state.actionChecks}
        onToggleAction={(action) => dispatch({ type: 'toggleAction', action })}
      />

      {!state.deepResult ? (
        <section className="panel panel--deep" aria-labelledby="upgrade-title">
          <h2 className="panel-title" id="upgrade-title" style={{ color: 'var(--color-text)' }}>이 고민을 더 자세히 살펴보기</h2>
          <p className="text-muted" style={{ fontSize: 14 }}>{PLANS.deep.description} 지금의 고민·답변·카드를 그대로 이어받아 추가 질문부터 진행해요.</p>
          <button type="button" className="btn btn--outline-accent btn--block" onClick={() => dispatch({ type: 'openDeepIntro', mode: 'upgrade' })}>
            심층 상담 알아보기
          </button>
        </section>
      ) : (
        <section className="panel panel--deep">
          <p className="text-muted" style={{ fontSize: 14 }}>이 고민의 심층 결과가 있어요.</p>
          <button type="button" className="btn btn--outline-accent btn--block" onClick={() => dispatch({ type: 'goToStep', step: 'deepResult' })}>심층 결과 보기</button>
        </section>
      )}

      <ResultActions {...props} supplementHint={isRemoteAnalysis ? '같은 카드로 보충 내용을 반영해 결과를 다시 정리해요.' : '같은 카드로 결과를 다시 정리해요. 지금은 예시 결과라 보충 내용이 해석에 반영되지는 않고, 접수 사실만 표시돼요.'} />
    </div>
  );
}

interface ActionsProps extends ResultProps {
  supplementHint: string;
}

/** 결과 화면 하단 공통: 저장 / 상황 보충(잘못 이해한 상황 수정) / 새 상담 + 면책 문구 */
export function ResultActions({ state, dispatch, onSave, onReanalyze, onNew, saveFeedback, saveStatus, supplementHint }: ActionsProps) {
  const [supplementOpen, setSupplementOpen] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const supplementOver = state.supplement.length > SUPPLEMENT_MAX_LENGTH;

  const share = async () => {
    const result = state.step === 'deepResult' && state.deepResult ? state.deepResult : state.result ?? state.deepResult;
    if (!result) return;
    try {
      const how = await shareText(buildShareText({ plan: state.plan, concern: state.concern, cards: getDrawnCards(state), result }));
      setShareNote(how === 'copied' ? '결과를 복사했어요. 원하는 곳에 붙여 넣으세요.' : how === 'shared' ? '공유 창으로 보냈어요.' : null);
    } catch {
      setShareNote('공유하지 못했어요. 잠시 뒤 다시 시도해 주세요.');
    }
  };

  return (
    <>
      {saveFeedback && !saveFeedback.ok && <Notice kind="error" role="alert">{saveFeedback.message}</Notice>}

      <div className="btn-stack">
        {saveStatus === 'saved' ? (
          <div className="btn btn--secondary btn--block" aria-live="polite" style={{ cursor: 'default' }}>
            <span className="tag tag--success">저장됨</span> 기록장에 있어요
          </div>
        ) : (
          <button type="button" className="btn btn--primary btn--block" onClick={onSave}>
            {saveStatus === 'changed' ? '기록 업데이트' : '기록 저장'}
          </button>
        )}
        <div className="btn-pair">
          <button type="button" className="btn btn--secondary btn--sub" onClick={share}>공유하기</button>
          <button
            type="button"
            className="btn btn--secondary btn--sub"
            aria-expanded={supplementOpen}
            aria-controls="supplement-area"
            onClick={() => setSupplementOpen((v) => !v)}
          >
            상황 보충하기
          </button>
        </div>
        <button type="button" className="btn btn--text btn--sub btn--block" onClick={onNew}>새 상담 시작</button>
      </div>
      {shareNote && <Notice kind="success" role="status">{shareNote}</Notice>}

      {supplementOpen && (
        <section className="panel" id="supplement-area" aria-labelledby="supp-title">
          <h2 className="panel-title" id="supp-title">상황 보충하기</h2>
          <p className="text-muted" style={{ fontSize: 14 }}>잘못 이해된 상황이나 빠진 조건을 적어 주세요. {supplementHint}</p>
          <div className="field">
            <label className="visually-hidden" htmlFor="supplement">보충할 내용</label>
            <div className="textarea-wrap">
              <textarea
                id="supplement"
                className="textarea"
                style={{ minHeight: 110 }}
                value={state.supplement}
                placeholder="예) 사실 이 고민은 이번 달 안에 결정해야 해요."
                onChange={(e) => dispatch({ type: 'setSupplement', supplement: e.target.value })}
                aria-invalid={supplementOver || undefined}
              />
              <span className={`counter ${supplementOver ? 'counter-over' : ''}`}>{state.supplement.length} / {SUPPLEMENT_MAX_LENGTH}</span>
            </div>
          </div>
          <button type="button" className="btn btn--primary btn--block" disabled={!state.supplement.trim() || supplementOver} onClick={onReanalyze}>
            같은 카드로 다시 정리하기
          </button>
        </section>
      )}

      <p className="faint center">이 결과는 카드 상징과 적어 주신 내용을 바탕으로 한 제안이에요. 최종 선택은 언제나 스스로 하실 수 있어요.</p>
    </>
  );
}
