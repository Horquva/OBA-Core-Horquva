import React, { useEffect, useState } from "react";
import { Save, Plus } from "lucide-react";
import { api } from "../../api/client";
import { useAltair } from "../../context/AltairContext";
import { ViewHead } from "../../components/ui/ViewHead";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";

export function WorkflowBuilderView({ id, navigate }) {
  const { workflows, can } = useAltair();
  const existing = workflows.find((w) => w.id === id) || workflows[0];
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!existing) return;
    setForm({
      ...existing,
      trigger: { ...existing.trigger },
      approval: { ...existing.approval },
      steps: [...existing.steps],
    });
  }, [existing?.id]);

  if (!can("workflow:write")) return <EmptyState title="Unauthorized" body="Your role cannot create or publish workflow versions." />;
  if (!form) return <EmptyState title="Workflow not found" body="Select a workflow before opening the builder." />;

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const parts = form.version.split(".").map(Number);
      const nextVersion = `${parts[0]}.${parts[1]}.${(parts[2] || 0) + 1}`;
      const result = await api.createWorkflowVersion(form.id, form, nextVersion);
      setForm(result.workflow);
      setMessage(`Published version ${result.version}.`);
    } catch (error) {
      setMessage(error.message || "Unable to publish version.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="view narrow">
      <ViewHead title="Workflow Builder" subtitle="Edit a governed workflow definition and publish a new version." />

      <Panel title="Identity">
        <div className="form-grid">
          <label className="form-field"><span>Name</span><input value={form.name} onChange={(e) => setField("name", e.target.value)} /></label>
          <label className="form-field"><span>Category</span><input value={form.category} onChange={(e) => setField("category", e.target.value)} /></label>
          <label className="form-field"><span>Trigger type</span><input value={form.trigger.type} onChange={(e) => setForm((x) => ({ ...x, trigger: { ...x.trigger, type: e.target.value } }))} /></label>
          <label className="form-field"><span>Trigger source</span><input value={form.trigger.source} onChange={(e) => setForm((x) => ({ ...x, trigger: { ...x.trigger, source: e.target.value } }))} /></label>
        </div>
        <label className="form-field"><span>Description</span><textarea value={form.description} onChange={(e) => setField("description", e.target.value)} /></label>
      </Panel>

      <Panel title="Steps" subtitle="One processing or execution step per row." right={<Button size="sm" variant="ghost" icon={Plus} onClick={() => setForm((x) => ({ ...x, steps: [...x.steps, { id: `s-${Date.now()}`, name: "New workflow step", phase: "processing" }] }))}>Add step</Button>}>
        <div className="builder-steps">
          {form.steps.map((step, index) => (
            <div className="builder-step" key={`${step.id}-${index}`}>
              <span className="mono">{index + 1}</span>
              <input value={step.name} onChange={(e) => setForm((x) => ({ ...x, steps: x.steps.map((s, i) => i === index ? { ...s, name: e.target.value } : s) }))} />
              <select value={step.phase} onChange={(e) => setForm((x) => ({ ...x, steps: x.steps.map((s, i) => i === index ? { ...s, phase: e.target.value } : s) }))}>
                <option value="processing">Processing</option>
                <option value="execution">Execution</option>
              </select>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Governance">
        <label className="confirm-row">
          <input type="checkbox" checked={form.approval.required} onChange={(e) => setForm((x) => ({ ...x, approval: { ...x.approval, required: e.target.checked } }))} />
          Approval required
        </label>
        {form.approval.required && (
          <label className="form-field">
            <span>Approver role</span>
            <input value={form.approval.approverRole || ""} onChange={(e) => setForm((x) => ({ ...x, approval: { ...x.approval, approverRole: e.target.value } }))} />
          </label>
        )}
      </Panel>

      {message && <p className="muted" role="status">{message}</p>}

      <div className="initiate-actions">
        <Button variant="ghost" onClick={() => navigate("workflow", form.id)}>Cancel</Button>
        <Button variant="primary" icon={Save} disabled={saving} onClick={save}>{saving ? "Publishing…" : "Publish new version"}</Button>
      </div>
    </div>
  );
}
