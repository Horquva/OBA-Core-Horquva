import React, { useState } from 'react';
import './FilterPanel.css';

/**
 * FilterPanel Component
 * Faceted filtering for search results
 * Supports category, status, and date range filters
 * 
 * @component
 * @example
 * <FilterPanel 
 *   onFilterChange={(filters) => {}}
 *   categories={['Standards', 'Playbooks']}
 * />
 */
const FilterPanel = ({
  categories = ['Standards', 'Best Practices', 'Playbooks', 'Runbooks', 'Lessons Learned', 'ADRs'],
  statuses = ['Approved', 'Draft', 'Deprecated'],
  onFilterChange = () => {},
}) => {
  const [expanded, setExpanded] = useState({
    category: true,
    status: true,
  });

  const [filters, setFilters] = useState({
    categories: [],
    statuses: [],
  });

  const handleCategoryChange = (category) => {
    const updated = filters.categories.includes(category)
      ? filters.categories.filter((c) => c !== category)
      : [...filters.categories, category];

    const newFilters = { ...filters, categories: updated };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleStatusChange = (status) => {
    const updated = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];

    const newFilters = { ...filters, statuses: updated };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const toggleExpanded = (section) => {
    setExpanded((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const clearFilters = () => {
    const cleared = { categories: [], statuses: [] };
    setFilters(cleared);
    onFilterChange(cleared);
  };

  const activeFilterCount = filters.categories.length + filters.statuses.length;

  return (
    <aside className="filter-panel">
      <div className="filter-panel__header">
        <h2 className="filter-panel__title">Filters</h2>
        {activeFilterCount > 0 && (
          <button
            className="filter-panel__clear"
            onClick={clearFilters}
            aria-label="Clear all filters"
          >
            Clear ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Category Filter */}
      <fieldset className="filter-panel__group">
        <button
          className="filter-panel__toggle"
          onClick={() => toggleExpanded('category')}
          aria-expanded={expanded.category}
        >
          <span>Category</span>
          <span className="filter-panel__toggle-icon">
            {expanded.category ? '−' : '+'}
          </span>
        </button>

        {expanded.category && (
          <div className="filter-panel__options">
            {categories.map((category) => (
              <label key={category} className="filter-panel__option">
                <input
                  type="checkbox"
                  checked={filters.categories.includes(category)}
                  onChange={() => handleCategoryChange(category)}
                  className="filter-panel__checkbox"
                />
                <span className="filter-panel__label">{category}</span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      {/* Status Filter */}
      <fieldset className="filter-panel__group">
        <button
          className="filter-panel__toggle"
          onClick={() => toggleExpanded('status')}
          aria-expanded={expanded.status}
        >
          <span>Status</span>
          <span className="filter-panel__toggle-icon">
            {expanded.status ? '−' : '+'}
          </span>
        </button>

        {expanded.status && (
          <div className="filter-panel__options">
            {statuses.map((status) => (
              <label key={status} className="filter-panel__option">
                <input
                  type="checkbox"
                  checked={filters.statuses.includes(status)}
                  onChange={() => handleStatusChange(status)}
                  className="filter-panel__checkbox"
                />
                <span className="filter-panel__label">{status}</span>
              </label>
            ))}
          </div>
        )}
      </fieldset>
    </aside>
  );
};

export default FilterPanel;
