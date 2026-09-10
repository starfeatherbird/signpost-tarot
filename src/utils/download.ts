/**
 * 텍스트 파일을 기기에 저장합니다.
 * 휴대폰에서 파일 공유가 가능하면 공유 창(파일 앱·메신저 등)을 띄우고, 아니면 내려받기로 처리합니다.
 */
export async function saveTextFile(name: string, text: string, mime = 'application/json'): Promise<'shared' | 'downloaded'> {
  const blob = new Blob([text], { type: mime });
  const file = new File([blob], name, { type: mime });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (typeof nav.share === 'function' && typeof nav.canShare === 'function' && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: name });
      return 'shared';
    } catch (err) {
      // 사용자가 공유 창을 닫은 경우는 실패로 보지 않고 내려받기로 넘어갑니다.
      if (err instanceof Error && err.name === 'AbortError') throw err;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}

/** 파일 선택창을 열고 선택한 파일의 텍스트를 돌려줍니다. 취소하면 null */
export function pickTextFile(accept = '.json,application/json'): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      file.text().then(resolve, () => resolve(null));
    };
    // 취소 시 change 가 안 오므로 포커스가 돌아오면 잠시 뒤 정리
    window.addEventListener('focus', () => setTimeout(() => { if (!input.files?.length) resolve(null); }, 800), { once: true });
    input.click();
  });
}
