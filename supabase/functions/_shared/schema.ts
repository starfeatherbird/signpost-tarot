/**
 * 모델이 돌려줘야 하는 JSON 형식.
 * - Anthropic: output_config.format 에 그대로 사용 (additionalProperties:false + required 필수)
 * - Gemini: responseSchema 는 additionalProperties 를 지원하지 않으므로 toGeminiSchema 로 걷어냅니다.
 */
import stonesJson from './stones.json' with { type: 'json' };
import type { StoneData } from './types.ts';

export type JsonSchema = Record<string, unknown>;

const str = { type: 'string' } as const;
const strList = { type: 'array', items: str } as const;

function obj(properties: Record<string, unknown>): JsonSchema {
  return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false };
}

const perspective = obj({
  positionId: { type: 'string', enum: ['core', 'blindspot', 'next'] },
  text: str,
});

export const STONE_IDS = (stonesJson as StoneData[]).map((s) => s.id);

const stone = obj({
  stoneId: { type: 'string', enum: STONE_IDS },
  promise: str,
});

/** 기본·심층이 함께 쓰는 항목 */
const COMMON = {
  priority: str,
  reasons: strList,
  alternatives: strList,
  actions: strList,
  perspectives: { type: 'array', items: perspective },
  notes: strList,
  stone,
  reflectionQuestion: str,
};

export const BASIC_SCHEMA: JsonSchema = obj({ ...COMMON });

export const DEEP_SCHEMA: JsonSchema = obj({
  ...COMMON,
  criteriaSummary: str,
  recommendedOption: str,
  comparisons: {
    type: 'array',
    items: obj({ option: str, benefits: strList, burdens: strList }),
  },
  fitConditions: strList,
  executionSteps: strList,
  obstacles: {
    type: 'array',
    items: obj({ obstacle: str, response: str }),
  },
});

export const FOLLOWUP_SCHEMA: JsonSchema = obj({
  answer: str,
});

/** Gemini responseSchema 용: additionalProperties 제거 (OpenAPI 부분집합) */
export function toGeminiSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(toGeminiSchema);
  if (schema && typeof schema === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
      if (key === 'additionalProperties') continue;
      out[key] = toGeminiSchema(value);
    }
    return out;
  }
  return schema;
}
