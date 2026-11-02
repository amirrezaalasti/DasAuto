import type { FlowId } from '../atlas/buildCar';
import type { V3 } from '../atlas/geometry';
import type { DiagramId } from './content';
import type { Drivetrain, Vehicle } from './vehicles';

/** A value that may depend on the car being toured. */
type PerCar<T> = T | ((v: Vehicle) => T);

interface StepDef {
  title: PerCar<string>;
  body: PerCar<string>;
  /** Skip the step unless the car has all of these parts. */
  requires?: string[];
  /** Skip the step if the car has any of these parts. */
  skipIf?: string[];
  focus?: string[];
  ghost?: string[];
  flows?: FlowId[];
  animate?: boolean;
  diagram?: PerCar<DiagramId | undefined>;
  view: PerCar<{ dir: V3; dist: number }>;
}

export interface TourStep {
  title: string;
  body: string;
  /** Parts to highlight; everything else is dimmed. */
  focus?: string[];
  /** Parts made see-through so you can look inside. */
  ghost?: string[];
  flows?: FlowId[];
  animate?: boolean;
  diagram?: DiagramId;
  /** Camera direction (from the focus point) and distance. */
  view: { dir: V3; dist: number };
}

export interface Tour {
  title: string;
  intro: string;
  steps: TourStep[];
}

const at = <T,>(x: PerCar<T>, v: Vehicle): T => (typeof x === 'function' ? (x as (v: Vehicle) => T)(v) : x);
const drives = (v: Vehicle) => (v.layout.driven === 'front' ? 'front wheels' : v.layout.driven === 'rear' ? 'rear wheels' : 'all four wheels');
/** Camera directions are written for a rear drive unit; mirror them for a front one. */
const unit = (dir: V3) => (v: Vehicle) => ({ dir: (v.layout.driven === 'front' ? [-dir[0], dir[1], dir[2]] : dir) as V3 });

/** The tour for one car: steps it has no parts for are dropped and the wording fits its layout. */
export function tourFor(v: Vehicle, has: (id: string) => boolean): Tour {
  const def = TOURS[v.drivetrain];
  const steps = def.steps
    .filter((s) => (s.requires ?? []).every(has) && !(s.skipIf ?? []).some(has))
    .map(({ requires, skipIf, ...s }) => ({
      ...s,
      title: at(s.title, v),
      body: at(s.body, v),
      diagram: at(s.diagram, v),
      view: at(s.view, v),
    }));
  // Renumber, since skipped steps leave gaps.
  let k = 0;
  for (const s of steps) if (/^\d+ · /.test(s.title)) s.title = s.title.replace(/^\d+/, String(++k));
  return { title: def.title, intro: def.intro, steps };
}

