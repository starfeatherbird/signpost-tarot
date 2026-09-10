import { useState, type Dispatch } from 'react';
import { CONCERN_MAX_LENGTH } from '../../config/appConfig';
import { CONCERN_EXAMPLES, PLANS } from '../../config/products';
import type { SessionAction, SessionState } from '../../state/session';

interface Props {
  state: SessionState;
  dispatch: Dispatch<SessionAction>;
  onOpenRecords: () => void;
}

export function InputStep({ state, dispatch, onOpenRecords }: Props) {
  const [showError, setShowError] = useState(false);
  const length = state.concern.length;
  const isEmpty = state.concern.trim().length === 0;
  const isOver = length > CONCERN_MAX_LENGTH;
  const limited = !!state.rateLimitedUntil && new Date(state.rateLimitedUntil).getTime() > Date.now();

  const start = () => {
    if (isEmpty) {
      setShowError(true);
      return;
    }
    if (isOver || limited) return;
    dispatch({ type: 'goToStep', step: 'questions' });
  };

  const setConcern = (concern: string) => {
    if (showError && concern.trim()) setShowError(false);
    dispatch({ type: 'setConcern', concern });
  };

  return (
    <div className="screen">
      <div className="screen-head">
        <p className="section-label">{state.plan === 'deep' ? PLANS.deep.name : '기본 상담'}</p>
        <h1 className="screen-title">어떤 고민을 함께 정리해 볼까요?</h1>
        <p className="screen-lead">떠오르는 대로 편하게 적어 주세요. 정리는 함께 해요.</p>
      </div>

      {limited && (
        <section className="panel limit-panel" aria-live="polite">
          <span className="limit-icon" aria-hidden="true">!</span>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>오늘 상담 횟수를 모두 사용했어요.</h2>
          <p className="text-muted" style={{ fontSize: 14 }}>내일 다시 찾아 주세요. 지금까지의 기록은 기록장에서 언제든 볼 수 있어요.</p>
          <button type="button" className="btn btn--secondary btn--sub" onClick={onOpenRecords}>기록장 보기</button>
        </section>
      )}

      <div className="field" style={limited ? { opacity: 0.5 } : undefined}>
        <label className="visually-hidden" htmlFor="concern">고민 내용</label>
        <div className="textarea-wrap">
          <textarea
            id="concern"
            className="textarea"
            value={state.concern}
            placeholder="예) 친구에게 서운한 마음을 말할지 고민돼요."
            onChange={(e) => setConcern(e.target.value)}
            disabled={limited}
            aria-describedby="concern-error"
            aria-invalid={showError || isOver ? true : undefined}
          />
          <span className={`counter ${isOver ? 'counter-over' : ''}`} aria-live="polite">{length} / {CONCERN_MAX_LENGTH}</span>
        </div>
        {(showError || isOver) && (
          <p className="field-error" id="concern-error" role="alert">
            {isOver ? `${CONCERN_MAX_LENGTH}자 이내로 줄여 주세요.` : '고민을 한 줄이라도 적어 주시면 함께 정리할 수 있어요.'}
          </p>
        )}
      </div>

      <div className="field">
        <p className="field-label" id="examples-label">이런 고민을 눌러 시작해도 돼요</p>
        <div className="chip-row" role="group" aria-labelledby="examples-label">
          {CONCERN_EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              className="chip"
              aria-pressed={state.concern === ex.text}
              disabled={limited}
              onClick={() => setConcern(ex.text)}
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="btn btn--primary btn--block" onClick={start} disabled={isOver || limited}>
        함께 정리하기
      </button>
    </div>
  );
}
