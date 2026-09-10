import { useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Notice } from '../../components/Notice';
import { APP_NAME, APP_VERSION } from '../../config/appConfig';
import type { RecordsApi } from '../../state/useRecords';
import type { Theme } from '../../state/useTheme';
import { pickTextFile, saveTextFile } from '../../utils/download';

interface Props {
  records: RecordsApi;
  theme: Theme;
  onToggleTheme: () => void;
}

export function SpaceScreen({ records, theme, onToggleTheme }: Props) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const count = records.records.length;

  const clearAll = () => {
    const result = records.clearAll();
    setConfirmClear(false);
    setFeedback(result.ok ? { ok: true, message: '모든 기록을 삭제했어요.' } : { ok: false, message: `삭제하지 못했어요. ${result.reason}` });
  };

  const exportRecords = async () => {
    if (count === 0 || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const how = await saveTextFile(`${APP_NAME}-기록-${stamp}.json`, records.exportJson());
      setFeedback({ ok: true, message: how === 'shared' ? `기록 ${count}개를 파일로 공유했어요.` : `기록 ${count}개를 파일로 저장했어요.` });
    } catch (err) {
      if (!(err instanceof Error && err.name === 'AbortError')) setFeedback({ ok: false, message: '파일을 저장하지 못했어요.' });
    } finally {
      setBusy(false);
    }
  };

  const importRecords = async () => {
    if (busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const text = await pickTextFile();
      if (text === null) return;
      const result = records.importFromText(text);
      if (result.ok) {
        const parts = [`${result.added ?? 0}개 추가`, ...(result.updated ? [`${result.updated}개 갱신`] : [])];
        setFeedback({ ok: true, message: `기록을 불러왔어요. ${parts.join(', ')}.` });
      } else {
        setFeedback({ ok: false, message: result.reason });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen">
      <div className="screen-head">
        <p className="section-label">내 공간</p>
        <h1 className="screen-title">설정과 안내</h1>
      </div>

      <Notice>{APP_NAME}는 아직 시제품이에요. 계정 없이 사용하며, 기록은 서버로 보내지 않아요.</Notice>

      {feedback && <Notice kind={feedback.ok ? 'success' : 'error'} role="status">{feedback.message}</Notice>}

      <section className="panel panel--flat" aria-label="기록">
        <div className="setting-row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 0 }}>
          <span className="setting-title">기록 저장 위치</span>
          <span className="setting-desc">상담 기록은 이 기기의 브라우저 안에만 저장돼요. 브라우저 데이터를 지우거나 다른 기기에서 열면 보이지 않아요. 아래에서 파일로 저장해 두면 옮기거나 되살릴 수 있어요.</span>
        </div>
        <button type="button" className="setting-row" onClick={exportRecords} disabled={count === 0 || busy}>
          <span className="setting-title" style={{ fontWeight: 600, fontSize: 15, color: count === 0 ? 'var(--color-text-faint)' : 'var(--color-accent-text)' }}>기록 파일로 저장</span>
          <span className="setting-value">{count}개</span>
        </button>
        <button type="button" className="setting-row" onClick={importRecords} disabled={busy}>
          <span className="setting-title" style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-accent-text)' }}>파일에서 불러오기</span>
          <span className="setting-value">.json</span>
        </button>
        <button type="button" className="setting-row setting-row--tall setting-row--danger" onClick={() => setConfirmClear(true)} disabled={count === 0}>
          <span className="setting-title">전체 기록 삭제</span>
          <span className="setting-value">{count}개</span>
        </button>
      </section>

      <section className="panel panel--flat" aria-label="앱 정보">
        <div className="setting-row"><span className="setting-title" style={{ fontWeight: 500, fontSize: 15 }}>앱 이름</span><span className="setting-value">{APP_NAME}</span></div>
        <div className="setting-row"><span className="setting-title" style={{ fontWeight: 500, fontSize: 15 }}>버전</span><span className="setting-value">{APP_VERSION}</span></div>
        <div className="setting-row"><span className="setting-title" style={{ fontWeight: 500, fontSize: 15 }}>동작 줄이기</span><span className="setting-value">기기 설정을 따라요</span></div>
        <button type="button" className="setting-row" onClick={onToggleTheme} aria-label={`화면 테마 바꾸기, 현재 ${theme === 'dark' ? '어두운 화면' : '밝은 화면'}`}>
          <span className="setting-title" style={{ fontWeight: 500, fontSize: 15 }}>화면 테마</span>
          <span className="setting-value" style={{ color: 'var(--color-accent-text)', fontWeight: 600 }}>{theme === 'dark' ? '어두운 화면 · 바꾸기' : '밝은 화면 · 바꾸기'}</span>
        </button>
      </section>

      <p className="faint center">상담 결과는 참고용 제안이며 전문 상담을 대신하지 않아요.</p>

      <ConfirmDialog
        open={confirmClear}
        title="모든 기록을 삭제할까요?"
        description={`저장된 상담 ${count}개가 이 기기에서 지워지고 되돌릴 수 없어요. 먼저 파일로 저장해 둘 수도 있어요.`}
        actions={[
          { label: '삭제하기', kind: 'danger', onClick: clearAll },
          { label: '취소', kind: 'secondary', onClick: () => setConfirmClear(false) },
        ]}
        onDismiss={() => setConfirmClear(false)}
      />
    </div>
  );
}
