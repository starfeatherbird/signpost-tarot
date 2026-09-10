import { useMemo, useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Notice } from '../../components/Notice';
import { StoneGem } from '../../components/StoneGem';
import { APP_NAME, APP_VERSION } from '../../config/appConfig';
import { STONES } from '../../data/stones';
import { getRecordStone } from '../../services/reflection';
import type { AuthApi } from '../../state/useAuth';
import type { RecordsApi } from '../../state/useRecords';
import type { Theme } from '../../state/useTheme';
import { pickTextFile, saveTextFile } from '../../utils/download';
import { formatDateTime } from '../../utils/format';

interface Props {
  records: RecordsApi;
  auth: AuthApi;
  theme: Theme;
  onToggleTheme: () => void;
}

export function SpaceScreen({ records, auth, theme, onToggleTheme }: Props) {
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

      <Notice>{APP_NAME}는 아직 시제품이에요. 로그인 없이도 쓸 수 있고, 로그인하면 기록을 다른 기기에서도 이어 볼 수 있어요.</Notice>

      {feedback && <Notice kind={feedback.ok ? 'success' : 'error'} role="status">{feedback.message}</Notice>}

      {auth.available && <AccountPanel auth={auth} records={records} />}

      <StoneCollection records={records} />

      <section className="panel panel--flat" aria-label="기록">
        <div className="setting-row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 0 }}>
          <span className="setting-title">기록 저장 위치</span>
          <span className="setting-desc">
            {records.synced
              ? '상담 기록은 이 기기와 계정 양쪽에 저장돼요. 같은 계정으로 로그인한 다른 기기에서도 이어 볼 수 있어요. 파일로도 따로 보관할 수 있어요.'
              : '상담 기록은 이 기기의 브라우저 안에만 저장돼요. 브라우저 데이터를 지우거나 다른 기기에서 열면 보이지 않아요. 위에서 로그인하거나, 아래에서 파일로 저장해 두면 옮기거나 되살릴 수 있어요.'}
          </span>
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

/** 계정: 로그인(Google / 이메일 링크)과 동기화 상태. 로그인은 선택입니다. */
function AccountPanel({ auth, records }: { auth: AuthApi; records: RecordsApi }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; message: string } | null>(null);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const google = async () => {
    setBusy(true);
    setNote(null);
    const err = await auth.signInWithGoogle();
    if (err) { setNote({ ok: false, message: `Google 로그인을 시작하지 못했어요. ${err}` }); setBusy(false); }
    // 성공하면 Google 페이지로 이동하므로 busy 를 풀 필요가 없습니다.
  };

  const sendLink = async () => {
    if (!emailValid || busy) return;
    setBusy(true);
    setNote(null);
    const err = await auth.signInWithEmail(email.trim());
    setNote(err ? { ok: false, message: `메일을 보내지 못했어요. ${err}` } : { ok: true, message: `${email.trim()} 으로 로그인 링크를 보냈어요. 메일의 링크를 이 기기에서 열어 주세요.` });
    setBusy(false);
  };

  const logout = async () => {
    setBusy(true);
    const err = await auth.signOut();
    setNote(err ? { ok: false, message: `로그아웃하지 못했어요. ${err}` } : { ok: true, message: '로그아웃했어요. 이 기기의 기록은 그대로 남아 있어요.' });
    setBusy(false);
  };

  const { syncStatus } = records;
  const syncLine = syncStatus.state === 'syncing'
    ? '기록을 맞추는 중이에요…'
    : syncStatus.state === 'error'
      ? `서버와 맞추지 못했어요. ${syncStatus.error ?? ''}`
      : syncStatus.lastSyncAt
        ? `기록 ${records.records.length}개 · ${formatDateTime(syncStatus.lastSyncAt)}에 맞춤`
        : '';

  if (!auth.ready) return null;

  return (
    <section className="panel" aria-labelledby="account-title">
      <h2 className="panel-title" id="account-title">계정</h2>
      {auth.user ? (
        <>
          <div className="account-row">
            <span className="account-email">{auth.user.email ?? '로그인됨'}</span>
            <span className="tag tag--outline">{auth.user.provider === 'google' ? 'Google' : '이메일'}</span>
          </div>
          {syncLine && <p className={`text-muted ${syncStatus.state === 'error' ? 'account-error' : ''}`} style={{ fontSize: 13 }}>{syncLine}</p>}
          <p className="faint">기록은 저장할 때마다 계정에 자동으로 올라가요. 다른 기기에서 남긴 기록이 보이지 않으면 아래에서 다시 불러올 수 있어요.</p>
          {note && <Notice kind={note.ok ? 'success' : 'error'} role="status">{note.message}</Notice>}
          <div className="btn-pair">
            <button type="button" className="btn btn--secondary btn--sub" onClick={() => void records.sync()} disabled={syncStatus.state === 'syncing'}>기록 다시 불러오기</button>
            <button type="button" className="btn btn--text btn--sub" onClick={logout} disabled={busy}>로그아웃</button>
          </div>
        </>
      ) : (
        <>
          <p className="text-muted" style={{ fontSize: 13 }}>로그인하면 이 기기의 기록이 계정에 올라가고, 다른 기기에서도 이어 볼 수 있어요. 상담 횟수도 기기 대신 계정 기준으로 세요.</p>
          <button type="button" className="btn btn--secondary btn--block" onClick={google} disabled={busy}>Google로 계속하기</button>
          <div className="field">
            <label className="field-label" htmlFor="login-email">이메일로 로그인 링크 받기</label>
            <div className="account-email-row">
              <input
                id="login-email"
                className="text-input"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                placeholder="you@example.com"
                onChange={(e) => { setEmail(e.target.value); setNote(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') void sendLink(); }}
              />
              <button type="button" className="btn btn--outline-accent btn--sub" onClick={sendLink} disabled={!emailValid || busy}>보내기</button>
            </div>
          </div>
          {note && <Notice kind={note.ok ? 'success' : 'error'} role="status">{note.message}</Notice>}
        </>
      )}
    </section>
  );
}

/** 저장한 상담에서 만난 상징 스톤 모음. 아직 만나지 않은 돌은 흐리게 보입니다. */
function StoneCollection({ records }: { records: RecordsApi }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of records.records) {
      const pick = getRecordStone(r);
      if (pick) map.set(pick.stoneId, (map.get(pick.stoneId) ?? 0) + 1);
    }
    return map;
  }, [records.records]);
  const met = STONES.filter((s) => counts.has(s.id)).length;
  const selected = STONES.find((s) => s.id === selectedId) ?? null;

  return (
    <section className="panel" aria-labelledby="stones-title">
      <div className="row-between">
        <h2 className="panel-title" id="stones-title">모은 스톤</h2>
        <span className="caption">{met} / {STONES.length}</span>
      </div>
      <p className="text-muted" style={{ fontSize: 13 }}>상담 결과마다 약속을 떠올리게 하는 돌 하나가 함께 와요. 기록을 저장하면 여기에 모여요.</p>
      <div className="stone-grid" role="list">
        {STONES.map((s) => {
          const count = counts.get(s.id) ?? 0;
          return (
            <button
              type="button"
              role="listitem"
              key={s.id}
              className="stone-cell"
              aria-pressed={selectedId === s.id}
              aria-label={`${s.nameKo}, ${count > 0 ? `${count}번 만남` : '아직 만나지 않음'}`}
              onClick={() => setSelectedId((v) => (v === s.id ? null : s.id))}
            >
              <StoneGem stone={s} size={36} dim={count === 0} />
              <span className="stone-cell-name">{s.nameKo}</span>
            </button>
          );
        })}
      </div>
      {selected && (
        <div className="stone-detail" role="status">
          <strong>{selected.nameKo}</strong> · {selected.symbol}
          <span className="caption"> · {counts.get(selected.id) ? `${counts.get(selected.id)}번 만남` : '아직 만나지 않음'}</span>
          <p className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>{selected.description}</p>
        </div>
      )}
    </section>
  );
}
