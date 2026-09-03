import { env } from '../config/env';

export interface IncidentAnalysis {
  category: string;
  priority: string;
  summary: string;
  possibleCause: string;
  suggestedActions: string[];
  suggestedDepartment: string | null;
  source: 'ai' | 'heuristic';
  model: string;
}

export interface LlmProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  analyzeIncident(input: { title: string; description: string; category?: string }): Promise<IncidentAnalysis>;
  embed(text: string): Promise<number[]>;
  chat(prompt: string): Promise<string>;
}

export const VALID_CATEGORIES = [
  'NETWORK', 'HARDWARE', 'SOFTWARE', 'SECURITY', 'ACCOUNT',
  'EMAIL', 'SERVER', 'DATABASE', 'VPN', 'OTHER',
] as const;

export const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export function isAiEnabled(): boolean {
  return env.AI_ENABLED;
}
