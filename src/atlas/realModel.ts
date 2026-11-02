import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { Vehicle } from '../data/vehicles';
import type { SystemId } from '../data/systems';
import { contentFor } from '../data/content';
import type { V3 } from './geometry';
import { SYSTEM_EXPLODE, type BuiltCar, type Part } from './buildCar';

/** Sits next to each model as public/models/<vehicle id>.json. */
export interface ModelMeta {
  title: string;
  author: string;
  license: string;
  url: string;
  note?: string;
  /** Rotation about y (radians) that points the nose at +x. Detected when omitted. */
  yaw?: number;
  /** Turn the detected orientation round, for models the detection gets backwards. */
  flip?: boolean;
}

export interface RealPart {
  id: string;
  system: SystemId;
  object: THREE.Group;
  center: V3;
}

/** The bonnet as a line in side view: hinged at the base of the windscreen, ending at the nose. */
export interface Bonnet {
  hinge: [number, number];
  front: [number, number];
}

export interface RealModel {
  meta: ModelMeta;
  parts: RealPart[];
  bonnet: Bonnet;
}

type Kind = 'drop' | 'body' | 'glass' | 'light' | 'wheel' | 'brake' | 'cabin';

const DROP = /ground|floor|shadow|backdrop|studio|turntable|\bplane\b|engine|motor(?!way)|licen[cs]e.?plate|number.?plate|kennzeichen/;
const LIGHT = /head.?l(ight|amp)|tail.?l(ight|amp)|brake.?light|stop.?light|\bdrl\b|indicator|blinker|turn.?signal|reflector|\blamp|\bled\b|lightbar|light.?strip/;
const BRAKE = /calip|calliper|brake|bremse|\bdisc\b|\bdisk\b/;
const WHEEL = /wheel|tyre|tire|(?<![tp])rim|felge|reifen|\bhub\b|lug.?nut|valve|^w\d\b/;
const NOT_WHEEL = /steer|arch|well|liner|house|spare/;
const CABIN = /interior|seat|dash|steer|cabin|inner|carpet|pedal|console|door.?(card|panel|trim)|headliner|belt|gear.?(lever|knob|shift)|display|screen|speaker|vent/;
const GLASS = /glass|window|windscreen|windshield|scheibe|glazing/;
const PAINT = /paint|lack|\bbody\b|carpaint|exterior.?colou?r/;

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = new Map<string, Promise<RealModel | null>>();

/** Loads public/models/<id>.glb if it exists; resolves null when the car has no real model. */
export function loadRealModel(v: Vehicle, onProgress?: (fraction: number) => void): Promise<RealModel | null> {
  let p = cache.get(v.id);
  if (!p) {
    p = load(v, onProgress).catch((err) => {
      console.error(`Could not load the 3D model for ${v.name}:`, err);
      cache.delete(v.id);
      return null;
    });
    cache.set(v.id, p);
  }
  return p;
}

async function load(v: Vehicle, onProgress?: (fraction: number) => void): Promise<RealModel | null> {
  const base = `${import.meta.env.BASE_URL}models/${v.id}`;
  const res = await fetch(`${base}.json`);
  // The dev server answers unknown paths with index.html, so check what came back.
  if (!res.ok || !res.headers.get('content-type')?.includes('json')) return null;
  const meta = (await res.json()) as ModelMeta;
  const gltf = await loader.loadAsync(`${base}.glb`, (e) => e.total && onProgress?.(e.loaded / e.total));
  return prepare(gltf.scene, gltf.animations, v, meta);
}

interface Item {
  mesh: THREE.Mesh;
  kind: Kind;
  paint: boolean;
  box: THREE.Box3;
}

/** Describes a mesh by its own name, its ancestors' names and its material names. */
function label(mesh: THREE.Mesh): string {
  const names: string[] = [];
  for (let o: THREE.Object3D | null = mesh; o; o = o.parent) names.push(o.name);
  for (const m of materials(mesh)) names.push(m.name);
  return names.join(' ').toLowerCase().replace(/[_.:-]+/g, ' ');
}

