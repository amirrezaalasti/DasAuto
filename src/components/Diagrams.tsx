import { useEffect, useState, type ReactNode } from 'react';
import type { DiagramId } from '../data/content';

/** Seconds since mount, updated every animation frame. */
function useTime(): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setT(Math.max(0, now - start) / 1000); // rAF timestamps can predate `start`
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return t;
}

const C = {
  ink: 'var(--ink)',
  dim: 'var(--ink-3)',
  line: 'var(--line-strong)',
  metal: '#8a929c',
  air: '#7cc8f2',
  fuel: '#f5b02e',
  fire: '#ff6a2b',
  exhaust: '#a8a29e',
  hv: '#ff7a00',
  ac: '#c084fc',
  charge: '#22c55e',
  regen: '#2dd4bf',
  cold: '#3b82f6',
  hot: '#ef4444',
};

function Frame({ caption, children, legend }: { caption: ReactNode; children: ReactNode; legend?: ReactNode }) {
  return (
    <figure className="diagram">
      <svg viewBox="0 0 320 200" role="img">
        {children}
      </svg>
      <figcaption>{caption}</figcaption>
      {legend && <div className="diagram-legend">{legend}</div>}
    </figure>
  );
}

function Dots({ d, color, t, speed = 40, gap = 16, r = 2.6 }: { d: string; color: string; t: number; speed?: number; gap?: number; r?: number }) {
  return (
    <path d={d} fill="none" stroke={color} strokeWidth={r * 2} strokeLinecap="round" strokeDasharray={`0 ${gap}`} strokeDashoffset={-t * speed} opacity={0.95} />
  );
}

// ── Four-stroke cycle ─────────────────────────────────────────────────
const STROKES = [
  { name: 'Intake', text: 'Piston moves down, intake valve open: air is drawn in and petrol is injected.', color: C.air },
  { name: 'Compression', text: 'Both valves closed, piston moves up and squeezes the mixture to ≈1/10 of its volume.', color: C.fuel },
  { name: 'Power', text: 'Spark plug fires. The burning mixture expands and forces the piston down — the only stroke that makes power.', color: C.fire },
  { name: 'Exhaust', text: 'Exhaust valve opens, piston moves up and pushes the burnt gas out towards the turbo.', color: C.exhaust },
];

function FourStroke() {
  const t = useTime();
  const theta = t * Math.PI * 0.55; // crank angle
  const phi = theta % (Math.PI * 4);
  const stroke = Math.floor(phi / Math.PI);
  const cx = 110;
  const cy = 165;
  const cr = 22;
  const rod = 62;
  const pinX = cx + cr * Math.sin(theta);
  const pinY = cy - cr * Math.cos(theta);
  const pistonY = cy - cr * Math.cos(theta) - Math.sqrt(rod * rod - (cr * Math.sin(theta)) ** 2);
  const pistonTop = pistonY - 20;
  const top = 34;
  const intakeOpen = stroke === 0;
  const exhaustOpen = stroke === 3;
  const spark = stroke === 2 && phi - 2 * Math.PI < 0.35;
  const s = STROKES[stroke];
  return (
    <Frame
      caption={
        <>
          <b style={{ color: s.color }}>{stroke + 1}. {s.name}</b> — {s.text}
        </>
      }
      legend={STROKES.map((x, i) => (
        <span key={x.name} className={i === stroke ? 'on' : ''}>
          <i style={{ background: x.color }} />
          {x.name}
        </span>
      ))}
    >
      {/* cylinder */}
      <rect x={78} y={top} width={64} height={124} fill="none" stroke={C.line} strokeWidth={3} />
      <rect x={80} y={top} width={60} height={pistonTop - top} fill={s.color} opacity={stroke === 2 ? 0.55 : 0.3} />
      {spark && <circle cx={110} cy={top + 6} r={14} fill={C.fire} opacity={0.9} />}
      {/* valves */}
      <line x1={92} y1={top - 18} x2={92} y2={top + (intakeOpen ? 8 : 0)} stroke={C.air} strokeWidth={3} />
      <rect x={84} y={top + (intakeOpen ? 6 : -2)} width={16} height={4} fill={C.air} />
      <line x1={128} y1={top - 18} x2={128} y2={top + (exhaustOpen ? 8 : 0)} stroke={C.exhaust} strokeWidth={3} />
      <rect x={120} y={top + (exhaustOpen ? 6 : -2)} width={16} height={4} fill={C.exhaust} />
      <rect x={107} y={top - 14} width={6} height={12} fill={C.ink} />
      {/* ports */}
      <path d={`M40 ${top - 10} H84`} stroke={C.air} strokeWidth={8} opacity={0.35} />
      <path d={`M136 ${top - 10} H280`} stroke={C.exhaust} strokeWidth={8} opacity={0.35} />
      {intakeOpen && <Dots d={`M40 ${top - 10} H92 V${top + 12}`} color={C.air} t={t} />}
      {exhaustOpen && <Dots d={`M128 ${top + 12} V${top - 10} H280`} color={C.exhaust} t={t} />}
      {/* piston, rod, crank */}
      <rect x={81} y={pistonTop} width={58} height={22} rx={3} fill={C.metal} />
      <line x1={110} y1={pistonY} x2={pinX} y2={pinY} stroke={C.ink} strokeWidth={6} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={cr + 6} fill="none" stroke={C.line} strokeWidth={2} />
      <line x1={cx} y1={cy} x2={pinX} y2={pinY} stroke={C.metal} strokeWidth={8} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={4} fill={C.ink} />
      <text x={40} y={top - 16} className="lbl">air + fuel</text>
      <text x={238} y={top - 16} className="lbl">exhaust</text>
      <text x={170} y={cy + 4} className="lbl">crankshaft</text>
      <text x={170} y={pistonTop + 14} className="lbl">piston</text>
      <text x={170} y={top + 10} className="lbl">spark plug</text>
    </Frame>
  );
}

