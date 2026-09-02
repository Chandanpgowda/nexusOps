import { describe, it, expect } from 'vitest';
import { heuristicAnalyze, clampCategory, clampPriority } from '../ai/heuristics';

describe('AI heuristics (fallback classifier)', () => {
  it('classifies VPN issues', () => {
    const r = heuristicAnalyze({
      title: 'VPN stopped connecting after Windows update',
      description: 'Remote access tunnel fails every time.',
    });
    expect(r.category).toBe('VPN');
    expect(['CRITICAL', 'HIGH']).toContain(r.priority);
    expect(r.source).toBe('heuristic');
  });

  it('classifies email issues', () => {
    const r = heuristicAnalyze({ title: 'Outlook not syncing', description: 'Inbox stuck.' });
    expect(r.category).toBe('EMAIL');
  });

  it('defaults to OTHER with LOW priority when nothing matches', () => {
    const r = heuristicAnalyze({ title: 'Zebra painting request', description: 'Something vague about colors.' });
    expect(r.category).toBe('OTHER');
    expect(r.priority).toBe('LOW');
  });

  it('escalates priority on outage language', () => {
    const r = heuristicAnalyze({ title: 'File server outage', description: 'Whole floor is down.' });
    expect(r.priority).toBe('CRITICAL');
  });

  it('always returns suggested actions', () => {
    const r = heuristicAnalyze({ title: 'x', description: 'y' });
    expect(r.suggestedActions.length).toBeGreaterThan(0);
  });

  it('clamps invalid model output to valid enums', () => {
    expect(clampCategory('SPACESHIP')).toBe('OTHER');
    expect(clampCategory('NETWORK')).toBe('NETWORK');
    expect(clampPriority('ULTRA')).toBe('MEDIUM');
    expect(clampPriority('CRITICAL')).toBe('CRITICAL');
  });
});