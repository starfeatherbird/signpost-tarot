import { useEffect, useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DeepReadingView } from '../../components/DeepReadingView';
import { FollowUpPanel } from '../../components/FollowUpPanel';
import { Notice } from '../../components/Notice';
import { ReadingView } from '../../components/ReadingView';
import { StoneGem } from '../../components/StoneGem';
import { MEMO_MAX_LENGTH } from '../../config/appConfig';
import { PLANS } from '../../config/products';
import { getCard } from '../../data/cards';
import { getStone } from '../../data/stones';
import type { ConsultationRecord } from '../../domain/types';
import { getRecordStone, getReflectionQuestion, getReflectionStatus, type ReflectionStatus } from '../../services/reflection';
import type { RecordsApi } from '../../state/useRecords';
import { formatDateTime } from '../../utils/format';
import { buildShareText, shareText } from '../../utils/share';

const REFLECTION_TAG: Record<ReflectionStatus, { label: string; className: string } | null> = {
  none: null,
  waiting: null,
  due: { label: '돌아볼 때', className: 'tag tag--accent' },
  done: { label: '돌아봄', className: 'tag tag--success' },
};

interface Props {
  records: RecordsApi;
  onStartNew: () => void;
}

export function RecordsScreen({ records, onStartNew }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = records.records.find((r) => r.id === selectedId) ?? null;

  if (selected) {
    return <RecordDetail record={selected} records={records} onBack={() => setSelectedId(null)} />;
  }

  if (records.records.length === 0) {
    return (
      <div className="screen">
        <div className="screen-head">
          <p className="section-label">기록장</p>
          <h1 className="screen-title">남겨 둔 상담 0개</h1>
        </div>
        <div className="empty-state">
          <div className="empty-icon" aria-hidden="true" />
          <h2>아직 남겨 둔 상담이 없어요</h2>
          <p>{'상담 결과에서 ‘기록 저장’을 누르면\n여기에 모여요.'}</p>
          <button type="button" className="btn btn--primary btn--sub" onClick={onStartNew}>새 상담 시작하기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="screen-head">
        <p className="section-label">기록장</p>
        <h1 className="screen-title">남겨 둔 상담 {records.records.length}개</h1>
        <p className="faint">이 브라우저에만 저장돼요</p>
      </div>
      <ul className="record-list">
        {records.records.map((r) => {
          const preview = r.deepResult?.priority ?? r.result?.priority ?? '';
          const reflectionTag = REFLECTION_TAG[getReflectionStatus(r)];
          const stonePick = getRecordStone(r);
          const stone = stonePick ? getStone(stonePick.stoneId) : undefined;
          return (
            <li key={r.id}>
              <button type="button" className="record-item" onClick={() => setSelectedId(r.id)}>
                <span className="row-between">
                  <span className="tag-row">
                    <span className={`tag ${r.plan === 'deep' ? '' : 'tag--outline'}`}>{PLANS[r.plan].name}</span>
                    {reflectionTag && <span className={reflectionTag.className}>{reflectionTag.label}</span>}
                    {stone && <StoneGem stone={stone} size={18} />}
                  </span>
                  <span className="caption">{formatDateTime(r.createdAt)}</span>
                </span>
                <span className="record-title">{r.concern}</span>
                <span className="tag-row">
                  {r.cards.map((c) => <span className="card-chip" key={c.positionId}>{getCard(c.cardId)?.nameKo ?? c.cardId}{c.reversed ? ' 역' : ''}</span>)}
                </span>
                <span className="record-preview">{preview}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface DetailProps {
  record: ConsultationRecord;
  records: RecordsApi;
  onBack: () => void;
}

function RecordDetail({ record, records, onBack }: DetailProps) {
  const [memo, setMemo] = useState(record.followUpMemo);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [view, setView] = useState<'deep' | 'basic'>(record.deepResult ? 'deep' : 'basic');
  const memoOver = memo.length > MEMO_MAX_LENGTH;
  const memoDirty = memo !== record.followUpMemo;
  const hasBoth = !!record.result && !!record.deepResult;
  const shown = view === 'deep' && record.deepResult ? record.deepResult : record.result;
  const answers = [...record.answers, ...record.deepAnswers].filter((a) => a.value || a.values?.length);
  const reflectionQuestion = getReflectionQuestion(record);
  const reflectionStatus = getReflectionStatus(record);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    if (!feedback?.ok) return;
    const t = setTimeout(() => setFeedback(null), 3000);
    return () => clearTimeout(t);
  }, [feedback]);

  const saveMemo = () => {
    if (memoOver) return;
    const result = records.updateMemo(record.id, memo);
    setFeedback(result.ok ? { ok: true, message: reflectionQuestion ? '돌아본 내용을 저장했어요.' : '메모를 저장했어요.' } : { ok: false, message: `저장하지 못했어요. ${result.reason}` });
  };

  const toggleAction = (action: string) => {
    const next = record.actionChecks.includes(action) ? record.actionChecks.filter((a) => a !== action) : [...record.actionChecks, action];
    records.update(record.id, { actionChecks: next });
  };

  const share = async () => {
    if (!shown) return;
    try {
      const how = await shareText(buildShareText({ plan: view === 'deep' && record.deepResult ? 'deep' : 'basic', concern: record.concern, cards: record.cards, result: shown }));
      if (how !== 'cancelled') setFeedback({ ok: true, message: how === 'copied' ? '결과를 복사했어요. 원하는 곳에 붙여 넣으세요.' : '공유 창으로 보냈어요.' });
    } catch {
      setFeedback({ ok: false, message: '공유하지 못했어요. 잠시 뒤 다시 시도해 주세요.' });
    }
  };

  const remove = () => {
    const result = records.remove(record.id);
    setConfirmDelete(false);
    if (result.ok) onBack();
    else setFeedback({ ok: false, message: `삭제하지 못했어요. ${result.reason}` });
  };

  return (
    <div className="screen">
      <div className="screen-head">
        <button type="button" className="back-button" onClick={onBack} aria-label="기록 목록으로">‹</button>
        <div className="row-between">
          <span className={`tag ${record.plan === 'deep' ? '' : 'tag--outline'}`}>{PLANS[record.plan].name}</span>
          <span className="caption">{formatDateTime(record.createdAt)}</span>
        </div>
      </div>

      <div className="field">
        <p className="field-label">그때의 고민</p>
        <p className="concern-box">{record.concern}</p>
      </div>

      {answers.length > 0 && (
        <div className="field">
          <p className="field-label">확인했던 상황</p>
          <div className="chip-row">
            {answers.map((a) => (
              <span className="chip chip--small" key={a.questionId}>{a.values?.length ? a.values.join(' / ') : a.value}</span>
            ))}
          </div>
        </div>
      )}

      {hasBoth && (
        <div className="chip-row" role="group" aria-label="결과 종류">
          <button type="button" className="chip chip--switch" aria-pressed={view === 'deep'} onClick={() => setView('deep')}>심층 결과</button>
          <button type="button" className="chip chip--switch" aria-pressed={view === 'basic'} onClick={() => setView('basic')}>기본 결과</button>
        </div>
      )}

      {shown && <ReadingView result={shown} cards={record.cards} actionChecks={record.actionChecks} onToggleAction={toggleAction} />}
      {view === 'deep' && record.deepResult && <DeepReadingView result={record.deepResult} deepAnswers={record.deepAnswers} />}
      {view === 'deep' && record.deepResult && record.followUps.length > 0 && (
        <FollowUpPanel followUps={record.followUps} onAsk={async () => {}} readOnly />
      )}

      <button type="button" className="btn btn--secondary btn--sub btn--block" onClick={share}>결과 공유하기</button>

      <section className={`panel ${reflectionQuestion ? 'panel--reflection' : ''}`} aria-labelledby="memo-title">
        <div className="row-between">
          <h2 className="panel-title" id="memo-title">{reflectionQuestion ? '이후 돌아보기' : '이후 상황 메모'}</h2>
          {reflectionStatus === 'due' && <span className="tag tag--accent">돌아볼 때</span>}
          {reflectionStatus === 'done' && <span className="tag tag--success">돌아봄</span>}
        </div>
        {reflectionQuestion ? (
          <>
            <p className="reflection-question">{reflectionQuestion}</p>
            {reflectionStatus === 'waiting' && <p className="text-muted" style={{ fontSize: 13 }}>아직 며칠 지나지 않았어요. 지금 떠오르는 게 있다면 미리 적어 두어도 괜찮아요.</p>}
          </>
        ) : (
          <p className="text-muted" style={{ fontSize: 13 }}>그 뒤로 어떻게 되었는지, 무엇을 해 봤는지 적어 두면 나중에 돌아보기 좋아요.</p>
        )}
        <div className="field">
          <label className="visually-hidden" htmlFor="memo">{reflectionQuestion ? '돌아보기 답' : '이후 상황 메모'}</label>
          <div className="textarea-wrap">
            <textarea
              id="memo"
              className="textarea"
              style={{ minHeight: 96 }}
              value={memo}
              placeholder={reflectionQuestion ? '예) 직접 물어보니 그냥 바빴던 거였어요. 혼자 넘겨짚었던 것 같아요.' : '예) 결국 친구에게 이야기했고, 생각보다 편하게 풀렸어요.'}
              onChange={(e) => { setMemo(e.target.value); setFeedback(null); }}
              aria-invalid={memoOver || undefined}
            />
            <span className={`counter ${memoOver ? 'counter-over' : ''}`}>{memo.length} / {MEMO_MAX_LENGTH}</span>
          </div>
        </div>
        {feedback && <Notice kind={feedback.ok ? 'success' : 'error'} role="status">{feedback.message}</Notice>}
        <button type="button" className="btn btn--outline-accent btn--sub" onClick={saveMemo} disabled={!memoDirty || memoOver}>{reflectionQuestion ? '답 저장' : '메모 저장'}</button>
      </section>

      <button type="button" className="btn btn--danger btn--sub btn--block" style={{ marginTop: -8 }} onClick={() => setConfirmDelete(true)}>기록 삭제</button>

      <ConfirmDialog
        open={confirmDelete}
        title="이 기록을 삭제할까요?"
        description="이 상담 기록이 이 기기에서 지워지고 되돌릴 수 없어요."
        actions={[
          { label: '삭제하기', kind: 'danger', onClick: remove },
          { label: '취소', kind: 'secondary', onClick: () => setConfirmDelete(false) },
        ]}
        onDismiss={() => setConfirmDelete(false)}
      />
    </div>
  );
}
