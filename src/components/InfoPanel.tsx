import type { BuiltCar, Flow, Part } from '../atlas/buildCar';
import { CONTENT } from '../data/content';
import { SYSTEM_BY_ID } from '../data/systems';
import { COUNTERPART, type Tour } from '../data/tours';
import type { VehiclePair } from '../data/vehicles';
import { Diagram } from './Diagrams';
import { Icon } from './Icon';

// ── Overview ──────────────────────────────────────────────────────────
const DRIVEN = { front: 'Front', rear: 'Rear', all: 'All four' } as const;

export function Overview({ car, pair, onTour, onSwitch, onSelect }: { car: BuiltCar; pair: VehiclePair; onTour: () => void; onSwitch: () => void; onSelect: (id: string) => void }) {
  const v = car.vehicle;
  const other = v.drivetrain === 'ice' ? pair.ev : pair.ice;
  const unique = car.parts.filter((p) => p.only);
  const ice = pair.ice.powertrain;
  const ev = pair.ev.powertrain;
  const rows: [string, string, string][] = [
    ['Energy store', `${ice.tank} petrol (≈ 9 kWh/L)`, `${ev.battery} battery`],
    ['Energy that reaches the road', '≈ 25–35 %', '≈ 85–90 %'],
    ['Power', ice.power, ev.power],
    ['Torque', `${ice.torque} (from ≈1,500 rpm)`, `${ev.torque} (from 0 rpm)`],
    ['Gears', `${pair.ice.layout.gears} (${{ dct: 'dual-clutch', automatic: 'automatic', manual: 'manual' }[pair.ice.layout.gearbox ?? 'dct']})`, '1 (fixed reduction)'],
    ['Driven wheels', DRIVEN[pair.ice.layout.driven], DRIVEN[pair.ev.layout.driven]],
    ['Rear brakes', pair.ice.rearBrake === 'disc' ? 'Discs' : 'Drums', pair.ev.rearBrake === 'disc' ? 'Discs' : 'Drums'],
    ['Exhaust system', 'Catalyst, GPF, silencers', 'None'],
    ['Refuel / recharge', '≈ 3 min', '≈ 30 min (10–80 % DC)'],
  ];
  return (
    <div className="panel-body">
      <div className="eyebrow">
        {pair.segment} · {v.drivetrain === 'ice' ? 'Petrol' : 'Electric'}
      </div>
      <h2>
        {v.brand} {v.name}
      </h2>
      <p className="muted">{v.trim}</p>

      <button className="cta" onClick={onTour}>
        <Icon name="play" />
        <span>
          <b>How it works</b>
          <small>Guided tour: {v.drivetrain === 'ice' ? 'from petrol to motion' : 'from plug to motion'}</small>
        </span>
        <Icon name="right" />
      </button>

      <dl className="specs">
        {v.overview.map(([k, val]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{val}</dd>
          </div>
        ))}
      </dl>

      <h3>Petrol vs electric</h3>
      <p className="muted small">
        {pair.ice.name} {pair.ice.trim.split(' · ')[0]} compared with {pair.ev.name} {pair.ev.trim.split(' · ')[0]} — the two cars {pair.brand} sells in this segment.
      </p>
      <table className="compare">
        <thead>
          <tr>
            <th />
            <th className={v.drivetrain === 'ice' ? 'cur' : ''}>
              <Icon name="fuel" size={14} /> {pair.ice.name}
            </th>
            <th className={v.drivetrain === 'ev' ? 'cur' : ''}>
              <Icon name="bolt" size={14} /> {pair.ev.name}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, a, b]) => (
            <tr key={k}>
              <th>{k}</th>
              <td className={v.drivetrain === 'ice' ? 'cur' : ''}>{a}</td>
              <td className={v.drivetrain === 'ev' ? 'cur' : ''}>{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn wide" onClick={onSwitch}>
        <Icon name="swap" /> Switch to the {other.name}
      </button>

      <h3>Only in the {v.name}</h3>
      <p className="muted small">
        {unique.length} parts exist only because this car is {v.drivetrain === 'ice' ? 'petrol-powered' : 'electric'}. Turn on <b>Differences</b> to highlight them.
      </p>
      <div className="chips">
        {unique.map((p) => (
          <button key={p.id} className={`chip ${p.only}`} onClick={() => onSelect(p.id)}>
            {p.name}
          </button>
        ))}
      </div>

      <p className="hint">
        Click any part to learn what it does. Drag to orbit, scroll or pinch to zoom. Keys: <kbd>E</kbd> explode · <kbd>X</kbd> x-ray · <kbd>Space</kbd> run · <kbd>/</kbd> search
      </p>
      <p className="disclaimer">
        Figures are representative and rounded; they vary by trim, market and model year.{' '}
        {car.model ? (
          <>
            Body, interior and wheels: <a href={car.model.url} target="_blank" rel="noreferrer">{car.model.title}</a> by {car.model.author} ({car.model.license}). The parts underneath are schematic reconstructions, not factory CAD.
          </>
        ) : (
          'This car is a simplified, schematic reconstruction, not a factory CAD model.'
        )}
      </p>
    </div>
  );
}

