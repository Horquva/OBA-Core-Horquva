"use client";

import { Building2, Briefcase, Users } from "lucide-react";

export default function OrgSetupStep() {
  return (
    <div className="space-y-8">

      {/* Title */}

      <div>
        <h3 className="text-2xl font-semibold">
          Organization Setup
        </h3>

        <p className="mt-2 text-gray-400">
          Tell OBA about your organization so it can personalize your
          intelligence workspace.
        </p>
      </div>

      {/* Form */}

      <div className="grid gap-6 md:grid-cols-2">

        {/* Organization Name */}

        <div className="space-y-2">

          <label className="text-sm text-gray-300">
            Organization Name
          </label>

          <div
  className="
    group
    flex
    items-center
    gap-3
    rounded-xl
    border
    border-white/10
    bg-white/5
    px-4
    py-3
    transition-all
    duration-300
    hover:border-cyan-500/30
    hover:bg-white/7
    hover:shadow-[0_0_20px_rgba(34,211,238,0.08)]
    focus-within:border-cyan-500/40
    focus-within:bg-white/7
    focus-within:shadow-[0_0_25px_rgba(34,211,238,0.12)]
  "
>

            <Building2 className="h-5 w-5 text-cyan-400" />

           <input
  type="text"
  placeholder="Horquva AI"
  style={{
    outline: "none",
    boxShadow: "none",
  }}
  className="w-full bg-transparent text-white placeholder:text-gray-500"
/>
          </div>

        </div>

        {/* Industry */}

        <div className="space-y-2">

          <label className="text-sm text-gray-300">
            Industry
          </label>

         <div
  className="
    group
    flex
    items-center
    gap-3
    rounded-xl
    border
    border-white/10
    bg-white/5
    px-4
    py-3
    transition-all
    duration-300
    hover:border-cyan-500/30
    hover:bg-white/7
    hover:shadow-[0_0_20px_rgba(34,211,238,0.08)]
    focus-within:border-cyan-500/40
    focus-within:bg-white/7
    focus-within:shadow-[0_0_25px_rgba(34,211,238,0.12)]
  "
>

            <Briefcase className="h-5 w-5 text-cyan-400" />

            <select  style={{
    outline: "none",
    boxShadow: "none",
  }}
  className="
    w-full
    bg-transparent
    text-white
  "
>

              <option className="bg-[#111827]">
                Technology
              </option>

              <option className="bg-[#111827]">
                Finance
              </option>

              <option className="bg-[#111827]">
                Healthcare
              </option>

              <option className="bg-[#111827]">
                Education
              </option>

              <option className="bg-[#111827]">
                Manufacturing
              </option>

            </select>

          </div>

        </div>

        {/* Employees */}

        <div className="space-y-2">

          <label className="text-sm text-gray-300">
            Team Size
          </label>

          <div
  className="
    group
    flex
    items-center
    gap-3
    rounded-xl
    border
    border-white/10
    bg-white/5
    px-4
    py-3
    transition-all
    duration-300
    hover:border-cyan-500/30
    hover:bg-white/7
    hover:shadow-[0_0_20px_rgba(34,211,238,0.08)]
    focus-within:border-cyan-500/40
    focus-within:bg-white/7
    focus-within:shadow-[0_0_25px_rgba(34,211,238,0.12)]
  "
>

            <Users className="h-5 w-5 text-cyan-400" />

           <input
 type="number"
              placeholder="120"
   style={{
    outline: "none",
    boxShadow: "none",
  }}
  className="
    w-full
    bg-transparent
    text-white
    placeholder:text-gray-500
    outline-none
    focus:outline-none
  "
/>

          </div>

        </div>

        {/* Department */}

        <div className="space-y-2">

          <label className="text-sm text-gray-300">
            Departments
          </label>

          <div
  className="
    group
    flex
    items-center
    gap-3
    rounded-xl
    border
    border-white/10
    bg-white/5
    px-4
    py-3
    transition-all
    duration-300
    hover:border-cyan-500/30
    hover:bg-white/7
    hover:shadow-[0_0_20px_rgba(34,211,238,0.08)]
    focus-within:border-cyan-500/40
    focus-within:bg-white/7
    focus-within:shadow-[0_0_25px_rgba(34,211,238,0.12)]
  "
>

            <Building2 className="h-5 w-5 text-cyan-400" />

           <input
  type="number"
              placeholder="8"
   style={{
    outline: "none",
    boxShadow: "none",
  }}
  className="
    w-full
    bg-transparent
    text-white
    placeholder:text-gray-500
    outline-none
    focus:outline-none
  "
/>

          </div>

        </div>

      </div>

      {/* Footer Note */}

      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">

        <p className="text-sm text-cyan-300">
          This information helps OBA create a role-aware organizational
          context and personalize your Command Center.
        </p>

      </div>

    </div>
  );
}