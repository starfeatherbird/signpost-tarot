import { useEffect, useReducer, useState } from 'react';
import { BottomNav, type Tab } from './components/BottomNav';
import { APP_NAME } from './config/appConfig';
import { CounselScreen } from './screens/counsel/CounselScreen';
import { RecordsScreen } from './screens/records/RecordsScreen';
import { SpaceScreen } from './screens/space/SpaceScreen';
import { loadSession, persistSession, sessionReducer } from './state/session';
import { useRecords } from './state/useRecords';
import { useTheme } from './state/useTheme';

export default function App() {
  const [tab, setTab] = useState<Tab>('counsel');
  const [session, dispatch] = useReducer(sessionReducer, undefined, loadSession);
  const records = useRecords();
  const { theme, toggle: toggleTheme } = useTheme();

  // 진행 중인 상담을 임시 보관해 새로고침 시 복구합니다.
  useEffect(() => {
    persistSession(session);
  }, [session]);

  useEffect(() => {
    document.title = APP_NAME;
  }, []);

  // 상담실에서 특정 기록을 바로 열 때 사용. 탭을 바꿀 때마다 지워 다음 방문에는 목록부터 보이게 합니다.
  const [openRecordId, setOpenRecordId] = useState<string | null>(null);

  const changeTab = (next: Tab, recordId: string | null = null) => {
    setOpenRecordId(recordId);
    setTab(next);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="app-shell">
      <main className="app-main" id="main">
        {tab === 'counsel' && <CounselScreen state={session} dispatch={dispatch} records={records} onOpenRecords={(id) => changeTab('records', id ?? null)} />}
        {tab === 'records' && <RecordsScreen records={records} initialId={openRecordId} onStartNew={() => changeTab('counsel')} />}
        {tab === 'space' && <SpaceScreen records={records} theme={theme} onToggleTheme={toggleTheme} />}
      </main>
      <BottomNav current={tab} onChange={changeTab} />
    </div>
  );
}
