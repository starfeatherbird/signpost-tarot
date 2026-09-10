/**
 * src/data/cards.ts 의 카드 데이터를 서버 함수용 JSON 으로 내보냅니다.
 *   → supabase/functions/_shared/cards.json
 * 카드 데이터를 고친 뒤 `npm run server:data` 를 실행하고 함수를 다시 배포하세요.
 * (Node 22+ 는 .ts 를 바로 읽을 수 있어 별도 빌드가 필요 없습니다.)
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const shared = resolve(here, '..', 'supabase', 'functions', '_shared');
const { CARDS } = await import(pathToFileURL(resolve(here, '..', 'src', 'data', 'cards.ts')).href);
const { STONES } = await import(pathToFileURL(resolve(here, '..', 'src', 'data', 'stones.ts')).href);

const slim = CARDS.map(({ id, number, nameKo, nameEn, keywords, essence, reversedKeywords, reversedEssence, perspectives, actions }) => ({
  id, number, nameKo, nameEn, keywords, essence, reversedKeywords, reversedEssence, perspectives, actions,
}));
const cardsTarget = resolve(shared, 'cards.json');
writeFileSync(cardsTarget, JSON.stringify(slim, null, 2) + '\n', 'utf8');
console.log(`[server:data] 카드 ${slim.length}장 → ${cardsTarget}`);

// 상징 스톤: 모델이 고르는 데 필요한 이름·상징·주제만 내보냅니다 (색·설명은 앱 전용).
const stones = STONES.map(({ id, nameKo, nameEn, symbol, themes }) => ({ id, nameKo, nameEn, symbol, themes }));
const stonesTarget = resolve(shared, 'stones.json');
writeFileSync(stonesTarget, JSON.stringify(stones, null, 2) + '\n', 'utf8');
console.log(`[server:data] 스톤 ${stones.length}종 → ${stonesTarget}`);
