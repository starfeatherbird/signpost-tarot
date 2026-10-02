import { useEffect, useState, type Dispatch } from 'react';
import { Notice } from '../../components/Notice';
import { DEEP_INTRO_NOTICE, DEEP_INTRO_STEPS } from '../../config/products';
import { fetchCredits } from '../../services/credits';
import type { SessionAction, SessionState } from '../../state/session';
import type { AuthApi } from '../../state/useAuth';
import type { PurchasesApi } from '../../state/usePurchases';

interface Props {
  state: SessionState;
  dispatch: Dispatch<SessionAction>;
  auth: AuthApi;
  purchases: PurchasesApi;
  onOpenSpace: () => void;
}

/**
 * 심층 상담 안내. 제공 내용을 보여 주고 시작 여부를 묻습니다.
 * - 결제를 쓸 수 있는 앱(Play): 로그인 → 아직 쓰지 않은 구매가 있으면 바로 시작, 없으면 1회 구매 후 시작.
 *   서버가 결제 확인을 하지 않는 동안(오픈 기간)은 결제 없이 시작합니다.
 * - 웹·결제 없는 환경: 안내만 보여 주고 바로 시작합니다 (서버 정책에 따름).
 */
export function DeepIntroStep({ state, dispatch, auth, purchases, onOpenSpace }: Props) {
  const upgrading = state.deepIntroMode === 'upgrade';
  const back = () => dispatch({ type: 'goToStep', step: upgrading ? 'result' : 'plan' });
  const start = () => dispatch({ type: 'startDeepTrial' });

  const [credits, setCredits] = useState<{ deepCredits: number; enforced: boolean } | null | undefined>(undefined);
  const [note, setNote] = useState<string | null>(null);

  // 결제 환경에서는 서버에 "쓰지 않은 심층 횟수"를 물어 본 뒤 버튼을 정합니다.
  useEffect(() => {
    if (!purchases.available) return;
    let active = true;
    setCredits(undefined);
    fetchCredits().then((c) => { if (active) setCredits(c); });
    return () => { active = false; };
  }, [purchases.available, auth.user?.id]);

  const buyAndStart = async () => {
    setNote(null);
    const r = await purchases.purchaseDeepReading();
    if (r.outcome === 'purchased') start();
    else if (r.outcome === 'error') setNote(r.message ?? '결제를 마치지 못했어요.');
  };

  let action: React.ReactNode;
  let notice = DEEP_INTRO_NOTICE;
  if (!purchases.available) {
    action = <button type="button" className="btn btn--primary btn--block" onClick={start}>심층 상담 시작하기</button>;
  } else if (!auth.user) {
    notice = '심층 상담은 로그인한 계정에 묶여 보관돼요. 내 공간에서 로그인한 뒤 이어서 진행해 주세요.';
    action = <button type="button" className="btn btn--primary btn--block" onClick={onOpenSpace}>내 공간에서 로그인하기</button>;
  } else if (credits === undefined) {
    notice = '구매 상태를 확인하고 있어요.';
    action = <button type="button" className="btn btn--primary btn--block" disabled>잠시만요…</button>;
  } else if (credits === null || !credits.enforced) {
    // 서버에 물을 수 없거나(오프라인 등) 오픈 기간이면 결제 없이 진행. 서버가 최종 판단합니다.
    action = <button type="button" className="btn btn--primary btn--block" onClick={start}>심층 상담 시작하기</button>;
  } else if (credits.deepCredits > 0) {
    notice = `구매해 둔 심층 상담 ${credits.deepCredits}회가 있어요. 이 상담에 1회를 써요.`;
    action = <button type="button" className="btn btn--primary btn--block" onClick={start}>심층 상담 시작하기</button>;
  } else {
    notice = '심층 상담은 1회씩 구매해요. 결제가 끝나면 바로 이어서 진행돼요.';
    action = (
      <button type="button" className="btn btn--primary btn--block" onClick={buyAndStart} disabled={purchases.busy}>
        {purchases.busy ? '결제 창을 여는 중…' : `심층 상담 1회 구매하기${purchases.deepPrice ? ` · ${purchases.deepPrice}` : ''}`}
      </button>
    );
  }

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

      <Notice>{notice}</Notice>
      {note && <Notice kind="error" role="alert">{note}</Notice>}

      <div className="btn-stack">
        {action}
        <button type="button" className="btn btn--secondary btn--block" onClick={back}>돌아가기</button>
      </div>
    </div>
  );
}
