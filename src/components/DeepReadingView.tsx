import type { Answer, DeepReadingResult } from '../domain/types';

interface Props {
  result: DeepReadingResult;
  deepAnswers: Answer[];
}

/** "먼저: 내용" 처럼 시기 접두어가 있으면 분리합니다. */
function splitStep(step: string): { when: string | null; body: string } {
  const m = step.match(/^([^:：]{1,12})[:：]\s*(.+)$/);
  return m ? { when: m[1].trim(), body: m[2].trim() } : { when: null, body: step };
}

/** 심층 상담에서 추가되는 본문(패널 6~10). 기본 본문(ReadingView) 뒤에 이어서 표시합니다. */
export function DeepReadingView({ result, deepAnswers }: Props) {
  const criteria = deepAnswers.find((a) => a.questionId === 'criteria')?.value ?? null;
  const constraint = deepAnswers.find((a) => a.questionId === 'constraints')?.value ?? null;
  const recommended = result.recommendedOption ?? result.comparisons[0]?.option;

  return (
    <>
      <section className="panel" aria-labelledby="sec-criteria">
        <h2 className="panel-title" id="sec-criteria"><span className="num" aria-hidden="true">6</span>확인한 기준과 제약</h2>
        {criteria && (
          <div className="criteria-row"><span className="tag">기준</span><span>{criteria}</span></div>
        )}
        {constraint && (
          <div className="criteria-row"><span className="tag tag--outline">제약</span><span>{constraint}</span></div>
        )}
        <p className="text-muted" style={{ fontSize: 14 }}>{result.criteriaSummary}</p>
      </section>

      <section className="panel" aria-labelledby="sec-compare">
        <h2 className="panel-title" id="sec-compare"><span className="num" aria-hidden="true">7</span>선택지 비교</h2>
        <div className="compare-list">
          {result.comparisons.map((c) => {
            const top = c.option === recommended;
            return (
              <article className={`compare-card ${top ? 'compare-card--top' : ''}`} key={c.option}>
                <div className="compare-head">
                  <h3 className="compare-title">{c.option}</h3>
                  {top && <span className="tag tag--accent">우선 제안</span>}
                </div>
                <div className="compare-cols">
                  <div>
                    <p className="compare-label compare-label--benefit">이점</p>
                    <ul>{c.benefits.map((b) => <li key={b}>{b}</li>)}</ul>
                  </div>
                  <div>
                    <p className="compare-label compare-label--burden">부담</p>
                    <ul>{c.burdens.map((b) => <li key={b}>{b}</li>)}</ul>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel" aria-labelledby="sec-fit">
        <h2 className="panel-title" id="sec-fit"><span className="num" aria-hidden="true">8</span>우선 제안이 적합한 조건</h2>
        <ul className="list">
          {result.fitConditions.map((f) => <li key={f}>{f}</li>)}
        </ul>
      </section>

      <section className="panel panel--strong" aria-labelledby="sec-steps">
        <h2 className="panel-title" id="sec-steps"><span className="num" aria-hidden="true">9</span>실행 순서</h2>
        <ol className="timeline">
          {result.executionSteps.map((s, i) => {
            const { when, body } = splitStep(s);
            return (
              <li key={s}>
                <span className="dot" aria-hidden="true">{i + 1}</span>
                <span>{when && <><span className="when">{when}</span> · </>}{body}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="panel" aria-labelledby="sec-obstacles">
        <h2 className="panel-title" id="sec-obstacles"><span className="num" aria-hidden="true">10</span>예상 장애물과 대응</h2>
        {result.obstacles.map((o) => (
          <div className="obstacle" key={o.obstacle}>
            <h3>{o.obstacle}</h3>
            <p>{o.response}</p>
          </div>
        ))}
      </section>
    </>
  );
}