// ── Part details ──────────────────────────────────────────────────────
export function PartPanel({
  part,
  isolated,
  counterpartName,
  onClose,
  onFocus,
  onIsolate,
  onHide,
  onCounterpart,
}: {
  part: Part;
  isolated: boolean;
  counterpartName: string | null;
  onClose: () => void;
  onFocus: () => void;
  onIsolate: () => void;
  onHide: () => void;
  onCounterpart: () => void;
}) {
  const sys = SYSTEM_BY_ID[part.system];
  return (
    <div className="panel-body">
      <div className="panel-top">
        <span className="sys-chip" style={{ '--c': sys.color } as React.CSSProperties}>
          {sys.name}
        </span>
        {part.only && <span className={`badge ${part.only}`}>{part.only === 'ice' ? 'Petrol only' : 'Electric only'}</span>}
        <button className="icon-btn push" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
      </div>
      <h2>{part.name}</h2>
      <p className="lead">{part.summary}</p>

      <div className="actions">
        <button className="btn" onClick={onFocus}>
          <Icon name="focus" /> Focus
        </button>
        <button className={`btn ${isolated ? 'on' : ''}`} onClick={onIsolate} aria-pressed={isolated}>
          <Icon name="isolate" /> Isolate
        </button>
        <button className="btn" onClick={onHide}>
          <Icon name="hide" /> Hide
        </button>
      </div>

      <h3>How it works</h3>
      <p>{part.how}</p>
      {part.diagram && <Diagram id={part.diagram} />}

      {part.check && (
        <div className="check">
          <h3>
            <Icon name="wrench" /> What a mechanic checks
          </h3>
          <p>{part.check}</p>
        </div>
      )}

      {part.specs.length > 0 && (
        <>
          <h3>Key data</h3>
          <dl className="specs">
            {part.specs.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      {counterpartName && (
        <button className="cta subtle" onClick={onCounterpart}>
          <Icon name="swap" />
          <span>
            <b>{part.only === 'ice' ? 'The electric equivalent' : 'The petrol equivalent'}</b>
            <small>{counterpartName}</small>
          </span>
          <Icon name="right" />
        </button>
      )}

      <p className="muted small">{sys.blurb}</p>
    </div>
  );
}

export function counterpartOf(part: Part): { id: string; name: string } | null {
  const id = COUNTERPART[part.id];
  return id ? { id, name: CONTENT[id]?.name ?? id } : null;
}

// ── Guided tour ───────────────────────────────────────────────────────
export function TourPanel({ tour, step, flows, onStep, onExit }: { tour: Tour; step: number; flows: Flow[]; onStep: (i: number) => void; onExit: () => void }) {
  const s = tour.steps[step];
  const last = step === tour.steps.length - 1;
  return (
    <div className="panel-body">
      <div className="panel-top">
        <span className="eyebrow">How it works · {tour.title}</span>
        <button className="icon-btn push" onClick={onExit} aria-label="Exit tour">
          <Icon name="close" />
        </button>
      </div>
      <div className="steps" role="tablist">
        {tour.steps.map((st, i) => (
          <button key={st.title} role="tab" aria-selected={i === step} className={i === step ? 'on' : i < step ? 'done' : ''} onClick={() => onStep(i)} title={st.title} />
        ))}
      </div>
      <h2>{s.title}</h2>
      {step === 0 && <p className="muted">{tour.intro}</p>}
      <p className="lead">{s.body}</p>
      {flows.length > 0 && (
        <div className="flow-legend">
          {flows.map((f) => (
            <span key={f.id}>
              <i style={{ background: f.color }} />
              {f.label}
            </span>
          ))}
        </div>
      )}
      {s.diagram && <Diagram id={s.diagram} />}
      <div className="tour-nav">
        <button className="btn" onClick={() => onStep(step - 1)} disabled={step === 0}>
          <Icon name="left" /> Back
        </button>
        <span className="muted small">
          {step + 1} / {tour.steps.length}
        </span>
        {last ? (
          <button className="btn primary" onClick={onExit}>
            Finish
          </button>
        ) : (
          <button className="btn primary" onClick={() => onStep(step + 1)}>
            Next <Icon name="right" />
          </button>
        )}
      </div>
      <p className="hint">Use ← → to step through. You can still orbit and click parts during the tour.</p>
    </div>
  );
}

/** The service checklist shown while the bonnet is open. */
export function ServicePanel({ car, items, onSelect, onClose }: { car: BuiltCar; items: { id: string; label: string }[]; onSelect: (id: string) => void; onClose: () => void }) {
  const v = car.vehicle;
  const parts = new Map(car.parts.map((p) => [p.id, p]));
  return (
    <div className="panel-body">
      <div className="panel-top">
        <span className="eyebrow">Mechanic view</span>
        <button className="icon-btn push" onClick={onClose} aria-label="Close the bonnet">
          <Icon name="close" />
        </button>
      </div>
      <h2>Under the bonnet</h2>
      <p className="lead">
        {v.drivetrain === 'ice'
          ? `What you would check on the ${v.brand} ${v.name} before a long trip or at a service. Pick an item to see where it is and how to check it.`
          : `An electric car has far less to service: no oil, no spark plugs, no exhaust. But the ${v.brand} ${v.name} still has fluids, a 12 V battery and fuses — and high voltage you must never touch.`}
      </p>
      <ol className="checklist">
        {items
          .filter((i) => parts.has(i.id))
          .map((i) => (
            <li key={i.id}>
              <button onClick={() => onSelect(i.id)}>
                <b>{i.label}</b>
                <small>{parts.get(i.id)!.check?.split('. ')[0]}.</small>
                <Icon name="right" />
              </button>
            </li>
          ))}
      </ol>
      <p className="muted small">The parts in the engine bay are reconstructions placed where they usually sit; exact positions differ from car to car — the handbook has the real map.</p>
    </div>
  );
}