const TOURS: Record<Drivetrain, { title: string; intro: string; steps: StepDef[] }> = {
  ice: {
    title: 'From petrol to motion',
    intro: 'Follow the energy from the fuel tank to the road, and see what happens to it along the way.',
    steps: [
      {
        title: 'The big picture',
        body: 'Petrol stores energy in chemical bonds. The engine burns it with oxygen from the air, and the expanding hot gas pushes pistons that turn a crankshaft. The gearbox adapts that rotation to the wheels. Only about 25–35 % of the fuel’s energy actually moves the car. The rest leaves as heat through the radiator and the exhaust.',
        flows: ['fuel', 'air', 'exhaust', 'torque', 'coolant'],
        animate: true,
        view: { dir: [1, 0.55, 1.15], dist: 6.2 },
      },
      {
        title: '1 · Fuel: tank to injector',
        body: (v) =>
          `The plastic tank sits under the rear seat, the safest place in a crash. An electric pump in the tank sends petrol forward through a thin steel line. ${
            v.layout.turbo
              ? 'On the engine, a camshaft-driven high-pressure pump raises the pressure to ≈350 bar. The injectors then spray a fine mist straight into each cylinder.'
              : 'Injectors in the intake ports spray it onto the back of the intake valves, where it mixes with the incoming air.'
          }`,
        focus: ['fuel-tank', 'fuel-system'],
        flows: ['fuel'],
        view: { dir: [0.2, 0.9, 1], dist: 4.8 },
      },
      {
        title: '2 · Air and the turbocharger',
        requires: ['turbo'],
        body: 'An engine needs about 14.7 kg of air for every 1 kg of petrol. Air enters behind the grille, passes the filter and is squeezed by the turbocharger’s compressor. Exhaust gas drives the turbo, so it reuses energy that would otherwise be wasted. Compressing air heats it, so a water-cooled charge-air cooler chills it again before it enters the cylinders.',
        focus: ['intake', 'turbo'],
        flows: ['air', 'exhaust'],
        diagram: 'turbo',
        view: { dir: [0.8, 1, 0.9], dist: 2.4 },
      },
      {
        title: '2 · Breathing in',
        skipIf: ['turbo'],
        body: 'An engine needs about 14.7 kg of air for every 1 kg of petrol. This one has no turbo: each piston simply sucks air in on its way down, through the filter, the throttle and the intake manifold. That keeps it simple and light, but a naturally aspirated engine needs more displacement for the same power.',
        focus: ['intake'],
        flows: ['air'],
        view: { dir: [0.8, 1, 0.9], dist: 2.4 },
      },
      {
        title: '3 · Four strokes',
        body: (v) =>
          `Every cylinder repeats four strokes: intake, compression, power and exhaust. The cycle takes two turns of the crankshaft. The ${v.layout.cylinders === 3 ? 'three cylinders fire in turn (1-2-3), one every 240° of crank rotation' : 'four cylinders fire in turn (1-3-4-2), so there is always one making power'}. At 3,000 rpm each cylinder fires 25 times a second. The connecting rods turn this up-and-down motion into rotation of the crankshaft.`,
        focus: ['pistons', 'crankshaft'],
        ghost: ['engine-block', 'cylinder-head', 'intake', 'turbo'],
        animate: true,
        diagram: 'four-stroke',
        view: { dir: [0.9, 0.5, 1], dist: 1.6 },
      },
      {
        title: (v) => `4 · The ${v.layout.hybrid?.volts ?? 48} V mild hybrid`,
        requires: ['bsg'],
        body: (v) => {
          const h = v.layout.hybrid!;
          const where = h.starter === 'integrated' ? 'an electric motor-generator built in between the engine and the gearbox' : 'a starter-generator driven by the engine’s belt';
          return `This car has ${where}, connected to a small ${h.volts} V battery. When you lift off, it recovers braking energy. When you pull away, it helps the engine and restarts it quietly, so the engine can switch off at a standstill${h.volts === 48 ? ' and even while coasting' : ''}.`;
        },
        focus: ['bsg', 'battery-48v'],
        flows: ['mild-hybrid'],
        view: { dir: [0.6, 1.1, 1], dist: 3.4 },
      },
      {
        title: '5 · The gearbox',
        body: (v) => {
          const g = v.layout.gearbox;
          const how =
            g === 'dct'
              ? 'This dual-clutch box holds the next gear ready on a second shaft. A shift just swaps one clutch for the other, with no interruption in pull.'
              : g === 'automatic'
                ? `This ${v.layout.gears}-speed automatic uses planetary gear sets behind a fluid coupling (torque converter), so it can creep and pull away smoothly and shift without a clutch pedal.`
                : 'Here the driver does the shifting: the clutch pedal disconnects the engine, the lever slides a collar to lock a new pair of gears, and synchronisers match their speeds first.';
          return `A petrol engine only makes useful power between ≈1,500 and 6,000 rpm, but the wheels turn from 0 to ≈1,500 rpm. Gears bridge that gap. ${how}`;
        },
        focus: ['gearbox'],
        ghost: ['engine-block', 'cylinder-head', 'intake'],
        flows: ['torque'],
        animate: true,
        diagram: (v) => (v.layout.gearbox === 'dct' ? 'dsg' : undefined),
        view: (v) => (v.layout.engineMount === 'longitudinal' ? { dir: [0.4, 0.9, 1], dist: 2.4 } : { dir: [0.5, 0.8, -1], dist: 2.2 }),
      },
      {
        title: (v) => `6 · Driving the ${drives(v)}`,
        body: (v) =>
          v.layout.driven === 'front'
            ? 'The differential in the gearbox splits torque between two driveshafts. In a corner, the outer wheel travels further than the inner one, and the differential lets them turn at different speeds. CV joints let the shafts keep turning while the wheels steer and bounce.'
            : `A propeller shaft runs back through a tunnel in the floor to the rear differential, which turns the drive through 90° and splits it between the rear wheels, letting them turn at different speeds in corners.${v.layout.driven === 'all' ? ' A clutch can also send torque to a front differential, so all four wheels pull when grip is low.' : ' The front wheels only steer, which keeps the steering pure.'}`,
        focus: ['driveshafts', 'wheels', 'gearbox'],
        flows: ['torque'],
        animate: true,
        view: (v) => (v.layout.driven === 'front' ? { dir: [1, 0.7, 0.25], dist: 3.2 } : { dir: [0.3, 1.2, 1], dist: 5.4 }),
      },
      {
        title: '7 · Cleaning the exhaust',
        body: (v) => `Right behind the ${v.layout.turbo ? 'turbo' : 'exhaust manifold'}, the catalytic converter turns toxic CO, unburnt fuel and NOx into CO₂, water and nitrogen. A particulate filter catches soot. The silencers then cancel out the pressure pulses before the gas leaves the car. CO₂ itself cannot be filtered out: burning 1 L of petrol produces about 2.3 kg of it.`,
        focus: ['catalyst', 'mufflers'],
        flows: ['exhaust'],
        view: { dir: [0.15, 0.45, 1], dist: 6.4 },
      },
      {
        title: '8 · Keeping cool',
        body: 'Combustion peaks at over 2,000 °C, while the metal must stay well below its limits. Coolant circulates through the block and head and carries the heat to the radiator. A thermostat keeps the engine near 90 °C, the temperature at which it runs most efficiently and cleanly.',
        focus: ['radiator', 'cooling-fan', 'engine-block'],
        flows: ['coolant'],
        animate: true,
        view: { dir: [1, 0.8, 0.6], dist: 2.6 },
      },
      {
        title: '9 · Stopping',
        body: (v) =>
          `All the kinetic energy built up in acceleration is turned into heat by the brakes. ${v.layout.hybrid ? 'The mild hybrid’s small generator recovers a little of it, but the' : 'The'} friction brakes do almost all the stopping. At 100 km/h, a full stop heats the front discs by well over 100 °C.`,
        focus: ['brakes-front', 'brakes-rear'],
        animate: true,
        diagram: 'brakes',
        view: { dir: [0.4, 0.6, 1], dist: 4.6 },
      },
    ],
  },
  ev: {
    title: 'From plug to motion',
    intro: 'Follow electricity from the charging cable through the battery to the wheels — and back again when you brake.',
    steps: [
      {
        title: 'The big picture',
        body: 'An electric car stores energy in a large lithium-ion battery in its floor. An inverter turns the battery’s DC into AC, an electric motor turns that into rotation, and a single gear takes it to the wheels. About 85–90 % of the battery energy reaches the road, roughly three times the share of a petrol engine. When you brake, the chain runs in reverse.',
        flows: ['hv-dc', 'hv-ac', 'torque', 'coolant'],
        animate: true,
        view: { dir: [1, 0.55, 1.15], dist: 6.2 },
      },
      {
        title: '1 · Charging',
        body: (v) =>
          `The CCS2 socket takes AC at home and DC at fast chargers. A battery can only store DC. With AC, the on-board charger has to convert it, which limits power to ${v.powertrain.ac.replace(' AC', '')}. A DC fast charger does the conversion itself and feeds the battery directly — ${v.powertrain.dc.replace(' DC', '')} on this car.`,
        focus: ['charge-port', 'obc', 'hv-cables'],
        flows: ['charge'],
        diagram: 'charging',
        view: { dir: [-0.4, 0.6, 1], dist: 3.6 },
      },
      {
        title: '2 · The battery',
        body: (v) =>
          `The floor holds ${v.powertrain.battery} in ${v.powertrain.cells.toLowerCase()}. Each cell is a stack of thin electrode layers. Lithium ions move through the electrolyte between graphite and metal-oxide electrodes, and the electrons travel the outer route through the car. The battery management system watches every cell, and a coolant plate keeps them at their preferred temperature.`,
        focus: ['battery-modules', 'bms', 'cooling-plate', 'battery-housing'],
        ghost: ['battery-cover', 'underbody', 'seats-front', 'seats-rear', 'console'],
        diagram: 'battery',
        view: { dir: [0.35, 1.4, 0.8], dist: 3.6 },
      },
      {
        title: '3 · The inverter',
        body: 'The inverter is the electric equivalent of an accelerator pedal and fuel injection. Power transistors chop the battery’s ≈400 V DC into three sine-shaped AC currents. A higher frequency makes the motor spin faster; a higher current gives more torque.',
        focus: ['inverter', 'hv-cables'],
        flows: ['hv-dc', 'hv-ac'],
        diagram: 'motor',
        view: (v) => ({ ...unit([-1, 0.9, 0.7])(v), dist: 2.2 }),
      },
      {
        title: '4 · The electric motor',
        body: (v) =>
          `The three currents flow through the stator windings. Because each is a third of a cycle behind the next, their magnetic field rotates. ${
            v.layout.motor === 'eesm'
              ? 'This motor has no permanent magnets: its rotor is an electromagnet, fed through slip rings, so its strength can be tuned — and no rare earths are needed.'
              : 'Permanent magnets in the rotor are pulled along with it.'
          } There is no combustion, no valves and no idling, and full torque is available from standstill.`,
        focus: ['motor-rotor', 'motor-stator'],
        ghost: ['motor-stator', 'inverter', 'reduction-gear'],
        animate: true,
        diagram: 'motor',
        view: (v) => ({ ...unit([-0.9, 0.6, 1])(v), dist: 2 }),
      },
      {
        title: (v) => `5 · One gear, ${v.layout.driven === 'front' ? 'front' : 'rear'}-wheel drive`,
        body: (v) =>
          `The motor runs efficiently from 0 to about 16,000 rpm, so one fixed reduction gear is enough: no clutch, no shifting. To reverse, the motor simply turns the other way. ${
            v.layout.driven === 'front'
              ? 'Here the whole drive unit sits in the nose and drives the front wheels, which keeps the rear free for passengers and luggage.'
              : 'Driving the rear wheels leaves the front wheels free to steer sharply, giving a small turning circle.'
          }`,
        focus: ['reduction-gear', 'halfshafts', 'wheels'],
        flows: ['torque'],
        animate: true,
        view: (v) => ({ ...unit([-1, 0.6, 0.35])(v), dist: 3.2 }),
      },
      {
        title: '6 · Regenerative braking',
        body: 'Lift off or press the brake gently and the motor becomes a generator. The wheels drive it, the inverter turns its AC back into DC, and the energy flows into the battery. Most everyday braking happens this way. In city driving, regeneration can recover a large share of the energy spent accelerating.',
        focus: ['motor-rotor', 'motor-stator', 'inverter', 'battery-modules'],
        ghost: ['battery-cover'],
        flows: ['regen'],
        animate: true,
        diagram: 'regen',
        view: (v) => ({ ...unit([-0.6, 0.9, 1])(v), dist: 4.4 }),
      },
      {
        title: '7 · Thermal management & heat pump',
        body: 'The drive wastes little heat, which is good for range but leaves little to warm the cabin. A heat pump moves heat from outside air and from the electronics into the cabin, giving 2–3 kWh of heat per kWh of electricity. The same coolant circuit warms the battery before fast charging and cools it afterwards.',
        focus: ['heat-pump', 'radiator-ev', 'cooling-plate'],
        ghost: ['battery-cover', 'battery-modules'],
        flows: ['coolant'],
        diagram: 'heatpump',
        view: { dir: [1, 0.9, 0.8], dist: 3.6 },
      },
      {
        title: '8 · The 12 V world',
        body: 'Lights, screens, locks and control units still run on 12 V. With no engine-driven alternator, a DC/DC converter steps the high voltage down to keep the 12 V battery charged. When you unlock the car, the 12 V system wakes the battery management system, which then closes the high-voltage contactors.',
        focus: ['dcdc', 'battery-12v'],
        flows: ['lv'],
        view: { dir: [1, 1.1, -0.6], dist: 2.6 },
      },
      {
        title: '9 · Brakes that rarely work',
        body: (v) =>
          `Thanks to regeneration, the friction brakes do much less work. ${
            v.rearBrake === 'drum'
              ? 'That is why this car uses enclosed drum brakes at the rear: discs that are seldom used would rust, while drums stay protected and last for a very long time.'
              : 'The car occasionally brakes with the discs alone, just to keep them clean of rust.'
          } When you press harder, the hydraulic brakes blend in seamlessly.`,
        focus: ['brakes-rear', 'brakes-front'],
        animate: true,
        diagram: 'brakes',
        view: { dir: [0.4, 0.6, 1], dist: 4.6 },
      },
    ],
  },
};

