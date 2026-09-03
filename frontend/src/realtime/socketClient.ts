import { io, Socket } from 'socket.io-client';

type AnalysisUpdate = {
  incidentId: string;
  analysis: {
    category: string; priority: string; summary: string;
    possibleCause: string; suggestedActions: string[];
    suggestedDepartment: string | null; source: 'ai' | 'heuristic'; model: string;
  } | null;
};

type Listener = (payload: AnalysisUpdate) => void;

let socket: Socket | null = null;
const analysisListeners: Set<Listener> = new Set();

export const initSocket = (token: string): void => {
  if (socket?.connected) return;
  const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  socket = io(base, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });
  socket.on('connect', () => { /* ready */ });
  socket.on('ai:analysis', (payload: AnalysisUpdate) => {
    analysisListeners.forEach((l) => l(payload));
  });
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
    analysisListeners.clear();
  }
};

export const onAiAnalysis = (cb: Listener): (() => void) => {
  analysisListeners.add(cb);
  return () => { analysisListeners.delete(cb); };
};

export const socketClient = { initSocket, disconnectSocket, onAiAnalysis };
