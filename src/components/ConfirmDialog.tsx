import { useEffect, useRef } from 'react';

export interface DialogAction {
  label: string;
  /** primary: 채운 파랑 / danger: 채운 위험색 / secondary: 윤곽 / text: 텍스트(44px) */
  kind: 'primary' | 'danger' | 'secondary' | 'text';
  onClick: () => void;
}

interface Props {
  open: boolean;
  title: string;
  description: string;
  /** 위에서부터 세로로 쌓입니다 (gap 8, 48px). 마지막 항목이 보통 '취소'. */
  actions: DialogAction[];
  onDismiss: () => void;
}

const CLASS: Record<DialogAction['kind'], string> = {
  primary: 'btn btn--primary btn--sub',
  danger: 'btn btn--danger-fill btn--sub',
  secondary: 'btn btn--secondary btn--sub',
  text: 'btn btn--text',
};

/** 확인 대화상자. 삭제·새 상담 시작처럼 되돌리기 어려운 동작 앞에 사용합니다. */
export function ConfirmDialog({ open, title, description, actions, onDismiss }: Props) {
  const firstRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onDismiss]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop" onClick={onDismiss}>
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-desc">{description}</p>
        <div className="btn-stack">
          {actions.map((action, i) => (
            <button
              key={action.label}
              ref={i === actions.length - 1 ? firstRef : undefined}
              type="button"
              className={action.kind === 'text' ? `${CLASS.text}` : CLASS[action.kind]}
              style={action.kind === 'text' ? { minHeight: 44 } : undefined}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
