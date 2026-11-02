import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Flow } from '../atlas/buildCar';

const SPEED = 0.9; // metres per second

function FlowPath({ points, color }: { points: THREE.Vector3[]; color: string }) {
  const { curve, tube, count } = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.15);
    const len = curve.getLength();
    const tube = new THREE.TubeGeometry(curve, Math.max(32, Math.round(len * 40)), 0.012, 6, false);
    return { curve, tube, count: Math.max(4, Math.round(len / 0.11)) };
  }, [points]);
  const inst = useRef<THREE.InstancedMesh>(null);
  const t = useRef(0);
  const tmp = useMemo(() => new THREE.Object3D(), []);
  const len = useMemo(() => curve.getLength(), [curve]);

  useEffect(() => () => tube.dispose(), [tube]);

  useFrame((_, dt) => {
    t.current += dt;
    const mesh = inst.current;
    if (!mesh) return;
    for (let i = 0; i < count; i++) {
      const u = (i / count + (t.current * SPEED) / len) % 1;
      curve.getPointAt(u, tmp.position);
      const pulse = 0.75 + 0.25 * Math.sin(u * Math.PI);
      tmp.scale.setScalar(pulse);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <mesh geometry={tube} renderOrder={5}>
        <meshBasicMaterial color={color} transparent opacity={0.28} depthWrite={false} depthTest={false} />
      </mesh>
      <instancedMesh ref={inst} args={[undefined, undefined, count]} renderOrder={6}>
        <sphereGeometry args={[0.026, 10, 8]} />
        <meshBasicMaterial color={color} depthTest={false} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

export function Flows({ flows, offsetX }: { flows: Flow[]; offsetX: number }) {
  return (
    <group position={[offsetX, 0, 0]}>
      {flows.flatMap((f) => f.paths.map((p, i) => <FlowPath key={`${f.id}-${i}`} points={toVectors(p)} color={f.color} />))}
    </group>
  );
}

const cache = new WeakMap<object, THREE.Vector3[]>();
function toVectors(p: [number, number, number][]): THREE.Vector3[] {
  let v = cache.get(p);
  if (!v) {
    v = p.map((q) => new THREE.Vector3(...q));
    cache.set(p, v);
  }
  return v;
}
