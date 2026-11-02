import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildCar, CONTAINERS, type Flow, type FlowId, type Part } from './atlas/buildCar';
import type { V3 } from './atlas/geometry';
import { loadRealModel, withoutShell, withRealModel, type RealModel } from './atlas/realModel';
import { EXPLODE_LIFT, type PartVisual } from './components/CarModel';
import { Icon } from './components/Icon';
import { Overview, PartPanel, ServicePanel, TourPanel, counterpartOf } from './components/InfoPanel';
import { Sidebar } from './components/Sidebar';
import { Viewer, type ViewerHandle } from './components/Viewer';
import type { SystemId } from './data/systems';
import { tourFor } from './data/tours';
import available from './data/available.json';
import { BRANDS, PAIRS, type Drivetrain } from './data/vehicles';

const RUN_FLOWS: Record<Drivetrain, FlowId[]> = {
  ice: ['fuel', 'air', 'exhaust', 'torque'],
  ev: ['hv-dc', 'hv-ac', 'torque'],
};

/** The mechanic's checklist with the bonnet open, in the order you would go through it. */
const SERVICE_ITEMS: Record<Drivetrain, { id: string; label: string }[]> = {
  ice: [
    { id: 'dipstick', label: 'Engine oil level' },
    { id: 'oil-filler', label: 'Oil filler cap' },
    { id: 'coolant-tank', label: 'Coolant' },
    { id: 'brake-fluid', label: 'Brake fluid' },
    { id: 'washer-fluid', label: 'Washer fluid' },
    { id: 'battery-12v', label: '12 V battery' },
    { id: 'fuse-box', label: 'Fuses & relays' },
    { id: 'intake', label: 'Air filter' },
    { id: 'cylinder-head', label: 'Spark plugs' },
    { id: 'bsg', label: 'Drive belt' },
    { id: 'radiator', label: 'Radiator' },
  ],
  ev: [
    { id: 'hv-cables', label: 'High voltage — hands off' },
    { id: 'coolant-tank', label: 'Coolant' },
    { id: 'brake-fluid', label: 'Brake fluid' },
    { id: 'washer-fluid', label: 'Washer fluid' },
    { id: 'battery-12v', label: '12 V battery' },
    { id: 'fuse-box', label: 'Fuses & relays' },
    { id: 'radiator-ev', label: 'Radiator' },
  ],
};

/** Only cars with a real 3D model of both versions are listed. */
const SHOWN = PAIRS.filter((p) => available.includes(p.ice.id) && available.includes(p.ev.id));

function readHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  const pair = SHOWN.find((p) => p.id === h.get('model'))?.id ?? SHOWN[0].id;
  const drive: Drivetrain = h.get('drive') === 'ev' ? 'ev' : 'ice';
  return { pair, drive, part: h.get('part') };
}

