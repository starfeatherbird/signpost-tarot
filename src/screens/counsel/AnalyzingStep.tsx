import { CardBack } from '../../components/CardBack';
import type { AnalysisStatus } from '../../state/session';

interface Props {
  status: AnalysisStatus;
  /** 심층 상담이면 더 오래 걸릴 수 있다고 안내 */
  deep?: boolean;
  error: string | null;
  onRetry: () => void;
  onBack: () => void;
}

/** 분석 대기·실패 화면. 입력과 카드는 세션에 그대로 남아 있으므로 재시도해도 바뀌지 않습니다. */
export function AnalyzingStep({ status, error, onRetry, onBack, deep = false }: Props) {
  if (status === 'error') {
    return (
      <div className="screen">
        <section className="panel panel--danger" role="alert">
          <h1 className="panel-title" style={{ color: 'var(--color-text)', fontSize: 17 }}>
            <span
              className="notice-icon"
              style={{ width: 22, height: 22, background: 'var(--color-danger)', borderColor: 'var(--color-danger)', color: 'var(--color-bg)', marginTop: 0 }}
              aria-hidden="true"
            >
              !
            </span>
            결과를 정리하지 못했어요
          </h1>
          <p className="text-muted">{error ?? '연결이 잠시 끊겼거나 응답이 늦어졌어요.'} 선택한 카드는 그대로 남아 있으니 다시 시도해 주세요.</p>
        </section>
        <div className="btn-stack">
          <button type="button" className="btn btn--primary btn--block" onClick={onRetry}>다시 시도하기</button>
          <button type="button" className="btn btn--secondary btn--block" onClick={onBack}>카드 화면으로 돌아가기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="loading" role="status" aria-live="polite" aria-busy={status === 'loading'}>
      <div className="spinner" aria-hidden="true" />
      <div className="spinner-dots" aria-hidden="true"><span /><span /><span /></div>
      <p className="loading-title">{'선택한 카드를 바탕으로\n고민을 정리하고 있어요.'}</p>
      <p className="muted" style={{ fontSize: 14 }}>
        {deep && <>심층 상담은 1분 안팎 걸릴 수 있어요.<br /></>}
        화면을 닫지 말고 잠시만 기다려 주세요.
      </p>
      <div className="loading-cards" aria-hidden="true"><CardBack /><CardBack /><CardBack /></div>
      {status === 'idle' && (
        <button type="button" className="btn btn--primary" onClick={onRetry}>정리 이어가기</button>
      )}
    </div>
  );
}
