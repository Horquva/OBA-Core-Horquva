interface VoiceIntentResolverProps {
  transcript?: string;
  intent?: string;
  action?: string;
  workflowId?: string;
  confidence?: string;
}

export default function VoiceIntentResolver({
  transcript = "No voice command yet.",
  intent = "-",
  action = "-",
  workflowId = "-",
  confidence = "-",
}: VoiceIntentResolverProps) {
  return (
    <section className="card p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
        Voice Intent Resolver
      </h3>

      <div className="mt-5 space-y-4">

        {/* Transcript */}
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">
            Transcript
          </p>

          <p className="mt-1 text-sm text-gray-300">
            {transcript}
          </p>
        </div>

        {/* Details */}
        <div className="grid gap-4 md:grid-cols-2">

          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Intent
            </p>

            <p className="mt-1 text-sm text-white">
              {intent}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Action
            </p>

            <p className="mt-1 text-sm text-white">
              {action}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Workflow
            </p>

            <p className="mt-1 text-sm text-white">
              {workflowId}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Confidence
            </p>

            <p className="mt-1 text-sm text-white">
              {confidence}
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}