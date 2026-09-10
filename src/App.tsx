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

  const changeTab = (next: Tab) => {
    setTab(next);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="app-shell">
      <main className="app-main" id="main">
        {tab === 'counsel' && <CounselScreen state={session} dispatch={dispatch} records={records} onOpenRecords={() => changeTab('records')} />}
        {tab === 'records' && <RecordsScreen records={records} onStartNew={() => changeTab('counsel')} />}
        {tab === 'space' && <SpaceScreen records={records} theme={theme} onToggleTheme={toggleTheme} />}
      </main>
      <BottomNav current={tab} onChange={changeTab} />
    </div>
  );
}
