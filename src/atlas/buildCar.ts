import * as THREE from 'three';
import type { Vehicle, BodyStyle } from '../data/vehicles';
import { contentFor, type DiagramId } from '../data/content';
import type { SystemId } from '../data/systems';
import {
  type P2,
  type V3,
  type Axis,
  arch,
  at,
  bellows,
  box,
  clipRect,
  cyl,
  extrude,
  lathe,
  merge,
  pipe,
  rbox,
  rim,
  sector,
  shiftPts,
  spring,
  strip,
  torus,
  tyre,
  volute,
} from './geometry';
import type { Bonnet, ModelMeta } from './realModel';

export type MatKey =
  | 'paint'
  | 'glass'
  | 'trim'
  | 'rubber'
  | 'alu'
  | 'steel'
  | 'darkmetal'
  | 'chrome'
  | 'copper'
  | 'hv'
  | 'cell'
  | 'headlight'
  | 'taillight'
  | 'fabric'
  | 'dash'
  | 'screen'
  | 'exhaust'
  | 'radiator'
  | 'magnet'
  | 'coolant'
  | 'reservoir'
  | 'capYellow'
  | 'capBlue';

export type Anim =
  | { kind: 'spin'; axis: Axis; speed: number }
  | { kind: 'piston'; phase: number; amplitude: number };

export interface MeshSpec {
  geometry: THREE.BufferGeometry;
  material: MatKey;
  position: V3;
  rotation?: V3;
  /** Exploded-view offset added on top of the part offset (for mirrored left/right meshes). */
  explode?: V3;
  anim?: Anim;
}

export interface Part {
  id: string;
  name: string;
  system: SystemId;
  summary: string;
  how: string;
  only?: 'ice' | 'ev';
  diagram?: DiagramId;
  /** What a mechanic checks, for service points and parts you inspect. */
  check?: string;
  specs: [string, string][];
  meshes: MeshSpec[];
  /** Ready-made meshes from a real 3D model, used instead of `meshes`. */
  object?: THREE.Group;
  explode: V3;
  center: V3;
}

export type FlowId =
  | 'fuel'
  | 'air'
  | 'exhaust'
  | 'coolant'
  | 'torque'
  | 'mild-hybrid'
  | 'charge'
  | 'hv-dc'
  | 'hv-ac'
  | 'regen'
  | 'lv';

export interface Flow {
  id: FlowId;
  label: string;
  color: string;
  paths: V3[][];
}

export interface BuiltCar {
  vehicle: Vehicle;
  parts: Part[];
  flows: Partial<Record<FlowId, Flow>>;
  /** Shift that centres the car lengthwise at the origin. */
  offsetX: number;
  /** Schematic part ids that a real model replaced, mapped to the part that now stands in for them. */
  alias?: Record<string, string>;
  /** Credit for the real 3D model, when one is loaded. */
  model?: ModelMeta;
  /** Where the bonnet is, for the mechanic view (real models only). */
  bonnet?: Bonnet;
}

/** Exploded-view offsets: every part of a system moves together unless it overrides. */
export const SYSTEM_EXPLODE: Record<SystemId, V3> = {
  body: [0, 1.15, 0],
  glass: [0, 1.75, 0],
  lighting: [0, 1.0, 0],
  interior: [0, 0.55, 0],
  chassis: [0, -0.2, 0],
  wheels: [0, 0, 0],
  powertrain: [0, 0.15, 0],
  energy: [0, -0.45, 0],
  exhaust: [0, -0.7, 0],
  thermal: [0.9, 0.3, 0],
  electrical: [0, 0.4, 0],
  service: [0, 0.6, 0],
};

/** Silhouette parameters per body style, as fractions of length (L) and height (H). */
const STYLE: Record<BodyStyle, { nose: number; cowlX: number; cowlY: number; ws: number; roofRear: number; tailX: number; tailY: number; tailMid: number; belt: number }> = {
  hatch: { nose: 0.5, cowlX: 0.25, cowlY: 0.66, ws: 0.44, roofRear: 0.16, tailX: 0.05, tailY: 0.8, tailMid: 0.55, belt: 0.64 },
  hatchEV: { nose: 0.52, cowlX: 0.17, cowlY: 0.64, ws: 0.38, roofRear: 0.13, tailX: 0.04, tailY: 0.82, tailMid: 0.56, belt: 0.62 },
  suv: { nose: 0.55, cowlX: 0.25, cowlY: 0.67, ws: 0.42, roofRear: 0.12, tailX: 0.04, tailY: 0.83, tailMid: 0.58, belt: 0.64 },
  suvEV: { nose: 0.52, cowlX: 0.2, cowlY: 0.65, ws: 0.4, roofRear: 0.11, tailX: 0.035, tailY: 0.82, tailMid: 0.57, belt: 0.63 },
  estate: { nose: 0.47, cowlX: 0.27, cowlY: 0.64, ws: 0.45, roofRear: 0.07, tailX: 0.03, tailY: 0.86, tailMid: 0.55, belt: 0.62 },
  fastback: { nose: 0.48, cowlX: 0.23, cowlY: 0.63, ws: 0.43, roofRear: 0.3, tailX: 0.03, tailY: 0.7, tailMid: 0.55, belt: 0.61 },
};

/** Scales z of every vertex by f(x, y) — used to round the body in section and plan view. */
function shapeZ(g: THREE.BufferGeometry, f: (x: number, y: number) => number) {
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, pos.getZ(i) * f(pos.getX(i), pos.getY(i)));
  pos.needsUpdate = true;
  g.computeBoundingBox();
  return g;
}

function seatGeometry(width: number): THREE.BufferGeometry {
  const cushion = at(rbox(0.5, 0.12, width, 0.04), 0, 0.28, 0);
  const back = rbox(0.12, 0.62, width, 0.04);
  back.rotateZ(0.22);
  back.translate(-0.3, 0.62, 0);
  const head = at(rbox(0.1, 0.17, Math.min(width * 0.55, 0.26), 0.03), -0.4, 1.0, 0);
  const base = at(box(0.3, 0.2, width * 0.6), 0, 0.12, 0);
  return merge([cushion, back, head, base]);
}

