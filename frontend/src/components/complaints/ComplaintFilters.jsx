import { COMPLAINT_STATUSES, COMPLAINT_PRIORITIES, DEFAULT_CATEGORIES } from '../../utils/constants';
import Button from '../ui/Button';

export default function ComplaintFilters({
  filters = {},
  onChange,
  onClear,
  categories = DEFAULT_CATEGORIES,
}) {
  const handleChange = (key, value) => {
    onChange?.({ ...filters, [key]: value });
  };

  const activeCount = Object.values(filters).filter(v => v && v !== '').length;

  return (
    <div className="filters-bar" id="complaint-filters">
      {/* Status */}
      <select
        id="filter-status"
        className="form-select"
        value={filters.status || ''}
        onChange={(e) => handleChange('status', e.target.value)}
      >
        <option value="">All Statuses</option>
        {COMPLAINT_STATUSES.map(s => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      {/* Category */}
      <select
        id="filter-category"
        className="form-select"
        value={filters.category || ''}
        onChange={(e) => handleChange('category', e.target.value)}
      >
        <option value="">All Categories</option>
        {categories.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      {/* Priority */}
      <select
        id="filter-priority"
        className="form-select"
        value={filters.priority || ''}
        onChange={(e) => handleChange('priority', e.target.value)}
      >
        <option value="">All Priorities</option>
        {COMPLAINT_PRIORITIES.map(p => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>

      {/* Date from */}
      <input
        id="filter-date-from"
        type="date"
        className="form-input"
        placeholder="From"
        value={filters.dateFrom || ''}
        onChange={(e) => handleChange('dateFrom', e.target.value)}
        style={{ minWidth: 140 }}
      />

      {/* Date to */}
      <input
        id="filter-date-to"
        type="date"
        className="form-input"
        placeholder="To"
        value={filters.dateTo || ''}
        onChange={(e) => handleChange('dateTo', e.target.value)}
        style={{ minWidth: 140 }}
      />

      {/* Clear */}
      {activeCount > 0 && (
        <Button id="filter-clear" variant="ghost" size="sm" onClick={onClear}>
          ✕ Clear ({activeCount})
        </Button>
      )}
    </div>
  );
}
