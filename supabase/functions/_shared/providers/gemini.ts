import { classifyStatus, ProviderError } from '../registry.ts';
import { toGeminiSchema } from '../schema.ts';
import type { ProviderCall } from './anthropic.ts';

const API = 'https://generativelanguage.googleapis.com/v1beta';

// 모델 이름을 고정하면 Google 이 모델을 교체할 때 404 가 납니다.
// 'auto' 면 키로 사용 가능한 flash 계열 모델을 새 버전부터 차례로 시도합니다.
// (목록에는 generateContent 를 지원한다고 나오지만 실제로는 다른 API 전용인 모델도 있어, 거부되면 다음 모델로 넘어갑니다.)
let cachedAutoModels: string[] | null = null;
let cachedWorkingModel: string | null = null;

/** 'auto' 일 때 시도할 모델 목록 (새 버전 우선). 고정 모델이면 그 이름만 돌려줍니다. */
export async function resolveGeminiModels(apiKey: string, requested: string): Promise<string[]> {
  if (requested !== 'auto') return [requested];
  if (cachedWorkingModel) return [cachedWorkingModel];
  if (cachedAutoModels) return cachedAutoModels;

  const res = await fetch(`${API}/models?key=${apiKey}&pageSize=200`);
  if (!res.ok) throw new ProviderError(`Gemini 모델 목록 조회 실패 (${res.status})`, classifyStatus(res.status), res.status);
  const data = await res.json();
  const models = (data.models ?? []) as { name: string; supportedGenerationMethods?: string[] }[];
  const usable = models
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => m.name.replace(/^models\//, ''))
    // 실험·경량·특수 용도 모델과 다른 API 전용(omni) 모델 제외
    .filter((name) => !/lite|preview|exp|tts|image|audio|live|omni|embedding|thinking/.test(name));

  const versionOf = (name: string) => Number((name.match(/gemini-(\d+(?:\.\d+)?)/) ?? [])[1] ?? 0);
  const byVersionDesc = (a: string, b: string) => versionOf(b) - versionOf(a) || b.localeCompare(a);
  const flash = usable.filter((n) => n.includes('flash')).sort(byVersionDesc);
  const pro = usable.filter((n) => n.includes('pro')).sort(byVersionDesc);
  const ordered = [...flash, ...pro].slice(0, 4);
  if (ordered.length === 0) throw new ProviderError('사용 가능한 Gemini 모델이 없어요.', 'model_unavailable');
  cachedAutoModels = ordered;
  return ordered;
}

/** 앱 로그·출처 표기용: 지금 쓰일 모델 이름 */
export async function resolveGeminiModel(apiKey: string, requested: string): Promise<string> {
  return (await resolveGeminiModels(apiKey, requested))[0];
}

async function generate(apiKey: string, model: string, call: ProviderCall): Promise<string> {
  const body = {
    systemInstruction: { parts: [{ text: call.system }] },
    contents: [{ role: 'user', parts: [{ text: call.user }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: call.maxTokens ?? 8192,
      responseMimeType: 'application/json',
      responseSchema: toGeminiSchema(call.schema),
    },
  };

  let res: Response;
  try {
    res = await fetch(`${API}/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new ProviderError(err instanceof Error ? err.message : String(err), 'network');
  }
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new ProviderError(`Gemini ${res.status} (${model}): ${detail}`, classifyStatus(res.status), res.status);
  }
  const result = await res.json();
  const text: string =
    result.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
  if (!text.trim()) throw new ProviderError(`Gemini 응답에 본문이 없어요. (${model})`, 'output');
  return text;
}

/**
 * Gemini 호출. JSON 모드(responseMimeType + responseSchema)로 형식을 강제합니다.
 * 'auto' 모델은 후보를 차례로 시도하고, 성공한 모델을 기억합니다.
 * 키는 Supabase 시크릿 GEMINI_API_KEY 에서만 읽습니다.
 * 실제로 사용한 모델 이름은 call.model 이 'auto' 여도 반환값의 model 로 알 수 있습니다.
 */
export async function callGemini(apiKey: string, call: ProviderCall): Promise<{ text: string; model: string }> {
  const models = await resolveGeminiModels(apiKey, call.model);
  let lastError: ProviderError | null = null;
  for (const model of models) {
    try {
      const text = await generate(apiKey, model, call);
      if (call.model === 'auto') cachedWorkingModel = model;
      return { text, model };
    } catch (err) {
      const error = err instanceof ProviderError ? err : new ProviderError(String(err), 'network');
      lastError = error;
      // 모델 자체가 거부(404, 400 "only supports …")한 경우만 다음 모델로. 한도·장애·형식 오류는 그대로 올립니다.
      const modelRejected = error.kind === 'model_unavailable' || (error.kind === 'bad_request' && /only supports|not supported|not found/i.test(error.message));
      if (!modelRejected || call.model !== 'auto') throw error;
      console.log(`[gemini] model rejected, trying next: ${model} — ${error.message.slice(0, 120)}`);
    }
  }
  throw lastError ?? new ProviderError('사용 가능한 Gemini 모델이 없어요.', 'model_unavailable');
}
