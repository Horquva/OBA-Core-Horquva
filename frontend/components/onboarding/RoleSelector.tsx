"use client";

import { useState } from "react";

import RoleCard from "./RoleCard";

import { roles } from "@/data/role";

export default function RoleSelector() {
  const [selectedRole, setSelectedRole] =
    useState("executive");

  return (
    <section className="card p-8">

      <div className="mb-8">

        <h2 className="text-2xl font-semibold">
          Select Your Role
        </h2>

        <p className="mt-2 text-gray-400">
          Choose your organizational role to personalize your
          dashboard and OBA experience.
        </p>

      </div>

      <div className="grid gap-6 lg:grid-cols-3">

        {roles.map((role) => (
          <RoleCard
            key={role.id}
            role={role}
            selected={selectedRole === role.id}
            onSelect={setSelectedRole}
          />
        ))}

      </div>

    </section>
  );
}