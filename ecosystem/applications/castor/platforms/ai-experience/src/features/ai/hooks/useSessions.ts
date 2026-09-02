"use client";

import { useState, useEffect } from 'react';

export interface Session {
  id: string;
  title: string;
  timestamp: Date;
  messageCount: number;
  contextTokens: string[];
  messages: any[];
}

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Load sessions from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('castor_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed.map((s: any) => ({
          ...s,
          timestamp: new Date(s.timestamp),
        })));
        if (parsed.length > 0) {
          setActiveSessionId(parsed[0].id);
        }
      } catch (e) {
        console.error('Failed to load sessions:', e);
      }
    }
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('castor_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  const createSession = (title: string, contextTokens: string[] = ['org-1']) => {
    const newSession: Session = {
      id: crypto.randomUUID(),
      title: title || `Conversation ${sessions.length + 1}`,
      timestamp: new Date(),
      messageCount: 0,
      contextTokens,
      messages: [],
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    return newSession.id;
  };

  const deleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      const remaining = sessions.filter(s => s.id !== sessionId);
      setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const updateSessionMessages = (sessionId: string, messages: any[]) => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId 
        ? { ...s, messages, messageCount: messages.length, timestamp: new Date() }
        : s
    ));
  };

  const getActiveSession = () => {
    return sessions.find(s => s.id === activeSessionId) || null;
  };

  return {
    sessions,
    activeSessionId,
    setActiveSessionId,
    createSession,
    deleteSession,
    updateSessionMessages,
    getActiveSession,
    setSessions,
  };
}