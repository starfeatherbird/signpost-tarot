import { useEffect, useState, type Dispatch } from 'react';
import { CardBack } from '../../components/CardBack';
import { CardFace } from '../../components/CardFace';
import { ConcernBox } from '../../components/ConcernBox';
import { FlowTop } from '../../components/FlowTop';
import { CARDS, getCard, getCardCaption } from '../../data/cards';
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

      {/* 세 자리: 뽑은 카드가 뒷면으로 놓입니다 (공개는 다음 화면) */}
      <div className="draw-slots" role="group" aria-label="세 자리">
        {POSITIONS.map((p, i) => {
          const filled = i < count;
          const current = i === count;
          return (
            <div className={`draw-slot ${filled ? 'is-filled' : ''} ${current ? 'is-current' : ''}`} key={p.id}>
              <span className="draw-slot-title">{p.title}</span>
              <div className="draw-slot-card" aria-label={filled ? `${p.title} 자리에 카드가 놓였어요` : current ? `${p.title} 자리, 다음에 놓일 자리` : `${p.title} 자리, 비어 있음`}>
                {filled ? (
                  <div className="draw-slot-dealt" key={state.selected[i]}>
                    <CardBack />
                    <span className="card-badge" aria-hidden="true">{i + 1}</span>
                  </div>
                ) : (
                  <div className="draw-slot-empty" aria-hidden="true" />
                )}
              </div>
              <span className="draw-slot-desc">{p.description}</span>
            </div>
          );
        })}
      </div>

      {/* 덱 더미: 누르면 맨 위 카드가 다음 자리로 */}
      <div className="deck-stage">
        <button
          type="button"
          className="deck-pile"
          disabled={complete}
          aria-label={complete ? '세 장을 모두 뽑았어요' : `덱에서 카드 한 장 뽑기, ${POSITIONS[count].title} 자리에 놓여요`}
          onClick={() => dispatch({ type: 'drawTop' })}
        >
          <span className="deck-layer deck-layer--3" aria-hidden="true"><CardBack /></span>
          <span className="deck-layer deck-layer--2" aria-hidden="true"><CardBack /></span>
          <span className="deck-layer deck-layer--1" aria-hidden="true"><CardBack /></span>
        </button>
        <p className="deck-hint" aria-live="polite">
          {complete
            ? '세 장이 모두 놓였어요. 이제 펼쳐 볼까요?'
            : `덱을 누르면 맨 위 카드가 「${POSITIONS[count].title}」 자리에 놓여요. ${remaining}장 남았어요.`}
        </p>
        <span className="caption">{CARDS.length}장 · 정·역방향 · 섞여 있어요</span>
      </div>

      <div className="btn-stack">
        {complete ? (
          <button type="button" className="btn btn--primary btn--block" onClick={() => dispatch({ type: 'reveal' })}>카드 펼치기</button>
        ) : (
          <button type="button" className="btn btn--primary btn--block" onClick={() => dispatch({ type: 'drawTop' })}>
            {count === 0 ? '첫 카드 뽑기' : `다음 카드 뽑기 · ${remaining}장 남음`}
          </button>
        )}
        <div className="btn-pair">
          <button type="button" className="btn btn--secondary btn--sub" onClick={() => dispatch({ type: 'goToStep', step: state.plan === 'deep' ? 'deepQuestions' : 'questions' })}>이전</button>
          <button type="button" className="btn btn--text btn--sub" disabled={count === 0} onClick={() => dispatch({ type: 'reshuffle' })}>다시 섞기</button>
        </div>
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
        const reversed = state.reversedIds.includes(cardId);
        if (!card) return null;
        return (
          <div className="reveal-slot" key={cardId}>
            <span className="position-title">{position.title}</span>
            <div className={`flip ${flipped[i] ? 'is-flipped' : ''}`}>
              <div className="flip-inner">
                <div className="flip-side flip-side--back"><CardBack /></div>
                <div className="flip-side flip-side--front"><CardFace card={card} showLabel={false} reversed={reversed} /></div>
              </div>
            </div>
            <span className="card-name">{card.nameKo}{reversed && <span className="tag tag--outline" style={{ marginLeft: 6, verticalAlign: 'middle' }}>역방향</span>}</span>
            <span className="card-number">{getCardCaption(card)}</span>
          </div>
        );
      })}
    </div>
  );
}
