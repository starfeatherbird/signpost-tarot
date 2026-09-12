import type { Dispatch } from 'react';
import { HeroScene } from '../../components/HeroScene';
import { Notice } from '../../components/Notice';
import { APP_NAME } from '../../config/appConfig';
import { PLANS } from '../../config/products';
import type { ConsultationRecord } from '../../domain/types';
import { isRemoteAnalysis } from '../../services/analysis';
import { getDueRecords } from '../../services/reflection';
import type { SessionAction } from '../../state/session';
import { formatDateTime, summarize } from '../../utils/format';

interface Props {
  dispatch: Dispatch<SessionAction>;
  records?: ConsultationRecord[];
  /** 기록장에서 해당 기록을 바로 엽니다. id 없이 부르면 목록으로. */
  onOpenRecord?: (recordId?: string) => void;
}

const DUE_PREVIEW_COUNT = 3;

/** 상담 시작 화면: 돌아볼 고민 안내 + 무료 기본(강조 패널) / 유료 심층(기본 패널) */
export function PlanStep({ dispatch, records = [], onOpenRecord }: Props) {
  const due = getDueRecords(records);
  return (
    <div className="screen">
      <HeroScene />
      <div className="screen-head screen-head--center">
        <p className="section-label">상담실</p>
        <h1 className="screen-title">{APP_NAME}에 오신 것을 환영해요</h1>
        <p className="screen-lead">어떤 방식으로 고민을 정리해 볼까요?</p>
      </div>

      <Notice>
        {isRemoteAnalysis
          ? '지금은 시제품이에요. 상담 결과는 AI가 카드와 적어 주신 내용을 바탕으로 정리하고, 기록은 이 브라우저에만 저장돼요.'
          : '지금은 시제품이에요. 상담 결과는 카드 의미를 바탕으로 한 예시 문장이고, 기록은 이 브라우저에만 저장돼요.'}
      </Notice>

      {due.length > 0 && onOpenRecord && (
        <section className="panel panel--reflection" aria-labelledby="due-title">
          <div className="row-between">
            <h2 className="panel-title" id="due-title">돌아볼 때가 된 고민</h2>
            <span className="tag tag--accent">{due.length}개</span>
          </div>
          <p className="text-muted" style={{ fontSize: 13 }}>며칠이 지났어요. 그 사이 어떻게 되었는지 한 줄만 남겨 보세요.</p>
          <ul className="due-list">
            {due.slice(0, DUE_PREVIEW_COUNT).map((r) => (
              <li key={r.id}>
                <button type="button" className="due-item" onClick={() => onOpenRecord(r.id)}>
                  <span className="due-concern">{summarize(r.concern, 48)}</span>
                  <span className="caption">{formatDateTime(r.createdAt)} 상담 · 돌아보기 ›</span>
                </button>
              </li>
            ))}
          </ul>
          {due.length > DUE_PREVIEW_COUNT && (
            <button type="button" className="link-button" onClick={() => onOpenRecord()}>기록장에서 {due.length - DUE_PREVIEW_COUNT}개 더 보기</button>
          )}
        </section>
      )}

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