function materials(mesh: THREE.Mesh): THREE.Material[] {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function isClear(mesh: THREE.Mesh): boolean {
  return materials(mesh).some((m) => {
    const s = m as THREE.MeshPhysicalMaterial;
    return (s.transmission ?? 0) > 0.2 || (m.transparent && m.opacity < 0.7);
  });
}

function classify(mesh: THREE.Mesh): Omit<Item, 'box'> {
  const s = label(mesh);
  const own = `${mesh.name} ${mesh.parent?.name ?? ''}`.toLowerCase();
  if (DROP.test(s) && !/glass|window|wheel/.test(own)) return { mesh, kind: 'drop', paint: false };
  if (BRAKE.test(s) && !/light/.test(s)) return { mesh, kind: 'brake', paint: false };
  if (WHEEL.test(s) && !NOT_WHEEL.test(s)) return { mesh, kind: 'wheel', paint: false };
  if (CABIN.test(s)) return { mesh, kind: 'cabin', paint: false };
  if (LIGHT.test(s)) return { mesh, kind: 'light', paint: false };
  if (GLASS.test(s) || isClear(mesh)) return { mesh, kind: 'glass', paint: false };
  return { mesh, kind: 'body', paint: PAINT.test(s) };
}

function boxOf(items: Item[]): THREE.Box3 {
  const b = new THREE.Box3();
  for (const i of items) b.union(i.box);
  return b;
}

/** Splits wheel meshes into the four corners; returns null unless all four are populated. */
function corners(items: Item[], mid: THREE.Vector3) {
  const groups: Item[][] = [[], [], [], []];
  for (const i of items) {
    const c = i.box.getCenter(new THREE.Vector3());
    groups[(c.x > mid.x ? 0 : 2) + (c.z > mid.z ? 0 : 1)].push(i);
  }
  if (groups.some((g) => g.length === 0)) return null;
  const boxes = groups.map(boxOf);
  const centers = boxes.map((b) => b.getCenter(new THREE.Vector3()));
  return {
    groups,
    centers,
    frontX: (centers[0].x + centers[1].x) / 2,
    rearX: (centers[2].x + centers[3].x) / 2,
    bottom: Math.min(...boxes.map((b) => b.min.y)),
  };
}

function prepare(scene: THREE.Group, clips: THREE.AnimationClip[], v: Vehicle, meta: ModelMeta): RealModel {
  // Models with door animations: pose them at frame 0 (doors shut) before reading transforms.
  if (clips.length) {
    const mixer = new THREE.AnimationMixer(scene);
    for (const c of clips) mixer.clipAction(c).play();
    mixer.setTime(0);
  }

  const wrapper = new THREE.Group();
  wrapper.add(scene);
  const measure = (): Item[] => {
    wrapper.updateMatrixWorld(true);
    return items.map((i) => ({ ...i, box: new THREE.Box3().setFromObject(i.mesh) }));
  };

  let items: Item[] = [];
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) items.push({ ...classify(mesh), box: new THREE.Box3() });
  });
  for (const i of items) if (i.kind === 'drop') i.mesh.removeFromParent();
  items = items.filter((i) => i.kind !== 'drop');

  // ── Orientation: length along x, nose towards +x ──────────────────────
  items = measure();
  const size = boxOf(items).getSize(new THREE.Vector3());
  wrapper.rotation.y = meta.yaw ?? (size.z > size.x ? Math.PI / 2 : 0);
  items = measure();
  findWheelsByShape(items);
  if (meta.yaw === undefined && pointsBackwards(items, v) !== !!meta.flip) {
    wrapper.rotation.y += Math.PI;
    items = measure();
  }

  // ── Scale to the real car and put the axles where the atlas expects them ─
  const all = boxOf(items);
  const mid = all.getCenter(new THREE.Vector3());
  const wheels = corners(items.filter((i) => i.kind === 'wheel'), mid);
  const lengthScale = v.dims.length / (all.max.x - all.min.x);
  let scale = lengthScale;
  let axleMid = mid.x;
  let ground = all.min.y;
  if (wheels) {
    const s = v.dims.wheelbase / (wheels.frontX - wheels.rearX);
    // Trust the wheels unless they disagree badly with the overall length.
    if (Math.abs(s / lengthScale - 1) < 0.08) {
      scale = s;
      axleMid = (wheels.frontX + wheels.rearX) / 2;
    }
    ground = wheels.bottom;
  }
  const root = new THREE.Group();
  root.add(wrapper);
  root.scale.setScalar(scale);
  root.position.set(-axleMid * scale, -ground * scale, -mid.z * scale);
  root.updateMatrixWorld(true);
  items = items.map((i) => ({ ...i, box: new THREE.Box3().setFromObject(i.mesh) }));
  // Add ?debug to the URL to see how each mesh of a new model was classified.
  if (location.search.includes('debug')) {
    const r = (x: THREE.Vector3) => x.toArray().map((n) => +n.toFixed(2));
    console.log(`MODEL ${v.id} ` + JSON.stringify(items.map((i) => [i.kind, label(i.mesh).slice(0, 70), r(i.box.getCenter(new THREE.Vector3())), r(i.box.getSize(new THREE.Vector3()))])));
  }

  const bonnet = findBonnet(items.filter((i) => i.kind === 'body' || i.kind === 'glass' || i.kind === 'light').map((i) => i.mesh), v);

  // ── Regroup meshes into atlas parts ────────────────────────────────────
  const groups = new Map<string, { system: SystemId; object: THREE.Group; mats: Map<THREE.Material, THREE.Material> }>();
  const group = (id: string, system: SystemId) => {
    let g = groups.get(id);
    if (!g) {
      g = { system, object: new THREE.Group(), mats: new Map() };
      g.object.name = id;
      groups.set(id, g);
    }
    return g;
  };
  const place = (i: Item, id: string, system: SystemId, parent?: THREE.Object3D) => {
    const g = group(id, system);
    (parent ?? g.object).attach(i.mesh);
    // Each part gets its own material copies so it can be ghosted or highlighted alone.
    i.mesh.material = Array.isArray(i.mesh.material) ? i.mesh.material.map((m) => own(g.mats, m, i.paint)) : own(g.mats, i.mesh.material, i.paint);
    i.mesh.castShadow = true;
    i.mesh.receiveShadow = true;
  };

  const finalMid = boxOf(items).getCenter(new THREE.Vector3());
  const finalWheels = corners(items.filter((i) => i.kind === 'wheel'), new THREE.Vector3(0, 0, finalMid.z));
  if (finalWheels) {
    const wheelGroup = group('wheels', 'wheels').object;
    finalWheels.groups.forEach((g, k) => {
      const pivot = new THREE.Group();
      pivot.position.copy(finalWheels.centers[k]);
      pivot.userData.spin = true;
      pivot.userData.explode = [0, 0, Math.sign(finalWheels.centers[k].z) * 0.7];
      wheelGroup.add(pivot);
      pivot.updateMatrixWorld(true);
      for (const i of g) place(i, 'wheels', 'wheels', pivot);
    });
  }

  const xMax = boxOf(items).max.x;
  const xMin = boxOf(items).min.x;
  for (const i of items) {
    const c = i.box.getCenter(new THREE.Vector3());
    switch (i.kind) {
      case 'wheel':
        if (!finalWheels) place(i, 'wheels', 'wheels');
        break;
      case 'brake':
        place(i, c.x > 0 ? 'brakes-front' : 'brakes-rear', 'wheels');
        break;
      case 'cabin':
        place(i, 'cabin', 'interior');
        break;
      case 'light':
        place(i, c.x > 0 ? 'headlights' : 'taillights', 'lighting');
        break;
      case 'glass': {
        // Lamp lenses are clear too: small, low pieces at the very ends of the car.
        const size = i.box.getSize(new THREE.Vector3());
        const atEnd = c.x > xMax - 0.55 || c.x < xMin + 0.55;
        if (atEnd && size.x < 0.6 && size.y < 0.35 && c.y < v.dims.height * 0.7) place(i, c.x > 0 ? 'headlights' : 'taillights', 'lighting');
        else place(i, 'glazing', 'glass');
        break;
      }
      default:
        place(i, 'body', 'body');
    }
  }
  paintFallback(groups.get('body'));

  const parts: RealPart[] = [];
  for (const [id, g] of groups) {
    const c = new THREE.Box3().setFromObject(g.object).getCenter(new THREE.Vector3());
    g.object.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.userData.partId = id;
    });
    parts.push({ id, system: g.system, object: g.object, center: [c.x, c.y, c.z] });
  }
  return { meta, parts, bonnet };
}

