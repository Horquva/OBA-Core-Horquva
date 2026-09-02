"use client";

import React, { createContext, useContext, useReducer, ReactNode, useState, useEffect } from 'react';
import { ConversationState, AIMessage, AIResponseType } from '../types/ai.contracts';
import { useSessions, Session } from '../hooks/useSessions';

type AIAction =
  | { type: 'SUBMIT_REQUEST' }
  | { type: 'PROCESSING_START' }
  | { type: 'STREAMING_START' }
  | { type: 'RECEIVING_RESPONSE'; payload: { message: AIMessage } }
  | { type: 'COMPLETE' }
  | { type: 'SET_ERROR'; payload: { error: string; retryable: boolean } }
  | { type: 'RESET' }
  | { type: 'APPROVE_MESSAGE'; payload: { messageId: string } }
  | { type: 'REJECT_MESSAGE'; payload: { messageId: string } }
  | { type: 'LOAD_SESSION'; payload: { messages: AIMessage[]; sessionId: string } };

interface AIContextType {
  state: ConversationState;
  messages: AIMessage[];
  sessions: Session[];
  activeSessionId: string | null;
  submitMessage: (text: string) => void;
  retry: () => void;
  clearChat: () => void;
  approveMessage: (messageId: string) => void;
  rejectMessage: (messageId: string) => void;
  createNewSession: () => void;
  selectSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  isDrawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  currentContextTokens: string[];
}

const initialState: { state: ConversationState; messages: AIMessage[] } = {
  state: { status: 'IDLE' },
  messages: [],
};

const aiReducer = (state: typeof initialState, action: AIAction): typeof initialState => {
  switch (action.type) {
    case 'SUBMIT_REQUEST':
      return { ...state, state: { status: 'SUBMITTING' } };
    case 'PROCESSING_START':
      return { ...state, state: { status: 'PROCESSING' } };
    case 'STREAMING_START':
      return { ...state, state: { status: 'STREAMING' } };
    case 'RECEIVING_RESPONSE': {
      const newMessages = [...state.messages, action.payload.message];
      return { messages: newMessages, state: { status: 'COMPLETE' } };
    }
    case 'COMPLETE':
      return { ...state, state: { status: 'COMPLETE' } };
    case 'SET_ERROR':
      return { ...state, state: { status: 'ERROR', error: { code: '500', message: action.payload.error, retryable: action.payload.retryable } } };
    case 'RESET':
      return { ...state, state: { status: 'IDLE' }, messages: [] };
    case 'APPROVE_MESSAGE': {
      const updatedMessages = state.messages.map(msg =>
        msg.id === action.payload.messageId ? { ...msg, isApproved: true, isRejected: false } : msg
      );
      return { ...state, messages: updatedMessages };
    }
    case 'REJECT_MESSAGE': {
      const updatedMessages = state.messages.map(msg =>
        msg.id === action.payload.messageId ? { ...msg, isRejected: true, isApproved: false } : msg
      );
      return { ...state, messages: updatedMessages };
    }
    case 'LOAD_SESSION':
      return { ...state, messages: action.payload.messages, state: { status: 'COMPLETE' } };
    default:
      return state;
  }
};

// Mock AI response
const mockAIResponse = (userText: string): Promise<AIMessage> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (userText.toLowerCase().includes('error')) {
        reject(new Error('Simulated network failure'));
      } else {
        const responseTypes: AIResponseType[] = ['information', 'recommendation', 'explanation', 'action'];
        const randomType = responseTypes[Math.floor(Math.random() * responseTypes.length)];
        resolve({
          id: crypto.randomUUID(),
          type: 'assistant',
          content: `You said: "${userText}". This is a simulated AI ${randomType}.`,
          responseType: randomType,
          timestamp: new Date(),
          isApproved: false,
          isRejected: false,
        });
      }
    }, 2000);
  });
};

const AIContext = createContext<AIContextType | undefined>(undefined);

export const AIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(aiReducer, initialState);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [currentContextTokens] = useState<string[]>(['org-1', 'project-alpha']);

  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    createSession,
    deleteSession,
    updateSessionMessages,
    getActiveSession,
    setSessions,
  } = useSessions();

  // Load session when switching
  const loadSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      dispatch({ type: 'LOAD_SESSION', payload: { messages: session.messages, sessionId } });
      setActiveSessionId(sessionId);
    }
  };

  const submitMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: AIMessage = {
      id: crypto.randomUUID(),
      type: 'user',
      content: text,
      timestamp: new Date(),
    };
    dispatch({ type: 'RECEIVING_RESPONSE', payload: { message: userMsg } });
    dispatch({ type: 'SUBMIT_REQUEST' });

    try {
      dispatch({ type: 'PROCESSING_START' });
      await new Promise(resolve => setTimeout(resolve, 500));
      dispatch({ type: 'STREAMING_START' });
      await new Promise(resolve => setTimeout(resolve, 800));
      const aiMsg = await mockAIResponse(text);
      dispatch({ type: 'RECEIVING_RESPONSE', payload: { message: aiMsg } });
      dispatch({ type: 'COMPLETE' });

      // Update session with new messages
      const currentMessages = [...state.messages, userMsg, aiMsg];
      if (activeSessionId) {
        updateSessionMessages(activeSessionId, currentMessages);
      } else {
        // Create a new session if none exists
        const newId = createSession(text.substring(0, 30) + '...', currentContextTokens);
        updateSessionMessages(newId, currentMessages);
        setActiveSessionId(newId);
      }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: { error: (err as Error).message, retryable: true } });
    }
  };

  const retry = () => {
    const lastUserMessage = state.messages.filter(m => m.type === 'user').pop();
    if (lastUserMessage) {
      submitMessage(lastUserMessage.content);
    } else {
      dispatch({ type: 'RESET' });
    }
  };

  const clearChat = () => {
    dispatch({ type: 'RESET' });
    if (activeSessionId) {
      updateSessionMessages(activeSessionId, []);
    }
  };

  const approveMessage = (messageId: string) => {
    dispatch({ type: 'APPROVE_MESSAGE', payload: { messageId } });
  };

  const rejectMessage = (messageId: string) => {
    dispatch({ type: 'REJECT_MESSAGE', payload: { messageId } });
  };

  const createNewSession = () => {
    const newId = createSession('New Conversation', currentContextTokens);
    setActiveSessionId(newId);
    dispatch({ type: 'RESET' });
    setDrawerOpen(false);
  };

  const selectSession = (sessionId: string) => {
    loadSession(sessionId);
    setDrawerOpen(false);
  };

  const handleDeleteSession = (sessionId: string) => {
    deleteSession(sessionId);
    if (sessions.length <= 1) {
      dispatch({ type: 'RESET' });
    }
  };

  return (
    <AIContext.Provider
      value={{
        state: state.state,
        messages: state.messages,
        sessions,
        activeSessionId,
        submitMessage,
        retry,
        clearChat,
        approveMessage,
        rejectMessage,
        createNewSession,
        selectSession,
        deleteSession: handleDeleteSession,
        isDrawerOpen,
        setDrawerOpen,
        currentContextTokens,
      }}
    >
      {children}
    </AIContext.Provider>
  );
};

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) throw new Error('useAI must be used within AIProvider');
  return context;
};