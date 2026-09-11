import React, { useState } from "react";
import { Search, Plus } from "lucide-react";
import { useAltair } from "../../context/AltairContext";
import { CATEGORIES } from "../../domain/categories";
import { ViewHead } from "../../components/ui/ViewHead";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { WorkflowCard } from "../../components/workflow/WorkflowCard";

export function CatalogView({ navigate, filters }) {
  const { workflows } = useAltair();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState(filters?.category || "all");

  const filtered = workflows.filter((w) => {
    const matchesQ = !q || w.name.toLowerCase().includes(q.toLowerCase()) || w.description.toLowerCase().includes(q.toLowerCase());
    const matchesCat = cat === "all" || w.category === cat;
    return matchesQ && matchesCat;
  });

  return (
    <div className="view">
      <ViewHead title="Workflow Catalog" subtitle="Browse governed engineering workflows and their ownership, triggers, and approval requirements." right={<Button variant="primary" icon={Plus} onClick={() => navigate("builder", "new")}>Open builder</Button>} />

      <div className="toolbar">
        <div className="search-box">
          <Search size={14} />
          <input placeholder="Search workflows…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search workflows" />
        </div>
        <div className="chip-row" role="tablist" aria-label="Filter by category">
          <button className={`chip ${cat === "all" ? "active" : ""}`} onClick={() => setCat("all")}>All</button>
          {Object.entries(CATEGORIES).map(([key, label]) => (
            <button key={key} className={`chip ${cat === key ? "active" : ""}`} onClick={() => setCat(key)}>{label}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No workflows match" body="Try a different search term or clear the category filter." />
      ) : (
        <div className="catalog-grid">
          {filtered.map((w) => (
            <WorkflowCard key={w.id} workflow={w} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
}
