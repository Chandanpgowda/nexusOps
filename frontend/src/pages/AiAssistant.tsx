import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import './AiAssistant.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ title: string; similarity: number }>;
  ts: number;
}

export const AiAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'assistant', content: 'Hello! I\'m your IT support assistant. Ask me anything about the knowledge base — I\'ll find relevant articles and cite my sources.', ts: Date.now() },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: q, ts: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const { data } = await api.post('/ai/ask', { question: q });
      const reply: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        ts: Date.now(),
      };
      setMessages((m) => [...m, reply]);
    } catch {
      setMessages((m) => [...m, { id: `e-${Date.now()}`, role: 'assistant', content: 'Sorry, I couldn\'t process that. Please try again.', ts: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = ['How do I fix VPN authentication errors?', 'What is the password reset process?', 'How to request a new laptop?'];

  return (
    <div className="ai-assistant">
      <div className="ai-assistant__header">
        <h1>AI Knowledge Assistant</h1>
        <p className="ai-assistant__subtitle">Ask questions — answers come from the company knowledge base with cited sources.</p>
      </div>
      <Card className="ai-assistant__chat">
        <div className="ai-assistant__messages">
          {messages.map((m) => (
            <div key={m.id} className={`ai-assistant__msg ai-assistant__msg--${m.role}`}>
              <div className="ai-assistant__bubble">
                <p>{m.content}</p>
                {m.sources && m.sources.length > 0 && (
                  <div className="ai-assistant__sources">
                    <span className="ai-assistant__sources-label">Sources:</span>
                    {m.sources.map((s, i) => (
                      <span key={i} className="ai-assistant__source">{s.title} ({(s.similarity * 100).toFixed(0)}%)</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="ai-assistant__msg ai-assistant__msg--assistant">
              <div className="ai-assistant__bubble ai-assistant__bubble--loading">
                <div className="ai-assistant__dots"><span /><span /><span /></div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="ai-assistant__suggestions">
          {suggestions.map((s) => (
            <Button key={s} variant="ghost" size="sm" onClick={() => { setInput(s); }}>{s}</Button>
          ))}
        </div>
        <div className="ai-assistant__input">
          <Input
            placeholder="Ask a question…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
          />
          <Button onClick={send} disabled={loading || !input.trim()}>Send</Button>
        </div>
      </Card>
    </div>
  );
};
