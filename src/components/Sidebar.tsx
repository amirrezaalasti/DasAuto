import { forwardRef, useMemo } from 'react';
import type { Part } from '../atlas/buildCar';
import { SYSTEMS, type SystemId } from '../data/systems';
import type { Drivetrain } from '../data/vehicles';
import { Icon } from './Icon';

interface Props {
  parts: Part[];
  drive: Drivetrain;
  query: string;
  onQuery: (q: string) => void;
  hiddenSystems: Set<SystemId>;
  onToggleSystem: (id: SystemId) => void;
  onSolo: (id: SystemId) => void;
  onPreset: (hidden: SystemId[]) => void;
  selected: string | null;
  onSelect: (id: string) => void;
}

const PRESETS: { label: string; hidden: SystemId[] }[] = [
  { label: 'Everything', hidden: [] },
  { label: 'Mechanicals', hidden: ['body', 'glass', 'lighting', 'interior'] },
  { label: 'Drivetrain', hidden: ['body', 'glass', 'lighting', 'interior', 'chassis', 'wheels'] },
  { label: 'Rolling chassis', hidden: ['body', 'glass', 'lighting', 'interior', 'powertrain', 'energy', 'exhaust', 'thermal', 'electrical'] },
];

export const Sidebar = forwardRef<HTMLInputElement, Props>(function Sidebar(p, searchRef) {
  const q = p.query.trim().toLowerCase();
  const matches = useMemo(
    () => (q ? p.parts.filter((x) => `${x.name} ${x.summary} ${x.id}`.toLowerCase().includes(q)) : p.parts),
    [p.parts, q],
  );
  const bySystem = useMemo(() => {
    const m = new Map<SystemId, Part[]>();
    for (const part of matches) m.set(part.system, [...(m.get(part.system) ?? []), part]);
    return m;
  }, [matches]);
  const counts = useMemo(() => {
    const c = new Map<SystemId, number>();
    for (const part of p.parts) c.set(part.system, (c.get(part.system) ?? 0) + 1);
    return c;
  }, [p.parts]);
  const activePreset = PRESETS.find((pr) => pr.hidden.length === p.hiddenSystems.size && pr.hidden.every((h) => p.hiddenSystems.has(h)));

  return (
    <div className="sidebar">
      <label className="search">
        <Icon name="search" />
        <input
          ref={searchRef}
          value={p.query}
          onChange={(e) => p.onQuery(e.target.value)}
          placeholder={p.drive === 'ice' ? 'Search parts — try “turbo”' : 'Search parts — try “inverter”'}
          aria-label="Search parts"
        />
        {p.query ? (
          <button className="icon-btn" onClick={() => p.onQuery('')} aria-label="Clear search">
            <Icon name="close" size={14} />
          </button>
        ) : (
          <kbd>/</kbd>
        )}
      </label>

      {!q && (
        <>
          <div className="section-label">Views</div>
          <div className="chips">
            {PRESETS.map((pr) => (
              <button key={pr.label} className={`chip ${activePreset === pr ? 'on' : ''}`} onClick={() => p.onPreset(pr.hidden)}>
                {pr.label}
              </button>
            ))}
          </div>

          <div className="section-label">Systems</div>
          <ul className="systems">
            {SYSTEMS.filter((s) => counts.get(s.id)).map((s) => {
              const on = !p.hiddenSystems.has(s.id);
              return (
                <li key={s.id} className={on ? '' : 'off'}>
                  <button className="system-row" onClick={() => p.onToggleSystem(s.id)} title={s.blurb} aria-pressed={on}>
                    <span className="swatch" style={{ background: on ? s.color : 'transparent', borderColor: s.color }} />
                    <span className="grow">{s.name}</span>
                    <span className="count">{counts.get(s.id)}</span>
                  </button>
                  <button className="solo" onClick={() => p.onSolo(s.id)} title={`Show only ${s.name}`}>
                    only
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <div className="section-label">
        {q ? `${matches.length} result${matches.length === 1 ? '' : 's'}` : 'Parts'}
      </div>
      <div className="parts">
        {SYSTEMS.filter((s) => bySystem.get(s.id)?.length).map((s) => (
          <div key={s.id} className="part-group">
            <div className="part-group-title">
              <span className="dot" style={{ background: s.color }} />
              {s.name}
            </div>
            {bySystem.get(s.id)!.map((part) => (
              <button
                key={part.id}
                className={`part-row ${p.selected === part.id ? 'on' : ''} ${p.hiddenSystems.has(part.system) ? 'muted' : ''}`}
                onClick={() => p.onSelect(part.id)}
              >
                <span className="grow">{part.name}</span>
                {part.only && <span className={`badge ${part.only}`}>{part.only === 'ice' ? 'Petrol' : 'EV'}</span>}
              </button>
            ))}
          </div>
        ))}
        {matches.length === 0 && <p className="empty">No part matches “{p.query}”.</p>}
      </div>
    </div>
  );
});