/**
 * Calls fn with every vertex of the given meshes where it is actually drawn — after skinning and
 * morphs (some exports are skinned), then the (already updated) world matrix.
 */
function eachVertex(meshes: THREE.Mesh[], fn: (p: THREE.Vector3) => void, stride = 1) {
  const p = new THREE.Vector3();
  for (const mesh of meshes) {
    const n = mesh.geometry.getAttribute('position').count;
    for (let i = 0; i < n; i += stride) fn(mesh.getVertexPosition(i, p).applyMatrix4(mesh.matrixWorld));
  }
}

/**
 * Walks back from the nose along the centre line, tracking the top of the car in 4 cm slices.
 * The bonnet rises gently; the windscreen rises steeply — where that happens is the hinge.
 * Works whatever the windscreen's material was classified as.
 */
function findBonnet(shell: THREE.Mesh[], v: Vehicle): Bonnet {
  const bin = 0.04;
  const top = new Map<number, number>();
  let noseX = -Infinity;
  eachVertex(shell, (p) => {
    if (p.x > noseX) noseX = p.x;
    if (Math.abs(p.z) > 0.3) return;
    const k = Math.floor(p.x / bin);
    top.set(k, Math.max(top.get(k) ?? -Infinity, p.y));
  }, 2);
  const kNose = Math.floor(noseX / bin);
  // Highest point of three neighbouring slices, which fills gaps in the sampled vertices.
  const at = (k: number) => {
    const m = Math.max(top.get(k - 1) ?? -Infinity, top.get(k) ?? -Infinity, top.get(k + 1) ?? -Infinity);
    return Number.isFinite(m) ? m : undefined;
  };
  let hinge: [number, number] | null = null;
  for (let k = kNose - 11; k > kNose - 70; k--) {
    const here = at(k);
    const behind = at(k - 8);
    // A sustained rise (13 cm over the next 32 cm) is the windscreen, not a wiper or a crease.
    if (here !== undefined && behind !== undefined && behind - here > 0.13) {
      hinge = [k * bin, here];
      break;
    }
  }
  let frontY = -Infinity;
  for (let k = Math.floor((noseX - 0.35) / bin); k <= Math.floor((noseX - 0.2) / bin); k++) frontY = Math.max(frontY, at(k) ?? -Infinity);
  if (!Number.isFinite(frontY)) frontY = v.dims.height * 0.55;
  const axle = v.dims.wheelbase / 2;
  if (!hinge || hinge[1] < frontY || hinge[0] < axle - 1.3 || hinge[0] > axle + 0.3) hinge = [axle - 0.45, v.dims.height * 0.68];
  return { hinge, front: [noseX - 0.2, frontY] };
}

