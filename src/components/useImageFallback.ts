import { useEffect, useState } from 'react';

/**
 * 이미지 후보 목록을 앞에서부터 시도합니다.
 * 반환된 src 가 실패하면 onError 를 호출해 다음 후보로 넘어가고,
 * 모두 실패하면 src 가 null 이 됩니다(임시 디자인 표시).
 */
export function useImageFallback(candidates: readonly string[]) {
  const [index, setIndex] = useState(0);
  const key = candidates.join('|');

  useEffect(() => {
    setIndex(0);
  }, [key]);

  const src = index < candidates.length ? candidates[index] : null;
  const onError = () => setIndex((i) => i + 1);
  return { src, onError };
}
