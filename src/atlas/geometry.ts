import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export type P2 = [number, number];
export type V3 = [number, number, number];
export type Axis = 'x' | 'y' | 'z';

/** Sutherland–Hodgman clip of a polygon against an axis-aligned rectangle. */
export function clipRect(poly: P2[], xmin: number, xmax: number, ymin: number, ymax: number): P2[] {
  const planes: [(p: P2) => boolean, (a: P2, b: P2) => P2][] = [
    [(p) => p[0] >= xmin, (a, b) => lerpAt(a, b, 0, xmin)],
    [(p) => p[0] <= xmax, (a, b) => lerpAt(a, b, 0, xmax)],
    [(p) => p[1] >= ymin, (a, b) => lerpAt(a, b, 1, ymin)],
    [(p) => p[1] <= ymax, (a, b) => lerpAt(a, b, 1, ymax)],
  ];
  let out = poly;
  for (const [inside, cut] of planes) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i];
      const prev = input[(i + input.length - 1) % input.length];
      if (inside(cur)) {
        if (!inside(prev)) out.push(cut(prev, cur));
        out.push(cur);
      } else if (inside(prev)) {
        out.push(cut(prev, cur));
      }
    }
    if (out.length < 3) return [];
  }
  return out;
}

function lerpAt(a: P2, b: P2, axis: 0 | 1, v: number): P2 {
  const t = (v - a[axis]) / (b[axis] - a[axis]);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Turns an open polyline into a closed strip of the given thickness, offset to its left side. */
export function strip(line: P2[], thickness: number): P2[] {
  const offset: P2[] = line.map((p, i) => {
    const a = line[Math.max(i - 1, 0)];
    const b = line[Math.min(i + 1, line.length - 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    return [p[0] - (dy / len) * thickness, p[1] + (dx / len) * thickness];
  });
  return [...line, ...offset.reverse()];
}

export function shiftPts(pts: P2[], dx: number, dy: number): P2[] {
  return pts.map(([x, y]) => [x + dx, y + dy]);
}

/** Extrudes a side profile (x/y plane) symmetrically across z. */
export function extrude(pts: P2[], depth: number, bevel = 0.02, crease = 0.7): THREE.BufferGeometry {
  if (pts.length < 3) return new THREE.BufferGeometry();
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const core = Math.max(depth - bevel * 2, 0.002);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: core,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 3,
    curveSegments: 8,
  });
  g.translate(0, 0, -core / 2);
  return toCreasedNormals(g, crease);
}

export function rbox(w: number, h: number, d: number, r = 0.015): THREE.BufferGeometry {
  const radius = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  return new RoundedBoxGeometry(w, h, d, 2, Math.max(radius, 0.001));
}

export function box(w: number, h: number, d: number): THREE.BufferGeometry {
  return new THREE.BoxGeometry(w, h, d);
}

/** Cylinder whose axis runs along the given world axis. */
export function cyl(r: number, len: number, axis: Axis = 'y', segs = 24, rTop = r): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rTop, r, len, segs);
  if (axis === 'x') g.rotateZ(Math.PI / 2);
  if (axis === 'z') g.rotateX(Math.PI / 2);
  return g;
}

export function torus(r: number, tube: number, axis: Axis = 'z', segs = 32): THREE.BufferGeometry {
  const g = new THREE.TorusGeometry(r, tube, 12, segs);
  if (axis === 'x') g.rotateY(Math.PI / 2);
  if (axis === 'y') g.rotateX(Math.PI / 2);
  return g;
}

export function sphere(r: number): THREE.BufferGeometry {
  return new THREE.SphereGeometry(r, 16, 12);
}

function toAxis(g: THREE.BufferGeometry, axis: Axis): THREE.BufferGeometry {
  if (axis === 'x') g.rotateZ(-Math.PI / 2);
  if (axis === 'z') g.rotateX(Math.PI / 2);
  return g;
}

/** Solid of revolution from a [radius, height] profile, axis along the given world axis. */
export function lathe(profile: P2[], axis: Axis = 'y', segs = 32): THREE.BufferGeometry {
  return toAxis(new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), segs), axis);
}

/** Slice of a cylinder (a pie wedge), axis along z, centred on angle `mid` (0 = +x, π/2 = +y). */
export function sector(r: number, len: number, mid: number, span: number, segs = 16): THREE.BufferGeometry {
  // Cylinder theta starts at +z; once the axis is turned to z, theta = 0 points at -y.
  const g = new THREE.CylinderGeometry(r, r, len, segs, 1, false, mid - span / 2 + Math.PI / 2, span);
  g.rotateX(Math.PI / 2);
  return g;
}

