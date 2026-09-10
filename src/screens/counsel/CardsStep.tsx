import { useEffect, useState, type Dispatch } from 'react';
import { CardBack } from '../../components/CardBack';
import { CardFace } from '../../components/CardFace';
import { ConcernBox } from '../../components/ConcernBox';
import { FlowTop } from '../../components/FlowTop';
import { CARDS, getCard } from '../../data/cards';
import { CARDS_TO_PICK, POSITIONS } from '../../data/positions';
import type { SessionAction, SessionState } from '../../state/session';

interface Props {
  state: SessionState;
  dispatch: Dispatch<SessionAction>;
  onAnalyze: () => void;
  onCancel: () => void;
}

export function CardsStep({ state, dispatch, onAnalyze, onCancel }: Props) {
  const count = state.selected.length;
  const complete = count === CARDS_TO_PICK;
  const remaining = CARDS_TO_PICK - count;

  if (state.revealed) {
    return (
      <div className="screen">
        <div className="screen-head">
          <FlowTop label="카드 공개" onCancel={onCancel} />
          <h1 className="screen-title">세 장의 카드가 펼쳐졌어요</h1>
        </div>
        <ConcernBox text={state.concern} />
        <RevealedCards state={state} />
        <p className="faint center">카드는 결과를 다시 정리해도 바뀌지 않아요.</p>
        <button type="button" className="btn btn--primary btn--block" onClick={onAnalyze}>해석 보기</button>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="screen-head">
        <FlowTop label="카드 선택" onCancel={onCancel} />
        <h1 className="screen-title">마음이 가는 카드 세 장을 골라 주세요</h1>
      </div>

      <ConcernBox text={state.concern} />

      <div className="slot-row" aria-label="세 자리">
        {POSITIONS.map((p, i) => {
          const filled = i < count;
          const current = i === count;
          const cls = filled ? 'slot slot--filled' : current ? 'slot slot--current' : 'slot';
          const stateText = filled ? `자리 ${i + 1} · 선택됨` : current ? `자리 ${i + 1} · 지금` : `자리 ${i + 1}`;
          return (
            <div className={cls} key={p.id}>
              <span className="slot-state">{stateText}</span>
              <span className="slot-name">{p.title}</span>
              <span className="slot-desc">{p.description}</span>
            </div>
          );
        })}
      </div>

      <div className="row-between">
        <span className="section-label" style={{ fontSize: 13, letterSpacing: 0 }} aria-live="polite">
          선택 {count} / {CARDS_TO_PICK}{!complete && ` · 다음 자리: ${POSITIONS[count].title}`}
        </span>
        <span className="caption">{CARDS.length}장 · 정방향</span>
      </div>

      <div className="card-grid" role="group" aria-label="뒤집힌 카드 22장">
        {state.deck.map((cardId, i) => {
          const order = state.selected.indexOf(cardId);
          const isSelected = order >= 0;
          const disabled = !isSelected && complete;
          const label = isSelected
            ? `${i + 1}번째 카드, 선택됨: ${POSITIONS[order].title}. 다시 누르면 선택이 풀려요`
            : `${i + 1}번째 카드`;
          return (
            <button
              key={cardId}
              type="button"
              className="card-button"
              aria-pressed={isSelected}
              aria-label={label}
              disabled={disabled}
              onClick={() => dispatch({ type: 'toggleCard', cardId })}
            >
              <CardBack />
              {isSelected && <span className="card-badge" aria-hidden="true">{order + 1}</span>}
            </button>
          );
        })}
      </div>

      <p className="caption" style={{ fontWeight: 500 }}>카드를 누르면 살짝 떠오르며 번호가 붙어요. 다시 누르면 선택이 풀려요.</p>

      <div className="btn-stack">
        <button type="button" className="btn btn--primary btn--block" disabled={!complete} onClick={() => dispatch({ type: 'reveal' })}>
          {complete ? '카드 펼치기' : `카드 펼치기 · ${remaining}장 더 골라 주세요`}
        </button>
        <button type="button" className="btn btn--text btn--sub btn--block" onClick={() => dispatch({ type: 'goToStep', step: state.plan === 'deep' ? 'deepQuestions' : 'questions' })}>이전</button>
      </div>
    </div>
  );
}

function RevealedCards({ state }: { state: SessionState }) {
  // 카드별 0.4s 뒤집기, 120ms 간격. 새로고침으로 돌아온 경우에도 같은 순서로 짧게 보여 줍니다.
  const [flipped, setFlipped] = useState<boolean[]>(() => POSITIONS.map(() => false));
  useEffect(() => {
    const timers = POSITIONS.map((_, i) => setTimeout(() => {
      setFlipped((prev) => prev.map((v, j) => (j === i ? true : v)));
    }, 60 + i * 120));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="reveal-row">
      {state.selected.map((cardId, i) => {
        const card = getCard(cardId);
        const position = POSITIONS[i];
        if (!card) return null;
        return (
          <div className="reveal-slot" key={cardId}>
            <span className="position-title">{position.title}</span>
            <div className={`flip ${flipped[i] ? 'is-flipped' : ''}`}>
              <div className="flip-inner">
                <div className="flip-side flip-side--back"><CardBack /></div>
                <div className="flip-side flip-side--front"><CardFace card={card} showLabel={false} /></div>
              </div>
            </div>
            <span className="card-name">{card.nameKo}</span>
            <span className="card-number">{card.number}번 · {card.nameEn}</span>
          </div>
        );
      })}
    </div>
  );
}
