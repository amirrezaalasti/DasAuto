import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CameraControls, ContactShadows, Environment, Html, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import type { BuiltCar, Flow } from '../atlas/buildCar';
import type { V3 } from '../atlas/geometry';
import { CarModel, type PartVisual } from './CarModel';
import { Flows } from './Flows';

export interface ViewerHandle {
  lookAt(target: V3, dir: V3, dist: number): void;
  reset(exploded: boolean, animate?: boolean): void;
}

interface Props {
  car: BuiltCar;
  paint: string;
  visuals: Record<string, PartVisual>;
  exploded: boolean;
  running: boolean;
  flows: Flow[];
  label: { text: string; position: V3 } | null;
  /** Mechanic view: open bonnet plus a pinned label on every service point. */
  bonnetOpen: boolean;
  pins: { id: string; text: string; position: V3 }[];
  autoRotate: boolean;
  onPick: (id: string | null) => void;
  onHover: (id: string | null) => void;
}

const HOME_DIR = new THREE.Vector3(1, 0.5, 1.35).normalize();

export const Viewer = forwardRef<ViewerHandle, Props>(function Viewer(props, ref) {
  const api = useRef<ViewerHandle | null>(null);
  const downAt = useRef<[number, number] | null>(null);

  useImperativeHandle(ref, () => ({
    lookAt: (...a) => api.current?.lookAt(...a),
    reset: (e) => api.current?.reset(e),
  }));

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true;
      }}
      camera={{ position: [5, 2.4, 6.2], fov: 35, near: 0.05, far: 100 }}
      onPointerDown={(e) => (downAt.current = [e.clientX, e.clientY])}
      onPointerMissed={(e) => {
        const d = downAt.current;
        if (d && Math.hypot(e.clientX - d[0], e.clientY - d[1]) < 6) props.onPick(null);
      }}
    >
      <color attach="background" args={['#0d1118']} />
      <fog attach="fog" args={['#0d1118', 16, 36]} />
      <hemisphereLight args={['#dfe8ff', '#1a1d24', 0.6]} />
      <directionalLight
        position={[4, 8, 5]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
      />
      <directionalLight position={[-6, 4, -4]} intensity={0.5} />
      {/* A photo studio: an overhead softbox plus long strip lights that draw clean lines in the paint. */}
      <Environment resolution={512} frames={1}>
        <Lightformer intensity={2.2} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 4, 1]} />
        {[-3, 0, 3].map((x) => (
          <Lightformer key={x} form="rect" intensity={1.6} position={[x, 4.5, 0]} rotation-x={Math.PI / 2} scale={[0.35, 10, 1]} />
        ))}
        <Lightformer intensity={1.2} position={[-6, 2, 3]} rotation-y={Math.PI / 2} scale={[10, 2, 1]} />
        <Lightformer intensity={1.2} position={[6, 2, -3]} rotation-y={-Math.PI / 2} scale={[10, 2, 1]} />
        <Lightformer intensity={0.8} position={[0, 1.2, 8]} scale={[14, 0.6, 1]} />
        <Lightformer intensity={0.6} position={[0, 1, -8]} scale={[16, 3, 1]} color="#9fb8ff" />
      </Environment>

      <CarModel car={props.car} paint={props.paint} visuals={props.visuals} exploded={props.exploded} running={props.running} bonnetOpen={props.bonnetOpen} onPick={props.onPick} onHover={props.onHover} />
      {!props.exploded && props.flows.length > 0 && <Flows flows={props.flows} offsetX={props.car.offsetX} />}

      {props.label && (
        <Html position={props.label.position} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="scene-label">{props.label.text}</div>
        </Html>
      )}

      {props.pins.map((p) => (
        <Html key={p.id} position={p.position} center zIndexRange={[19, 0]}>
          <button className="scene-pin" onClick={() => props.onPick(p.id)}>
            {p.text}
          </button>
        </Html>
      ))}

      <ContactShadows position={[0, 0.001, 0]} opacity={props.exploded ? 0.25 : 0.55} scale={14} blur={2.4} far={3} resolution={512} />
      <gridHelper args={[40, 40, '#1d2533', '#151b26']} />

      <Rig api={api} length={props.car.vehicle.dims.length} autoRotate={props.autoRotate} />
    </Canvas>
  );
});

/** Owns the camera controls and frames the car for the current viewport. */
function Rig({ api, length, autoRotate }: { api: React.MutableRefObject<ViewerHandle | null>; length: number; autoRotate: boolean }) {
  const controls = useRef<CameraControls>(null);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);

  /** Distance at which a sphere of the given radius fits the narrower field of view. */
  const fitDistance = (radius: number) => {
    const v = THREE.MathUtils.degToRad(camera.fov) / 2;
    const h = Math.atan(Math.tan(v) * (size.width / size.height));
    return radius / Math.sin(Math.min(v, h));
  };

  api.current = {
    lookAt(target, dir, dist) {
      const d = new THREE.Vector3(...dir).normalize();
      // On portrait screens, back off so the focus still fits sideways.
      const k = size.width < size.height ? 1.5 : 1;
      const p = new THREE.Vector3(...target).addScaledVector(d, dist * k);
      controls.current?.setLookAt(p.x, Math.max(p.y, 0.15), p.z, target[0], target[1], target[2], true);
    },
    reset(exploded, animate = true) {
      const radius = exploded ? length / 2 + 1.5 : length / 2 + 0.15;
      const y = exploded ? 1.5 : 0.6;
      const p = HOME_DIR.clone().multiplyScalar(fitDistance(radius));
      controls.current?.setLookAt(p.x, p.y + y, p.z, 0, y, 0, animate);
    },
  };

  useEffect(() => {
    api.current?.reset(false, false); // first frame only; later resets are explicit
  }, [api]);

  useFrame((_, dt) => {
    if (autoRotate && controls.current) controls.current.azimuthAngle += dt * 0.18;
  });

  return <CameraControls ref={controls} makeDefault minDistance={0.8} maxDistance={20} maxPolarAngle={Math.PI * 0.495} smoothTime={0.45} />;
}
