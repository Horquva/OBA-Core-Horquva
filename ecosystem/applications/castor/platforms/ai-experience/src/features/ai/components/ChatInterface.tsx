"use client";

import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAI } from '../context/AIContext';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { StreamingText } from './StreamingText';
import { ContextDrawer } from './ContextDrawer';

export const ChatInterface: React.FC = () => {
  const {
    state,
    messages,
    submitMessage,
    retry,
    clearChat,
    approveMessage,
    rejectMessage,
    sessions,
    activeSessionId,
    selectSession,
    deleteSession,
    createNewSession,
    isDrawerOpen,
    setDrawerOpen,
    currentContextTokens,
  } = useAI();

  const [inputValue, setInputValue] = useState('');
  const [contextId] = useState('org-1');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [followUpSuggestions, setFollowUpSuggestions] = useState<string[]>([]);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'up' | 'down'>>({});

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    const lastMessage = messages.filter(m => m.type === 'assistant').pop();
    if (lastMessage) {
      setFollowUpSuggestions([
        'Summarize this',
        'Explain further',
        'Give me an action plan',
        'What are the risks?'
      ]);
      if (lastMessage.type === 'assistant' && !streamingMessageId) {
        setStreamingMessageId(lastMessage.id);
      }
    }
  }, [messages]);

  const isLoading = state.status === 'SUBMITTING' || state.status === 'PROCESSING' || state.status === 'STREAMING';
  const isError = state.status === 'ERROR';
  const isIdle = state.status === 'IDLE';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    setStreamingMessageId(null);
    submitMessage(inputValue);
    setInputValue('');
  };

  const handleFollowUp = (suggestion: string) => {
    setInputValue(suggestion);
    setTimeout(() => {
      submitMessage(suggestion);
      setInputValue('');
    }, 100);
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleFeedback = (messageId: string, type: 'up' | 'down') => {
    setFeedbackGiven(prev => ({
      ...prev,
      [messageId]: type,
    }));
  };

  const handleStreamingComplete = () => {
    setStreamingMessageId(null);
  };

  // Helper function to safely format timestamp
  const formatTime = (timestamp: Date | string) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white shadow-xl lg:rounded-2xl lg:my-4 lg:h-[92vh] overflow-hidden border border-gray-200">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-4 sm:px-6 py-4 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
              C
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-semibold text-gray-800">
                Castor <span className="text-indigo-600">AI</span>
              </h1>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs font-medium text-gray-500 capitalize">
                  {isLoading ? state.status.toLowerCase() : isError ? 'error' : 'ready'}
                </span>
                <Badge variant="info" className="text-[10px] px-2 py-0.5">
                  {contextId}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-1.5 text-gray-600"
            >
              📚 History
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </Button>
          </div>
        </div>

        {/* MESSAGE LIST */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4 bg-gray-50">
          {messages.length === 0 && isIdle ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-3xl mb-4">
                🧠
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-700">Welcome to Castor AI</h2>
              <p className="text-sm text-gray-400 mt-1 max-w-sm">
                Ask me anything about your organizational data.
              </p>
              <p className="text-xs text-gray-300 mt-3 italic">
                I'm a frontend UI — not the real AI reasoning engine.
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isStreaming = msg.id === streamingMessageId && msg.type === 'assistant';
              const feedback = feedbackGiven[msg.id];

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.type === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0 mt-1 text-xs font-bold">
                      AI
                    </div>
                  )}

                  <div className={`max-w-[85%] sm:max-w-[75%] ${msg.type === 'user' ? 'order-2' : 'order-1'}`}>
                    <div className={`rounded-2xl px-4 py-3 ${
                      msg.type === 'user' 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-white border border-gray-200 text-gray-800 shadow-sm'
                    }`}>
                      
                      {msg.type === 'assistant' ? (
                        <div className="prose prose-sm max-w-none">
                          {isStreaming ? (
                            <StreamingText
                              text={msg.content}
                              onComplete={handleStreamingComplete}
                              isStreaming={true}
                              speed={12}
                            />
                          ) : (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content}
                            </ReactMarkdown>
                          )}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed break-words">
                          {msg.content}
                        </p>
                      )}

                      {/* Response Type Badge */}
                      {msg.responseType && msg.type === 'assistant' && (
                        <div className="mt-2 flex flex-wrap gap-2 items-center">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            msg.responseType === 'recommendation' 
                              ? 'bg-amber-100 text-amber-700' 
                              : msg.responseType === 'action'
                              ? 'bg-emerald-100 text-emerald-700'
                              : msg.responseType === 'explanation'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {msg.responseType}
                          </span>

                          {msg.responseType === 'recommendation' && (
                            <>
                              <span className="text-[10px] text-gray-400 italic">— not a decision</span>
                              <div className="flex gap-2 mt-1.5 w-full">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => approveMessage(msg.id)}
                                  disabled={msg.isApproved || msg.isRejected}
                                  className="text-xs px-3 py-1 h-auto"
                                >
                                  {msg.isApproved ? '✅ Approved' : '👍 Approve'}
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => rejectMessage(msg.id)}
                                  disabled={msg.isApproved || msg.isRejected}
                                  className="text-xs px-3 py-1 h-auto"
                                >
                                  {msg.isRejected ? '❌ Rejected' : '👎 Reject'}
                                </Button>
                              </div>
                            </>
                          )}
                          {msg.isApproved && <Badge variant="success" className="text-[10px]">Human Approved</Badge>}
                          {msg.isRejected && <Badge variant="danger" className="text-[10px]">Human Rejected</Badge>}
                        </div>
                      )}

                      {/* Actions */}
                      {msg.type === 'assistant' && !isStreaming && (
                        <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-gray-100">
                          <button
                            onClick={() => handleCopy(msg.content)}
                            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors py-1 px-2 rounded hover:bg-gray-100"
                          >
                            📋 Copy
                          </button>
                          
                          <div className="flex gap-0.5">
                            <button
                              onClick={() => handleFeedback(msg.id, 'up')}
                              className={`p-1.5 rounded transition-colors ${
                                feedback === 'up'
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              👍
                            </button>
                            <button
                              onClick={() => handleFeedback(msg.id, 'down')}
                              className={`p-1.5 rounded transition-colors ${
                                feedback === 'down'
                                  ? 'bg-red-50 text-red-600'
                                  : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                              }`}
                            >
                              👎
                            </button>
                          </div>

                          {feedback && (
                            <span className="text-[10px] text-gray-400">
                              {feedback === 'up' ? '✓ Thanks!' : 'We\'ll improve!'}
                            </span>
                          )}

                          <span className="ml-auto text-[10px] text-gray-400">
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                      )}

                      {msg.type === 'user' && (
                        <span className="mt-1 block text-[10px] text-white/60 text-right">
                          {formatTime(msg.timestamp)}
                        </span>
                      )}
                    </div>
                  </div>

                  {msg.type === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 flex-shrink-0 mt-1 text-xs font-bold">
                      U
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0 mt-1 text-xs font-bold">
                AI
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0s' }} />
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div className="flex justify-center px-2">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 max-w-md w-full">
                <p className="text-red-600 text-sm">⚠️ {state.error?.message || 'Something went wrong.'}</p>
                {state.error?.retryable && (
                  <Button variant="primary" size="sm" className="mt-2" onClick={retry}>
                    Retry
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Follow-up Suggestions */}
          {!isLoading && messages.length > 0 && !isError && (
            <div className="flex flex-wrap gap-2 justify-center mt-4 pt-2">
              {followUpSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleFollowUp(suggestion)}
                  className="text-xs px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* INPUT AREA */}
        <form className="flex flex-col sm:flex-row gap-2 p-3 sm:p-4 border-t border-gray-200 bg-white flex-shrink-0">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 disabled:opacity-50 transition-all min-h-[44px] max-h-[120px] bg-gray-50 placeholder:text-gray-400"
            style={{ height: 'auto' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            disabled={!inputValue.trim() || isLoading}
            className="min-h-[44px] px-5 sm:px-6 rounded-xl font-medium flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:shadow-none"
          >
            <span>Send</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </Button>
        </form>
      </div>

      {/* Context Drawer */}
      <ContextDrawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={selectSession}
        onDeleteSession={deleteSession}
        onCreateSession={createNewSession}
        currentContextTokens={currentContextTokens}
      />
    </>
  );
};