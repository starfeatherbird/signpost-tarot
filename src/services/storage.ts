/**
 * localStorage 를 안전하게 감싸는 얇은 계층.
 * - 저장소 접근 자체가 막혀 있어도(프라이빗 모드 등) 앱이 멈추지 않습니다.
 * - JSON 파싱 실패(손상된 데이터)는 null 로 취급합니다.
 * - 저장 실패는 false 를 돌려주어 호출 쪽에서 "성공했다"고 잘못 알리지 않게 합니다.
 */

export type StorageResult = { ok: true } | { ok: false; reason: string };

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readJson<T>(key: string, validate: (value: unknown) => value is T): T | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return validate(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): StorageResult {
  const storage = getStorage();
  if (!storage) return { ok: false, reason: '이 브라우저에서는 저장 공간을 사용할 수 없어요.' };
  try {
    storage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch {
    return { ok: false, reason: '저장 공간이 가득 찼거나 저장이 막혀 있어요.' };
  }
}

export function removeKey(key: string): StorageResult {
  const storage = getStorage();
  if (!storage) return { ok: false, reason: '이 브라우저에서는 저장 공간을 사용할 수 없어요.' };
  try {
    storage.removeItem(key);
    return { ok: true };
  } catch {
    return { ok: false, reason: '저장 공간에 접근할 수 없어요.' };
  }
}
