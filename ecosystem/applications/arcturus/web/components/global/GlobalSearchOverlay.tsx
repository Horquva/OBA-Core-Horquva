"use client";

import { useState, useEffect } from "react";
import { Search, X, Workflow, Users, Bot, GitFork } from "lucide-react";
import { useGlobalPanels } from "./GlobalPanelsContext";
import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Mock data leveraging A1 Ontology + A6 concept
const MOCK_RESULTS = [
  { id: "1", title: "Payroll Processing", type: "Workflow", category: "Finance", icon: Workflow, url: "/workflows" },
  { id: "2", title: "Sarah Jenkins (Payroll Lead)", type: "Person", category: "HR", icon: Users, url: "/ownership" },
  { id: "3", title: "Payroll Anomaly Agent", type: "Agent", category: "AI Tools", icon: Bot, url: "/ai-tools" },
  { id: "4", title: "Payroll DB Dependency", type: "System", category: "Infrastructure", icon: GitFork, url: "/map" }
];

export default function GlobalSearchOverlay() {
  const { isSearchOpen, toggleSearch } = useGlobalPanels();
  const [query, setQuery] = useState("");
  const router = useRouter();

  // Keyboard shortcut listener (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggleSearch();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSearch]);

  const results = query.length > 0
    ? MOCK_RESULTS.filter(r => r.title.toLowerCase().includes(query.toLowerCase()) || r.type.toLowerCase().includes(query.toLowerCase()))
    : [];

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 sm:pt-24">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={toggleSearch}
      />
      
      {/* Search Panel */}
      <div 
        className="relative z-50 w-full max-w-2xl transform overflow-hidden rounded-2xl bg-[#131326] transition-all"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center px-4 py-3 border-b border-white/10 bg-[#131326]">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            type="text"
            className="flex-1 bg-transparent border-0 px-4 py-2 text-white placeholder-gray-500 !outline-none focus:!outline-none focus:!ring-0 focus:!border-transparent focus-visible:!outline-none focus-visible:!ring-0 !shadow-none text-lg"
            style={{ outline: 'none', boxShadow: 'none', border: 'none' }}
            placeholder="Search agents, workflows, people... (A1 Ontology)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button 
            onClick={toggleSearch}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Results Body */}
        {query.length > 0 && (
          <div className="max-h-96 overflow-y-auto p-2 bg-[#131326]">
            {results.length > 0 ? (
              <ul className="space-y-1">
                {results.map((result) => {
                  const Icon = result.icon;
                  return (
                    <li key={result.id}>
                      <button
                        onClick={() => {
                          toggleSearch();
                          router.push(result.url);
                        }}
                        className="w-full flex justify-between items-center px-4 py-3 text-left rounded-xl hover:bg-white/5 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 group-hover:bg-white/10 transition-colors">
                            <Icon size={18} className="text-gray-400 group-hover:text-white" />
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">{result.title}</p>
                            <p className="text-xs text-gray-500 flex gap-2">
                              <span>{result.type}</span>
                              <span>•</span>
                              <span>{result.category}</span>
                            </p>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="py-14 text-center text-sm text-gray-400 bg-[#131326]">
                <p>No results found for "{query}"</p>
                <p className="mt-2 text-xs text-gray-500">Try searching for "Payroll" or "Agent"</p>
              </div>
            )}
          </div>
        )}

        {/* Footer Hints */}
        {query.length === 0 && (
          <div className="px-4 py-6 text-center border-t border-white/5 bg-[#131326]">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Entity Resolver Active</p>
            <p className="text-sm text-gray-400 mt-2">Type "Payroll" to see role-aware entity mapping.</p>
          </div>
        )}
      </div>
    </div>
  );
}
