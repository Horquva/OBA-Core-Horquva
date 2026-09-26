"use client";

import { useEffect, useRef } from "react";
import { useAgent } from "./AgentProvider";
import { AgentMessage } from "./AgentMessage";
import { AgentComposer } from "./AgentComposer";
import { ToolStatusLine } from "./ToolStatusLine";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { EmptyState } from "./EmptyState";
import { ConversationHistory } from "./ConversationHistory";

// Matches Sidebar.tsx's own fixed width -- the agent takes over everything
// to the right of it, not the whole viewport, so the app's own navigation
// stays reachable while on this page.
const SIDEBAR_WIDTH = 260;

function ConversationBody() {
  const { state } = useAgent();
  const { messages, isStreaming, currentStream, error } = state;
  const bottomRef = useRef<HTMLDivElement>(null);

  const runningTool = currentStream?.toolCalls.find(
    (tc) => tc.status === "running"
  );
  // Streaming has started (the request is in flight, tokens may arrive any
  // moment) but nothing visible exists yet -- no tool announced itself and
  // no text has landed. Without an explicit "thinking" state this gap shows
  // nothing at all and the agent looks stalled.
  const isThinking = isStreaming && !runningTool && !currentStream?.text;

  const isEmpty = messages.length === 0 && !isStreaming && !error;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, currentStream?.text, runningTool?.status, isThinking, error]);

  if (isEmpty) {
    return (
      <div className="flex-1 overflow-y-auto">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[720px] px-6 py-8">
        {messages.map((msg) => (
          <AgentMessage key={msg.id} message={msg} />
        ))}

        {isStreaming && currentStream && currentStream.text && (
          <AgentMessage
            message={{ role: "assistant", content: currentStream.text }}
          />
        )}

        {runningTool && <ToolStatusLine label={runningTool.label} />}

        {isThinking && <ThinkingIndicator />}

        {!isStreaming && error && (
          <div className="mt-3 rounded-[10px] border border-[var(--risk-critical-border)] bg-[var(--risk-critical-bg)] px-3.5 py-2.5 text-[13px] text-[var(--risk-critical-text)]">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

export default function AgentPanel() {
  return (
    <div
      className="fixed top-0 bottom-0 right-0 z-10 flex bg-[var(--bg-base)]"
      style={{ left: SIDEBAR_WIDTH }}
    >
      <ConversationHistory />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 flex-shrink-0 items-center border-b border-[var(--border-subtle)] px-5">
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            OBA Agent
          </span>
        </div>
        <ConversationBody />
        <div className="flex-shrink-0 px-6 pb-6 pt-2">
          <div className="mx-auto w-full max-w-[720px]">
            <AgentComposer />
          </div>
        </div>
      </div>
    </div>
  );
}
