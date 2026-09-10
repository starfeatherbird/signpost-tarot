import type { ReactNode } from 'react';

interface Props {
  kind?: 'info' | 'success' | 'error';
  children: ReactNode;
  role?: 'status' | 'alert';
  className?: string;
}

const ICON: Record<NonNullable<Props['kind']>, string> = { info: 'i', success: '✓', error: '!' };

/** 안내 상자 3종: 일반(윤곽 i) / 성공(채운 ✓) / 오류(채운 !) */
export function Notice({ kind = 'info', children, role, className = '' }: Props) {
  const modifier = kind === 'info' ? '' : `notice--${kind}`;
  return (
    <div className={`notice ${modifier} ${className}`.trim()} role={role}>
      <span className="notice-icon" aria-hidden="true">{ICON[kind]}</span>
      <div>{children}</div>
    </div>
  );
}
