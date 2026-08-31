"use client";

import { useState } from "react";

import DataSourceCard from "./DataSourceCard";

import { dataSources } from "@/data/onboarding";
import { DataSource } from "@/types/onboarding";

export default function DataSourceConnector() {
  const [sources, setSources] =
    useState<DataSource[]>(dataSources);

  const handleConnect = (id: string) => {
    setSources((prev) =>
      prev.map((source) =>
        source.id === id
          ? { ...source, connected: true }
          : source
      )
    );
  };

  const connectedCount = sources.filter(
    (source) => source.connected
  ).length;

  return (
    <section className="card p-8">

      {/* Header */}

      <div className="mb-8">

        <h2 className="text-2xl font-semibold">
          Connect Data Sources
        </h2>

        <p className="mt-2 text-gray-400">
          Connect the platforms OBA will use to build organizational intelligence.
        </p>

      </div>

      {/* Progress */}

      <div className="mb-8 flex items-center justify-between rounded-xl border border-white/10 bg-white/0.03 px-5 py-4">

        <div>

          <p className="text-sm text-gray-400">
            Connected Platforms
          </p>

          <h3 className="mt-1 text-xl font-semibold">
            {connectedCount} / {sources.length}
          </h3>

        </div>

        <div className="h-2 w-48 overflow-hidden rounded-full bg-white/10">

          <div
            className="h-full rounded-full bg-cyan-400 transition-all duration-500"
            style={{
              width: `${(connectedCount / sources.length) * 100}%`,
            }}
          />

        </div>

      </div>

      {/* Cards */}

      <div className="grid gap-6 md:grid-cols-2">

        {sources.map((source) => (
          <DataSourceCard
            key={source.id}
            source={source}
            onConnect={handleConnect}
          />
        ))}

      </div>

    </section>
  );
}