// ── Turbocharger ──────────────────────────────────────────────────────
function Impeller({ x, y, r, a, color }: { x: number; y: number; r: number; a: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${a})`}>
      <circle r={r + 4} fill="none" stroke={C.line} strokeWidth={2} />
      {[0, 60, 120, 180, 240, 300].map((d) => (
        <path key={d} d={`M0 0 Q${r * 0.6} ${-r * 0.2} ${r} ${-r * 0.5}`} transform={`rotate(${d})`} stroke={color} strokeWidth={3} fill="none" />
      ))}
      <circle r={4} fill={C.ink} />
    </g>
  );
}

function Turbo() {
  const t = useTime();
  const a = t * 720;
  return (
    <Frame caption="Hot exhaust gas spins the turbine (right). A shaft drives the compressor (left), which packs fresh air into the engine. More air allows more fuel to burn, giving more power from a small engine.">
      <Impeller x={100} y={100} r={34} a={-a} color={C.air} />
      <Impeller x={220} y={100} r={34} a={a} color={C.exhaust} />
      <rect x={134} y={96} width={52} height={8} fill={C.metal} />
      <Dots d="M100 190 V140 Q100 110 100 100" color={C.air} t={t} gap={14} />
      <Dots d="M100 100 Q60 60 20 40" color={C.air} t={t} gap={8} speed={70} />
      <Dots d="M300 30 Q250 50 220 100" color={C.exhaust} t={t} />
      <Dots d="M220 100 V190" color={C.exhaust} t={t} gap={22} />
      <text x={20} y={30} className="lbl">compressed air → engine</text>
      <text x={110} y={188} className="lbl">fresh air</text>
      <text x={232} y={24} className="lbl">exhaust in</text>
      <text x={230} y={188} className="lbl">→ catalyst</text>
      <text x={130} y={88} className="lbl">shared shaft</text>
    </Frame>
  );
}

// ── DSG ───────────────────────────────────────────────────────────────
function Dsg() {
  const t = useTime();
  const gear = (Math.floor(t / 1.4) % 7) + 1;
  const odd = gear % 2 === 1;
  const next = gear === 7 ? 6 : gear + 1;
  const odds = [1, 3, 5, 7];
  const evens = [2, 4, 6, 'R'] as const;
  const gearBox = (g: number | string, i: number, y: number) => {
    const active = g === gear;
    const pre = g === next;
    return (
      <g key={String(g)}>
        <rect
          x={130 + i * 44}
          y={y}
          width={34}
          height={30}
          rx={5}
          fill={active ? 'var(--accent)' : 'transparent'}
          stroke={active || pre ? 'var(--accent)' : C.line}
          strokeDasharray={pre ? '4 3' : undefined}
          strokeWidth={2}
        />
        <text x={147 + i * 44} y={y + 20} textAnchor="middle" className="lbl strong" fill={active ? '#fff' : undefined}>
          {g}
        </text>
      </g>
    );
  };
  return (
    <Frame
      caption={
        <>
          Driving in <b>gear {gear}</b> through clutch <b>{odd ? 'K1' : 'K2'}</b>. Gear {next} is already engaged on the other shaft. The shift simply swaps clutches, taking a few hundredths of a second.
        </>
      }
    >
      <text x={14} y={20} className="lbl">engine</text>
      <rect x={14} y={30} width={40} height={140} rx={6} fill={C.metal} opacity={0.4} />
      <rect x={66} y={46} width={42} height={42} rx={6} fill={odd ? 'var(--accent)' : 'transparent'} stroke="var(--accent)" strokeWidth={2} />
      <text x={87} y={72} textAnchor="middle" className="lbl strong" fill={odd ? '#fff' : undefined}>K1</text>
      <rect x={66} y={112} width={42} height={42} rx={6} fill={!odd ? 'var(--accent)' : 'transparent'} stroke="var(--accent)" strokeWidth={2} />
      <text x={87} y={138} textAnchor="middle" className="lbl strong" fill={!odd ? '#fff' : undefined}>K2</text>
      <line x1={108} y1={67} x2={310} y2={67} stroke={C.line} strokeWidth={3} />
      <line x1={108} y1={133} x2={310} y2={133} stroke={C.line} strokeWidth={3} />
      {odds.map((g, i) => gearBox(g, i, 52))}
      {evens.map((g, i) => gearBox(g, i, 118))}
      <text x={130} y={42} className="lbl">odd gears</text>
      <text x={130} y={170} className="lbl">even gears + reverse</text>
    </Frame>
  );
}

// ── Electric motor ────────────────────────────────────────────────────
function Motor() {
  const t = useTime();
  const w = t * 2.2;
  const phases = [
    { n: 'U', a: 0, c: '#f87171' },
    { n: 'V', a: (2 * Math.PI) / 3, c: '#4ade80' },
    { n: 'W', a: (4 * Math.PI) / 3, c: '#60a5fa' },
  ];
  const cx = 92;
  const cy = 100;
  const fieldA = w; // resulting field direction
  const wave = (k: number) => {
    let d = '';
    for (let i = 0; i <= 60; i++) {
      const x = 190 + i * 2;
      const y = 40 + k * 50 - Math.sin(w - (i / 60) * Math.PI * 2 * 0.9 + 0 - phases[k].a) * 14;
      d += `${i ? 'L' : 'M'}${x} ${y}`;
    }
    return d;
  };
  return (
    <Frame caption="The inverter feeds three currents (U, V, W), each shifted a third of a cycle. Together the stator coils create a rotating magnetic field (arrow). The rotor’s permanent magnets follow it, so the rotor turns.">
      <circle cx={cx} cy={cy} r={78} fill="none" stroke={C.line} strokeWidth={10} />
      {phases.flatMap((p) =>
        [0, Math.PI].map((off) => {
          const a = p.a + off;
          const i = Math.cos(w - p.a) * (off ? -1 : 1);
          return (
            <rect
              key={p.n + off}
              x={-10}
              y={-8}
              width={20}
              height={16}
              rx={3}
              fill={p.c}
              opacity={0.25 + Math.max(0, i) * 0.75}
              transform={`translate(${cx + Math.cos(a) * 66} ${cy + Math.sin(a) * 66}) rotate(${(a * 180) / Math.PI + 90})`}
            />
          );
        }),
      )}
      {phases.map((p) => (
        <text key={p.n} x={cx + Math.cos(p.a) * 92 - 4} y={cy + Math.sin(p.a) * 92 + 4} className="lbl strong" fill={p.c}>
          {p.n}
        </text>
      ))}
      <g transform={`translate(${cx} ${cy}) rotate(${(fieldA * 180) / Math.PI - 8})`}>
        <circle r={40} fill="var(--panel-2)" stroke={C.metal} strokeWidth={2} />
        <path d="M0 -38 A38 38 0 0 1 0 38 Z" fill={C.hot} opacity={0.8} />
        <path d="M0 38 A38 38 0 0 1 0 -38 Z" fill={C.cold} opacity={0.8} />
        <text x={14} y={5} className="lbl strong" fill="#fff">N</text>
        <text x={-22} y={5} className="lbl strong" fill="#fff">S</text>
      </g>
      <g transform={`translate(${cx} ${cy}) rotate(${(fieldA * 180) / Math.PI})`}>
        <line x1={0} y1={0} x2={56} y2={0} stroke="var(--ink)" strokeWidth={2.5} />
        <path d="M56 0 l-8 -5 v10 z" fill="var(--ink)" />
      </g>
      {phases.map((p, k) => (
        <g key={p.n}>
          <path d={wave(k)} fill="none" stroke={p.c} strokeWidth={2} />
          <text x={176} y={44 + k * 50} className="lbl strong" fill={p.c}>{p.n}</text>
        </g>
      ))}
      <line x1={190} y1={20} x2={190} y2={180} stroke={C.line} strokeDasharray="3 3" />
      <text x={196} y={194} className="lbl">phase currents (now ←)</text>
    </Frame>
  );
}

// ── Battery ───────────────────────────────────────────────────────────
function Battery() {
  const t = useTime();
  const charging = Math.floor(t / 4) % 2 === 1;
  const ions = Array.from({ length: 9 }, (_, i) => {
    const p = ((t * 0.35 + i / 9) % 1);
    const x = charging ? 250 - p * 70 : 180 + p * 70;
    const y = 52 + ((i * 37) % 70);
    return <circle key={i} cx={x} cy={y} r={4} fill={C.charge} />;
  });
  return (
    <Frame
      caption={
        <>
          288 cells form 12 modules, which together store ≈77 kWh. Inside each cell, lithium ions (green) shuttle through the electrolyte.{' '}
          <b>{charging ? 'Charging: ions move into the graphite anode.' : 'Driving: ions move back to the cathode, and electrons flow out through the motor.'}</b>
        </>
      }
    >
      {/* hierarchy */}
      <g>
        <rect x={14} y={26} width={22} height={34} rx={2} fill={C.cold} opacity={0.85} />
        <text x={14} y={74} className="lbl">1 cell</text>
        <text x={14} y={86} className="lbl">≈3.7 V</text>
        <text x={44} y={46} className="lbl">×24 →</text>
        <g>
          {Array.from({ length: 6 }, (_, i) => (
            <rect key={i} x={84 + i * 7} y={26} width={6} height={34} rx={1} fill={C.cold} opacity={0.85} />
          ))}
        </g>
        <text x={84} y={74} className="lbl">1 module</text>
        <text x={14} y={118} className="lbl">×12 →</text>
        {Array.from({ length: 12 }, (_, i) => (
          <rect key={i} x={14 + (i % 6) * 22} y={128 + Math.floor(i / 6) * 22} width={19} height={18} rx={2} fill={C.cold} opacity={0.85} />
        ))}
        <text x={14} y={188} className="lbl">pack · 288 cells · ≈77 kWh</text>
      </g>
      {/* cell cross-section */}
      <rect x={168} y={36} width={18} height={100} fill="#4b5563" />
      <rect x={252} y={36} width={18} height={100} fill="#64748b" />
      <rect x={186} y={36} width={66} height={100} fill={C.charge} opacity={0.08} />
      <line x1={219} y1={36} x2={219} y2={136} stroke={C.line} strokeDasharray="4 3" />
      {ions}
      <text x={160} y={152} className="lbl">anode</text>
      <text x={160} y={164} className="lbl">(graphite)</text>
      <text x={238} y={152} className="lbl">cathode</text>
      <text x={238} y={164} className="lbl">(NMC oxide)</text>
      <text x={204} y={28} className="lbl">separator</text>
      <Dots d={charging ? 'M261 36 V18 H177 V36' : 'M177 36 V18 H261 V36'} color="var(--ink)" t={t} gap={10} r={1.6} />
      <text x={190} y={184} className="lbl">e⁻ take the outer path</text>
    </Frame>
  );
}

// ── Charging ──────────────────────────────────────────────────────────
function Charging() {
  const t = useTime();
  const node = (x: number, y: number, label: string, sub?: string, hl = false) => (
    <g>
      <rect x={x} y={y} width={70} height={36} rx={7} fill={hl ? 'var(--accent-soft)' : 'var(--panel-2)'} stroke={hl ? 'var(--accent)' : C.line} />
      <text x={x + 35} y={y + 16} textAnchor="middle" className="lbl strong">{label}</text>
      {sub && <text x={x + 35} y={y + 29} textAnchor="middle" className="lbl">{sub}</text>}
    </g>
  );
  return (
    <Frame caption="AC at home: the car’s own on-board charger converts the current, which limits power to 11 kW (≈7–8 h for a full charge). DC fast charging: the station converts the current and bypasses the on-board charger, delivering over 100 kW (≈30 min for 10–80 %).">
      <text x={10} y={22} className="lbl strong">AC · wallbox</text>
      {node(10, 32, 'Grid', '~ AC')}
      {node(122, 32, 'On-board', 'charger', true)}
      {node(240, 32, 'Battery', 'DC')}
      <Dots d="M80 50 H122" color={C.ac} t={t} speed={25} />
      <Dots d="M192 50 H240" color={C.charge} t={t} speed={25} />
      <text x={92} y={84} className="lbl">AC</text>
      <text x={190} y={84} className="lbl">DC, max 11 kW</text>
      <text x={10} y={118} className="lbl strong">DC · fast charger</text>
      {node(10, 128, 'Charger', 'AC→DC', true)}
      {node(240, 128, 'Battery', 'DC')}
      <rect x={122} y={128} width={70} height={36} rx={7} fill="none" stroke={C.line} strokeDasharray="4 3" />
      <text x={157} y={178} textAnchor="middle" className="lbl">on-board charger bypassed</text>
      <Dots d="M80 146 H240" color={C.charge} t={t} speed={80} gap={10} r={3.2} />
      <text x={160} y={194} textAnchor="middle" className="lbl">DC, up to ≈175 kW, straight to the cells</text>
    </Frame>
  );
}

// ── Regenerative braking ──────────────────────────────────────────────
function Regen() {
  const t = useTime();
  const regen = Math.floor(t / 3.5) % 2 === 1;
  const color = regen ? C.regen : C.hv;
  const labels = ['Battery', 'Inverter', 'Motor', 'Wheels'];
  const path = regen ? 'M276 100 H24' : 'M24 100 H276';
  return (
    <Frame
      caption={
        regen ? (
          <>
            <b style={{ color: C.regen }}>Braking:</b> the wheels drive the motor, which now works as a generator. The inverter rectifies its AC into DC and charges the battery, while the motor’s resistance slows the car.
          </>
        ) : (
          <>
            <b style={{ color: C.hv }}>Driving:</b> energy flows from the battery through the inverter to the motor and on to the wheels.
          </>
        )
      }
    >
      <Dots d={path} color={color} t={t} speed={50} gap={14} r={3} />
      {labels.map((l, i) => (
        <g key={l}>
          <rect x={10 + i * 78} y={78} width={62} height={44} rx={8} fill="var(--panel-2)" stroke={C.line} />
          <text x={41 + i * 78} y={104} textAnchor="middle" className="lbl strong">{l}</text>
        </g>
      ))}
      <text x={160} y={52} textAnchor="middle" className="lbl strong" fill={color}>
        {regen ? '← energy recovered' : 'energy used →'}
      </text>
      <rect x={20} y={146} width={280} height={10} rx={5} fill="var(--panel-2)" />
      <rect x={20} y={146} width={140 + Math.sin(t * 0.9) * 20 + (regen ? 10 : 0)} height={10} rx={5} fill={C.charge} />
      <text x={20} y={176} className="lbl">state of charge {regen ? 'rises' : 'falls'}</text>
    </Frame>
  );
}

// ── Brakes ────────────────────────────────────────────────────────────
function Brakes() {
  const t = useTime();
  const press = (Math.sin(t * 1.6) + 1) / 2;
  const clamp = press > 0.5;
  const heat = Math.max(0, press - 0.5) * 2;
  return (
    <Frame caption="Pedal force is boosted and turned into hydraulic pressure. Pistons in the calliper press the pads onto the spinning disc, and friction turns motion into heat. In the ID. models, light braking is done by the motor (regeneration); the friction brakes are added only when more stopping power is needed.">
      <g transform={`translate(200 100) rotate(${t * 200})`}>
        <circle r={70} fill="#6b7280" />
        <circle r={70} fill={C.hot} opacity={heat * 0.45} />
        <circle r={28} fill="var(--panel)" />
        {Array.from({ length: 12 }, (_, i) => (
          <circle key={i} cx={Math.cos((i / 12) * Math.PI * 2) * 50} cy={Math.sin((i / 12) * Math.PI * 2) * 50} r={3} fill="var(--panel)" />
        ))}
      </g>
      <rect x={176} y={14} width={48} height={40} rx={8} fill="#b8323a" />
      <rect x={186} y={30 + press * 6} width={28} height={8} fill="#2a2a2a" />
      <text x={232} y={30} className="lbl">calliper + pads</text>
      {/* pedal + line */}
      <line x1={30} y1={170} x2={56} y2={110 + press * 14} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
      <rect x={60} y={104} width={40} height={22} rx={4} fill={C.metal} />
      <text x={20} y={190} className="lbl">pedal</text>
      <text x={58} y={98} className="lbl">master cyl.</text>
      <path d="M100 115 H140 V34 H176" fill="none" stroke={clamp ? C.fire : C.line} strokeWidth={3} />
      <text x={104} y={140} className="lbl">{clamp ? 'pressure ↑' : 'released'}</text>
    </Frame>
  );
}

// ── Heat pump ─────────────────────────────────────────────────────────
function HeatPump() {
  const t = useTime();
  const loop = 'M60 60 H260 V140 H60 Z';
  return (
    <Frame caption="Like a fridge running in reverse. The refrigerant evaporates in the outside heat exchanger and soaks up heat even from cold air. The compressor squeezes it, making it hot. It releases that heat to the cabin, expands, cools down and starts again.">
      <path d={loop} fill="none" stroke={C.line} strokeWidth={10} strokeLinejoin="round" />
      <Dots d="M60 140 H260" color={C.cold} t={t} speed={30} />
      <Dots d="M260 140 V60" color={C.ac} t={t} speed={30} />
      <Dots d="M260 60 H60" color={C.hot} t={t} speed={30} />
      <Dots d="M60 60 V140" color={C.air} t={t} speed={30} />
      <rect x={120} y={124} width={80} height={32} rx={6} fill="var(--panel-2)" stroke={C.cold} />
      <text x={160} y={144} textAnchor="middle" className="lbl strong">evaporator</text>
      <rect x={232} y={84} width={56} height={32} rx={16} fill="var(--panel-2)" stroke={C.ac} />
      <text x={260} y={104} textAnchor="middle" className="lbl strong">compressor</text>
      <rect x={120} y={44} width={80} height={32} rx={6} fill="var(--panel-2)" stroke={C.hot} />
      <text x={160} y={64} textAnchor="middle" className="lbl strong">condenser</text>
      <rect x={34} y={84} width={52} height={32} rx={6} fill="var(--panel-2)" stroke={C.air} />
      <text x={60} y={104} textAnchor="middle" className="lbl strong">valve</text>
      <text x={160} y={24} textAnchor="middle" className="lbl">heat → cabin ↑</text>
      <text x={160} y={186} textAnchor="middle" className="lbl">↑ heat from outside air &amp; drive unit</text>
    </Frame>
  );
}

export function Diagram({ id }: { id: DiagramId }) {
  switch (id) {
    case 'four-stroke':
      return <FourStroke />;
    case 'turbo':
      return <Turbo />;
    case 'dsg':
      return <Dsg />;
    case 'motor':
      return <Motor />;
    case 'battery':
      return <Battery />;
    case 'charging':
      return <Charging />;
    case 'regen':
      return <Regen />;
    case 'brakes':
      return <Brakes />;
    case 'heatpump':
      return <HeatPump />;
  }
}
