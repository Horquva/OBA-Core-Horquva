export type ConversationStatus = string;
export interface ConversationState { status: string; error?: { code?: string; message: string; retryable?: boolean; } | null; [key: string]: any; }
export type AIResponseType = any;
export interface AIMessage { id: string; role?: any; content: string; timestamp?: any; type?: any; responseType?: any; isApproved?: boolean; isRejected?: boolean; [key: string]: any; }
export interface Message { id: string; role?: any; content: string; timestamp?: any; [key: string]: any; }
