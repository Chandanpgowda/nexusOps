import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../api/client';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { onAiAnalysis } from '../../realtime/socketClient';
import './AiPanel.css';

interface Analysis {
  category: string;
  priority: string;
  summary: string;
  possibleCause: string;
  suggestedActions: string[];
  suggestedDepartment: string | null;
  source: 'ai' | 'heuristic';
  model: string;
}

interface AiPanelProps {
  incidentId: string;
  canDecide: boolean;
  onAnalysisUpdate?: (a: Analysis | null) => void;
}

export const AiPanel: React.FC<AiPanelProps> = ({ incidentId, canDecide, onAnalysisUpdate }) => {
  const [status, setStatus] = useState<'PENDING' | 'QUEUED' | 'PROCESSING' | 'DONE' | 'FAILED'>('PENDING');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [accepted, setAccepted] = useState<boolean | null>(null);
  const [rejected, setRejected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/ai/incidents/${incidentId}/analysis`);
      setStatus(data.status);
      if (data.analysis) {
        setAnalysis(data.analysis);
        setAccepted(data.accepted);
        setRejected(data.rejected);
        onAnalysisUpdate?.(data.analysis);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [incidentId, onAnalysisUpdate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    return onAiAnalysis((data) => {
      if (data.incidentId === incidentId) {
        setAnalysis(data.analysis);
        setAccepted(null);
        setRejected(null);
        setStatus('DONE');
        onAnalysisUpdate?.(data.analysis);
      }
    });
  }, [incidentId, onAnalysisUpdate]);

  const reanalyze = async () => {
    setLoading(true);
    await api.post(`/ai/incidents/${incidentId}/reanalyze`);
    setStatus('QUEUED');
    setLoading(false);
  };

  const decide = async (decision: 'accept' | 'reject') => {
    const { data } = await api.post(`/ai/incidents/${incidentId}/ai-decision`, { decision });
    setAccepted(data.accepted);
    setRejected(data.rejected);
  };

  if (loading && !analysis) {
    return (
      <Card className="ai-panel">
        <div className="ai-panel__header"><h3>AI Analysis</h3><Badge variant="info">Analyzing…</Badge></div>
        <div className="ai-panel__loading"><div className="ai-panel__spinner" /><p>AI is analyzing this incident…</p></div>
      </Card>
    );
  }
  if (status === 'QUEUED' || status === 'PROCESSING') {
    return (
      <Card className="ai-panel">
        <div className="ai-panel__header"><h3>AI Analysis</h3><Badge variant="warning">{status === 'PROCESSING' ? 'Processing…' : 'Queued'}</Badge></div>
        <div className="ai-panel__loading"><div className="ai-panel__spinner" /><p>{status === 'PROCESSING' ? 'AI is analyzing…' : 'Waiting in queue…'}</p><Button variant="ghost" size="sm" onClick={reanalyze}>Refresh</Button></div>
      </Card>
    );
  }
  if (!analysis) {
    return (
      <Card className="ai-panel">
        <div className="ai-panel__header"><h3>AI Analysis</h3><Badge variant="default">Pending</Badge></div>
        <p className="ai-panel__empty">No AI analysis available yet.</p>
        <Button size="sm" onClick={reanalyze}>Run AI Analysis</Button>
      </Card>
    );
  }
  return (
    <Card className="ai-panel">
      <div className="ai-panel__header"><h3>AI Analysis</h3><Badge variant={analysis.source === 'ai' ? 'info' : 'default'}>{analysis.source === 'ai' ? `AI (${analysis.model})` : 'Heuristic'}</Badge></div>
      <div className="ai-panel__disclaimer">AI-generated recommendation — requires human review</div>
      <div className="ai-panel__grid">
        <div className="ai-panel__item"><span className="ai-panel__label">Category</span><Badge variant="info">{analysis.category}</Badge></div>
        <div className="ai-panel__item"><span className="ai-panel__label">Priority</span><Badge variant={analysis.priority === 'CRITICAL' ? 'danger' : analysis.priority === 'HIGH' ? 'warning' : 'info'}>{analysis.priority}</Badge></div>
        {analysis.suggestedDepartment && <div className="ai-panel__item"><span className="ai-panel__label">Department</span><Badge variant="default">{analysis.suggestedDepartment}</Badge></div>}
      </div>
      <div className="ai-panel__section"><span className="ai-panel__label">Summary</span><p>{analysis.summary}</p></div>
      <div className="ai-panel__section"><span className="ai-panel__label">Possible Cause</span><p>{analysis.possibleCause}</p></div>
      <div className="ai-panel__section"><span className="ai-panel__label">Suggested Actions</span><ol className="ai-panel__steps">{analysis.suggestedActions.map((a, i) => <li key={i}>{a}</li>)}</ol></div>
      {canDecide && accepted === null && rejected === null && (
        <div className="ai-panel__actions"><Button size="sm" onClick={() => decide('accept')}>Accept</Button><Button size="sm" variant="ghost" onClick={() => decide('reject')}>Reject</Button><Button size="sm" variant="ghost" onClick={reanalyze}>Re-analyze</Button></div>
      )}
      {accepted && <p className="ai-panel__decided ai-panel__decided--accepted">Accepted</p>}
      {rejected && <p className="ai-panel__decided ai-panel__decided--rejected">Rejected</p>}
    </Card>
  );
};
