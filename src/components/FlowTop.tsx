interface Props {
  /** 왼쪽 섹션 라벨 (예: "카드 선택") */
  label?: string;
  /** 있으면 오른쪽에 "상담 취소" 버튼을 보여 줍니다. */
  onCancel?: () => void;
}

/** 상담 진행 화면의 맨 윗줄: 섹션 라벨 + 상담 취소 */
export function FlowTop({ label, onCancel }: Props) {
  return (
    <div className="flow-top">
      <span className="section-label">{label ?? ''}</span>
      {onCancel && (
        <button type="button" className="cancel-link" onClick={onCancel}>상담 취소</button>
      )}
    </div>
  );
}
