import { useState } from 'react';
import { ANSWER_MAX_LENGTH } from '../config/appConfig';
import { DEEP_FOLLOWUP_TRIAL_COUNT } from '../config/products';
import type { FollowUp } from '../domain/types';
import { Notice } from './Notice';

interface Props {
  followUps: FollowUp[];
  /** 질문을 보내고 응답을 받습니다. 실패하면 예외를 던집니다. */
  onAsk: (question: string) => Promise<void>;
  /** 기록 상세처럼 읽기만 할 때 */
  readOnly?: boolean;
}

/**
 * 결과에 대해 더 묻기. '상황 보충하기'(잘못 이해한 상황 수정)와는 다른 기능으로,
 * 결과를 다시 만들지 않고 질문·응답을 말풍선으로 덧붙입니다.
 */
export function FollowUpPanel({ followUps, onAsk, readOnly = false }: Props) {
  const [question, setQuestion] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const remaining = Math.max(0, DEEP_FOLLOWUP_TRIAL_COUNT - followUps.length);
  const over = question.length > ANSWER_MAX_LENGTH;
  const canAsk = !readOnly && remaining > 0 && question.trim().length > 0 && !over && status !== 'loading';

  const ask = async () => {
    if (!canAsk) return;
    setStatus('loading');
    setError(null);
    try {
      await onAsk(question.trim());
      setQuestion('');
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : '질문을 보내지 못했어요.');
    }
  };

  return (
    <section className="panel panel--deep" aria-labelledby="followup-title">
      <h2 className="panel-title" id="followup-title">결과에 대해 더 묻기</h2>

      {followUps.length > 0 && (
        <div className="bubble-list">
          {followUps.map((f) => (
            <div key={f.askedAt} style={{ display: 'contents' }}>
              <p className="bubble bubble--user">{f.question}</p>
              <p className="bubble bubble--answer">{f.answer}{f.isSample && <span className="tag" style={{ marginLeft: 8 }}>예시 응답</span>}</p>
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <>
          <div className="ask-row">
            <label className="visually-hidden" htmlFor="followup-question">추가 질문</label>
            <textarea
              id="followup-question"
              className="textarea"
              style={{ flex: 1 }}
              rows={1}
              value={question}
              placeholder={remaining > 0 ? '결과를 읽고 궁금한 점을 물어보세요' : '이번 상담의 질문을 모두 사용했어요'}
              onChange={(e) => setQuestion(e.target.value)}
              aria-invalid={over || undefined}
              disabled={status === 'loading' || remaining === 0}
            />
            <button type="button" className="btn btn--primary btn--icon" onClick={ask} disabled={!canAsk} aria-label="질문 보내기" aria-busy={status === 'loading'}>
              ↑
            </button>
          </div>
          {error && <Notice kind="error" role="alert">{error}</Notice>}
          <p className="caption" style={{ fontWeight: 500 }}>
            {status === 'loading'
              ? '응답을 정리하고 있어요…'
              : `이번 상담에서 ${remaining}번 더 물을 수 있어요.${over ? ` (${ANSWER_MAX_LENGTH}자 이내로 줄여 주세요)` : ''}`}
          </p>
        </>
      )}
    </section>
  );
}