/**
 * For models whose names say nothing: a wheel is round in side view, about a sixth of the car's
 * length across, narrower than it is tall, low down and out at the side. Groups (a mesh's parent)
 * are tested first so a tyre, rim and hub cap stay together.
 */
function findWheelsByShape(items: Item[]) {
  const all = boxOf(items);
  const mid = all.getCenter(new THREE.Vector3());
  if (corners(items.filter((i) => i.kind === 'wheel'), mid)) return;
  const size = all.getSize(new THREE.Vector3());
  const looksLikeWheel = (b: THREE.Box3) => {
    const s = b.getSize(new THREE.Vector3());
    const c = b.getCenter(new THREE.Vector3());
    const d = Math.max(s.x, s.y);
    return (
      Math.abs(s.x - s.y) < 0.12 * d &&
      d > 0.09 * size.x &&
      d < 0.2 * size.x &&
      s.z < 0.6 * d &&
      c.y - all.min.y < 0.12 * size.x &&
      Math.abs(c.z - mid.z) > 0.2 * size.z
    );
  };
  const byParent = new Map<THREE.Object3D | null, Item[]>();
  for (const i of items) {
    const list = byParent.get(i.mesh.parent) ?? [];
    list.push(i);
    byParent.set(i.mesh.parent, list);
  }
  for (const group of byParent.values()) {
    if (looksLikeWheel(boxOf(group))) {
      for (const i of group) i.kind = 'wheel';
    } else {
      for (const i of group) if (i.kind === 'body' && looksLikeWheel(i.box)) i.kind = 'wheel';
    }
  }
}

/**
 * True when the nose points at -x. The steering wheel sits ahead of the cabin centre;
 * without one, compare front and rear overhangs with the real car's.
 */
function pointsBackwards(items: Item[], v: Vehicle): boolean {
  const all = boxOf(items);
  const mid = all.getCenter(new THREE.Vector3());
  const steer = items.filter((i) => /steer/.test(label(i.mesh)));
  if (steer.length) return boxOf(steer).getCenter(new THREE.Vector3()).x < mid.x;
  const w = corners(items.filter((i) => i.kind === 'wheel'), mid);
  if (!w) return false;
  const fo = v.dims.frontOverhang;
  const ro = v.dims.length - v.dims.wheelbase - fo;
  const front = all.max.x - w.frontX;
  const rear = w.rearX - all.min.x;
  return (front - rear) * (fo - ro) < 0;
}

/** Copies a material for one part, upgrading body paint to a clear-coated finish. */
function own(map: Map<THREE.Material, THREE.Material>, m: THREE.Material, paint: boolean): THREE.Material {
  let c = map.get(m);
  if (!c) {
    c = paint ? toPaint(m) : m.clone();
    const s = c as THREE.MeshStandardMaterial;
    c.userData.base = {
      opacity: c.opacity,
      transparent: c.transparent,
      depthWrite: c.depthWrite,
      emissive: s.emissive?.clone(),
      emissiveIntensity: s.emissiveIntensity,
    };
    map.set(m, c);
  }
  return c;
}

