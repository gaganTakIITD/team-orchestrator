import React from 'react';

const SORT_OPTIONS = {
  date_desc: { label: 'Newest first', key: 'date', dir: 'desc' },
  date_asc: { label: 'Oldest first', key: 'date', dir: 'asc' },
  score_desc: { label: 'Highest score', key: 'score', dir: 'desc' },
  score_asc: { label: 'Lowest score', key: 'score', dir: 'asc' },
  author_asc: { label: 'Author A–Z', key: 'author', dir: 'asc' },
  author_desc: { label: 'Author Z–A', key: 'author', dir: 'desc' },
  type_asc: { label: 'Type A–Z', key: 'type', dir: 'asc' },
};

export function FilterSortBar({
  sortKey,
  onSortChange,
  sortOptions = SORT_OPTIONS,
  filterOptions,
  filterValues = {},
  onFilterChange,
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange,
  showSearch = true,
  showFilters = true,
}) {
  return (
    <div className="filter-sort-bar">
      {showSearch && (
        <div className="filter-sort-search">
          <svg className="filter-sort-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="input input-sm"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={e => onSearchChange?.(e.target.value)}
          />
        </div>
      )}
      {showFilters && filterOptions && Object.keys(filterOptions).length > 0 && (
        <div className="filter-sort-filters">
          {Object.entries(filterOptions).map(([key, opts]) => (
            <select
              key={key}
              className="filter-sort-select"
              value={filterValues?.[key] ?? ''}
              onChange={e => onFilterChange?.(key, e.target.value)}
            >
              <option value="">All {key}</option>
              {opts.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ))}
        </div>
      )}
      <div className="filter-sort-sort">
        <select
          className="filter-sort-select"
          value={sortKey}
          onChange={e => onSortChange?.(e.target.value)}
        >
          {Object.entries(sortOptions).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
