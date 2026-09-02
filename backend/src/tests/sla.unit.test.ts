import { describe, it, expect } from 'vitest';
import { SlaService } from '../modules/incidents/sla.service';

describe('SLA engine', () => {
  describe('computeDeadlinesFromPolicy', () => {
    it('computes deadlines from policy minutes', () => {
      const from = new Date('2026-09-01T12:00:00Z');
      const sla = new SlaService();
      const result = sla.computeDeadlinesFromPolicy(60, 240, from);
      expect(result.responseDeadline.toISOString()).toBe('2026-09-01T13:00:00.000Z');
      expect(result.resolutionDeadline.toISOString()).toBe('2026-09-01T16:00:00.000Z');
    });

    it('handles zero-minute policy (instant deadline)', () => {
      const from = new Date('2026-09-01T12:00:00Z');
      const sla = new SlaService();
      const result = sla.computeDeadlinesFromPolicy(0, 0, from);
      expect(result.responseDeadline.getTime()).toBe(from.getTime());
      expect(result.resolutionDeadline.getTime()).toBe(from.getTime());
    });
  });

  describe('formatRemaining', () => {
    it('returns null for null deadline', () => {
      expect(SlaService.formatRemaining(null)).toBeNull();
    });

    it('reports breached when past deadline', () => {
      const past = new Date(Date.now() - 60_000);
      expect(SlaService.formatRemaining(past)).toBe('breached');
    });

    it('formats minutes remaining', () => {
      const future = new Date(Date.now() + 45 * 60_000);
      expect(SlaService.formatRemaining(future)).toBe('45m remaining');
    });

    it('formats hours and minutes', () => {
      const future = new Date(Date.now() + 3 * 60_000 * 60 + 15 * 60_000);
      expect(SlaService.formatRemaining(future)).toBe('3h 15m remaining');
    });

    it('formats days and hours', () => {
      const future = new Date(Date.now() + 2 * 24 * 3600_000 + 5 * 3600_000);
      expect(SlaService.formatRemaining(future)).toBe('2d 5h remaining');
    });
  });
});
