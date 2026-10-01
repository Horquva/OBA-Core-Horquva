"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Zap } from "lucide-react";
import { fetchInventory } from "@/lib/api";
import { CanonicalEntity, EntityKind } from "@horquva/types";

const KINDS: Array<{ label: string; value: EntityKind | "all" }> = [
  { label: "All Assets", value: "all" },
  { label: "Automations", value: "automation" },
  { label: "People", value: "person" },
  { label: "Credentials", value: "credential" },
  { label: "Models", value: "model" },
  { label: "Apps", value: "app" },
];

const fallbackEntities: CanonicalEntity[] = [
  {
    id: "automation:n8n:101",
    kind: "automation",
    name: "Billing Sync to Stripe",
    description: "n8n Active: true",
    externalRefs: { n8n: "101" },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "automation:n8n:102",
    kind: "automation",
    name: "Payroll Batch Trigger",
    description: "n8n Active: true",
    externalRefs: { n8n: "102" },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "person:omar@acme.com",
    kind: "person",
    name: "Omar Farooq",
    description: "VP of Operations",
    externalRefs: { email: "omar@acme.com" },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "person:maya@acme.com",
    kind: "person",
    name: "Maya Lin",
    description: "Lead Automation Engineer",
    externalRefs: { email: "maya@acme.com" },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "model:openai:gpt-4o",
    kind: "model",
    name: "OpenAI GPT-4o",
    description: "Vendor: openai",
    externalRefs: { vendor: "openai" },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export default function InventoryPage() {
  const [entities, setEntities] = useState<CanonicalEntity[]>([]);
  const [selectedKind, setSelectedKind] = useState<EntityKind | "all">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchInventory(selectedKind === "all" ? undefined : selectedKind)
      .then((data) => {
        if (active) {
          setEntities(data.entities);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setEntities(fallbackEntities);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [selectedKind]);

  const filtered = entities.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.id.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Continuity Asset Inventory
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Catalog of all tracked people, workflows, personal credentials, and AI models across integrated tools.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
          {KINDS.map((k) => (
            <button
              key={k.value}
              onClick={() => setSelectedKind(k.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                selectedKind === k.value
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or ID..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Kind</th>
                <th className="py-3 px-4">Canonical ID</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    Loading inventory...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    No assets found matching the criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900 dark:text-white">{item.name}</div>
                      {item.description && (
                        <div className="text-xs text-slate-500 truncate max-w-md">{item.description}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="capitalize px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {item.kind}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-500">{item.id}</td>
                    <td className="py-3.5 px-4 text-right">
                      {item.kind === "person" ? (
                        <Link
                          href={`/simulation?leaver=${encodeURIComponent(item.id)}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors"
                        >
                          <Zap className="w-3 h-3 text-amber-500" />
                          <span>Simulate Departure</span>
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400">Tracked</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