/** Closest equivalent part in the other drivetrain, for "how does the other car do this?" links. */
export const COUNTERPART: Record<string, string> = {
  'engine-block': 'motor-stator',
  'cylinder-head': 'inverter',
  pistons: 'motor-rotor',
  crankshaft: 'motor-rotor',
  gearbox: 'reduction-gear',
  driveshafts: 'halfshafts',
  'fuel-tank': 'battery-modules',
  'fuel-system': 'charge-port',
  ecu: 'inverter',
  radiator: 'radiator-ev',
  'cooling-fan': 'heat-pump',
  'battery-48v': 'battery-modules',
  bsg: 'motor-rotor',
  turbo: 'inverter',
  intake: 'inverter',
  'motor-stator': 'engine-block',
  'motor-rotor': 'pistons',
  'reduction-gear': 'gearbox',
  halfshafts: 'driveshafts',
  inverter: 'ecu',
  'battery-modules': 'fuel-tank',
  'battery-cover': 'fuel-tank',
  'battery-housing': 'fuel-tank',
  'cooling-plate': 'radiator',
  bms: 'ecu',
  'charge-port': 'fuel-system',
  obc: 'fuel-system',
  'radiator-ev': 'radiator',
  'heat-pump': 'radiator',
  dcdc: 'battery-48v',
  'hv-cables': 'fuel-system',
};