export function buildCar(v: Vehicle): BuiltCar {
  const isEV = v.drivetrain === 'ev';
  const { length: L, width: W, height: H, wheelbase: wb, frontOverhang: fo, tireDiameter, tireWidth: tw, groundClearance: gc } = v.dims;
  const s = STYLE[v.style];
  const r = tireDiameter / 2;
  const rimR = r * 0.68;
  const R = r + 0.06; // wheel-arch radius
  const xf = wb / 2 + fo;
  const xr = -(L - wb - fo) - wb / 2;
  const zw = W / 2 - tw / 2 - 0.05; // wheel centre, sideways
  const xFA = wb / 2; // front axle
  const xRA = -wb / 2; // rear axle

  const noseY = s.nose * H;
  const cowlX = xf - s.cowlX * L;
  const cowlY = s.cowlY * H;
  const wsX = xf - s.ws * L;
  const roofRearX = xr + s.roofRear * L;
  const tailX = xr + s.tailX * L;
  const tailY = s.tailY * H;
  const tailMid = s.tailMid * H;
  const belt = s.belt * H;
  const sill = gc + 0.06;
  const shoulder = belt - 0.18;

  /** Width factor at (x, y): rounded flanks, tumblehome above the shoulder, tapered nose and tail. */
  const bodyScale = (x: number, y: number) => {
    let k = 1;
    if (y < shoulder) k *= 1 - 0.05 * ((shoulder - y) / (shoulder - sill)) ** 2;
    else k *= 1 - 0.24 * Math.min((y - shoulder) / (H - shoulder), 1) ** 2;
    const f0 = xFA + 0.15;
    if (x > f0) k *= 1 - 0.13 * Math.min((x - f0) / (xf - f0), 1) ** 2;
    const r0 = xRA - 0.15;
    if (x < r0) k *= 1 - 0.09 * Math.min((r0 - x) / (r0 - xr), 1) ** 2;
    return k;
  };
  const shaped = (g: THREE.BufferGeometry) => shapeZ(g, bodyScale);
  /** Outer surface z at (x, y), minus an inset. */
  const skinZ = (x: number, y: number, inset = 0) => (W / 2) * bodyScale(x, y) - inset;

  // ── Side silhouette ─────────────────────────────────────────────────
  const top: P2[] = [
    [xf - 0.12, gc + 0.08],
    [xf - 0.02, gc + 0.26],
    [xf, noseY - 0.08],
    [xf - 0.05, noseY],
    [xf - 0.25, noseY + 0.04],
    [cowlX, cowlY],
    [wsX, H - 0.03],
    [wsX - 0.3, H],
    [roofRearX + 0.25, H - 0.01],
    [roofRearX, H - 0.05],
    [tailX, tailY],
    [xr + 0.01, tailMid],
    [xr, gc + 0.3],
    [xr + 0.1, gc + 0.08],
  ];
  const profile: P2[] = [...top, [xRA - R - 0.05, sill], ...arch(xRA, r, R, sill), ...arch(xFA, r, R, sill), [xFA + R + 0.05, sill]];

  const parts: Part[] = [];
  const add = (id: string, system: SystemId, meshes: MeshSpec[], opts: { explode?: V3; specs?: [string, string][]; name?: string } = {}) => {
    const c = contentFor(id, v);
    const bb = new THREE.Box3();
    for (const m of meshes) {
      m.geometry.computeBoundingBox();
      const b = m.geometry.boundingBox!.clone().translate(new THREE.Vector3(...m.position));
      bb.union(b);
    }
    const center = bb.getCenter(new THREE.Vector3());
    parts.push({
      id,
      name: opts.name ?? c?.name ?? id,
      system,
      summary: c?.summary ?? '',
      how: c?.how ?? '',
      only: c?.only,
      diagram: c?.diagram,
      check: c?.check,
      specs: opts.specs ?? [],
      meshes,
      explode: opts.explode ?? SYSTEM_EXPLODE[system],
      center: [center.x, center.y, center.z],
    });
  };
  const m = (geometry: THREE.BufferGeometry, material: MatKey, position: V3 = [0, 0, 0], extra: Partial<MeshSpec> = {}): MeshSpec => ({ geometry, material, position, ...extra });
  const sides = [1, -1] as const;
  const P = v.powertrain;

  // ── Body ─────────────────────────────────────────────────────────────
  const lower = clipRect(profile, -10, 10, -10, belt);
  add('biw', 'body', [m(shaped(extrude(lower, W - 0.06, 0.05)), 'paint')]);

  const hoodLine = top.slice(3, 6);
  add('hood', 'body', [m(shaped(extrude(shiftPts(strip(hoodLine, 0.035), 0, 0.012), W - 0.14, 0.02)), 'paint')], { explode: [0.45, 1.55, 0] });

  const roofLine = top.slice(6, 10);
  const roofGeo = shaped(extrude(shiftPts(strip(roofLine, 0.03), 0, 0.006), W * 0.98, 0.025));
  add('roof', 'body', [m(roofGeo, 'paint')], { explode: [0, 2.35, 0] });

  const doorY0 = sill + 0.07;
  const frontDoorX0 = xFA - R - 0.03;
  const bPillar = (xFA - R + (xRA + R)) / 2 + 0.1;
  const frontDoor = clipRect(profile, bPillar + 0.01, frontDoorX0, doorY0, belt);
  const rearDoor = clipRect(profile, xRA - 0.02, bPillar - 0.01, doorY0, belt);
  const doorMeshes = (poly: P2[], handleX: number) =>
    sides.flatMap((side) => [
      m(shaped(at(extrude(poly, 0.05, 0.015), 0, 0, side * (W / 2 - 0.025))), 'paint', [0, 0, 0], { explode: [0, 0, side * 1.0] }),
      m(rbox(0.14, 0.03, 0.03, 0.012), 'trim', [handleX, belt - 0.1, side * skinZ(handleX, belt - 0.1)], { explode: [0, 0, side * 1.0] }),
    ]);
  add('doors-front', 'body', doorMeshes(frontDoor, bPillar + 0.15), { explode: [0, 0.75, 0] });
  add('doors-rear', 'body', doorMeshes(rearDoor, bPillar - 0.2), { explode: [0, 0.75, 0] });

  const tailLine = top.slice(10, 13);
  add('tailgate', 'body', [m(shaped(extrude(strip(tailLine, 0.045), W - 0.2, 0.03)), 'paint')], {
    name: v.style === 'fastback' ? 'Liftback tailgate' : undefined,
    explode: [-0.75, 1.25, 0],
  });

  add('bumper-front', 'body', [m(shaped(extrude(clipRect(profile, xf - 0.38, 10, -10, noseY - 0.1), W - 0.02, 0.06)), 'paint')], { explode: [0.95, 0.55, 0] });
  add('bumper-rear', 'body', [m(shaped(extrude(clipRect(profile, -10, xr + 0.35, -10, gc + 0.42), W - 0.02, 0.06)), 'paint')], { explode: [-0.95, 0.55, 0] });

  const grille: MeshSpec[] = [m(rbox(0.08, isEV ? 0.1 : 0.16, W * (isEV ? 0.42 : 0.55), 0.03), 'trim', [xf - 0.02, gc + 0.2, 0])];
  if (!isEV) grille.push(m(rbox(0.06, 0.07, W * 0.42, 0.02), 'trim', [xf - 0.02, noseY - 0.1, 0]));
  add('grille', 'body', grille, { explode: [1.25, 0.6, 0] });

  add('mirrors', 'body', sides.map((side) => m(rbox(0.13, 0.11, 0.2, 0.04), 'paint', [cowlX - 0.12, belt + 0.07, side * (skinZ(cowlX - 0.12, belt) + 0.08)], { explode: [0, 0, side * 0.55] })), {
    explode: [0, 1.25, 0],
  });

  // ── Glass & lights ──────────────────────────────────────────────────
  const greenhouse = clipRect(profile, -10, cowlX + 0.01, belt - 0.01, 10);
  add('glazing', 'glass', [m(shaped(extrude(greenhouse, W * 0.95, 0.04)), 'glass')]);

  add('headlights', 'lighting', sides.map((side) => m(rbox(0.12, 0.06, 0.34, 0.025), 'headlight', [xf - 0.09, noseY - 0.05, side * skinZ(xf - 0.09, noseY, 0.24)])), { explode: [1.45, 0.85, 0] });
  const tlX = (tailX + xr) / 2 + 0.05;
  const tlY = (tailY + tailMid) / 2 - 0.02;
  add('taillights', 'lighting', sides.map((side) => m(rbox(0.12, 0.07, 0.38, 0.03), 'taillight', [tlX, tlY, side * skinZ(tlX, tlY, 0.22)])), { explode: [-1.4, 1.05, 0] });
  if (isEV) {
    const bars: MeshSpec[] = [m(rbox(0.03, 0.018, 2 * skinZ(xf - 0.06, noseY, 0.3), 0.008), 'headlight', [xf - 0.06, noseY - 0.035, 0])];
    if (v.style !== 'hatchEV') bars.push(m(rbox(0.03, 0.02, 2 * skinZ(tlX, tlY, 0.3), 0.008), 'taillight', [tlX - 0.01, tlY + 0.02, 0]));
    add('lightbar', 'lighting', bars, { explode: [0, 1.0, 0] });
  }

  // ── Interior ────────────────────────────────────────────────────────
  const floorY = isEV ? gc + 0.22 : gc + 0.14;
  const seatX = cowlX - (isEV ? 0.98 : 1.05);
  const rearSeatX = xRA + (isEV ? 0.6 : 0.55);
  add('seats-front', 'interior', sides.map((side) => m(seatGeometry(0.5), 'fabric', [seatX, floorY, side * 0.37], { explode: [0, 0, side * 0.35] })), { explode: [0.2, 0.5, 0] });
  add('seats-rear', 'interior', [m(seatGeometry(W - 0.5), 'fabric', [rearSeatX, floorY - 0.02, 0])], { explode: [-0.4, 0.5, 0] });
  add('dashboard', 'interior', [m(rbox(0.45, 0.26, W - 0.18, 0.06), 'dash', [cowlX - 0.2, belt - 0.11, 0])], { explode: [0.4, 0.55, 0] });
  const wheelGeo = merge([torus(0.18, 0.018, 'x'), cyl(0.06, 0.06, 'x'), at(box(0.02, 0.17, 0.03), 0, -0.08, 0)]);
  add('steering-wheel', 'interior', [m(wheelGeo, 'dash', [cowlX - 0.52, belt + 0.02, -0.37], { rotation: [0, 0, 0.4] })], { explode: [0.15, 0.8, -0.2] });
  add(
    'displays',
    'interior',
    [
      m(rbox(0.02, 0.1, 0.26, 0.008), 'screen', [cowlX - 0.42, belt + 0.12, -0.37], { rotation: [0, 0, 0.2] }),
      m(rbox(0.02, 0.2, 0.32, 0.01), 'screen', [cowlX - 0.33, belt + 0.12, 0], { rotation: [0, 0, 0.15] }),
    ],
    { explode: [0.45, 0.95, 0] },
  );
  const consoleMeshes: MeshSpec[] = isEV
    ? [m(rbox(0.5, 0.08, 0.2, 0.03), 'dash', [seatX + 0.12, floorY + 0.4, 0]), m(box(0.06, 0.32, 0.12), 'dash', [seatX + 0.3, floorY + 0.2, 0])]
    : [m(rbox(0.6, 0.24, 0.22, 0.04), 'dash', [seatX + 0.15, floorY + 0.12, 0]), m(rbox(0.06, 0.1, 0.05, 0.02), 'chrome', [seatX + 0.3, floorY + 0.29, 0])];
  add('console', 'interior', consoleMeshes, { explode: [0, 0.45, 0] });

  // ── Chassis ─────────────────────────────────────────────────────────
  const underbody: MeshSpec[] = [
    m(rbox(wb - 0.25, 0.03, W - 0.3, 0.01), 'darkmetal', [0, floorY - 0.02, 0]),
    ...sides.map((side) => m(rbox(wb - 0.85, 0.13, 0.1, 0.02), 'darkmetal', [0, gc + 0.12, side * (W / 2 - 0.1)])),
  ];
  add('underbody', 'chassis', underbody, { explode: [0, 0.3, 0] });

  add(
    'subframe-front',
    'chassis',
    [m(rbox(0.5, 0.07, W - 0.6, 0.02), 'darkmetal', [xFA - 0.05, r - 0.06, 0])],
    { explode: [0.3, -0.45, 0] },
  );

  const strutZ = zw - tw / 2 - 0.07;
  add(
    'suspension-front',
    'chassis',
    sides.flatMap((side) => {
      const ex: V3 = [0, 0, side * 0.45];
      return [
        m(cyl(0.028, 0.44, 'y'), 'steel', [xFA - 0.02, r + 0.24, side * strutZ], { explode: ex }),
        m(spring(0.075, 0.26, 5, 0.011), 'coolant', [xFA - 0.02, r + 0.32, side * strutZ], { explode: ex }),
        m(cyl(0.085, 0.03, 'y'), 'darkmetal', [xFA - 0.02, r + 0.47, side * strutZ], { explode: ex }),
        m(rbox(0.32, 0.035, 0.36, 0.012), 'darkmetal', [xFA - 0.05, r - 0.09, side * (zw - 0.3)], { explode: ex }),
      ];
    }),
    { explode: [0, -0.1, 0] },
  );

  const rearSusp: MeshSpec[] = [m(rbox(0.22, 0.06, W - 0.6, 0.02), 'darkmetal', [xRA + 0.24, r - 0.06, 0], { explode: [0, -0.1, 0] })];
  for (const side of sides) {
    const ex: V3 = [0, 0, side * 0.45];
    rearSusp.push(
      m(spring(0.07, 0.2, 4, 0.011), 'coolant', [xRA + 0.12, r + 0.06, side * (zw - 0.24)], { explode: ex }),
      m(cyl(0.025, 0.4, 'y'), 'steel', [xRA - 0.13, r + 0.2, side * (zw - 0.17)], { explode: ex }),
      m(rbox(0.06, 0.03, 0.46, 0.01), 'darkmetal', [xRA - 0.02, r - 0.09, side * (zw - 0.32)], { explode: ex }),
      m(rbox(0.52, 0.05, 0.05, 0.015), 'darkmetal', [xRA + 0.24, r - 0.05, side * (zw - 0.14)], { explode: ex }),
    );
  }
  add('suspension-rear', 'chassis', rearSusp, {
    explode: [0, -0.1, 0],
    specs: [['Type', v.rearSuspension === 'multilink' ? 'Multi-link' : 'Torsion beam']],
  });

  const rackLen = W - 0.75;
  add(
    'steering-rack',
    'chassis',
    [
      m(cyl(0.03, rackLen, 'z'), 'alu', [xFA - 0.17, r + 0.02, 0]),
      m(rbox(0.1, 0.1, 0.14, 0.02), 'darkmetal', [xFA - 0.17, r + 0.04, -0.18]),
      ...sides.map((side) => m(cyl(0.012, 0.2, 'z'), 'steel', [xFA - 0.17, r + 0.02, side * (rackLen / 2 + 0.1)])),
      m(pipe([[xFA - 0.17, r + 0.06, -0.3], [cowlX + 0.05, belt - 0.25, -0.34], [cowlX - 0.45, belt - 0.02, -0.37]], 0.018), 'steel'),
    ],
    { explode: [0.45, -0.05, 0] },
  );

  // ── Wheels & brakes ─────────────────────────────────────────────────
  const wheelMeshes: MeshSpec[] = [];
  const brakeF: MeshSpec[] = [];
  const brakeR: MeshSpec[] = [];
  for (const x of [xFA, xRA]) {
    for (const side of sides) {
      const flip: V3 = side > 0 ? [0, 0, 0] : [0, Math.PI, 0];
      const spin: Anim = { kind: 'spin', axis: 'z', speed: side > 0 ? -1 : 1 };
      const ex: V3 = [0, 0, side * 0.95];
      wheelMeshes.push(
        m(tyre(r, rimR + 0.01, tw), 'rubber', [x, r, side * zw], { rotation: flip, anim: spin, explode: ex }),
        m(rim(rimR, tw), 'alu', [x, r, side * zw], { rotation: flip, anim: spin, explode: ex }),
      );
      const exB: V3 = [0, 0, side * 0.6];
      const bz = side * (zw - 0.07);
      if (x === xFA) {
        brakeF.push(
          m(cyl(rimR - 0.04, 0.028, 'z', 36), 'steel', [x, r, bz], { anim: spin, explode: exB }),
          m(rbox(0.11, 0.12, 0.07, 0.02), 'magnet', [x - 0.12, r + 0.1, side * (zw - 0.065)], { explode: exB }),
        );
      } else if (v.rearBrake === 'disc') {
        brakeR.push(
          m(cyl(rimR - 0.06, 0.02, 'z', 36), 'steel', [x, r, bz], { anim: spin, explode: exB }),
          m(rbox(0.09, 0.09, 0.06, 0.02), 'magnet', [x - 0.1, r + 0.08, side * (zw - 0.065)], { explode: exB }),
        );
      } else {
        brakeR.push(m(cyl(rimR - 0.07, 0.09, 'z', 36), 'darkmetal', [x, r, side * (zw - 0.08)], { anim: spin, explode: exB }));
      }
    }
  }
  add('wheels', 'wheels', wheelMeshes, { specs: [['Tyre diameter', `≈ ${Math.round(tireDiameter * 1000)} mm`], ['Tyre width', `${Math.round(tw * 1000)} mm`]] });
  add('brakes-front', 'wheels', brakeF, { specs: [['Type', 'Ventilated discs, floating callipers']] });
  add('brakes-rear', 'wheels', brakeR, {
    name: v.rearBrake === 'drum' ? 'Rear drum brakes' : 'Rear disc brakes',
    specs: [['Type', v.rearBrake === 'drum' ? 'Drum brakes' : 'Disc brakes']],
  });

  const flows: Partial<Record<FlowId, Flow>> = {};

  // ── Service points: what you check with the bonnet open ──────────────
  /** Translucent bottle with a coloured cap, the way fluid reservoirs look. */
  const bottle = (id: string, pos: V3, size: V3, cap: MatKey) =>
    add(id, 'service', [
      m(merge([rbox(size[0], size[1], size[2], 0.025), at(cyl(0.022, 0.03, 'y', 16), 0, size[1] / 2 + 0.012, 0)]), 'reservoir', pos),
      m(merge([cyl(0.03, 0.022, 'y', 20), ...[0, 1, 2, 3, 4, 5].map((k) => at(box(0.006, 0.02, 0.006), Math.cos(k) * 0.03, 0, Math.sin(k) * 0.03))]), cap, [pos[0], pos[1] + size[1] / 2 + 0.035, pos[2]]),
    ]);
  const servicePoints = (firewallX: number, fuseBox: V3) => {
    bottle('coolant-tank', [firewallX + 0.12, r + 0.45, 0.58], [0.16, 0.12, 0.12], 'trim');
    bottle('brake-fluid', [firewallX + 0.05, r + 0.5, -0.5], [0.09, 0.07, 0.07], 'capYellow');
    bottle('washer-fluid', [xf - 0.42, r + 0.3, 0.62], [0.16, 0.18, 0.12], 'capBlue');
    add('fuse-box', 'service', [m(merge([rbox(0.2, 0.09, 0.14, 0.015), at(rbox(0.21, 0.02, 0.15, 0.008), 0, 0.05, 0)]), 'trim', fuseBox)]);
  };

  if (!isEV) {
    // ── Combustion powertrain ────────────────────────────────────────
    // Everything engine-related is laid out for a transverse engine (cylinders along z) and then
    // turned 90° about the engine centre when the engine sits lengthways.
    const L = v.layout;
    const lengthways = L.engineMount === 'longitudinal';
    const E: V3 = lengthways ? [xFA + 0.05, r + 0.2, 0] : [xFA + 0.25, r + 0.2, 0.08];
    const [ex, ey, ez] = E;
    const T = (p: V3): V3 => (lengthways ? [ex + (p[2] - ez), p[1], ez - (p[0] - ex)] : p);
    const turned = (meshes: MeshSpec[]): MeshSpec[] =>
      lengthways ? meshes.map((s) => ({ ...s, position: T(s.position), rotation: [0, Math.PI / 2, 0] as V3 })) : meshes;
    const addEngine = (id: string, meshes: MeshSpec[], opts: Parameters<typeof add>[3]) => add(id, 'powertrain', turned(meshes), opts);

    const n = L.cylinders ?? 4;
    const bl = n * 0.11; // block length
    const cylZ = [...Array(n)].map((_, i) => (i - (n - 1) / 2) * 0.11);
    // Crank angle offsets so the cylinders fire evenly: 1-3-4-2 for four, 1-2-3 for three.
    const phases = n === 4 ? [0, Math.PI, Math.PI, 0] : [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
    const amp = 0.043;
    const crankY = ey - 0.12;

    // Block: deck, siamesed bore walls showing on the intake side, ribs, bedplate and sump.
    const blockAlu = merge([
      rbox(0.26, 0.3, bl, 0.02),
      ...cylZ.map((dz) => at(cyl(0.05, 0.25, 'y', 20), 0.1, 0.01, dz)),
      ...[-0.06, 0.02].map((dy) => at(rbox(0.014, 0.018, bl, 0.006), 0.14, dy, 0)),
      ...cylZ.map((dz) => at(rbox(0.012, 0.22, 0.016, 0.005), -0.135, -0.02, dz)),
      at(rbox(0.28, 0.06, bl + 0.01, 0.012), 0, -0.175, 0),
    ]);
    const sump = merge([at(rbox(0.24, 0.1, bl - 0.04, 0.025), 0.01, -0.255, 0), at(cyl(0.012, 0.02, 'y', 12), 0.06, -0.31, 0.1)]);
    const timingCover = merge([at(rbox(0.25, 0.42, 0.035, 0.02), 0, 0.03, bl / 2 + 0.02), ...[-0.08, 0.06].map((dy) => at(rbox(0.2, 0.01, 0.012, 0.004), 0, dy, bl / 2 + 0.042))]);
    const oilFilter = at(merge([cyl(0.038, 0.09, 'x', 20), at(cyl(0.041, 0.012, 'x', 20), 0.04, 0, 0)]), 0.16, -0.1, -0.12);
    addEngine(
      'engine-block',
      [
        m(blockAlu, 'alu', E),
        m(sump, 'darkmetal', E),
        m(timingCover, 'trim', E),
        m(oilFilter, 'steel', E),
        m(cyl(0.075, 0.03, 'z', 32), 'steel', [ex, crankY, ez + bl / 2 + 0.055], { anim: { kind: 'spin', axis: 'z', speed: 1 } }),
      ],
      {
        explode: [0.65, 0.2, 0],
        specs: [['Engine', P.engine], ['Displacement', P.displacement], ['Power', P.power], ['Torque', P.torque]],
      },
    );

    // Head with integrated exhaust manifold, cam cover over two camshafts, one coil pack per cylinder.
    const head = merge([rbox(0.28, 0.12, bl + 0.02, 0.02), at(rbox(0.05, 0.08, bl - 0.14, 0.02), -0.15, -0.01, 0.02)]);
    const camCover = merge([
      at(rbox(0.22, 0.05, bl, 0.02), 0.01, 0.085, 0),
      at(cyl(0.03, bl - 0.02, 'z', 20), -0.045, 0.1, 0),
      at(cyl(0.03, bl - 0.02, 'z', 20), 0.065, 0.1, 0),
      at(cyl(0.022, 0.03, 'y', 16), -0.06, 0.135, bl / 2 - 0.05),
    ]);
    const coils = merge(cylZ.flatMap((dz) => [at(rbox(0.05, 0.045, 0.04, 0.008), 0.01, 0.15, dz), at(rbox(0.024, 0.02, 0.03, 0.005), 0.05, 0.155, dz)]));
    addEngine('cylinder-head', [m(head, 'alu', [ex, ey + 0.21, ez]), m(camCover, 'trim', [ex, ey + 0.21, ez]), m(coils, 'dash', [ex, ey + 0.21, ez])], {
      explode: [0.65, 0.65, 0],
      specs: [
        ['Valves', n === 3 && !L.turbo ? '6 (2 per cylinder)' : `${n * 4} (4 per cylinder)`],
        ['Injection', L.turbo ? 'Direct, ≈ 350 bar' : 'Into the intake ports'],
        ['Camshafts', n === 3 && !L.turbo ? '1, chain-driven' : '2, variable timing'],
      ],
    });

    // Piston with ring grooves and pin; connecting rod with small and big end.
    const piston = merge([
      lathe([[0.001, 0.028], [0.036, 0.028], [0.036, 0.021], [0.033, 0.02], [0.036, 0.018], [0.036, 0.015], [0.033, 0.014], [0.036, 0.012], [0.036, -0.028], [0.001, -0.028]], 'y', 28),
      cyl(0.009, 0.066, 'z', 12),
    ]);
    const rod = merge([at(rbox(0.016, 0.16, 0.011, 0.004), 0, -0.09, 0), torus(0.011, 0.005, 'z', 16), at(torus(0.022, 0.007, 'z', 20), 0, -0.18, 0)]);
    addEngine(
      'pistons',
      cylZ.flatMap((dz, i) => [
        m(piston, 'chrome', [ex, ey + 0.06, ez + dz], { anim: { kind: 'piston', phase: phases[i], amplitude: amp } }),
        m(rod, 'steel', [ex, ey + 0.06, ez + dz], { anim: { kind: 'piston', phase: phases[i], amplitude: amp } }),
      ]),
      { explode: [0.65, 1.0, 0], specs: [['Cylinders', `${n} in-line`], ['Firing order', n === 4 ? '1-3-4-2' : '1-2-3']] },
    );

    // Crankshaft: main journals, a crank pin per cylinder between two webs, counterweights opposite.
    const crank: THREE.BufferGeometry[] = [cyl(0.022, bl + 0.06, 'z', 20)];
    cylZ.forEach((dz, i) => {
      const up = phases[i] + Math.PI / 2;
      const px = Math.cos(up) * 0.043;
      const py = Math.sin(up) * 0.043;
      crank.push(at(cyl(0.02, 0.026, 'z', 16), px, py, dz));
      for (const s of [-1, 1]) {
        const web = rbox(0.045, 0.07, 0.012, 0.006);
        web.rotateZ(up - Math.PI / 2);
        crank.push(at(web, px / 2, py / 2, dz + s * 0.019));
        crank.push(at(sector(0.058, 0.012, up + Math.PI, Math.PI * 0.9), 0, 0, dz + s * 0.019));
      }
    });
    crank.push(at(cyl(0.13, 0.022, 'z', 40), 0, 0, -(bl / 2 + 0.04)));
    addEngine('crankshaft', [m(merge(crank), 'steel', [ex, crankY, ez], { anim: { kind: 'spin', axis: 'z', speed: 1 } })], {
      explode: [0.65, -0.25, 0],
      specs: [['Main bearings', `${n + 1}`], ['Flywheel', L.gearbox === 'manual' ? 'Single-mass, carries the clutch' : 'Dual-mass']],
    });

    // Turbocharger: aluminium compressor scroll, steel bearing housing, cast turbine scroll, actuator.
    const turboPos: V3 = [ex - 0.21, ey + 0.1, ez + 0.12];
    if (L.turbo) {
      addEngine(
        'turbo',
        [
          m(merge([volute(0.05, 0.026), at(cyl(0.036, 0.05, 'z', 24), 0, 0, -0.04), at(cyl(0.022, 0.06, 'y', 16), 0.05, 0.03, 0)]), 'alu', [turboPos[0], turboPos[1], turboPos[2] - 0.06]),
          m(merge([cyl(0.03, 0.06, 'z', 20), ...[0, 1, 2, 3, 4, 5].map((k) => at(box(0.008, 0.008, 0.06), Math.cos(k) * 0.032, Math.sin(k) * 0.032, 0))]), 'steel', turboPos),
          m(merge([volute(0.046, 0.025), at(cyl(0.04, 0.05, 'z', 24), 0, 0, 0.04)]), 'exhaust', [turboPos[0], turboPos[1], turboPos[2] + 0.06]),
          m(merge([cyl(0.026, 0.045, 'y', 16), at(cyl(0.004, 0.07, 'x', 6), 0.035, -0.02, 0)]), 'darkmetal', [turboPos[0] + 0.02, turboPos[1] - 0.08, turboPos[2] + 0.06]),
        ],
        { explode: [0.15, 0.55, 0.45], specs: [['Type', P.turbo ?? 'Wastegate turbo'], ['Max. speed', '≈ 200,000 rpm']] },
      );
    }

    // Intake: air box, charge pipe (from the turbo, if any), throttle body, manifold.
    const plenumX = ex + 0.215;
    const plenumY = ey + 0.15;
    const airBox: V3 = [ex, ey + 0.2, ez + bl / 2 + 0.16];
    const runners = cylZ.map((dz) => pipe([[plenumX, plenumY + 0.02, ez + dz], [plenumX + 0.01, ey + 0.27, ez + dz], [ex + 0.15, ey + 0.23, ez + dz]], 0.019, 0.5));
    const chargeFrom: V3 = L.turbo ? [turboPos[0] + 0.05, turboPos[1] + 0.06, turboPos[2] - 0.06] : [airBox[0] - 0.08, airBox[1] + 0.02, airBox[2] - 0.12];
    addEngine(
      'intake',
      [
        m(merge([rbox(0.25, 0.12, 0.3, 0.03), ...[-0.08, 0, 0.08].map((dx) => at(rbox(0.012, 0.012, 0.26, 0.004), dx, 0.064, 0))]), 'trim', airBox),
        m(merge([cyl(0.045, bl - 0.04, 'z', 24), ...(L.turbo ? [at(rbox(0.07, 0.11, bl - 0.08, 0.02), 0.01, -0.06, 0)] : []), ...runners.map((g) => at(g, -plenumX, -plenumY, -ez))]), 'trim', [plenumX, plenumY, ez]),
        m(merge([cyl(0.036, 0.05, 'z', 24), at(rbox(0.04, 0.05, 0.04, 0.008), 0.03, 0.02, 0)]), 'alu', [plenumX, plenumY, ez - bl / 2 - 0.005]),
        m(pipe([chargeFrom, [ex - 0.12, ey + 0.38, ez - 0.12], [ex + 0.1, ey + 0.34, ez - bl / 2 - 0.05], [plenumX, plenumY, ez - bl / 2 - 0.05]], 0.027), 'trim'),
      ],
      { explode: [1.0, 0.55, 0.2], specs: L.turbo ? [['Charge-air cooling', 'Water-cooled, in the manifold']] : [['Aspiration', 'Natural (no turbo)']] },
    );

    // Mild hybrid: a belt-driven starter-generator, or a disc-shaped one between engine and gearbox.
    if (L.hybrid?.starter === 'belt') {
      const bsgPos: V3 = [ex + 0.08, ey - 0.02, ez + bl / 2 + 0.1];
      const bsgBody = merge([cyl(0.065, 0.12, 'z', 28), ...[0, 1, 2, 3, 4, 5, 6, 7].map((k) => at(box(0.008, 0.008, 0.1), Math.cos((k * Math.PI) / 4) * 0.066, Math.sin((k * Math.PI) / 4) * 0.066, 0))]);
      const bz = ez + bl / 2;
      addEngine(
        'bsg',
        [
          m(bsgBody, 'alu', bsgPos),
          m(cyl(0.035, 0.03, 'z', 20), 'steel', [bsgPos[0], bsgPos[1], bsgPos[2] - 0.075], { anim: { kind: 'spin', axis: 'z', speed: 2 } }),
          m(pipe([[ex, crankY + 0.075, bz + 0.055], [bsgPos[0] - 0.02, bsgPos[1] + 0.035, bz + 0.045], [bsgPos[0] + 0.03, bsgPos[1], bz + 0.042], [bsgPos[0] - 0.02, bsgPos[1] - 0.035, bz + 0.045], [ex + 0.02, crankY - 0.075, bz + 0.055]], 0.006, 0.5), 'rubber'),
        ],
        { explode: [0.75, 0.15, 0.55], specs: [['Voltage', `${L.hybrid.volts} V`]] },
      );
    } else if (L.hybrid?.starter === 'integrated') {
      addEngine(
        'bsg',
        [
          m(lathe([[0.1, -0.035], [0.175, -0.035], [0.175, 0.035], [0.1, 0.035], [0.1, -0.035]], 'z', 48), 'alu', [ex, crankY, ez - bl / 2 - 0.06]),
          m(torus(0.135, 0.022, 'z', 48), 'copper', [ex, crankY, ez - bl / 2 - 0.06], { anim: { kind: 'spin', axis: 'z', speed: 1 } }),
        ],
        { explode: [0.75, 0.15, -0.55], specs: [['Voltage', `${L.hybrid.volts} V`], ['Boost', '≈ 15 kW / 200 Nm']] },
      );
    }

    // Gearbox. Transverse: a squat case beside the engine with the differential built in.
    // Lengthways: a long tapering case on the crank axis behind the engine.
    const gearboxSpecs: [string, string][] = [
      ['Gearbox', P.gearbox],
      L.gearbox === 'dct' ? ['Clutches', '2 (odd / even gears)'] : L.gearbox === 'automatic' ? ['Coupling', 'Torque converter + lock-up clutch'] : ['Clutch', 'Single dry plate, pedal-operated'],
      ['Drive', P.drive],
    ];
    const gbLen = 0.7;
    const gbTail: V3 = [ex, crankY - 0.02, ez - bl / 2 - 0.08 - gbLen];
    const gbPos: V3 = [ex - 0.12, r + 0.06, ez - bl / 2 - 0.21];
    addEngine(
      'gearbox',
      lengthways
        ? [
            m(
              lathe([[0.001, gbLen / 2], [0.175, gbLen / 2], [0.17, gbLen * 0.3], [0.13, gbLen * 0.1], [0.12, -gbLen * 0.2], [0.09, -gbLen * 0.4], [0.05, -gbLen / 2], [0.001, -gbLen / 2]], 'z', 40),
              'alu',
              [ex, crankY, ez - bl / 2 - 0.08 - gbLen / 2],
            ),
            m(merge([rbox(0.2, 0.08, gbLen * 0.55, 0.02), ...[-0.05, 0.05].map((dx) => at(rbox(0.01, 0.07, gbLen * 0.5, 0.004), dx, -0.045, 0))]), 'darkmetal', [ex, crankY - 0.14, ez - bl / 2 - 0.08 - gbLen * 0.45]),
          ]
        : [
            m(lathe([[0.001, -0.05], [0.165, -0.05], [0.16, 0.0], [0.13, 0.05], [0.001, 0.05]], 'z', 40), 'alu', [ex - 0.02, crankY + 0.06, ez - bl / 2 - 0.07]),
            m(merge([rbox(0.34, 0.28, 0.22, 0.04), ...[-0.1, -0.03, 0.04, 0.11].map((dx) => at(rbox(0.012, 0.26, 0.24, 0.005), dx, 0, 0)), at(cyl(0.11, 0.2, 'z', 32), xFA - gbPos[0], r - gbPos[1], 0.02)]), 'alu', gbPos),
            m(merge([rbox(0.2, 0.07, 0.16, 0.02), at(rbox(0.05, 0.03, 0.03, 0.008), 0.06, 0.04, 0.05)]), 'trim', [gbPos[0] + 0.05, gbPos[1] + 0.17, gbPos[2]]),
          ],
      { explode: [0.6, 0.1, -0.5], specs: gearboxSpecs },
    );

    // Driveline: shafts from the gearbox (or the rear differential) to the driven wheels.
    const spinZ = { kind: 'spin', axis: 'z', speed: 1 } as const;
    const boot = (x: number, side: number, z: number, wide = true): MeshSpec =>
      m(wide ? bellows(0.05, 0.026, 0.1, 5, 'z') : bellows(0.046, 0.026, 0.08, 4, 'z'), 'rubber', [x, r, z], { rotation: (side > 0) === wide ? [0, Math.PI, 0] : [0, 0, 0], explode: [0, 0, side * 0.3] });
    /** Two shafts from a differential at (x, ±inner) out to the wheels. */
    const axleShafts = (x: number, inner: number): MeshSpec[] =>
      sides.flatMap((side) => {
        const len = zw - 0.1 - inner;
        return [
          m(cyl(0.02, len, 'z'), 'steel', [x, r, side * (inner + len / 2)], { explode: [0, 0, side * 0.3], anim: spinZ }),
          boot(x, side, side * (zw - 0.15)),
          boot(x, side, side * (inner + 0.06), false),
        ];
      });
    const tail = T(gbTail);
    const rearDiff = (): MeshSpec[] => [
      m(pipe([tail, [(tail[0] + xRA) / 2, (tail[1] + r) / 2 - 0.02, 0], [xRA + 0.14, r, 0]], 0.03), 'steel'),
      m(merge([cyl(0.1, 0.16, 'x', 32), cyl(0.075, 0.24, 'z', 24), at(cyl(0.045, 0.08, 'x', 20), 0.11, 0, 0)]), 'alu', [xRA, r, 0]),
      ...axleShafts(xRA, 0.12),
    ];
    let driveline: MeshSpec[];
    if (L.driven === 'front') {
      const shaftL = zw - 0.1 - (bl / 2 + 0.21 - ez);
      driveline = [
        m(cyl(0.02, shaftL, 'z'), 'steel', [xFA, r, -(bl / 2 + 0.21 - ez) - shaftL / 2], { explode: [0, 0, -0.3], anim: spinZ }),
        m(cyl(0.02, zw - 0.1 + 0.25, 'z'), 'steel', [xFA, r, (zw - 0.1 - 0.25) / 2], { explode: [0, 0, 0.3], anim: spinZ }),
        boot(xFA, 1, zw - 0.15),
        boot(xFA, -1, -(zw - 0.15)),
        boot(xFA, 1, 0.3, false),
        boot(xFA, -1, -(bl / 2 + 0.21 - ez) - 0.12, false),
      ];
    } else {
      driveline = rearDiff();
      if (L.driven === 'all') driveline.push(m(merge([cyl(0.09, 0.14, 'x', 28), cyl(0.06, 0.2, 'z', 20)]), 'alu', [xFA, r, 0]), ...axleShafts(xFA, 0.1));
    }
    add('driveshafts', 'powertrain', driveline, { explode: [0.3, 0, 0], specs: [['Drive', P.drive]] });

    // Energy
    const tankX = xRA + 0.62;
    add('fuel-tank', 'energy', [m(rbox(0.45, 0.2, 0.85, 0.05), 'trim', [tankX, gc + 0.16, 0])], {
      specs: [['Capacity', P.tank], ['Energy per litre', '≈ 9 kWh'], ['Pump', 'Electric, in tank']],
    });
    const filler: V3[] = [[tankX - 0.1, gc + 0.22, 0.35], [xRA + 0.15, gc + 0.3, 0.55], [xRA - 0.1, belt - 0.25, W / 2 - 0.2], [xRA - 0.18, belt - 0.12, W / 2 - 0.04]];
    const fuelLine: V3[] = [[tankX + 0.1, gc + 0.1, 0.28], [0, gc + 0.07, 0.28], [xFA - 0.1, gc + 0.1, 0.28], T([ex - 0.12, ey + 0.05, ez + 0.2]), T([ex, ey + 0.26, ez + 0.15])];
    add('fuel-system', 'energy', [m(pipe(filler, 0.025), 'steel'), m(pipe(fuelLine, 0.008), 'steel'), m(cyl(0.035, 0.02, 'z'), 'trim', [xRA - 0.18, belt - 0.12, W / 2 - 0.02])], {
      explode: [0, -0.6, 0],
    });
    if (L.hybrid) add('battery-48v', 'energy', [m(rbox(0.25, 0.09, 0.3, 0.02), 'alu', [seatX, floorY + 0.06, 0.37])], { explode: [0, 0.25, 0.6], specs: [['Voltage', `${L.hybrid.volts} V`]] });

    // Exhaust: catalyst right behind the manifold or turbo, then a particulate filter and silencers.
    // With a propeller shaft in the middle, the pipe runs off to one side.
    const exZ = L.driven === 'front' ? 0.05 : 0.3;
    const catPos = T([ex - 0.28, ey - 0.08, ez + 0.08]);
    const gpfPos: V3 = [xFA - 0.35, gc + 0.12, exZ];
    add('catalyst', 'exhaust', [m(cyl(0.07, 0.26, 'y'), 'exhaust', catPos), m(cyl(0.08, 0.32, 'x'), 'exhaust', gpfPos)], {
      explode: [0.3, -0.5, 0.4],
      specs: [['Stages', 'Three-way catalyst + particulate filter (GPF)']],
    });
    const rearMuffler: V3 = [xr + 0.42, gc + 0.17, -0.22];
    const exhaustPath: V3[] = [
      [gpfPos[0] - 0.16, gc + 0.12, exZ],
      [-0.1, gc + 0.09, exZ],
      [tankX + 0.3, gc + 0.09, -0.48],
      [xRA + 0.1, gc + 0.12, -0.5],
      [rearMuffler[0] + 0.15, rearMuffler[1], -0.4],
    ];
    add(
      'mufflers',
      'exhaust',
      [
        m(pipe(exhaustPath, 0.025), 'exhaust'),
        m(pipe([[catPos[0], catPos[1] - 0.13, catPos[2]], [catPos[0] - 0.05, gc + 0.14, (catPos[2] + exZ) / 2], [gpfPos[0] + 0.16, gc + 0.12, exZ]], 0.025), 'exhaust'),
        m(rbox(0.5, 0.1, 0.18, 0.04), 'exhaust', [-0.1, gc + 0.09, exZ]),
        m(rbox(0.3, 0.15, 0.6, 0.05), 'exhaust', rearMuffler),
        m(cyl(0.03, 0.18, 'x'), 'chrome', [xr + 0.18, gc + 0.14, -0.42]),
      ],
      { explode: [0, -0.8, 0] },
    );

    // Thermal & electrical
    add('radiator', 'thermal', [m(rbox(0.04, 0.42, W * 0.55, 0.01), 'radiator', [xf - 0.2, r + 0.1, 0])], { explode: [1.25, 0.25, 0] });
    const fanBlade = merge([cyl(0.04, 0.05, 'x'), ...[0, 1, 2, 3, 4].map((i) => {
      const b = box(0.01, 0.14, 0.05);
      b.translate(0, 0.08, 0);
      b.rotateX((i / 5) * Math.PI * 2);
      return b;
    })]);
    add(
      'cooling-fan',
      'thermal',
      [m(torus(0.17, 0.012, 'x'), 'trim', [xf - 0.27, r + 0.1, 0.15]), m(fanBlade, 'trim', [xf - 0.27, r + 0.1, 0.15], { anim: { kind: 'spin', axis: 'x', speed: 3 } })],
      { explode: [1.0, 0.3, 0] },
    );
    add('battery-12v', 'electrical', [m(rbox(0.18, 0.18, 0.25, 0.015), 'trim', [ex + 0.04, ey + 0.12, -0.6])], { explode: [0.6, 0.55, -0.35] });
    add('ecu', 'electrical', [m(rbox(0.15, 0.04, 0.2, 0.01), 'alu', [ex + 0.16, ey + 0.25, -0.6])], { explode: [0.7, 0.75, -0.3] });

    // Flows
    const wheel = (x: number, side: number): V3 => [x, r, side * zw];
    flows.fuel = { id: 'fuel', label: 'Petrol', color: '#f5b02e', paths: [[[tankX, gc + 0.2, 0.2], ...fuelLine]] };
    flows.air = {
      id: 'air',
      label: 'Fresh air',
      color: '#7cc8f2',
      paths: [[[xf - 0.02, r + 0.3, 0.4], ...[airBox, ...(L.turbo ? [[turboPos[0], turboPos[1] + 0.05, turboPos[2] - 0.06] as V3] : []), [ex - 0.05, ey + 0.32, ez - 0.05] as V3, [ex + 0.2, ey + 0.15, ez] as V3, [ex + 0.05, ey + 0.08, ez] as V3].map(T)]],
    };
    flows.exhaust = {
      id: 'exhaust',
      label: 'Exhaust gas',
      color: '#a8a29e',
      paths: [[T([ex - 0.1, ey + 0.12, ez]), ...(L.turbo ? [T([turboPos[0], turboPos[1], turboPos[2] + 0.06])] : []), catPos, [catPos[0] - 0.05, gc + 0.14, (catPos[2] + exZ) / 2], gpfPos, ...exhaustPath.slice(1), rearMuffler, [xr + 0.05, gc + 0.14, -0.42], [xr - 0.3, gc + 0.14, -0.42]]],
    };
    flows.coolant = {
      id: 'coolant',
      label: 'Coolant',
      color: '#3b82f6',
      paths: [[T([ex, ey + 0.05, ez + 0.1]), T([ex + 0.12, ey + 0.2, ez + 0.24]), [xf - 0.2, r + 0.28, 0.3], [xf - 0.2, r - 0.08, -0.25], T([ex + 0.12, ey - 0.12, ez - 0.28]), T([ex, ey - 0.02, ez - 0.05])]],
    };
    const crankFront = T([ex, crankY, ez + bl / 2]);
    const crankRear = T([ex, crankY, ez - bl / 2]);
    const frontAxle: V3[][] = L.driven === 'all' ? [[T([ex, crankY, ez - bl / 2 - 0.2]), [xFA, r, 0], wheel(xFA, -1)], [[xFA, r, 0], wheel(xFA, 1)]] : [];
    flows.torque = {
      id: 'torque',
      label: 'Torque',
      color: '#f8fafc',
      paths:
        L.driven === 'front'
          ? [
              [crankFront, crankRear, [gbPos[0], gbPos[1], gbPos[2]], [xFA, r, gbPos[2]], wheel(xFA, -1)],
              [[gbPos[0], gbPos[1], gbPos[2]], [xFA, r, gbPos[2] + 0.13], [xFA, r, 0.2], wheel(xFA, 1)],
            ]
          : [
              [crankFront, crankRear, tail, [xRA + 0.14, r, 0], [xRA, r, 0], wheel(xRA, -1)],
              [[xRA, r, 0], wheel(xRA, 1)],
              ...frontAxle,
            ],
    };
    if (L.hybrid) {
      const motorAt = L.hybrid.starter === 'belt' ? T([ex + 0.08, ey - 0.02, ez + bl / 2 + 0.1]) : T([ex, crankY, ez - bl / 2 - 0.06]);
      flows['mild-hybrid'] = {
        id: 'mild-hybrid',
        label: `${L.hybrid.volts} V energy`,
        color: '#a3e635',
        paths: [[[seatX, floorY + 0.1, 0.37], [seatX + 0.4, floorY, 0.4], [xFA - 0.1, r + 0.12, 0.42], motorAt]],
      };
    }

    servicePoints(lengthways ? xFA - 0.62 : xFA - 0.3, [ex - 0.22, ey + 0.14, -0.62]);
    add('oil-filler', 'service', [m(merge([cyl(0.026, 0.02, 'y', 24), ...[0, 1, 2, 3, 4, 5, 6, 7].map((k) => at(box(0.006, 0.016, 0.006), Math.cos(k * 0.785) * 0.026, 0, Math.sin(k * 0.785) * 0.026))]), 'capYellow', T([ex - 0.06, ey + 0.37, ez + bl / 2 - 0.05]))], {
      explode: [0.65, 1.3, 0],
    });
    if (!L.oilSensor) {
      const top = T([ex + 0.16, ey + 0.34, ez - 0.08]);
      add('dipstick', 'service', [m(torus(0.018, 0.005, 'z', 20), 'capYellow', top, { rotation: [0, lengthways ? Math.PI / 2 : 0, 0] }), m(cyl(0.004, 0.42, 'y', 8), 'steel', [top[0], top[1] - 0.22, top[2]])], {
        explode: [0.65, 1.3, 0.2],
      });
    }
  } else {
    // ── Electric powertrain ──────────────────────────────────────────
    // The drive unit sits on the driven axle: behind the rear axle, or ahead of the front one.
    const front = v.layout.driven === 'front';
    const xDA = front ? xFA : xRA;
    const dir = front ? -1 : 1;
    const M: V3 = [xDA - 0.17 * dir, r + 0.04, -0.08];
    const [mx, my, mz] = M;
    // Stator housing with axial cooling fins and a water jacket inlet; copper end windings show at both ends.
    const fins = [...Array(18)].map((_, k) => {
      const b = box(0.01, 0.016, 0.22);
      b.translate(0, 0.146, 0);
      b.rotateZ((k / 18) * Math.PI * 2);
      return b;
    });
    add(
      'motor-stator',
      'powertrain',
      [
        m(merge([cyl(0.14, 0.24, 'z', 48), ...fins, at(cyl(0.012, 0.05, 'y', 12), 0.06, 0.16, -0.06), at(cyl(0.012, 0.05, 'y', 12), -0.06, 0.16, 0.06)]), 'alu', M),
        m(cyl(0.125, 0.025, 'z', 40), 'darkmetal', [mx, my, mz - 0.13]),
        ...sides.map((side) => m(torus(0.105, 0.022, 'z', 40), 'copper', [mx, my, mz + side * 0.1])),
      ],
      {
        explode: [-0.7, 0.2, 0],
        specs: [['Motor', P.motor], ['Power', P.power], ['Torque', P.torque], ['Phases', '3']],
      },
    );
    const magnets = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
      const b = box(0.03, 0.02, 0.2);
      b.translate(0, 0.075, 0);
      b.rotateZ((i / 8) * Math.PI * 2);
      return b;
    });
    const rotorCore = merge([cyl(0.07, 0.2, 'z', 32), cyl(0.02, 0.42, 'z', 16), ...[-0.105, 0.105].map((dz) => at(cyl(0.06, 0.01, 'z', 32), 0, 0, dz))]);
    add(
      'motor-rotor',
      'powertrain',
      [m(rotorCore, 'steel', M, { anim: { kind: 'spin', axis: 'z', speed: 4 } }), m(merge(magnets), 'magnet', M, { anim: { kind: 'spin', axis: 'z', speed: 4 } })],
      { explode: [-0.7, 0.2, -0.55], specs: [['Magnets', 'Permanent (rare-earth)'], ['Max. speed', '≈ 16,000 rpm']] },
    );
    // Two-stage reduction: motor shaft → intermediate shaft → differential, in one housing.
    const gz = mz + 0.2;
    add(
      'reduction-gear',
      'powertrain',
      [
        m(
          merge([
            at(cyl(0.085, 0.12, 'z', 32), mx - (xDA - 0.08 * dir), my - (r + 0.02), 0),
            at(cyl(0.075, 0.12, 'z', 32), 0, 0.12, 0),
            at(cyl(0.125, 0.13, 'z', 40), 0.08 * dir, -0.02, 0),
            at(rbox(0.2, 0.18, 0.12, 0.03), 0, 0.02, 0),
            ...[0.05, -0.05].map((dz) => at(torus(0.124, 0.006, 'z', 40), 0.08 * dir, -0.02, dz)),
          ]),
          'alu',
          [xDA - 0.08 * dir, r + 0.02, gz],
        ),
      ],
      { explode: [-0.7, 0.2, 0.5], specs: [['Ratio', '≈ 11.5 : 1 (single speed)'], ['Stages', '2 helical gear pairs'], ['Drive', P.drive]] },
    );
    // Inverter on top of the motor: finned lid, HV DC input and the three AC phase outputs.
    add(
      'inverter',
      'powertrain',
      [
        m(merge([rbox(0.3, 0.07, 0.32, 0.02), ...[-0.1, -0.05, 0, 0.05, 0.1].map((dx) => at(rbox(0.012, 0.012, 0.28, 0.004), dx, 0.04, 0))]), 'alu', [mx + 0.02, my + 0.2, mz]),
        m(merge([at(cyl(0.022, 0.05, 'x', 16), 0.17, 0, 0.08), at(cyl(0.022, 0.05, 'x', 16), 0.17, 0, -0.08)]), 'hv', [mx + 0.02, my + 0.2, mz]),
        m(merge([-0.04, 0, 0.04].map((dz) => at(cyl(0.012, 0.06, 'y', 12), -0.1, -0.06, dz))), 'copper', [mx + 0.02, my + 0.2, mz]),
      ],
      { explode: [-0.7, 0.65, 0], specs: [['Input', '≈ 400 V DC'], ['Output', '3-phase AC'], ['Switches', 'Silicon power transistors (IGBT/SiC)']] },
    );
    add(
      'halfshafts',
      'powertrain',
      [
        m(cyl(0.02, zw - 0.1 - (mz + 0.26), 'z'), 'steel', [xDA, r, (zw - 0.1 + mz + 0.26) / 2], { explode: [0, 0, 0.3], anim: { kind: 'spin', axis: 'z', speed: 1 } }),
        m(cyl(0.02, zw - 0.1 + mz + 0.14, 'z'), 'steel', [xDA, r, (-(zw - 0.1) + mz + 0.14) / 2], { explode: [0, 0, -0.3], anim: { kind: 'spin', axis: 'z', speed: 1 } }),
        ...sides.flatMap((side) => [
          m(bellows(0.05, 0.026, 0.1, 5, 'z'), 'rubber', [xDA, r, side * (zw - 0.15)], { rotation: side > 0 ? [0, Math.PI, 0] : [0, 0, 0], explode: [0, 0, side * 0.3] }),
          m(bellows(0.046, 0.026, 0.08, 4, 'z'), 'rubber', [xDA, r, side > 0 ? mz + 0.32 : mz + 0.08], { rotation: side > 0 ? [0, 0, 0] : [0, Math.PI, 0], explode: [0, 0, side * 0.3] }),
        ]),
      ],
      { explode: [-0.7, 0, 0] },
    );

    // Battery: extruded aluminium frame with cross-members, cooling plate, modules, BMS and lid.
    const BL = wb - 0.8;
    const BW = W * 0.78;
    const by = gc + 0.02;
    const nMod = v.modules ?? 12;
    const perRow = Math.ceil(nMod / 2);
    const modX0 = -BL / 2 + 0.08;
    const modX1 = BL / 2 - 0.32;
    const modLen = (modX1 - modX0) / perRow;
    const modW = (BW - 0.16) / 2;
    const sill = (side: number) => merge([at(rbox(BL, 0.12, 0.06, 0.012), 0, 0, 0), at(rbox(BL - 0.02, 0.012, 0.07, 0.004), 0, 0.03, side * 0.002), at(rbox(BL - 0.02, 0.012, 0.07, 0.004), 0, -0.03, side * 0.002)]);
    add(
      'battery-housing',
      'energy',
      [
        m(rbox(BL, 0.02, BW, 0.008), 'alu', [0, by, 0]),
        ...sides.map((side) => m(sill(side), 'alu', [0, by + 0.07, side * (BW / 2 - 0.03)])),
        ...sides.map((side) => m(rbox(0.06, 0.12, BW - 0.1, 0.015), 'alu', [side * (BL / 2 - 0.03), by + 0.07, 0])),
        m(merge([...Array(perRow - 1)].map((_, k) => at(rbox(0.02, 0.1, BW - 0.12, 0.004), modX0 + modLen * (k + 1), 0, 0))), 'alu', [0, by + 0.06, 0]),
        m(rbox(BL - 0.12, 0.1, 0.02, 0.004), 'alu', [0, by + 0.06, 0]),
      ],
      { explode: [0, -1.05, 0], specs: [['Frame', 'Extruded aluminium, crash-absorbing sills']] },
    );
    add('cooling-plate', 'energy', [m(merge([rbox(BL - 0.14, 0.012, BW - 0.14, 0.005), ...[-0.3, -0.1, 0.1, 0.3].map((dz) => at(cyl(0.008, BL - 0.18, 'x', 8), 0, 0.006, dz * (BW / 1.6)))]), 'coolant', [0, by + 0.022, 0])], {
      explode: [0, -0.8, 0],
      specs: [['Coolant', 'Water–glycol'], ['Target', '≈ 25–35 °C']],
    });
    // Each module: aluminium case, black end plates, and copper busbars linking it to its neighbour.
    const cases: THREE.BufferGeometry[] = [];
    const ends: THREE.BufferGeometry[] = [];
    const bars: THREE.BufferGeometry[] = [];
    for (let i = 0; i < nMod; i++) {
      const row = i % 2;
      const col = Math.floor(i / 2);
      const cx = modX0 + modLen * (col + 0.5);
      const cz = (row - 0.5) * modW;
      cases.push(at(rbox(modLen - 0.05, 0.1, modW - 0.02, 0.008), cx, 0, cz));
      for (const s of [-1, 1]) ends.push(at(rbox(0.014, 0.104, modW - 0.03, 0.004), cx + s * (modLen / 2 - 0.02), 0, cz));
      for (const s of [-1, 1]) bars.push(at(box(0.02, 0.006, 0.05), cx + (modLen / 2), 0.045, cz + s * modW * 0.3));
      // Grooves hint at the 24 pouch cells stacked inside.
      for (let k = 1; k < 6; k++) cases.push(at(box(0.004, 0.003, modW - 0.06), cx - modLen / 2 + 0.025 + (k * (modLen - 0.05)) / 6, 0.051, cz));
    }
    add('battery-modules', 'energy', [m(merge(cases), 'alu', [0, by + 0.08, 0]), m(merge(ends), 'trim', [0, by + 0.08, 0]), m(merge(bars), 'copper', [0, by + 0.08, 0])], {
      explode: [0, -0.5, 0],
      specs: [['Capacity', P.battery], ['Layout', P.cells], ['Chemistry', 'Lithium-ion (NMC)'], ['Range', P.range]],
    });
    add(
      'bms',
      'energy',
      [m(merge([rbox(0.18, 0.06, 0.3, 0.01), ...[-0.08, 0.08].map((dz) => at(rbox(0.04, 0.02, 0.06, 0.005), -0.1, 0.01, dz))]), 'darkmetal', [BL / 2 - 0.18, by + 0.07, 0]), m(merge([at(cyl(0.02, 0.06, 'x', 14), 0.09, 0.0, 0.1), at(cyl(0.02, 0.06, 'x', 14), 0.09, 0.0, -0.1)]), 'hv', [BL / 2 - 0.18, by + 0.07, 0])],
      { explode: [0.4, -0.5, 0], specs: [['Watches', 'Voltage and temperature of every cell'], ['Contactors', 'Disconnect the pack when the car is off']] },
    );
    add(
      'battery-cover',
      'energy',
      [m(merge([rbox(BL, 0.02, BW, 0.01), ...[...Array(7)].map((_, k) => at(rbox(BL - 0.2, 0.008, 0.03, 0.004), 0, 0.012, -BW / 2 + 0.15 + (k * (BW - 0.3)) / 6))]), 'alu', [0, by + 0.155, 0])],
      { explode: [0, -0.2, 0] },
    );

    const portPos: V3 = [xRA - 0.3, belt - 0.12, skinZ(xRA - 0.3, belt - 0.12, 0.005)];
    add('charge-port', 'energy', [m(rbox(0.14, 0.14, 0.03, 0.02), 'trim', portPos), m(cyl(0.045, 0.02, 'z'), 'hv', [portPos[0], portPos[1], portPos[2] + 0.015])], {
      explode: [0, 0.6, 0.9],
      specs: [['Standard', 'CCS2 (Type 2 + DC)'], ['AC', P.ac], ['DC', P.dc]],
    });
    const obcPos: V3 = [xRA - 0.45, r + 0.3, 0.3];
    add('obc', 'energy', [m(rbox(0.26, 0.08, 0.3, 0.02), 'alu', obcPos)], { explode: [-0.9, 0.55, 0.3], specs: [['Max. AC power', P.ac]] });
    const hvBattToInv: V3[] = [[-BL / 2 + 0.06, by + 0.14, 0.25], [xDA + 0.3 * dir, r + 0.05, 0.25], [mx + 0.1 * dir, my + 0.2, mz + 0.16]];
    const hvPortToBatt: V3[] = [portPos, [xRA - 0.3, belt - 0.25, W / 2 - 0.2], obcPos, [xRA + 0.25, r + 0.0, 0.5], [-BL / 2 + 0.06, by + 0.12, 0.5]];
    const hvFront: V3[] = [[BL / 2 - 0.05, by + 0.12, -0.3], [xFA - 0.3, r + 0.0, -0.3], [xFA + 0.3, r + 0.12, -0.15]];
    add('hv-cables', 'energy', [m(pipe(hvBattToInv, 0.016), 'hv'), m(pipe(hvPortToBatt, 0.016), 'hv'), m(pipe(hvFront, 0.014), 'hv')], {
      explode: [0, -0.2, 0],
      specs: [['Voltage', '≈ 400 V DC']],
    });

    // Thermal & electrical
    add('radiator-ev', 'thermal', [m(rbox(0.035, 0.3, W * 0.45, 0.01), 'radiator', [xf - 0.18, r + 0.04, 0])], { explode: [1.25, 0.2, 0] });
    add(
      'heat-pump',
      'thermal',
      // A front motor takes the middle of the bay, so the heat pump moves out to the sides.
      [m(rbox(0.25, 0.18, 0.35, 0.03), 'alu', [xFA + 0.3, r + 0.2, front ? 0.33 : 0.25]), m(cyl(0.07, 0.2, 'z'), 'darkmetal', front ? [xFA + 0.45, r + 0.1, -0.4] : [xFA + 0.3, r + 0.1, -0.15])],
      { explode: [0.8, 0.5, 0.3], specs: [['Refrigerant', 'CO₂ (R744)']] },
    );
    add('battery-12v', 'electrical', [m(rbox(0.18, 0.17, 0.24, 0.015), 'trim', [xf - 0.62, r + 0.28, -0.4])], { explode: [0.8, 0.6, -0.4] });
    add('dcdc', 'electrical', [m(rbox(0.2, 0.07, 0.24, 0.015), 'alu', [xFA + 0.12, r + 0.34, -0.12])], { explode: [0.5, 0.75, -0.2], specs: [['Conversion', '≈ 400 V → 12 V']] });

    // Flows
    const wheelL: V3 = [xDA, r, -zw];
    const wheelR: V3 = [xDA, r, zw];
    const gearPos: V3 = [xDA - 0.08 * dir, r + 0.02, mz + 0.2];
    const invPos: V3 = [mx + 0.02, my + 0.2, mz];
    const coolingIn: V3 = [BL / 2 - 0.1, by + 0.03, 0];
    flows.charge = { id: 'charge', label: 'Charging current', color: '#22c55e', paths: [hvPortToBatt, [[0, by + 0.1, 0.5], [0, by + 0.1, -0.2]]] };
    flows['hv-dc'] = { id: 'hv-dc', label: 'DC from battery', color: '#ff7a00', paths: [[[0, by + 0.1, 0.25], ...hvBattToInv, invPos]] };
    flows['hv-ac'] = { id: 'hv-ac', label: '3-phase AC', color: '#c084fc', paths: [[invPos, [mx, my + 0.12, mz], M]] };
    flows.torque = {
      id: 'torque',
      label: 'Torque',
      color: '#f8fafc',
      paths: [
        [M, gearPos, [xDA, r, mz + 0.26], wheelR],
        [[xDA, r, mz + 0.14], [xDA, r, mz], wheelL],
      ],
    };
    flows.regen = {
      id: 'regen',
      label: 'Recovered energy',
      color: '#2dd4bf',
      paths: [
        [wheelR, [xDA, r, mz + 0.26], gearPos, M, invPos, ...[...hvBattToInv].reverse(), [0, by + 0.1, 0.25]],
        [wheelL, [xDA, r, mz], M],
      ],
    };
    flows.coolant = {
      id: 'coolant',
      label: 'Coolant',
      color: '#3b82f6',
      paths: [[[xf - 0.18, r + 0.1, 0.2], [xFA + 0.3, r + 0.15, 0.25], [BL / 2 + 0.05, by + 0.05, 0.2], coolingIn, [-BL / 2 + 0.1, by + 0.03, 0], [xDA + 0.15 * dir, r, -0.3], [mx, my, mz - 0.1]]],
    };
    flows.lv = {
      id: 'lv',
      label: '12 V supply',
      color: '#facc15',
      paths: [[[BL / 2 - 0.05, by + 0.12, -0.3], [xFA - 0.3, r + 0.05, -0.25], [xFA + 0.12, r + 0.34, -0.12], [xf - 0.62, r + 0.3, -0.4]]],
    };
    servicePoints(xFA - 0.3, [xFA - 0.15, r + 0.42, -0.6]);
  }

  return { vehicle: v, parts, flows, offsetX: -(xf + xr) / 2 };
}

/** Containers that turn see-through when one of their inner parts is selected. */
export const CONTAINERS: Record<string, string[]> = {
  pistons: ['engine-block', 'cylinder-head'],
  crankshaft: ['engine-block'],
  'motor-rotor': ['motor-stator'],
  'battery-modules': ['battery-cover'],
  'cooling-plate': ['battery-cover', 'battery-modules'],
  bms: ['battery-cover'],
};
