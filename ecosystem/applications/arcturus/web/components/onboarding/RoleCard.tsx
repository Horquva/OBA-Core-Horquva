"use client";

import {
  Crown,
  Users,
  BarChart3,
  CheckCircle2,
} from "lucide-react";

import { Role } from "@/types/onboarding";

interface RoleCardProps {
  role: Role;
  selected: boolean;
  onSelect: (id: string) => void;
}

export default function RoleCard({
  role,
  selected,
  onSelect,
}: RoleCardProps) {
  const getIcon = () => {
    switch (role.icon) {
      case "executive":
        return <Crown className="h-8 w-8 text-cyan-400" />;

      case "department":
        return <Users className="h-8 w-8 text-cyan-400" />;

      case "analyst":
        return <BarChart3 className="h-8 w-8 text-cyan-400" />;
    }
  };

  return (
    <button
      onClick={() => onSelect(role.id)}
      className={`w-full rounded-xl border p-6 text-left transition-all duration-300
      ${
        selected
          ? "border-cyan-500 bg-cyan-500/10 shadow-[0_0_25px_rgba(34,211,238,0.15)]"
          : "border-white/10 bg-white/3 hover:border-cyan-500/30 hover:bg-white/5"
      }`}
    >
      <div className="flex items-start justify-between">

        <div className="space-y-5">

          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-black/20">
            {getIcon()}
          </div>

          <div>

            <h3 className="text-xl font-semibold">
              {role.title}
            </h3>

            <p className="mt-3 text-sm leading-6 text-gray-400">
              {role.description}
            </p>

          </div>

        </div>

        {selected && (
          <CheckCircle2 className="h-6 w-6 text-cyan-400" />
        )}

      </div>
    </button>
  );
}