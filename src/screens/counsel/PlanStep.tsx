import type { Dispatch } from 'react';
import { Notice } from '../../components/Notice';
import { APP_NAME } from '../../config/appConfig';
import { PLANS } from '../../config/products';
import { isRemoteAnalysis } from '../../services/analysis';
import type { SessionAction } from '../../state/session';

interface Props {
  dispatch: Dispatch<SessionAction>;
}

/** 상담 시작 화면: 무료 기본(강조 패널) / 유료 심층(기본 패널) */
export function PlanStep({ dispatch }: Props) {
  return (
    <div className="screen">
      <div className="screen-head">
        <p className="section-label">상담실</p>
        <h1 className="screen-title">{APP_NAME}에 오신 것을 환영해요</h1>
        <p className="screen-lead">어떤 방식으로 고민을 정리해 볼까요?</p>
      </div>

      <Notice>
        {isRemoteAnalysis
          ? '지금은 시제품이에요. 상담 결과는 AI가 카드와 적어 주신 내용을 바탕으로 정리하고, 기록은 이 브라우저에만 저장돼요.'
          : '지금은 시제품이에요. 상담 결과는 카드 의미를 바탕으로 한 예시 문장이고, 기록은 이 브라우저에만 저장돼요.'}
      </Notice>

      <section className="panel panel--strong" aria-labelledby="plan-basic">
        <div className="row-between">
          <h2 className="panel-title" id="plan-basic">{PLANS.basic.name}</h2>
          <span className="tag">{PLANS.basic.badge}</span>
        </div>
        <p>{PLANS.basic.description}</p>
        <ul className="list list--dots plan-features">
          {PLANS.basic.features.map((f) => <li key={f}>{f}</li>)}
        </ul>
        <button type="button" className="btn btn--primary btn--block" onClick={() => dispatch({ type: 'choosePlan', plan: 'basic' })}>
          {PLANS.basic.cta}
        </button>
      </section>

      <section className="panel" aria-labelledby="plan-deep">
        <div className="row-between">
          <h2 className="panel-title" id="plan-deep">{PLANS.deep.name}</h2>
          <span className="tag tag--outline">{PLANS.deep.badge}</span>
        </div>
        <p>{PLANS.deep.description}</p>
        <ul className="list list--dots plan-features">
          {PLANS.deep.features.map((f) => <li key={f}>{f}</li>)}
        </ul>
        <button type="button" className="btn btn--secondary btn--block" onClick={() => dispatch({ type: 'choosePlan', plan: 'deep' })}>
          {PLANS.deep.cta}
        </button>
      </section>

      <p className="faint">가격과 이용 횟수는 아직 정해지지 않았어요. 정식 서비스에서 안내드릴게요.</p>
    </div>
  );
}
