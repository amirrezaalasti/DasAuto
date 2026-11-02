import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { BuiltCar, MeshSpec, Part } from '../atlas/buildCar';
import type { V3 } from '../atlas/geometry';
import { MATERIALS } from '../atlas/materials';

export type Look = 'normal' | 'ghost' | 'dim' | 'hidden';
export type Glow = 'selected' | 'hover' | 'focus' | 'ice' | 'ev' | null;

export interface PartVisual {
  look: Look;
  glow: Glow;
}

const GLOW: Record<Exclude<Glow, null>, [string, number]> = {
  selected: ['#4c8dff', 0.32],
  hover: ['#4c8dff', 0.16],
  focus: ['#ffb347', 0.3],
  ice: ['#f08a3c', 0.45],
  ev: ['#3fbf7f', 0.45],
};

/** Raised in exploded view so parts pushed downwards stay above the ground. */
export const EXPLODE_LIFT = 0.95;

interface Props {
  car: BuiltCar;
  paint: string;
  visuals: Record<string, PartVisual>;
  exploded: boolean;
  running: boolean;
  /** Mechanic view: the bonnet swings open. */
  bonnetOpen: boolean;
  onPick: (id: string | null) => void;
  onHover: (id: string | null) => void;
}

interface Live {
  obj: THREE.Mesh;
  spec: MeshSpec;
  part: Part;
}

type Register = (key: string, part: Part, spec: MeshSpec) => (obj: THREE.Mesh | null) => void;

export function CarModel({ car, paint, visuals, exploded, running, bonnetOpen, onPick, onHover }: Props) {
  const live = useRef<Map<string, Live>>(new Map());
  const progress = useRef(exploded ? 1 : 0);
  const theta = useRef(0);
  const hoverId = useRef<string | null>(null);

  useFrame((_, dt) => {
    const target = exploded ? 1 : 0;
    progress.current += (target - progress.current) * Math.min(1, dt * 3.5);
    if (Math.abs(target - progress.current) < 1e-4) progress.current = target;
    if (running) theta.current += dt * 5.5;
    const p = progress.current;
    const th = theta.current;
    for (const { obj, spec, part } of live.current.values()) {
      const e = spec.explode;
      obj.position.set(
        spec.position[0] + (part.explode[0] + (e?.[0] ?? 0)) * p,
        spec.position[1] + (part.explode[1] + (e?.[1] ?? 0) + EXPLODE_LIFT) * p,
        spec.position[2] + (part.explode[2] + (e?.[2] ?? 0)) * p,
      );
      const a = spec.anim;
      if (a?.kind === 'spin') {
        obj.rotation[a.axis] = (spec.rotation?.[a.axis === 'x' ? 0 : a.axis === 'y' ? 1 : 2] ?? 0) + th * a.speed;
      } else if (a?.kind === 'piston') {
        obj.position.y += a.amplitude * Math.cos(th + a.phase);
      }
    }
    // Parts that come from a real 3D model move as one group; wheel pivots also spin.
    for (const part of car.parts) {
      const g = part.object;
      if (!g) continue;
      g.position.set(part.explode[0] * p, (part.explode[1] + EXPLODE_LIFT) * p, part.explode[2] * p);
      for (const c of g.children) {
        const e = c.userData.explode as V3 | undefined;
        if (e) {
          c.userData.home ??= c.position.clone();
          const home = c.userData.home as THREE.Vector3;
          c.position.set(home.x + e[0] * p, home.y + e[1] * p, home.z + e[2] * p);
        }
        if (c.userData.spin) c.rotation.z = -th;
      }
    }
  });

  const register = useCallback(
    (key: string, part: Part, spec: MeshSpec) => (obj: THREE.Mesh | null) => {
      if (obj) live.current.set(key, { obj, spec, part });
      else live.current.delete(key);
    },
    [],
  );

  const pick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return; // that was a drag to orbit, not a click
    onPick(firstPickable(e.intersections));
  };
  const move = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const id = firstPickable(e.intersections);
    if (id !== hoverId.current) {
      hoverId.current = id;
      onHover(id);
      document.body.style.cursor = id ? 'pointer' : '';
    }
  };
  const leave = () => {
    hoverId.current = null;
    onHover(null);
    document.body.style.cursor = '';
  };

  return (
    <group position={[car.offsetX, 0, 0]} onClick={pick} onPointerMove={move} onPointerOut={leave}>
      {car.parts.map((part) => (
        <PartMeshes key={part.id} part={part} visual={visuals[part.id] ?? { look: 'normal', glow: null }} paint={paint} register={register} />
      ))}
      {car.bonnet && <OpeningBonnet car={car} open={bonnetOpen && !exploded} paint={paint} />}
    </group>
  );
}

