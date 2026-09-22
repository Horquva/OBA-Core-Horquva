"use client";

import { useAgent } from "./AgentProvider";
import { AgentMessage } from "./AgentMessage";
import { AgentComposer } from "./AgentComposer";
import { ToolStatusLine } from "./ToolStatusLine";
import { EmptyState } from "./EmptyState";

function ConversationBody() {
  const { state } = useAgent();
  const { messages, isStreaming, currentStream } = state;

  const runningTool = currentStream?.toolCalls.find(
    (tc) => tc.status === "running"
  );

  const isEmpty = messages.length === 0 && !isStreaming;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
      {isEmpty ? (
        <EmptyState />
      ) : (
        <>
          {messages.map((msg) => (
            <AgentMessage key={msg.id} message={msg} />
          ))}

          {isStreaming && currentStream && (
            <AgentMessage
              message={{ role: "assistant", content: currentStream.text }}
            />
          )}

          {runningTool && <ToolStatusLine label={runningTool.label} />}
        </>
      )}
    </div>
  );
}

// AgentPanel is mounted at two fixed points that never remount across
// navigation (D-77): AppShell (`slot="shell"`, persists on every route) and
// app/page.tsx (`slot="route"`, only present while the route is `/`). Both
// read the same AgentProvider context, so the conversation itself never
// resets -- only which slot is visible changes. Each slot renders exactly
// one of the three presentations so the two mounts never draw on top of
// each other: "shell" owns the collapsed pill and the docked panel, "route"
// owns the fullscreen column.
export default function AgentPanel({ slot = "shell" }: { slot?: "shell" | "route" }) {
  const { state } = useAgent();
  const { mode, isCollapsed, messages } = state;

  if (isCollapsed) {
    if (slot !== "shell") return null;

    const lastMessage = messages[messages.length - 1];
    return (
      <div
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          borderRadius: "9999px",
          padding: "12px 20px",
          maxWidth: "300px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {lastMessage ? lastMessage.content : "Agent"}
      </div>
    );
  }

  if (mode === "fullscreen") {
    if (slot !== "route") return null;

    return (
      <div
        style={{
          width: "760px",
          margin: "0 auto",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <ConversationBody />
        <AgentComposer />
      </div>
    );
  }

  // Docked mode
  if (slot !== "shell") return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: "400px",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <ConversationBody />
      <AgentComposer />
    </div>
  );
}