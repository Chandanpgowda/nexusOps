import { Ollama } from 'ollama';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { IncidentAnalysis, LlmProvider } from './types';
import { clampCategory, clampPriority, heuristicAnalyze } from './heuristics';

const SYSTEM_PROMPT = `You are an IT operations assistant for an incident management system.
Analyze the incident and respond with ONLY a JSON object (no markdown, no commentary) with exactly these keys:
{"category": one of NETWORK|HARDWARE|SOFTWARE|SECURITY|ACCOUNT|EMAIL|SERVER|DATABASE|VPN|OTHER,
 "priority": one of LOW|MEDIUM|HIGH|CRITICAL,
 "summary": "one-sentence summary of the issue",
 "possibleCause": "most likely root cause",
 "suggestedActions": ["step 1", "step 2", "step 3"],
 "suggestedDepartment": "IT|NETWORK|HARDWARE|SECURITY|HR|FINANCE"}`;

export class OllamaProvider implements LlmProvider {
  readonly name = 'ollama';
  private client = new Ollama({ host: env.OLLAMA_BASE_URL });

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.list();
      return true;
    } catch {
      return false;
    }
  }

  async analyzeIncident(input: { title: string; description: string }): Promise<IncidentAnalysis> {
    const response = await this.client.chat({
      model: env.OLLAMA_CHAT_MODEL,
      format: 'json',
      options: { temperature: 0.2 },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Title: ${input.title}\n\nDescription: ${input.description}` },
      ],
    });

    const raw = response.message.content;
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      logger.warn({ raw: raw.slice(0, 200) }, 'AI returned invalid JSON — falling back to heuristics');
      return heuristicAnalyze(input);
    }

    const actions = Array.isArray(parsed.suggestedActions)
      ? (parsed.suggestedActions as unknown[]).filter((a): a is string => typeof a === 'string').slice(0, 8)
      : [];

    return {
      category: clampCategory(String(parsed.category || 'OTHER')),
      priority: clampPriority(String(parsed.priority || 'MEDIUM')),
      summary: String(parsed.summary || input.title).slice(0, 500),
      possibleCause: String(parsed.possibleCause || 'Unknown').slice(0, 500),
      suggestedActions: actions.length > 0 ? actions : heuristicAnalyze(input).suggestedActions,
      suggestedDepartment: parsed.suggestedDepartment ? String(parsed.suggestedDepartment) : null,
            source: 'ai',
      model: env.OLLAMA_CHAT_MODEL,
    };
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings({
      model: env.OLLAMA_EMBED_MODEL,
      prompt: text,
    });
    return response.embedding as unknown as number[];
  }

  async chat(prompt: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout
    try {
      const response = await this.client.chat({
        model: env.OLLAMA_CHAT_MODEL,
        options: { temperature: 0.3, num_predict: 500 },
        messages: [
          { role: 'system', content: 'You are a helpful IT support assistant. Be concise and accurate.' },
          { role: 'user', content: prompt },
        ],
      });
      clearTimeout(timeout);
      return response.message.content;
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('AI model is taking too long to respond. Please try again or use a faster model.');
      }
      throw err;
    }
  }
}

export const ollamaProvider = new OllamaProvider();
