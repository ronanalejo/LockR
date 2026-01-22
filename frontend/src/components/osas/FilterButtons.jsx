import React, { useState, useCallback } from "react";
import { debounce } from "lodash";
import "../../assets/css/filterButtons.css";

const FilterButtons = ({ filters, onFilterChange, onClearFilters }) => {
  const [localSearch, setLocalSearch] = useState(filters.search || "");

  const debouncedSearch = useCallback(
    debounce((value) => {
      onFilterChange({ search: value });
    }, 500),
    [onFilterChange],
  );

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setLocalSearch(value);
    debouncedSearch(value);
  };

  const handleFloorChange = (floor) => {
    onFilterChange({ floor: filters.floor === floor ? "" : floor });
  };

  const handleDateChange = (type, value) => {
    onFilterChange({
      dateRange: {
        ...filters.dateRange,
        [type]: value,
      },
    });
  };

  const hasActiveFilters = () => {
    return (
      filters.floor ||
      filters.search ||
      filters.dateRange.start ||
      filters.dateRange.end
    );
  };

  return (
    <div className="filter-controls">
      <div className="filter-section">
        <label className="filter-label">Search</label>
        <input
          type="text"
          placeholder="Search by student name or referral number"
          value={localSearch}
          onChange={handleSearchChange}
          className="filter-search-input"
        />
      </div>

      <div className="filter-section">
        <label className="filter-label">Floor</label>
        <div className="filter-floor-buttons">
          {[6, 7, 9, 10].map((floor) => (
            <button
              key={floor}
              className={`filter-floor-btn ${filters.floor === floor.toString() ? "active" : ""}`}
              onClick={() => handleFloorChange(floor.toString())}
            >
              Floor {floor}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-section">
        <label className="filter-label">Date Range</label>
        <div className="filter-date-inputs">
          <input
            type="date"
            value={filters.dateRange.start}
            onChange={(e) => handleDateChange("start", e.target.value)}
            className="filter-date-input"
            placeholder="Start Date"
          />
          <span className="date-separator">to</span>
          <input
            type="date"
            value={filters.dateRange.end}
            onChange={(e) => handleDateChange("end", e.target.value)}
            className="filter-date-input"
            placeholder="End Date"
          />
        </div>
      </div>

      {hasActiveFilters() && (
        <div className="filter-section">
          <button className="btn-clear-filters" onClick={onClearFilters}>
            Clear All Filters
          </button>
        </div>
      )}

      {hasActiveFilters() && (
        <div className="active-filters">
          {filters.floor && (
            <span className="filter-badge">
              Floor: {filters.floor}
              <button onClick={() => handleFloorChange("")}>×</button>
            </span>
          )}
          {filters.search && (
            <span className="filter-badge">
              Search: {filters.search}
              <button
                onClick={() => {
                  setLocalSearch("");
                  onFilterChange({ search: "" });
                }}
              >
                ×
              </button>
            </span>
          )}
          {(filters.dateRange.start || filters.dateRange.end) && (
            <span className="filter-badge">
              Date: {filters.dateRange.start || "..."} to{" "}
              {filters.dateRange.end || "..."}
              <button
                onClick={() =>
                  onFilterChange({ dateRange: { start: "", end: "" } })
                }
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterButtons;
