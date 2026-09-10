import { getCard } from '../data/cards';
import { POSITION_BY_ID } from '../data/positions';
import type { DrawnCard, ReadingResult } from '../domain/types';
import { CardFace } from './CardFace';
import { Notice } from './Notice';

interface Props {
  result: ReadingResult;
  cards: DrawnCard[];
  /** '지금 할 수 있는 일' 체크 상태 */
  actionChecks?: string[];
  onToggleAction?: (action: string) => void;
}

/** 상담 결과 본문(패널 1~5). 결과 화면과 기록 상세에서 함께 사용합니다. */
export function ReadingView({ result, cards, actionChecks = [], onToggleAction }: Props) {
  return (
    <>
      <div className="mini-cards" aria-label="선택한 카드">
        {cards.map((drawn) => {
          const card = getCard(drawn.cardId);
          const position = POSITION_BY_ID[drawn.positionId];
          if (!card) return null;
          return (
            <div className="mini-card" key={drawn.positionId}>
              <CardFace card={card} showLabel={false} reversed={!!drawn.reversed} />
              <span className="mini-label">{position.title}<strong>{card.nameKo}{drawn.reversed ? ' · 역방향' : ''}</strong></span>
            </div>
          );
        })}
      </div>

      {result.notes.map((note) => (
        <Notice key={note}>{note}</Notice>
      ))}

      <section className="panel panel--strong" aria-labelledby="sec-priority">
        <h2 className="panel-title" id="sec-priority"><span className="num" aria-hidden="true">1</span>먼저 제안드리는 방향</h2>
        <p className="priority-text">{result.priority}</p>
      </section>

      <section className="panel" aria-labelledby="sec-reasons">
        <h2 className="panel-title" id="sec-reasons"><span className="num" aria-hidden="true">2</span>이렇게 제안하는 이유</h2>
        <ul className="list">
          {result.reasons.map((r) => <li key={r}>{r}</li>)}
        </ul>
      </section>

      <section className="panel" aria-labelledby="sec-alt">
        <h2 className="panel-title" id="sec-alt"><span className="num" aria-hidden="true">3</span>다른 선택이 나은 경우</h2>
        <ul className="list">
          {result.alternatives.map((a) => <li key={a}>{a}</li>)}
        </ul>
      </section>

      <section className="panel panel--strong" aria-labelledby="sec-actions">
        <h2 className="panel-title" id="sec-actions"><span className="num" aria-hidden="true">4</span>지금 할 수 있는 일</h2>
        <ul className="check-list">
          {result.actions.map((a) => {
            const checked = actionChecks.includes(a);
            return (
              <li key={a}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  className="check-item"
                  onClick={() => onToggleAction?.(a)}
                  disabled={!onToggleAction}
                  style={!onToggleAction ? { cursor: 'default' } : undefined}
                >
                  <span className="box" aria-hidden="true">{checked ? '✓' : ''}</span>
                  <span className="label">{a}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel" aria-labelledby="sec-cards" style={{ gap: 0 }}>
        <h2 className="panel-title" id="sec-cards" style={{ marginBottom: 6 }}><span className="num" aria-hidden="true">5</span>카드별로 살펴볼 관점</h2>
        <div className="accordion-list">
          {result.perspectives.map((p, i) => {
            const card = getCard(p.cardId);
            const position = POSITION_BY_ID[p.positionId];
            const reversed = !!cards.find((c) => c.positionId === p.positionId)?.reversed;
            return (
              <details className="accordion" key={p.positionId} open={i === 0}>
                <summary>
                  <span className="pos">{position.title}</span>
                  <span>{card?.nameKo ?? p.cardId}{reversed ? ' (역방향)' : ''}</span>
                </summary>
                <div className="accordion-body">{p.text}</div>
              </details>
            );
          })}
        </div>
      </section>
    </>
  );
}
