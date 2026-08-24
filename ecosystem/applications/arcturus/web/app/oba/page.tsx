import AvatarChatPanel from "@/components/avatar/AvatarChatPanel";

export default function OBAPage() {
  return (
    <main className="space-y-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white tracking-wide">
          Intelligence Console
        </h1>
        <p className="mt-2 text-gray-400">
          Your conversational command center for organizational awareness.
        </p>
      </div>

      <AvatarChatPanel />
    </main>
  );
}
