import { App as CapApp } from '@capacitor/app';
import { useEffect, useReducer, useState } from 'react';
import { BottomNav, type Tab } from './components/BottomNav';
import { isNativeApp } from './services/native';
import { APP_NAME } from './config/appConfig';
import { CounselScreen } from './screens/counsel/CounselScreen';
import { RecordsScreen } from './screens/records/RecordsScreen';
import { SpaceScreen } from './screens/space/SpaceScreen';
import { loadSession, persistSession, sessionReducer } from './state/session';
import { useAds } from './state/useAds';
import { useAuth } from './state/useAuth';
import { useRecords } from './state/useRecords';
import { useTheme } from './state/useTheme';

export default function App() {
  const [tab, setTab] = useState<Tab>('counsel');
  const [session, dispatch] = useReducer(sessionReducer, undefined, loadSession);
  const auth = useAuth();
  const records = useRecords(auth.user?.id ?? null);
  const { theme, toggle: toggleTheme } = useTheme();
  useAds(tab, session.step); // 네이티브 앱의 하단 배너 (웹에서는 아무 일도 안 함)

  // 진행 중인 상담을 임시 보관해 새로고침 시 복구합니다.
  useEffect(() => {
    persistSession(session);
  }, [session]);

  useEffect(() => {
    document.title = APP_NAME;
  }, []);

  // 안드로이드 뒤로 가기: 다른 탭이면 상담실로, 상담실이면 앱을 뒤로 보냅니다(진행 중인 상담은 임시 보관됨).
  useEffect(() => {
    if (!isNativeApp) return;
    const handle = CapApp.addListener('backButton', () => {
      setTab((current) => {
        if (current !== 'counsel') {
          window.scrollTo({ top: 0 });
          return 'counsel';
        }
        void CapApp.minimizeApp();
        return current;
      });
    });
    return () => {
      handle.then((h) => h.remove());
    };
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
        {tab === 'space' && <SpaceScreen records={records} auth={auth} theme={theme} onToggleTheme={toggleTheme} />}
      </main>
      <BottomNav current={tab} onChange={changeTab} />
    </div>
  );
}
