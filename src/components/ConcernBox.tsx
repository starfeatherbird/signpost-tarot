import { useState } from 'react';

interface Props {
  text: string;
  /** 이 길이를 넘거나 줄이 많으면 2줄로 접어서 보여 줍니다. */
  clampAt?: number;
}

/** 사용자가 적은 고민 인용. 길면 2줄 clamp + "전체 보기" 토글 */
export function ConcernBox({ text, clampAt = 60 }: Props) {
  const isLong = text.length > clampAt || text.split('\n').length > 2;
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <p className={`concern-box ${isLong && !expanded ? 'clamped' : ''}`}>{text}</p>
      {isLong && (
        <button type="button" className="link-button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
          {expanded ? '접기' : '전체 보기'}
        </button>
      )}
    </div>
  );
}
