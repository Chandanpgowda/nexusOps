import { IncidentAnalysis, VALID_CATEGORIES, VALID_PRIORITIES } from './types';

const KEYWORDS: Record<string, string[]> = {
  VPN: ['vpn', 'tunnel', 'remote access'],
  NETWORK: ['network', 'wifi', 'wi-fi', 'internet', 'connection', 'dns', 'firewall', 'ethernet', 'lan'],
  EMAIL: ['email', 'outlook', 'mail', 'smtp', 'inbox'],
  ACCOUNT: ['password', 'login', 'account', 'locked', 'credentials', 'sso', 'mfa'],
  HARDWARE: ['laptop', 'screen', 'printer', 'keyboard', 'mouse', 'monitor', 'battery', 'charger', 'disk'],
  DATABASE: ['database', 'db', 'sql', 'query', 'postgres', 'mysql'],
  SERVER: ['server', 'hosting', 'uptime', 'restart', 'vm'],
  SECURITY: ['virus', 'malware', 'phishing', 'hack', 'breach', 'suspicious'],
  SOFTWARE: ['software', 'application', 'app', 'install', 'update', 'crash', 'license', 'bug'],
};

export function heuristicAnalyze(input: { title: string; description: string }): IncidentAnalysis {
  const text = `${input.title} ${input.description}`.toLowerCase();

  let category = 'OTHER';
  let bestScore = 0;
  for (const [cat, words] of Object.entries(KEYWORDS)) {
    const score = words.reduce((acc, w) => (text.includes(w) ? acc + 1 : acc), 0);
    if (score > bestScore) {
      bestScore = score;
      category = cat;
    }
  }

  let priority = 'LOW';
  if (/(cannot|unable|outage|down|breach|critical|urgent|data loss)/.test(text)) priority = 'CRITICAL';
  else if (/(not working|error|fail|blocked|multiple users)/.test(text)) priority = 'HIGH';
  else if (/(slow|intermittent|sometimes|occasionally|question)/.test(text)) priority = 'MEDIUM';

  return {
    category,
    priority,
    summary: `${input.title.trim()} — reported issue categorized as ${category} with ${priority} priority based on keyword analysis.`,
    possibleCause: 'Requires technician investigation (keyword-based heuristic, no AI model available).',
    suggestedActions: [
      'Gather more details from the reporter (screenshots, error messages)',
      'Reproduce the issue if possible',
      'Check recent changes (updates, configurations)',
      'Review similar past incidents in the knowledge base',
    ],
    suggestedDepartment: null,
    source: 'heuristic',
    model: 'keyword-heuristic',
  };
}

export function clampCategory(c: string): string {
  return (VALID_CATEGORIES as readonly string[]).includes(c) ? c : 'OTHER';
}

export function clampPriority(p: string): string {
  return (VALID_PRIORITIES as readonly string[]).includes(p) ? p : 'MEDIUM';
}
