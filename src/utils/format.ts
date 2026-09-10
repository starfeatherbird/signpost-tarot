const formatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return formatter.format(date);
}

/** 기록 목록 제목용: 첫 줄을 잘라 요약 */
export function summarize(text: string, max = 40): string {
  const firstLine = text.trim().split('\n')[0] ?? '';
  return firstLine.length > max ? `${firstLine.slice(0, max)}…` : firstLine;
}
