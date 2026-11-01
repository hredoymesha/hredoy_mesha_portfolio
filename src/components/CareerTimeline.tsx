import { useId, useState } from 'react';
import { siteData, type TimelineEntry, type WorkKind } from '../data/siteData';

const FILTERS: Array<{ id: 'all' | WorkKind; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'data', label: 'Data & IT' },
  { id: 'research', label: 'Research' },
  { id: 'study', label: 'Study' }
];

// Jobs and studies together, newest first (the main Experience list keeps its own order).
const ENTRIES: TimelineEntry[] = [...siteData.experience, ...siteData.studyTimeline].sort((a, b) => b.sort - a.sort);

/** Career timeline with filters. Reads the same experience list as the main column. */
export function CareerTimeline() {
  const [filter, setFilter] = useState<'all' | WorkKind>('all');
  const titleId = useId();
  const shown = ENTRIES.filter((xp) => filter === 'all' || xp.kinds.includes(filter));

  return (
    <aside className="print-hide career-timeline" aria-labelledby={titleId}>
      <header className="timeline-head">
        <h3 id={titleId} className="timeline-title">Career timeline</h3>
        <p className="timeline-sub">2014 to today</p>
      </header>

      <div role="group" aria-label="Filter the timeline" className="timeline-seg">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`timeline-chip ${filter === f.id ? 'is-on' : ''}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="timeline-count" role="status" aria-live="polite">
        {shown.length} of {ENTRIES.length} entries
      </p>

      <ol className="timeline-list" key={filter}>
        {shown.map((xp, i) => (
          <li key={xp.when + xp.role} className={`timeline-item${xp.kinds.includes('study') ? ' is-study' : ''}`} style={{ animationDelay: `${i * 60}ms` }}>
            <span className="timeline-when">{xp.when}{xp.kinds.includes('study') ? ' · Study' : ''}</span>
            <span className="timeline-role">{xp.role}</span>
            <span className="timeline-org">{xp.org}</span>
            <span className="timeline-place">{xp.place}</span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
