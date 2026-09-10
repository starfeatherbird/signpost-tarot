export type Tab = 'counsel' | 'records' | 'space';

/** 탭 아이콘은 이미지 없이 CSS 도형: 원 / 라운드 사각 / 45° 회전 사각 */
const TABS: { id: Tab; label: string; shape: 'circle' | 'square' | 'diamond' }[] = [
  { id: 'counsel', label: '상담실', shape: 'circle' },
  { id: 'records', label: '기록장', shape: 'square' },
  { id: 'space', label: '내 공간', shape: 'diamond' },
];

interface Props {
  current: Tab;
  onChange: (tab: Tab) => void;
}

export function BottomNav({ current, onChange }: Props) {
  return (
    <nav className="bottom-nav" aria-label="주요 메뉴">
      <ul>
        {TABS.map((tab) => (
          <li key={tab.id}>
            <button
              type="button"
              className="nav-item"
              aria-current={current === tab.id ? 'page' : undefined}
              onClick={() => onChange(tab.id)}
            >
              <span className={`nav-icon nav-icon--${tab.shape}`} aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
