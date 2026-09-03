import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Card } from '../components/ui/Card';
import { Badge, PriorityBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import { onAiAnalysis } from '../realtime/socketClient';
import './IncidentDetail.css';

export interface Incident {
  id: string;
  ref: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  assignee?: { fullName: string };
  reporter: { fullName: string };
  createdAt: string;
  updatedAt: string;
  resolution?: string;
  slaBreached?: boolean;
}

export interface AiAnalysisData {
  category: string; priority: string; summary: string;
  possibleCause: string; suggestedActions: string[];
  suggestedDepartment: string | null; source: 'ai' | 'heuristic'; model: string;
}

export interface AiAnalysis {
  status: 'PENDING' | 'QUEUED' | 'PROCESSING' | 'DONE';
  analysis: AiAnalysisData | null;
  accepted: boolean | null;
  rejected: boolean | null;
}

const statusVariant: Record<string, 'info' | 'warning' | 'success' | 'default' | 'danger'> = {
  OPEN: 'info', ASSIGNED: 'info', IN_PROGRESS: 'warning',
  WAITING_FOR_USER: 'warning', WAITING_FOR_VENDOR: 'warning',
  RESOLVED: 'success', CLOSED: 'default', REOPENED: 'warning', REJECTED: 'danger',
};

export const IncidentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const [incident, setIncident] = useState<Incident | null>(null);
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const canDecide = roles.includes('ADMIN') || roles.includes('IT_MANAGER');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get<{ success: boolean; data: Incident }>(`/incidents/${id}`)
      .then((r) => setIncident(r.data.data))
      .catch(() => setIncident(null))
      .finally(() => setLoading(false));
    api.get<{ success: boolean; data: AiAnalysis }>(`/ai/incidents/${id}/analysis`)
      .then((r) => setAnalysis(r.data.data))
      .catch(() => setAnalysis(null));
    const unsub = onAiAnalysis((payload) => {
      if (payload.incidentId !== id) return;
      setAnalysis((prev) => prev && {
        ...prev,
        status: 'DONE',
        analysis: payload.analysis ? {
          category: payload.analysis.category, priority: payload.analysis.priority,
          summary: payload.analysis.summary, possibleCause: payload.analysis.possibleCause,
          suggestedActions: payload.analysis.suggestedActions,
          suggestedDepartment: payload.analysis.suggestedDepartment,
          source: payload.analysis.source, model: payload.analysis.model,
        } : null,
      });
    });
    return unsub;
  }, [id]);

  const handleDecide = async (decision: 'accept' | 'reject') => {
    if (!id) return;
    await api.post(`/ai/incidents/${id}/ai-decision`, { decision });
    setAnalysis((prev) => prev && { ...prev, accepted: decision === 'accept', rejected: decision === 'reject' });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    setUploadMsg('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('incidentId', id);
    try {
      await api.post('/uploads', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUploadMsg(`✓ Uploaded ${file.name}`);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setUploadMsg(msg || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (loading || !incident) {
    return <div className="incident-detail"><Skeleton className="incident-detail__skeleton" /></div>;
  }

  const a = analysis;
  return (
    <div className="incident-detail">
      <div className="incident-detail__header">
        <div>
          <h1>{incident.title}</h1>
          <p className="incident-detail__meta">{incident.ref} · Created {new Date(incident.createdAt).toLocaleString()}</p>
        </div>
        <PriorityBadge priority={incident.priority} />
      </div>

      <div className="incident-detail__grid">
        <Card>
          <h3>Details</h3>
          <dl className="detail-list">
            <dt>Status</dt><dd><Badge variant={statusVariant[incident.status] || 'default'}>{incident.status.replace(/_/g, ' ')}</Badge></dd>
            <dt>Category</dt><dd>{incident.category}</dd>
            <dt>Assignee</dt><dd>{incident.assignee?.fullName || 'Unassigned'}</dd>
            <dt>Reporter</dt><dd>{incident.reporter.fullName}</dd>
            <dt>SLA Breached</dt><dd>{incident.slaBreached ? 'Yes ⚠' : 'No'}</dd>
          </dl>
        </Card>

        <Card>
          <h3>Description</h3>
          <p className="incident-detail__description">{incident.description}</p>
          {incident.resolution && (
            <>
              <h3 style={{ marginTop: 'var(--space-4)' }}>Resolution</h3>
              <p>{incident.resolution}</p>
            </>
          )}
        </Card>

        <Card>
          <h3>AI Analysis</h3>
          {!a ? (
            <p className="incident-detail__subtle">No AI analysis available.</p>
          ) : a.status === 'PENDING' || a.status === 'QUEUED' || a.status === 'PROCESSING' ? (
            <div className="ai-status">
              <span className="ai-status__dot" />
              <span>AI is analyzing{'.'.repeat(3)}</span>
            </div>
          ) : a.analysis ? (
            <div className="ai-analysis">
              <div className="ai-analysis__source">
                <Badge variant="default">{a.analysis.source === 'ai' ? 'AI-generated' : 'Heuristic recommendation'}</Badge>
                <span className="ai-analysis__model">{a.analysis.model}</span>
              </div>
              <p className="ai-analysis__summary">{a.analysis.summary}</p>
              <p><strong>Category:</strong> {a.analysis.category} · <strong>Priority:</strong> {a.analysis.priority}</p>
              <p><strong>Possible cause:</strong> {a.analysis.possibleCause}</p>
              <div className="ai-analysis__actions">
                <strong>Suggested actions:</strong>
                <ul>{a.analysis.suggestedActions.map((action, i) => <li key={i}>{action}</li>)}</ul>
              </div>
              {a.analysis.suggestedDepartment && <p><strong>Suggested department:</strong> {a.analysis.suggestedDepartment}</p>}
              {canDecide && a.accepted === null && a.rejected === null && (
                <div className="ai-analysis__decisions">
                  <Button size="sm" onClick={() => handleDecide('accept')}>Accept</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDecide('reject')}>Reject</Button>
                </div>
              )}
              {a.accepted === true && <p className="ai-analysis__verdict">✓ Recommendation accepted</p>}
                            {a.rejected === true && <p className="ai-analysis__verdict">✗ Recommendation rejected</p>}
            </div>
          ) : (
            <Button size="sm" onClick={() => api.post(`/ai/incidents/${id}/reanalyze`)}>Run AI analysis</Button>
          )}
        </Card>

        <Card>
          <h3>Attachments</h3>
          <div className="incident-detail__upload">
            <input ref={fileRef} type="file" onChange={handleUpload} accept=".png,.jpg,.jpeg,.gif,.pdf,.doc,.docx,.txt,.log" hidden />
            <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? 'Uploading…' : '+ Upload File'}
            </Button>
            {uploadMsg && <span className="incident-detail__upload-msg">{uploadMsg}</span>}
          </div>
          <p className="incident-detail__subtle">Max 10MB. Allowed: images, PDF, Word, txt, log files.</p>
        </Card>
      </div>
    </div>
  );
};
