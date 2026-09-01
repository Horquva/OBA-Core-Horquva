"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SectionHeader from "../../components/ui/SectionHeader";
import { Plus, Zap, AlertTriangle, X, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface ScenarioItem {
  id: string;
  name: string;
  domain: string;
  seed: number;
  duration: number;
  shock_type?: string;
  shock_tick?: number;
  description?: string;
}

export default function ScenariosPage() {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("Financial Services");
  const [seed, setSeed] = useState(42);
  const [duration, setDuration] = useState(50);
  const [shockType, setShockType] = useState("DEMAND_SPIKE");
  const [shockTick, setShockTick] = useState(15);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchScenarios();
  }, []);

  const fetchScenarios = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<ScenarioItem[]>("/api/v1/scenarios/list/detailed");
      setScenarios(data || []);
    } catch (err) {
      console.warn('[FALLBACK TRIGGERED] Scenarios: Failed to fetch /api/v1/scenarios/list/detailed from backend API. Diverting to default demo scenarios payload.', err);
      // Fallback
      setScenarios([
        { id: "SCN-RT-992", name: "High Market Volatility Stress Test", domain: "Financial Services", seed: 42, duration: 100, shock_type: "DEMAND_SPIKE", shock_tick: 20 },
        { id: "SCN-RT-401", name: "Global Freight Port Congestion", domain: "Supply Chain", seed: 101, duration: 250, shock_type: "SUPPLIER_FAILURE", shock_tick: 30 },
        { id: "SCN-RT-884", name: "Cyber Incident Infrastructure Failover", domain: "IT Operations", seed: 777, duration: 50, shock_type: "SYSTEM_OUTAGE", shock_tick: 10 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    try {
      setSubmitting(true);
      const newScn = await apiClient.post<ScenarioItem>("/api/v1/scenarios/custom", {
        name,
        domain,
        seed: Number(seed),
        duration: Number(duration),
        shock_type: shockType,
        shock_tick: Number(shockTick),
      });

      setScenarios(prev => [newScn, ...prev]);
      setModalOpen(false);
      setName("");
    } catch (err: any) {
      alert("Failed to create scenario: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLaunchScenario = async (scn: ScenarioItem) => {
    try {
      setLaunchingId(scn.id);
      
      // 1. Create experiment
      const expRes = await apiClient.post<any>("/api/v1/experiments", {
        name: `Exec: ${scn.name}`,
        description: `Running scenario ${scn.id} (${scn.domain}) with ${scn.shock_type || 'STANDARD'} shock profile.`,
        seed: scn.seed,
        config: {
          scenario_id: scn.id,
          duration_ticks: scn.duration,
          domain: scn.domain,
          shock_type: scn.shock_type,
          shock_tick: scn.shock_tick,
        },
      });

      const expId = expRes.id || expRes.experiment_id;

      // 2. Start simulation run
      await apiClient.post(`/api/v1/runtime/experiments/${expId}/start`, {
        global_seed: scn.seed,
        duration_ticks: scn.duration,
        tick_delay_seconds: 0.3,
      });

      // 3. Navigate to experiment live execution
      router.push(`/experiments/${expId}`);
    } catch (err: any) {
      alert("Failed to launch scenario: " + err.message);
    } finally {
      setLaunchingId(null);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <SectionHeader
        title="Scenario Engineering Workbench"
        description="Author custom digital twin shock conditions, stochastic parameters, and event injection profiles."
        action={
          <button
            onClick={() => setModalOpen(true)}
            className="bg-[var(--brand-primary)] text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition font-medium text-sm shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Author New Scenario
          </button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {scenarios.map((scn) => (
            <div key={scn.id} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5 shadow-sm space-y-4 hover:border-indigo-200 transition-colors">
              <div className="flex justify-between items-start">
                <span className="text-xs font-mono text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded font-bold">{scn.id}</span>
                <span className="text-xs text-slate-500 font-medium">{scn.domain}</span>
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">{scn.name}</h3>
              
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                <div><span className="text-slate-400">Global Seed:</span> <b className="font-mono text-slate-700 dark:text-slate-300">{scn.seed}</b></div>
                <div><span className="text-slate-400">Duration:</span> <b className="font-mono text-slate-700 dark:text-slate-300">{scn.duration} ticks</b></div>
                {scn.shock_type && scn.shock_type !== "NONE" && (
                  <div className="col-span-2 pt-1 border-t border-slate-200/50 flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Shock: <b>{scn.shock_type}</b> @ tick {scn.shock_tick || 10}</span>
                  </div>
                )}
              </div>

              <button
                disabled={launchingId === scn.id}
                onClick={() => handleLaunchScenario(scn)}
                className="w-full bg-[var(--brand-primary)] text-white py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {launchingId === scn.id ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Provisioning Run...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Launch Simulation</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Interactive Scenario Authoring Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100">Author Custom Scenario</h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateScenario} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Scenario Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Supply Chain Disruption & Port Strike"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Domain / Industry</label>
                  <select
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Financial Services">Financial Services</option>
                    <option value="Supply Chain">Supply Chain</option>
                    <option value="Healthcare Systems">Healthcare Systems</option>
                    <option value="IT Operations">IT Operations</option>
                    <option value="E-Commerce Logistics">E-Commerce Logistics</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Random Seed</label>
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(Number(e.target.value))}
                    className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Simulation Duration (Ticks)</label>
                  <input
                    type="number"
                    min="10"
                    max="500"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Scheduled Shock Event</label>
                  <select
                    value={shockType}
                    onChange={(e) => setShockType(e.target.value)}
                    className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="DEMAND_SPIKE">Demand Spike (1.4x)</option>
                    <option value="SUPPLIER_FAILURE">Supplier Failure</option>
                    <option value="SYSTEM_OUTAGE">System Outage</option>
                    <option value="KEY_RESIGNATION">Key Lead Resignation</option>
                    <option value="NONE">None (Baseline)</option>
                  </select>
                </div>
              </div>

              {shockType !== "NONE" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Shock Injected At Tick</label>
                  <input
                    type="number"
                    min="1"
                    max={duration - 1}
                    value={shockTick}
                    onChange={(e) => setShockTick(Number(e.target.value))}
                    className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Save Scenario</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
