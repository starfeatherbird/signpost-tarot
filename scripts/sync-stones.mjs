/**
 * app/stone_asset/ 의 스톤 그림 PNG 를 웹용으로 줄여 public/stones/ 에 넣습니다.
 * - 파일명은 스톤 id 와 같아야 합니다 (예: moonstone.png, rose-quartz.png). 대소문자·공백은 정리합니다.
 * - 정사각형 MAX_SIZE 이하 WebP(투명 유지)로 저장합니다. 원본보다 결과가 최신이면 건너뜁니다.
 * - 그림이 없는 스톤은 앱이 대표 색 보석 모양(StoneGem)으로 대신 보여 줍니다.
 * `npm run dev` / `npm run build` 전에 자동 실행됩니다. 원본 폴더는 git 에 넣지 않습니다.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, utimesSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_SIZE = 320; // 화면 최대 표시 48px·모음 36px 이라 2~3배면 충분
const QUALITY = 88;

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = resolve(here, '..', 'stone_asset');
const TARGET_DIR = resolve(here, '..', 'public', 'stones');

if (!existsSync(SOURCE_DIR)) {
  console.log(`[stones] 그림 폴더가 없어 보석 모양으로 대신합니다. (그림을 넣으려면: ${SOURCE_DIR})`);
  process.exit(0);
}
mkdirSync(TARGET_DIR, { recursive: true });

let sharp = null;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.warn('[stones] sharp 를 불러오지 못해 축소 없이 PNG 로 복사합니다.');
}

const baseName = (name) => name.replace(/\.png$/i, '').trim().toLowerCase().replace(/[\s_]+/g, '-');

let done = 0;
let skipped = 0;
for (const file of readdirSync(SOURCE_DIR)) {
  if (!/\.png$/i.test(file)) continue;
  const src = join(SOURCE_DIR, file);
  const dst = join(TARGET_DIR, baseName(file) + (sharp ? '.webp' : '.png'));
  if (existsSync(dst) && statSync(dst).mtimeMs >= statSync(src).mtimeMs) {
    skipped += 1;
    continue;
  }
  if (sharp) {
    await sharp(src)
      .resize({ width: MAX_SIZE, height: MAX_SIZE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALITY, alphaQuality: 95 })
      .toFile(dst);
  } else {
    copyFileSync(src, dst);
  }
  const now = new Date();
  utimesSync(dst, now, now);
  done += 1;
}
console.log(`[stones] 변환 ${done}개, 최신 ${skipped}개 → ${TARGET_DIR}`);