/** Snail-shell housing of a turbocharger stage: a ring that swells around the axis (z). */
export function volute(r: number, tube: number, segs = 28): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  const turns = 0.9;
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * turns * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const g = new THREE.TubeGeometry(curve, segs * 2, tube, 12, false);
  // Grow the tube along its length so the scroll widens towards the outlet.
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const rings = segs * 2 + 1;
  for (let i = 0; i < pos.count; i++) {
    const ring = Math.floor(i / 13);
    const t = ring / (rings - 1);
    v.fromBufferAttribute(pos, i);
    const c = curve.getPointAt(Math.min(t, 1));
    v.sub(c).multiplyScalar(0.55 + 0.6 * t).add(c);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Rubber CV-joint boot: a bellows along the given axis, wide end at -len/2. */
export function bellows(r0: number, r1: number, len: number, folds = 5, axis: Axis = 'z'): THREE.BufferGeometry {
  const prof: P2[] = [[0.001, -len / 2]];
  const n = folds * 2;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const base = r0 + (r1 - r0) * t;
    prof.push([base * (i % 2 ? 0.82 : 1), -len / 2 + t * len]);
  }
  prof.push([0.001, len / 2]);
  return lathe(prof, axis, 24);
}

/** Tube along a smooth path through the given points. */
export function pipe(points: V3[], radius: number, tension = 0.2): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', tension);
  return new THREE.TubeGeometry(curve, Math.max(points.length * 12, 24), radius, 10, false);
}

class Helix extends THREE.Curve<THREE.Vector3> {
  constructor(private r: number, private h: number, private turns: number) {
    super();
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const a = t * this.turns * Math.PI * 2;
    return target.set(Math.cos(a) * this.r, t * this.h - this.h / 2, Math.sin(a) * this.r);
  }
}

/** Coil spring standing along y, centred on the origin. */
export function spring(r: number, h: number, turns: number, wire: number): THREE.BufferGeometry {
  return new THREE.TubeGeometry(new Helix(r, h, turns), turns * 24, wire, 6, false);
}

/** Tyre: a lathed rounded-rectangle cross section, axle along z. */
export function tyre(outerR: number, innerR: number, width: number): THREE.BufferGeometry {
  const w = width / 2;
  const c = Math.min(0.035, (outerR - innerR) * 0.35);
  const pts = [
    new THREE.Vector2(innerR, -w + 0.01),
    new THREE.Vector2(outerR - c, -w),
    new THREE.Vector2(outerR - c * 0.3, -w + c * 0.4),
    new THREE.Vector2(outerR, -w + c),
    new THREE.Vector2(outerR, w - c),
    new THREE.Vector2(outerR - c * 0.3, w - c * 0.4),
    new THREE.Vector2(outerR - c, w),
    new THREE.Vector2(innerR, w - 0.01),
  ];
  const g = new THREE.LatheGeometry(pts, 48);
  g.rotateX(Math.PI / 2);
  return g;
}

/** Five-spoke alloy rim, axle along z, face pointing towards +z. */
export function rim(r: number, width: number, spokes = 5): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const barrel = new THREE.CylinderGeometry(r, r, width * 0.9, 36, 1, true);
  barrel.rotateX(Math.PI / 2);
  parts.push(barrel);
  const hub = new THREE.CylinderGeometry(r * 0.22, r * 0.22, 0.06, 20);
  hub.rotateX(Math.PI / 2);
  hub.translate(0, 0, width * 0.32);
  parts.push(hub);
  for (let i = 0; i < spokes; i++) {
    const s = new THREE.BoxGeometry(r * 0.16, r * 0.82, 0.03);
    s.translate(0, r * 0.55, width * 0.34);
    s.rotateZ((i / spokes) * Math.PI * 2);
    parts.push(s);
  }
  return mergeGeometries(parts.map((g) => g.toNonIndexed()), false) ?? barrel;
}

export function merge(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  return mergeGeometries(geos.map((g) => (g.index ? g.toNonIndexed() : g)), false) ?? geos[0];
}

/** Returns a copy of a geometry translated by an offset — handy for merging. */
export function at(g: THREE.BufferGeometry, x: number, y: number, z: number): THREE.BufferGeometry {
  g.translate(x, y, z);
  return g;
}

/**
 * Wheel-arch cut-out along the underside of a profile, walked from rear (-x) to front (+x):
 * starts where the circle meets the sill line, goes over the top and comes back down.
 */
export function arch(cx: number, cy: number, r: number, groundY: number, segs = 16): P2[] {
  const s = Math.asin(Math.max(-1, Math.min(1, (groundY - cy) / r)));
  const start = Math.PI - s;
  const end = s;
  const out: P2[] = [];
  for (let i = 0; i <= segs; i++) {
    const a = start + (end - start) * (i / segs);
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}