/** First hit that is visible and not see-through; falls back to a see-through hit. */
function firstPickable(hits: THREE.Intersection[]): string | null {
  let fallback: string | null = null;
  for (const h of hits) {
    if (!isShown(h.object)) continue;
    const id = h.object.userData.partId as string | undefined;
    if (!id) continue;
    if (h.object.userData.seeThrough) {
      fallback ??= id;
      continue;
    }
    return id;
  }
  return fallback;
}

function isShown(o: THREE.Object3D | null): boolean {
  for (; o; o = o.parent) if (!o.visible) return false;
  return true;
}

const PartMeshes = memo(function PartMeshes({
  part,
  visual,
  paint,
  register,
}: {
  part: Part;
  visual: PartVisual;
  paint: string;
  register: Register;
}) {
  if (part.object) return <RealPartView part={part} visual={visual} paint={paint} />;
  return <SchematicMeshes part={part} visual={visual} paint={paint} register={register} />;
});

function SchematicMeshes({ part, visual, paint, register }: { part: Part; visual: PartVisual; paint: string; register: Register }) {
  const refs = useMemo(() => part.meshes.map((spec, i) => register(`${part.id}:${i}`, part, spec)), [part, register]);
  const hidden = visual.look === 'hidden';
  const seeThrough = visual.look === 'ghost' || visual.look === 'dim';
  return (
    <group visible={!hidden}>
      {part.meshes.map((spec, i) => {
        const base = MATERIALS[spec.material];
        const color = spec.material === 'paint' ? paint : base.color;
        let opacity = base.opacity ?? 1;
        if (visual.look === 'ghost') opacity = Math.min(opacity, part.system === 'body' || part.system === 'glass' ? 0.07 : 0.16);
        if (visual.look === 'dim') opacity = Math.min(opacity, part.system === 'body' || part.system === 'glass' ? 0.05 : 0.14);
        const transparent = opacity < 1;
        const glow = visual.glow ? GLOW[visual.glow] : null;
        return (
          <mesh
            key={i}
            ref={refs[i]}
            geometry={spec.geometry}
            position={spec.position}
            rotation={spec.rotation ?? [0, 0, 0]}
            castShadow={!transparent}
            receiveShadow={!transparent}
            renderOrder={transparent ? 2 : 0}
            userData={{ partId: part.id, seeThrough }}
          >
            <meshStandardMaterial
              color={color}
              metalness={base.metalness}
              roughness={base.roughness}
              transparent={transparent}
              opacity={opacity}
              depthWrite={!transparent}
              emissive={glow ? glow[0] : base.emissive ?? '#000000'}
              emissiveIntensity={glow ? glow[1] : base.emissiveIntensity ?? 0}
              envMapIntensity={spec.material === 'paint' ? 1.2 : 0.8}
              side={transparent ? THREE.DoubleSide : THREE.FrontSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/** A part supplied by a real 3D model: its materials are adjusted in place. */
function RealPartView({ part, visual, paint }: { part: Part; visual: PartVisual; paint: string }) {
  const object = part.object!;
  useEffect(() => {
    const seeThrough = visual.look === 'ghost' || visual.look === 'dim';
    const shell = part.system === 'body' || part.system === 'glass' || part.system === 'interior';
    const limit = visual.look === 'ghost' ? (shell ? 0.07 : 0.16) : shell ? 0.05 : 0.14;
    // Tinting real paint or upholstery looks wrong; the label and panel already mark the selection.
    const glow = visual.glow && !shell ? GLOW[visual.glow] : null;
    const seen = new Set<THREE.Material>();
    object.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.userData.seeThrough = seeThrough;
      mesh.castShadow = !seeThrough;
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        if (seen.has(m)) continue;
        seen.add(m);
        const base = m.userData.base;
        const s = m as THREE.MeshPhysicalMaterial;
        const opacity = seeThrough ? Math.min(base.opacity, limit) : base.opacity;
        const transparent = base.transparent || opacity < 1;
        if (m.transparent !== transparent) m.needsUpdate = true;
        m.transparent = transparent;
        m.opacity = opacity;
        m.depthWrite = seeThrough ? false : base.depthWrite;
        if (base.transmission === undefined) base.transmission = s.transmission ?? 0;
        if (s.transmission !== undefined) s.transmission = seeThrough ? 0 : base.transmission;
        if (s.emissive) {
          if (glow) s.emissive.set(glow[0]);
          else s.emissive.copy(base.emissive);
          // Real paint and textures read better with a faint tint than with the schematic glow.
          s.emissiveIntensity = glow ? glow[1] * 0.35 : base.emissiveIntensity;
        }
        if (m.userData.paint) s.color.set(paint);
      }
    });
  }, [object, part.system, visual, paint]);
  return (
    <group visible={visual.look !== 'hidden'}>
      <primitive object={object} />
    </group>
  );
}

const OPEN_ANGLE = 0.95;

/**
 * Real models have the bonnet merged into the body, so it is cut out with clipping planes: the body
 * loses the region above the bonnet line between the windscreen and the nose, and a copy of the
 * body keeps only that region and swings up around the hinge. The copy's planes turn with it.
 */
function OpeningBonnet({ car, open, paint }: { car: BuiltCar; open: boolean; paint: string }) {
  const body = car.parts.find((p) => p.id === 'body')?.object;
  const { hinge, front } = car.bonnet!;
  const swing = useRef<THREE.Group>(null);
  const angle = useRef(0);
  const active = useRef(false);

  // Planes in world space (the car group is shifted by offsetX).
  const planes = useMemo(() => {
    const ox = car.offsetX;
    // Deep enough to take the bonnet's inner panel with it, narrow enough to leave the wings.
    const h = new THREE.Vector3(hinge[0] + ox, hinge[1] - 0.08, 0);
    const f = new THREE.Vector3(front[0] + ox, front[1] - 0.08, 0);
    const half = car.vehicle.dims.width / 2 - 0.12;
    const down = new THREE.Vector3(f.y - h.y, -(f.x - h.x), 0).normalize();
    const below = new THREE.Plane().setFromNormalAndCoplanarPoint(down, h);
    const behind = new THREE.Plane(new THREE.Vector3(-1, 0, 0), h.x);
    const ahead = new THREE.Plane(new THREE.Vector3(1, 0, 0), -(f.x + 0.05));
    const left = new THREE.Plane(new THREE.Vector3(0, 0, -1), -half);
    const right = new THREE.Plane(new THREE.Vector3(0, 0, 1), -half);
    // Body: clipped only where every plane says "outside" — the box above the bonnet line.
    const cut = [behind, below, ahead, left, right];
    // Bonnet copy: the opposite of each, combined as a union, so only that region is left.
    const keep = cut.map((p) => p.clone().negate());
    return { cut, keep, base: keep.map((p) => p.clone()), hinge: new THREE.Vector3(h.x, hinge[1], 0) };
  }, [car.offsetX, car.vehicle.dims.width, hinge, front]);

  const copy = useMemo(() => {
    if (!body) return null;
    const c = body.clone(true);
    c.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const own = (m: THREE.Material) => {
        const k = m.clone();
        k.userData = { ...m.userData };
        k.clippingPlanes = planes.keep;
        k.clipIntersection = false;
        k.clipShadows = true;
        return k;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(own) : own(mesh.material);
      mesh.userData = { partId: 'body', seeThrough: false };
    });
    return c;
  }, [body, planes]);

  useEffect(() => {
    copy?.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m?.userData?.paint) m.color.set(paint);
    });
  }, [copy, paint]);

  const setCut = (on: boolean) => {
    active.current = on;
    body?.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        m.clippingPlanes = on ? planes.cut : null;
        m.clipIntersection = true;
        m.clipShadows = true;
        m.needsUpdate = true;
      }
    });
  };
  useEffect(() => () => setCut(false), [body, planes]); // eslint-disable-line react-hooks/exhaustive-deps

  const turn = new THREE.Matrix4();
  useFrame((_, dt) => {
    const target = open ? OPEN_ANGLE : 0;
    angle.current += (target - angle.current) * Math.min(1, dt * 3);
    if (Math.abs(target - angle.current) < 1e-3) angle.current = target;
    const on = angle.current > 0 || open;
    if (on !== active.current) setCut(on);
    if (!swing.current) return;
    swing.current.visible = on;
    swing.current.rotation.z = angle.current;
    // Turn the copy's planes with it: T(hinge) · Rz · T(-hinge).
    const p = planes.hinge;
    turn.makeTranslation(p.x, p.y, 0).multiply(new THREE.Matrix4().makeRotationZ(angle.current)).multiply(new THREE.Matrix4().makeTranslation(-p.x, -p.y, 0));
    planes.keep.forEach((k, i) => k.copy(planes.base[i]).applyMatrix4(turn));
  });

  if (!copy) return null;
  return (
    <group position={[hinge[0], hinge[1], 0]}>
      <group ref={swing} visible={false}>
        <group position={[-hinge[0], -hinge[1], 0]}>
          <primitive object={copy} />
        </group>
      </group>
    </group>
  );
}
