/**
 * app/card_asset/ 의 카드 PNG 를 웹용으로 줄여 public/cards/ 에 넣습니다.
 * - 파일명은 소문자 + 공백→하이픈 으로 바꿔 카드 ID 와 맞춥니다. (HIGH PRIESTESS.png → high-priestess.webp)
 * - FRONT.png → front.webp (틀, 투명 유지), BACK.png → back.webp (뒷면)
 * - 폭 MAX_WIDTH 이하로 줄이고 WebP(품질 QUALITY)로 저장합니다. 1.5MB PNG → 100KB 안팎.
 * - 원본보다 결과가 최신이면 건너뜁니다. `npm run dev` / `npm run build` 전에 자동 실행됩니다.
 * - sharp 를 불러올 수 없으면 축소 없이 PNG 그대로 복사합니다(앱은 .webp 가 없으면 .png 를 찾습니다).
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, utimesSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_WIDTH = 810;   // 완성 카드 폭 805px 기준. 그림(896px)은 이 폭으로 줄어듭니다.
const QUALITY = 85;

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = resolve(here, '..', 'card_asset');   // app/card_asset
const TARGET_DIR = resolve(here, '..', 'public', 'cards');

if (!existsSync(SOURCE_DIR)) {
  console.warn(`[cards] 원본 폴더가 없어 건너뜁니다. 카드 PNG 를 이 폴더에 넣어 주세요: ${SOURCE_DIR}`);
  process.exit(0);
}
mkdirSync(TARGET_DIR, { recursive: true });

let sharp = null;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.warn('[cards] sharp 를 불러오지 못해 축소 없이 PNG 로 복사합니다. (npm install 을 다시 실행해 보세요)');
}

const baseName = (name) => name.replace(/\.png$/i, '').trim().toLowerCase().replace(/\s+/g, '-');

let done = 0;
let skipped = 0;
let totalBytes = 0;
for (const file of readdirSync(SOURCE_DIR)) {
  if (!/\.png$/i.test(file)) continue;
  const src = join(SOURCE_DIR, file);
  const dst = join(TARGET_DIR, baseName(file) + (sharp ? '.webp' : '.png'));
  const s = statSync(src);
  if (existsSync(dst) && statSync(dst).mtimeMs >= s.mtimeMs) {
    skipped += 1;
    totalBytes += statSync(dst).size;
    continue;
  }
  if (sharp) {
    await sharp(src)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY, alphaQuality: 95 })
      .toFile(dst);
  } else {
    copyFileSync(src, dst);
  }
  // 결과 파일 시각을 지금으로 맞춰 다음 실행 때 건너뛰게 합니다.
  const now = new Date();
  utimesSync(dst, now, now);
  totalBytes += statSync(dst).size;
  done += 1;
}
console.log(`[cards] 변환 ${done}개, 최신 ${skipped}개, 합계 ${(totalBytes / 1024 / 1024).toFixed(1)}MB → ${TARGET_DIR}`);
