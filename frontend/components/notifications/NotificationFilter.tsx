"use client";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const options = [
  "All",
  "Critical",
  "High",
  "Medium",
  "Low",
];

export default function SeverityFilter({
  value,
  onChange,
}: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)] px-4 py-3 outline-none focus:border-[var(--accent)] transition-colors"
    >
      {options.map((item) => (
        <option
          key={item}
          value={item}
          className="bg-[var(--bg-surface)] text-[var(--text-primary)]"
        >
          {item}
        </option>
      ))}
    </select>
  );
}