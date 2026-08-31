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
      className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
    >
      {options.map((item) => (
        <option
          key={item}
          value={item}
        >
          {item}
        </option>
      ))}
    </select>
  );
}