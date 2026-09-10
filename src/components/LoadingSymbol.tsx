/**
 * 로딩 심볼: 아이콘 디자인의 표지판(단색, currentColor).
 * 기둥 아래를 축으로 ±6° 흔들리고, 동작 줄이기 설정에서는 흔들림 없이 불투명도만 맥동합니다.
 */
export function LoadingSymbol({ size = 61 }: { size?: number }) {
  return (
    <span className="loading-symbol" aria-hidden="true" style={{ width: size, height: Math.round((size * 67) / 61) }}>
      <svg viewBox="230 230 610 670" width="100%" height="100%" fill="currentColor" focusable="false">
        <rect x="472" y="250" width="80" height="630" rx="40" />
        <path d="M294 318h452l74 88-74 88H294a34 34 0 0 1-34-34V352a34 34 0 0 1 34-34z" />
        <path d="M752 548H307l-57 68 57 68h445a28 28 0 0 0 28-28v-80a28 28 0 0 0-28-28z" />
      </svg>
    </span>
  );
}
