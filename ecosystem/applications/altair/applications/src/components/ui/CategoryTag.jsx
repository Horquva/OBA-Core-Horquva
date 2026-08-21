import React from "react";
import { Layers } from "lucide-react";
import { CATEGORIES, CATEGORY_ICON } from "../../domain/categories";

export function CategoryTag({ category }) {
  const Icon = CATEGORY_ICON[category] || Layers;
  return (
    <span className="cat-tag">
      <Icon size={12} />
      {CATEGORIES[category]}
    </span>
  );
}
