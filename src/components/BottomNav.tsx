export type Tab = 'counsel' | 'records' | 'space';

const TABS: { id: Tab; label: string }[] = [
  { id: 'counsel', label: '상담실' },
  { id: 'records', label: '기록장' },
  { id: 'space', label: '내 공간' },
];

/** 탭 아이콘: 얇은 선 아이콘 (상담실 = 부채꼴 카드 세 장, 기록장 = 기록장 책, 내 공간 = 표지판) */
function NavIcon({ tab }: { tab: Tab }) {
  const common = { className: 'nav-svg', width: 22, height: 22, viewBox: '0 0 24 24', 'aria-hidden': true, focusable: false } as const;
  if (tab === 'counsel') {
    return (
      <svg {...common}>
        <rect x="8" y="5.5" width="8" height="12" rx="1.4" transform="rotate(-13 12 23)" />
        <rect x="8" y="5.5" width="8" height="12" rx="1.4" transform="rotate(13 12 23)" />
        <rect x="8" y="4.5" width="8" height="12" rx="1.4" className="nav-svg-front" />
      </svg>
    );
  }
  if (tab === 'records') {
    return (
      <svg {...common}>
        <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3H18v16H7.5A1.5 1.5 0 0 0 6 20.5z" />
        <path d="M6 20.5A1.5 1.5 0 0 1 7.5 19H18v2.5H7.5A1.5 1.5 0 0 1 6 20.5z" />
        <path d="M9.5 8h5M9.5 11h5" className="nav-svg-line" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 3v2.5M12 16v5" className="nav-svg-line" />
      <path d="M7 5.5h8.5l2.5 2.5-2.5 2.5H7z" />
      <path d="M17 11.5H8.5L6 14l2.5 2.5H17z" />
    </svg>
  );
}

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
              <NavIcon tab={tab.id} />
              <span>{tab.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
