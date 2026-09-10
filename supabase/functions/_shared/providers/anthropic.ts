import Anthropic from 'npm:@anthropic-ai/sdk';
import { classifyStatus, ProviderError } from '../registry.ts';
import type { JsonSchema } from '../schema.ts';

export interface ProviderCall {
  model: string;
  system: string;
  user: string;
  schema: JsonSchema;
  maxTokens?: number;
  /** 생각 깊이. 상담문은 'low' 로도 충분하며 응답 시간이 크게 줄어듭니다. */
  effort?: 'low' | 'medium' | 'high';
}

/**
 * Anthropic(Claude) 호출. 구조화 출력(output_config.format)으로 JSON 만 받습니다.
 * 키는 Supabase 시크릿 ANTHROPIC_API_KEY 에서만 읽습니다.
 */
export async function callAnthropic(apiKey: string, call: ProviderCall): Promise<string> {
  const client = new Anthropic({ apiKey, maxRetries: 1 });
  try {
    const response = await client.messages.create({
      model: call.model,
      max_tokens: call.maxTokens ?? 8000,
      system: call.system,
      messages: [{ role: 'user', content: call.user }],
      thinking: { type: 'adaptive' },
      output_config: { effort: call.effort ?? 'low', format: { type: 'json_schema', schema: call.schema } },
    });
    if (response.stop_reason === 'refusal') {
      throw new ProviderError('모델이 이 요청에 답하지 않았어요.', 'output');
    }
    const text = response.content.find((block) => block.type === 'text');
    if (!text || text.type !== 'text' || !text.text.trim()) {
      throw new ProviderError('모델 응답에 본문이 없어요.', 'output');
    }
    return text.text;
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    if (err instanceof Anthropic.APIError) {
      const status = err.status ?? 0;
      throw new ProviderError(`Anthropic ${status}: ${err.message}`, status ? classifyStatus(status) : 'network', status || undefined);
    }
    throw new ProviderError(err instanceof Error ? err.message : String(err), 'network');
  }
}
