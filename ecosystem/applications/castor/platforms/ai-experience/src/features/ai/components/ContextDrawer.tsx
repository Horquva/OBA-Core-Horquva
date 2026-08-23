"use client";

import { useState } from 'react';
import { Drawer } from '../../../components/ui/Drawer';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Session } from '../hooks/useSessions';

interface ContextDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: Session[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onCreateSession: () => void;
  currentContextTokens: string[];
}

export const ContextDrawer: React.FC<ContextDrawerProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onCreateSession,
  currentContextTokens,
}) => {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDelete = (sessionId: string) => {
    if (confirmDelete === sessionId) {
      onDeleteSession(sessionId);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(sessionId);
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} side="right" className="w-80 sm:w-96 bg-slate-50/95 backdrop-blur-sm border-l border-slate-200/60">
      <div className="p-5 h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              📚 Session History
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {sessions.length} conversations
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={onCreateSession}
            className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 shadow-md shadow-indigo-500/25 rounded-xl text-xs font-medium px-4 py-2 h-auto"
          >
            + New Chat
          </Button>
        </div>

        {/* Active Context Tokens */}
        <div className="mb-5 p-3.5 bg-white rounded-xl border border-slate-200/60 shadow-sm">
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2">
            Active Context
          </p>
          <div className="flex flex-wrap gap-1.5">
            {currentContextTokens.map((token) => (
              <span
                key={token}
                className="text-[11px] px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full font-medium border border-indigo-100"
              >
                {token}
              </span>
            ))}
          </div>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {sessions.length === 0 ? (
            <div className="text-center text-slate-400 py-12">
              <p className="text-sm">No sessions yet</p>
              <p className="text-xs mt-1">Start a new chat to begin</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`group p-3.5 rounded-xl border cursor-pointer transition-all ${
                  session.id === activeSessionId
                    ? 'border-indigo-300 bg-white shadow-sm shadow-indigo-100/50'
                    : 'border-slate-200/60 bg-white/60 hover:border-slate-300 hover:bg-white hover:shadow-sm'
                }`}
                onClick={() => onSelectSession(session.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      session.id === activeSessionId ? 'text-indigo-700' : 'text-slate-700'
                    }`}>
                      {session.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-400">
                        {session.messages.length} messages
                      </span>
                      <span className="text-xs text-slate-300">•</span>
                      <span className="text-xs text-slate-400">
                        {session.timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(session.id);
                    }}
                    className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                      confirmDelete === session.id
                        ? 'bg-red-500 text-white'
                        : 'text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {confirmDelete === session.id ? 'Confirm' : '✕'}
                  </button>
                </div>
                {session.contextTokens.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {session.contextTokens.slice(0, 3).map((token) => (
                      <span
                        key={token}
                        className="text-[10px] px-2 py-0.5 bg-slate-100 rounded-full text-slate-500"
                      >
                        {token}
                      </span>
                    ))}
                    {session.contextTokens.length > 3 && (
                      <span className="text-[10px] text-slate-400">
                        +{session.contextTokens.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-slate-200/60">
          <Button
            variant="outline"
            className="w-full rounded-xl text-slate-500 border-slate-200 hover:bg-slate-100 transition-all"
            onClick={onClose}
          >
            Close Drawer
          </Button>
        </div>
      </div>
    </Drawer>
  );
};