export default function App() {
  const initial = useMemo(readHash, []);
  const [pairId, setPairId] = useState(initial.pair);
  const [drive, setDrive] = useState<Drivetrain>(initial.drive);
  const [selected, setSelected] = useState<string | null>(initial.part);
  const [hovered, setHovered] = useState<string | null>(null);
  const [hiddenSystems, setHiddenSystems] = useState<Set<SystemId>>(new Set());
  const [hiddenParts, setHiddenParts] = useState<Set<string>>(new Set());
  const [exploded, setExploded] = useState(false);
  const [xray, setXray] = useState(false);
  const [diff, setDiff] = useState(false);
  const [isolate, setIsolate] = useState(false);
  const [running, setRunning] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [mechanic, setMechanic] = useState(false);
  const [paintIdx, setPaintIdx] = useState(0);
  const [query, setQuery] = useState('');
  const [leftOpen, setLeftOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const viewer = useRef<ViewerHandle>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const pair = SHOWN.find((p) => p.id === pairId)!;
  const vehicle = pair[drive];
  const schematic = useMemo(() => buildCar(vehicle), [vehicle]);
  useEffect(
    () => () => {
      for (const p of schematic.parts) for (const m of p.meshes) m.geometry.dispose();
    },
    [schematic],
  );

  // The real 3D model replaces the schematic body, glass, lights, wheels and interior once loaded.
  const [real, setReal] = useState<{ id: string; model: RealModel | null } | null>(null);
  const [loading, setLoading] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    loadRealModel(vehicle, (f) => alive && setLoading(f)).then((model) => {
      if (!alive) return;
      setReal({ id: vehicle.id, model });
      setLoading(null);
    });
    return () => {
      alive = false;
    };
  }, [vehicle]);
  // Until the real model arrives, show just the machinery rather than a placeholder body.
  const car = useMemo(() => {
    if (real?.id !== vehicle.id) return withoutShell(schematic);
    return real.model ? withRealModel(schematic, real.model) : schematic;
  }, [schematic, real, vehicle.id]);
  const resolve = useCallback((id: string) => car.alias?.[id] ?? id, [car]);
  const partById = useMemo(() => new Map(car.parts.map((p) => [p.id, p])), [car]);
  const selectedPart = selected ? partById.get(selected) ?? null : null;
  const tour = useMemo(() => tourFor(vehicle, (id) => partById.has(resolve(id))), [vehicle, partById, resolve]);
  const step = tourStep !== null ? tour.steps[tourStep] : null;
  const paint = vehicle.paints[paintIdx % vehicle.paints.length];

  // Keep the URL shareable.
  useEffect(() => {
    const h = new URLSearchParams({ model: pairId, drive });
    if (selected) h.set('part', selected);
    history.replaceState(null, '', `#${h}`);
  }, [pairId, drive, selected]);

  // Drop a selection that does not exist in the newly built car (once its real model, if any, has loaded).
  const modelSettled = real?.id === vehicle.id;
  useEffect(() => {
    if (!modelSettled || !selected || partById.has(selected)) return;
    setSelected(partById.has(resolve(selected)) ? resolve(selected) : null);
  }, [partById, selected, resolve, modelSettled]);

  const worldCenter = useCallback(
    (p: Part): V3 => {
      const e = exploded ? 1 : 0;
      return [p.center[0] + car.offsetX + p.explode[0] * e, p.center[1] + (p.explode[1] + EXPLODE_LIFT) * e, p.center[2] + p.explode[2] * e];
    },
    [car, exploded],
  );

  const focusPart = useCallback(
    (id: string) => {
      const p = partById.get(id);
      if (!p) return;
      const c = worldCenter(p);
      const big = p.system === 'body' || p.system === 'glass' || p.id === 'wheels' || p.id === 'underbody';
      if (mechanic && !big) viewer.current?.lookAt(c, [0.9, 1.5, 0.6], 1.5);
      else viewer.current?.lookAt(c, [1, 0.55, 1.1], big ? 5.5 : p.system === 'interior' ? 2.6 : 2.2);
    },
    [partById, worldCenter, mechanic],
  );

  const select = useCallback(
    (id: string | null, focus = false) => {
      setSelected(id);
      if (id) {
        setSheetOpen(true);
        if (focus) focusPart(id);
        if (hiddenSystems.has(partById.get(id)?.system as SystemId)) {
          setHiddenSystems((s) => {
            const n = new Set(s);
            n.delete(partById.get(id)!.system);
            return n;
          });
        }
        setHiddenParts((s) => {
          if (!s.has(id)) return s;
          const n = new Set(s);
          n.delete(id);
          return n;
        });
      } else {
        setIsolate(false);
      }
    },
    [focusPart, hiddenSystems, partById],
  );

  // Tour camera moves.
  useEffect(() => {
    if (!step) return;
    const focus = [...new Set((step.focus ?? []).map(resolve))].map((id) => partById.get(id)).filter(Boolean) as Part[];
    const target: V3 = focus.length
      ? (focus.reduce<V3>((a, p) => [a[0] + p.center[0], a[1] + p.center[1], a[2] + p.center[2]], [0, 0, 0]).map((x) => x / focus.length) as V3)
      : [-car.offsetX, 0.55, 0];
    target[0] += car.offsetX;
    viewer.current?.lookAt(target, step.view.dir, step.view.dist);
  }, [step, partById, car.offsetX, resolve]);

  // Mechanic view: look down into the engine bay from the front corner.
  const lookIntoBay = useCallback(() => {
    const b = car.bonnet;
    if (!b) return;
    const x = (b.hinge[0] + b.front[0]) / 2 + car.offsetX;
    viewer.current?.lookAt([x, b.front[1] - 0.25, 0], [0.9, 1.5, 0.55], 2.5);
  }, [car]);
  const nothingSelected = !selected;
  useEffect(() => {
    if (mechanic && nothingSelected) lookIntoBay();
  }, [mechanic, nothingSelected, lookIntoBay]);
  const toggleMechanic = () => {
    if (!mechanic) {
      setExploded(false);
      setXray(false);
      setTourStep(null);
      setIsolate(false);
      setSelected(null);
    } else viewer.current?.reset(false);
    setMechanic((v) => !v);
  };

  const startTour = () => {
    setMechanic(false);
    setExploded(false);
    setIsolate(false);
    setSelected(null);
    setHiddenSystems(new Set());
    setHiddenParts(new Set());
    setDiff(false);
    setTourStep(0);
    setSheetOpen(true);
  };
  const exitTour = () => {
    setTourStep(null);
    viewer.current?.reset(exploded);
  };
  const gotoStep = (i: number) => setTourStep(Math.max(0, Math.min(tour.steps.length - 1, i)));

  const switchDrive = (d: Drivetrain, partId?: string) => {
    setDrive(d);
    setTourStep(null);
    setIsolate(false);
    setSelected(partId ?? null);
    setPaintIdx(0);
  };
  const switchPair = (id: string) => {
    setPairId(id);
    setTourStep(null);
    setSelected(null);
    setIsolate(false);
    setPaintIdx(0);
    viewer.current?.reset(exploded);
  };
  const toggleExploded = () => {
    setMechanic(false);
    setExploded((e) => {
      viewer.current?.reset(!e);
      return !e;
    });
    setTourStep(null);
  };

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.tagName === 'INPUT';
      if (e.key === 'Escape') {
        if (typing) (e.target as HTMLInputElement).blur();
        else if (tourStep !== null) exitTour();
        else select(null);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') {
        e.preventDefault();
        setLeftOpen(true);
        searchRef.current?.focus();
      } else if (e.key === 'e') toggleExploded();
      else if (e.key === 'x') setXray((v) => !v);
      else if (e.key === 'd') setDiff((v) => !v);
      else if (e.key === 'b') toggleMechanic();
      else if (e.key === 'r') viewer.current?.reset(exploded);
      else if (e.key === ' ') {
        e.preventDefault();
        setRunning((v) => !v);
      } else if (tourStep !== null && e.key === 'ArrowRight') gotoStep(tourStep + 1);
      else if (tourStep !== null && e.key === 'ArrowLeft') gotoStep(tourStep - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // What each part looks like right now.
  const visuals = useMemo(() => {
    const ghost = new Set([...(step?.ghost ?? []), ...(selected ? CONTAINERS[selected] ?? [] : [])].map(resolve));
    const focus = step?.focus ? new Set(step.focus.map(resolve)) : null;
    // Selecting something buried inside the car turns the body see-through so you can find it.
    // (With the bonnet open you can already see what is in the engine bay.)
    const buried = selectedPart && !mechanic && !['body', 'glass', 'lighting'].includes(selectedPart.system);
    const xrayOn = xray || step !== null || !!buried;
    const out: Record<string, PartVisual> = {};
    for (const p of car.parts) {
      const v: PartVisual = { look: 'normal', glow: null };
      if (hiddenSystems.has(p.system) || hiddenParts.has(p.id)) v.look = 'hidden';
      else if (isolate && selected && p.id !== selected) v.look = 'hidden';
      else if (ghost.has(p.id)) v.look = 'ghost';
      else if (focus && !focus.has(p.id)) v.look = 'dim';
      else if (diff && !p.only) v.look = 'dim';
      else if (xrayOn && (p.system === 'body' || p.system === 'glass')) v.look = 'ghost';
      // A real interior blocks the view down to the battery and drive units when looking for a part.
      else if ((step || buried) && p.id === 'cabin' && selected !== 'cabin') v.look = 'ghost';
      if (p.id === selected) v.glow = 'selected';
      else if (p.id === hovered) v.glow = 'hover';
      else if (focus?.has(p.id)) v.glow = 'focus';
      else if (diff && p.only) v.glow = p.only;
      out[p.id] = v;
    }
    return out;
  }, [car, step, selected, selectedPart, hovered, hiddenSystems, hiddenParts, isolate, diff, xray, resolve, mechanic]);

  const pins = useMemo(() => {
    if (!mechanic || selected || step || exploded) return [];
    return SERVICE_ITEMS[drive]
      .map((i) => ({ i, p: partById.get(i.id) }))
      .filter(({ p }) => p && p.id !== 'hv-cables' && p.id !== 'radiator' && p.id !== 'radiator-ev')
      .map(({ i, p }) => ({ id: i.id, text: i.label, position: [p!.center[0] + car.offsetX, p!.center[1] + 0.1, p!.center[2]] as V3 }));
  }, [mechanic, selected, step, exploded, drive, partById, car.offsetX]);

  const activeFlows: Flow[] = useMemo(() => {
    const ids = step ? step.flows ?? [] : running ? RUN_FLOWS[drive] : [];
    return ids.map((id) => car.flows[id]).filter(Boolean) as Flow[];
  }, [step, running, drive, car]);

  const label = useMemo(() => {
    const p = hovered && hovered !== selected ? partById.get(hovered) : selectedPart;
    if (!p || step) return null;
    const c = worldCenter(p);
    return { text: p.name, position: [c[0], c[1] + 0.12, c[2]] as V3 };
  }, [hovered, selected, selectedPart, partById, worldCenter, step]);

  const counterpart = selectedPart ? counterpartOf(selectedPart) : null;

  let panel: React.ReactNode;
  if (step && tourStep !== null) {
    panel = <TourPanel tour={tour} step={tourStep} flows={activeFlows} onStep={gotoStep} onExit={exitTour} />;
  } else if (selectedPart) {
    panel = (
      <PartPanel
        part={selectedPart}
        isolated={isolate}
        counterpartName={counterpart?.name ?? null}
        onClose={() => select(null)}
        onFocus={() => focusPart(selectedPart.id)}
        onIsolate={() => {
          setIsolate((v) => !v);
          focusPart(selectedPart.id);
        }}
        onHide={() => {
          setHiddenParts((s) => new Set(s).add(selectedPart.id));
          select(null);
        }}
        onCounterpart={() => counterpart && switchDrive(drive === 'ice' ? 'ev' : 'ice', counterpart.id)}
      />
    );
  } else if (mechanic) {
    panel = <ServicePanel car={car} items={SERVICE_ITEMS[drive]} onSelect={(id) => select(id, true)} onClose={toggleMechanic} />;
  } else {
    panel = <Overview car={car} pair={pair} onTour={startTour} onSwitch={() => switchDrive(drive === 'ice' ? 'ev' : 'ice')} onSelect={(id) => select(id, true)} />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">DA</span>
          <span>
            <b>DasAuto</b> Atlas
          </span>
        </div>
        <nav className="pairs" aria-label="Model">
          <select value={pairId} onChange={(e) => switchPair(e.target.value)} aria-label="Model">
            {BRANDS.filter((b) => SHOWN.some((p) => p.brand === b)).map((b) => (
              <optgroup key={b} label={b}>
                {SHOWN.filter((p) => p.brand === b).map((p) => (
                  <option key={p.id} value={p.id}>
                    {b} {p.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </nav>
        <div className="drive" role="radiogroup" aria-label="Drivetrain">
          <button role="radio" aria-checked={drive === 'ice'} className={drive === 'ice' ? 'on ice' : ''} onClick={() => switchDrive('ice')}>
            <Icon name="fuel" /> Petrol
          </button>
          <button role="radio" aria-checked={drive === 'ev'} className={drive === 'ev' ? 'on ev' : ''} onClick={() => switchDrive('ev')}>
            <Icon name="bolt" /> Electric
          </button>
        </div>
      </header>

      <aside className={`left ${leftOpen ? 'open' : ''}`}>
        <Sidebar
          ref={searchRef}
          parts={car.parts}
          drive={drive}
          query={query}
          onQuery={setQuery}
          hiddenSystems={hiddenSystems}
          onToggleSystem={(id) =>
            setHiddenSystems((s) => {
              const n = new Set(s);
              if (n.has(id)) n.delete(id);
              else n.add(id);
              return n;
            })
          }
          onSolo={(id) => setHiddenSystems(new Set(car.parts.map((p) => p.system).filter((s) => s !== id)))}
          onPreset={(hidden) => {
            setHiddenSystems(new Set(hidden));
            setHiddenParts(new Set());
          }}
          selected={selected}
          onSelect={(id) => {
            setTourStep(null);
            select(id, true);
            setLeftOpen(false);
          }}
        />
      </aside>

      <main className="stage">
        <Viewer
          ref={viewer}
          car={car}
          paint={paint.hex}
          visuals={visuals}
          exploded={exploded}
          running={running || !!step?.animate}
          flows={activeFlows}
          label={label}
          bonnetOpen={mechanic}
          pins={pins}
          autoRotate={autoRotate}
          onPick={(id) => select(id)}
          onHover={setHovered}
        />

        {loading !== null && loading > 0 && (
          <div className="loading" role="status">
            Loading 3D model… {Math.round(loading * 100)}%
            <i style={{ width: `${loading * 100}%` }} />
          </div>
        )}

        <div className="stage-head">
          <button className="btn mobile-only" onClick={() => setLeftOpen((v) => !v)}>
            <Icon name="layers" /> Parts
          </button>
          <div className="stage-title">
            <b>{vehicle.name}</b> <span>{vehicle.trim}</span>
          </div>
          {hiddenParts.size > 0 && (
            <button className="btn small" onClick={() => setHiddenParts(new Set())}>
              <Icon name="eye" /> Show {hiddenParts.size} hidden
            </button>
          )}
        </div>

        <div className="toolbar" role="toolbar" aria-label="View controls">
          <div className="seg">
            <button className={!exploded ? 'on' : ''} onClick={() => exploded && toggleExploded()} title="Assembled (E)">
              <Icon name="isolate" /> <span>Assembled</span>
            </button>
            <button className={exploded ? 'on' : ''} onClick={() => !exploded && toggleExploded()} title="Exploded (E)">
              <Icon name="explode" /> <span>Exploded</span>
            </button>
          </div>
          <button className={`tool ${mechanic ? 'on' : ''}`} onClick={toggleMechanic} title="Open the bonnet: what a mechanic checks (B)" aria-pressed={mechanic}>
            <Icon name="wrench" /> <span>Bonnet</span>
          </button>
          <button className={`tool ${xray ? 'on' : ''}`} onClick={() => setXray((v) => !v)} title="X-ray body (X)" aria-pressed={xray}>
            <Icon name="xray" /> <span>X-ray</span>
          </button>
          <button className={`tool ${diff ? 'on' : ''}`} onClick={() => setDiff((v) => !v)} title="Highlight parts unique to this drivetrain (D)" aria-pressed={diff}>
            <Icon name="diff" /> <span>Differences</span>
          </button>
          <button className={`tool ${running ? 'on' : ''}`} onClick={() => setRunning((v) => !v)} title="Run the machine: spin wheels, fire the engine, show energy flow (Space)" aria-pressed={running}>
            <Icon name={running ? 'pause' : 'play'} /> <span>{running ? 'Stop' : 'Run'}</span>
          </button>
          <button className={`tool ${autoRotate ? 'on' : ''}`} onClick={() => setAutoRotate((v) => !v)} title="Auto-rotate" aria-pressed={autoRotate}>
            <Icon name="rotate" />
          </button>
          <button className="tool" onClick={() => viewer.current?.reset(exploded)} title="Reset view (R)">
            <Icon name="home" />
          </button>
          <div className="paints" aria-label="Paint">
            {vehicle.paints.map((p, i) => (
              <button key={p.name} className={i === paintIdx ? 'on' : ''} style={{ background: p.hex }} title={p.name} aria-label={p.name} onClick={() => setPaintIdx(i)} />
            ))}
          </div>
        </div>

        {diff && (
          <div className="legend-float">
            <span>
              <i className={drive} /> Only in the {drive === 'ice' ? 'petrol' : 'electric'} car
            </span>
            <span>
              <i className="shared" /> Shared
            </span>
          </div>
        )}
      </main>

      <aside className={`right ${sheetOpen ? 'open' : ''}`}>
        <button className="sheet-handle mobile-only" onClick={() => setSheetOpen((v) => !v)} aria-label={sheetOpen ? 'Collapse panel' : 'Expand panel'}>
          <span />
          {!sheetOpen && <em>{step ? step.title : selectedPart ? selectedPart.name : `About the ${vehicle.name}`}</em>}
        </button>
        {panel}
      </aside>
      {leftOpen && <div className="scrim mobile-only" onClick={() => setLeftOpen(false)} />}
    </div>
  );
}