function toPaint(m: THREE.Material, force = false): THREE.Material {
  const s = m as THREE.MeshStandardMaterial;
  // Very dark "paint" is usually a black roof or trim, which should keep its colour —
  // unless the whole car turns out to be black (see paintFallback).
  if (!s.color || (!force && luminance(s.color) < 0.02)) {
    const c = m.clone();
    c.userData.darkPaint = true;
    return c;
  }
  const p = new THREE.MeshPhysicalMaterial({
    name: m.name,
    color: s.color.clone(),
    map: s.map,
    normalMap: s.normalMap,
    metalness: 0.45,
    roughness: 0.32,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.3,
  });
  p.userData.paint = true;
  return p;
}

function luminance(c: THREE.Color): number {
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

/** Without a material named like paint, the most-used light, untextured body colour is the paint. */
function paintFallback(body: { object: THREE.Group; mats: Map<THREE.Material, THREE.Material> } | undefined) {
  if (!body) return;
  const all = [...body.mats.values()];
  if (all.some((m) => m.userData.paint)) return;
  const area = new Map<THREE.Material, number>();
  const darkOnly = all.some((m) => m.userData.darkPaint);
  body.object.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    const s = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());
    area.set(mesh.material, (area.get(mesh.material) ?? 0) + s.x * s.y + s.y * s.z + s.x * s.z);
  });
  let best: THREE.Material | null = null;
  for (const [m, a] of area) {
    const s = m as THREE.MeshStandardMaterial;
    if (darkOnly ? !m.userData.darkPaint : !s.color || s.map || m.transparent || luminance(s.color) < 0.02) continue;
    if (!best || a > area.get(best)!) best = m;
  }
  if (!best) return;
  const paint = toPaint(best, true);
  paint.userData.base = best.userData.base;
  body.object.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && mesh.material === best) mesh.material = paint;
  });
}

/**
 * Schematic parts that a real model draws better, each with the real parts that can stand in
 * for it (first one present wins). References to them — tours, links — are redirected.
 */
const REPLACES: Record<string, string[]> = {
  biw: ['body'],
  hood: ['body'],
  roof: ['body'],
  'doors-front': ['body'],
  'doors-rear': ['body'],
  tailgate: ['body'],
  'bumper-front': ['body'],
  'bumper-rear': ['body'],
  grille: ['body'],
  mirrors: ['body'],
  glazing: ['glazing', 'body'],
  headlights: ['headlights', 'body'],
  taillights: ['taillights', 'body'],
  lightbar: ['taillights', 'body'],
  wheels: ['wheels'],
  'brakes-front': ['brakes-front', 'wheels'],
  'brakes-rear': ['brakes-rear', 'wheels'],
  // The schematic cabin stays when the model has no interior of its own.
  'seats-front': ['cabin'],
  'seats-rear': ['cabin'],
  dashboard: ['cabin'],
  'steering-wheel': ['cabin'],
  displays: ['cabin'],
  console: ['cabin'],
};

/** Swaps the schematic shell for the real model, keeping the schematic mechanicals inside it. */
export function withRealModel(car: BuiltCar, real: RealModel): BuiltCar {
  const provided = new Set(real.parts.map((p) => p.id));
  const alias: Record<string, string> = {};
  for (const [from, to] of Object.entries(REPLACES)) {
    const hit = to.find((id) => provided.has(id));
    if (hit) alias[from] = hit;
  }
  const kept = car.parts.filter((p) => !alias[p.id]);
  const added: Part[] = real.parts.map((rp) => {
    const old = car.parts.find((p) => p.id === rp.id);
    const c = contentFor(rp.id, car.vehicle);
    return {
      id: rp.id,
      name: old?.name ?? c?.name ?? rp.id,
      system: rp.system,
      summary: c?.summary ?? '',
      how: c?.how ?? '',
      only: c?.only,
      diagram: c?.diagram,
      check: c?.check,
      specs: old?.specs ?? [],
      meshes: [],
      object: rp.object,
      explode: old?.explode ?? SYSTEM_EXPLODE[rp.system],
      center: rp.center,
    };
  });
  return { ...car, parts: [...added, ...kept], alias, model: real.meta, bonnet: real.bonnet };
}

/** The machinery alone, shown while a real model is still loading. */
export function withoutShell(car: BuiltCar): BuiltCar {
  return { ...car, parts: car.parts.filter((p) => !REPLACES[p.id]) };
}
