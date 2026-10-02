import type { Dispatch } from 'react';
import { Notice } from '../../components/Notice';
import { DEEP_INTRO_NOTICE, DEEP_INTRO_STEPS } from '../../config/products';
import type { SessionAction, SessionState } from '../../state/session';

interface Props {
  state: SessionState;
  dispatch: Dispatch<SessionAction>;
}

/**
 * 심층 상담 안내. 제공 내용을 보여 주고 시작 여부를 묻습니다.
 * 결제(Play 인앱)는 다음 단계에서 이 화면의 시작 버튼에 연결됩니다.
 */
export function DeepIntroStep({ state, dispatch }: Props) {
  const upgrading = state.deepIntroMode === 'upgrade';
  const back = () => dispatch({ type: 'goToStep', step: upgrading ? 'result' : 'plan' });

  return (
    <div className="screen">
      <div className="screen-head">
        <p className="section-label">심층 상담</p>
        <h1 className="screen-title">{upgrading ? '이 고민을 더 자세히 살펴볼까요?' : '선택지를 나란히 놓고 비교해 봐요'}</h1>
        <p className="screen-lead">기본 상담에 더해 아래 내용을 함께 정리해요.</p>
      </div>

      <section className="panel" aria-label="제공 내용">
        <ol className="list list--numbered">
          {DEEP_INTRO_STEPS.map((step, i) => (
            <li key={step}><span className="circle" aria-hidden="true">{i + 1}</span><span>{step}</span></li>
          ))}
        </ol>
      </section>

      {upgrading && (
        <p className="muted" style={{ fontSize: 14 }}>지금까지 적어 주신 고민, 확인 답변, 선택한 카드는 그대로 이어받아요. 카드를 다시 뽑거나 같은 내용을 다시 적지 않아도 돼요.</p>
      )}

      <Notice>{DEEP_INTRO_NOTICE}</Notice>

      <div className="btn-stack">
        <button type="button" className="btn btn--primary btn--block" onClick={() => dispatch({ type: 'startDeepTrial' })}>심층 상담 시작하기</button>
        <button type="button" className="btn btn--secondary btn--block" onClick={back}>돌아가기</button>
      </div>
    </div>
  );
}
