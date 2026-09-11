import React, { useState } from "react";
import { Play, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAltair } from "../../context/AltairContext";
import { sampleInputValue } from "../../data/executions";
import { ViewHead } from "../../components/ui/ViewHead";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";

export function InitiateView({ id, navigate }) {
  const { getWorkflow, initiateWorkflow } = useAltair();
  const wf = getWorkflow(id);
  const [values, setValues] = useState({});
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!wf) return <EmptyState title="Workflow not found" body="This workflow may have been removed or renamed." />;

  function setVal(name, v) {
    setValues((s) => ({ ...s, [name]: v }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  }

  function validate() {
    const errs = {};
    wf.inputs.required.forEach((inp) => {
      if (!values[inp.name] || String(values[inp.name]).trim() === "") errs[inp.name] = "Required";
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function submit() {
    if (!validate() || !confirmed) return;
    const inputs = { ...values };
    wf.inputs.required.forEach((inp) => { if (!(inp.name in inputs)) inputs[inp.name] = sampleInputValue(inp); });
    setSubmitting(true);
    try {
      const result = await initiateWorkflow(id, inputs, crypto.randomUUID());
      setSubmitted(result.executionId);
    } catch (error) {
      setErrors({ _form: error.message || "Unable to initiate workflow." });
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="view narrow">
        <Panel>
          <div className="submitted">
            <CheckCircle2 size={28} className="tone-green-fg" />
            <h3>Workflow initiated</h3>
            <p className="muted">
              <span className="mono">{submitted}</span> was created for <strong>{wf.name}</strong> and is now queued.
              {wf.approval.required && " It will pause for approval before execution."}
            </p>
            <div className="submitted-actions">
              <Button variant="primary" onClick={() => navigate("execution", submitted)}>Watch execution</Button>
              <Button variant="ghost" onClick={() => navigate("workflow", id)}>Back to workflow</Button>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="view narrow">
      <ViewHead title={`Initiate — ${wf.name}`} subtitle="Review the workflow, provide inputs, and confirm before it starts." />

      <Panel title="What this does">
        <p>{wf.description}</p>
        <p className="label-caps">Preconditions</p>
        <ul className="check-list">
          {wf.trigger.preconditions.map((p, i) => <li key={i}><CheckCircle2 size={13} />{p}</li>)}
        </ul>
      </Panel>

      <Panel title="Inputs">
        <div className="form-grid">
          {wf.inputs.required.map((inp) => (
            <label key={inp.name} className="form-field">
              <span>{inp.name} <em>· required</em></span>
              <input
                value={values[inp.name] || ""}
                onChange={(e) => setVal(inp.name, e.target.value)}
                placeholder={String(sampleInputValue(inp))}
                aria-invalid={!!errors[inp.name]}
                aria-describedby={errors[inp.name] ? `err-${inp.name}` : undefined}
              />
              <span className="field-hint">{inp.desc}</span>
              {errors[inp.name] && <span id={`err-${inp.name}`} className="field-error"><AlertTriangle size={12} /> {errors[inp.name]}</span>}
            </label>
          ))}
          {wf.inputs.optional.map((inp) => (
            <label key={inp.name} className="form-field">
              <span>{inp.name} <em>· optional</em></span>
              <input value={values[inp.name] || ""} onChange={(e) => setVal(inp.name, e.target.value)} placeholder={String(sampleInputValue(inp))} />
              <span className="field-hint">{inp.desc}</span>
            </label>
          ))}
        </div>
      </Panel>

      <Panel title="Approval &amp; consequences">
        <div className={`consequence-box ${wf.approval.protected ? "protected" : ""}`}>
          {wf.approval.protected && <AlertTriangle size={16} />}
          <div>
            <p>
              {wf.approval.required
                ? `This workflow requires approval from a ${wf.approval.approverRole} before it executes. It will not proceed automatically.`
                : "This workflow does not require approval and will begin executing immediately once queued."}
            </p>
            {wf.approval.protected && <p className="tone-red-fg">This action is difficult to reverse once executed. Confirm the inputs above are correct.</p>}
          </div>
        </div>
        <label className="confirm-row">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          I've reviewed the inputs and understand what this workflow will do.
        </label>
      </Panel>

      {errors._form && <div className="field-error" role="alert"><AlertTriangle size={12} /> {errors._form}</div>}

      <div className="initiate-actions">
        <Button variant="ghost" onClick={() => navigate("workflow", id)}>Cancel</Button>
        <Button variant="primary" icon={Play} disabled={!confirmed || submitting} onClick={submit}>{submitting ? "Queueing…" : "Initiate workflow"}</Button>
      </div>
    </div>
  );
}
