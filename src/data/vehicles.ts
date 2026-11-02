import type { PartContent } from './content';

export type Drivetrain = 'ice' | 'ev';
export type BodyStyle = 'hatch' | 'hatchEV' | 'suv' | 'suvEV' | 'estate' | 'fastback';

export interface Paint {
  name: string;
  hex: string;
}

/** How the machinery is arranged — drives both the 3D reconstruction and the explanations. */
export interface Layout {
  driven: 'front' | 'rear' | 'all';
  // Petrol cars
  cylinders?: 3 | 4;
  engineMount?: 'transverse' | 'longitudinal';
  turbo?: boolean;
  gearbox?: 'dct' | 'automatic' | 'manual';
  gears?: number;
  hybrid?: { volts: 12 | 48; starter: 'belt' | 'integrated' };
  /** Electronic oil-level sensor instead of a dipstick. */
  oilSensor?: boolean;
  // Electric cars: the motor sits on the driven axle.
  motor?: 'pmsm' | 'eesm';
}

export interface Vehicle {
  id: string;
  pairId: string;
  brand: string;
  drivetrain: Drivetrain;
  name: string;
  trim: string;
  style: BodyStyle;
  dims: {
    length: number;
    width: number;
    height: number;
    wheelbase: number;
    frontOverhang: number;
    tireDiameter: number;
    tireWidth: number;
    groundClearance: number;
  };
  rearBrake: 'disc' | 'drum';
  rearSuspension: 'multilink' | 'torsion';
  layout: Layout;
  /** Number of battery modules (EV only). */
  modules?: number;
  powertrain: Record<string, string>;
  overview: [string, string][];
  paints: Paint[];
  /** Car-specific wording for parts where the generic explanation does not fit. */
  notes?: Record<string, Partial<PartContent>>;
}

export interface VehiclePair {
  id: string;
  brand: string;
  label: string;
  segment: string;
  ice: Vehicle;
  ev: Vehicle;
}

const PAINTS_ICE: Paint[] = [
  { name: 'Red metallic', hex: '#9b1c22' },
  { name: 'Grey metallic', hex: '#6d7277' },
  { name: 'Dark blue', hex: '#1f3b63' },
  { name: 'White', hex: '#eceeef' },
  { name: 'Black', hex: '#141518' },
];

const PAINTS_EV: Paint[] = [
  { name: 'Glacier blue', hex: '#5d86a8' },
  { name: 'Turquoise', hex: '#2d9c9a' },
  { name: 'Red metallic', hex: '#9b1c22' },
  { name: 'Grey metallic', hex: '#6d7277' },
  { name: 'White', hex: '#eef0f1' },
];

type Spec = Omit<Vehicle, 'pairId' | 'brand' | 'drivetrain' | 'paints'> & { paints?: Paint[] };

function pair(id: string, brand: string, segment: string, ice: Spec, ev: Spec): VehiclePair {
  return {
    id,
    brand,
    label: `${ice.name} · ${ev.name}`,
    segment,
    ice: { paints: PAINTS_ICE, ...ice, pairId: id, brand, drivetrain: 'ice' },
    ev: { paints: PAINTS_EV, ...ev, pairId: id, brand, drivetrain: 'ev' },
  };
}

const mm = (n: number) => n.toLocaleString('en-GB');
/** Overview rows shared by every car. */
function basics(d: Spec['dims'], extra: [string, string][], weight: number): [string, string][] {
  return [...extra, ['Length × width', `${mm(Math.round(d.length * 1000))} × ${mm(Math.round(d.width * 1000))} mm`], ['Wheelbase', `${mm(Math.round(d.wheelbase * 1000))} mm`], ['Kerb weight', `≈ ${mm(weight)} kg`]];
}

const ETSI = { cylinders: 4, engineMount: 'transverse', turbo: true, gearbox: 'dct', gears: 7, hybrid: { volts: 48, starter: 'belt' }, driven: 'front' } as const;
const MEB_REAR = { driven: 'rear', motor: 'pmsm' } as const;
const VW_ETSI_NOTES: Vehicle['notes'] = {
  turbo: { summary: 'Exhaust-driven compressor with variable turbine geometry (VTG), unusual on a petrol engine.' },
  bsg: { summary: 'Electric motor-generator driven by the engine’s belt — the "e" in eTSI.' },
};

// Figures describe one representative trim per model and are rounded; ≈ marks the less certain
// ones. They vary by market and model year — check the maker's site for exact data.
const dGolf = { length: 4.284, width: 1.789, height: 1.456, wheelbase: 2.636, frontOverhang: 0.86, tireDiameter: 0.634, tireWidth: 0.225, groundClearance: 0.14 };
const dId3 = { length: 4.261, width: 1.809, height: 1.552, wheelbase: 2.77, frontOverhang: 0.78, tireDiameter: 0.69, tireWidth: 0.215, groundClearance: 0.14 };
const dTiguan = { length: 4.539, width: 1.859, height: 1.639, wheelbase: 2.681, frontOverhang: 0.92, tireDiameter: 0.7, tireWidth: 0.235, groundClearance: 0.18 };
const dId4 = { length: 4.584, width: 1.852, height: 1.612, wheelbase: 2.765, frontOverhang: 0.86, tireDiameter: 0.72, tireWidth: 0.235, groundClearance: 0.17 };
const dPassat = { length: 5.006, width: 1.85, height: 1.489, wheelbase: 2.871, frontOverhang: 0.96, tireDiameter: 0.66, tireWidth: 0.235, groundClearance: 0.14 };
const dId7 = { length: 4.961, width: 1.862, height: 1.538, wheelbase: 2.971, frontOverhang: 0.89, tireDiameter: 0.72, tireWidth: 0.235, groundClearance: 0.14 };
const d330 = { length: 4.713, width: 1.827, height: 1.44, wheelbase: 2.851, frontOverhang: 0.8, tireDiameter: 0.634, tireWidth: 0.225, groundClearance: 0.13 };
const dI4 = { length: 4.783, width: 1.852, height: 1.448, wheelbase: 2.856, frontOverhang: 0.84, tireDiameter: 0.68, tireWidth: 0.245, groundClearance: 0.13 };
const dC = { length: 4.751, width: 1.82, height: 1.438, wheelbase: 2.865, frontOverhang: 0.82, tireDiameter: 0.657, tireWidth: 0.225, groundClearance: 0.13 };
const dEqe = { length: 4.946, width: 1.961, height: 1.512, wheelbase: 3.12, frontOverhang: 0.86, tireDiameter: 0.712, tireWidth: 0.255, groundClearance: 0.14 };
const dQ5 = { length: 4.682, width: 1.893, height: 1.662, wheelbase: 2.819, frontOverhang: 0.94, tireDiameter: 0.739, tireWidth: 0.235, groundClearance: 0.2 };
const dQ4 = { length: 4.588, width: 1.865, height: 1.632, wheelbase: 2.764, frontOverhang: 0.86, tireDiameter: 0.74, tireWidth: 0.235, groundClearance: 0.17 };
const d500 = { length: 3.571, width: 1.627, height: 1.488, wheelbase: 2.3, frontOverhang: 0.66, tireDiameter: 0.585, tireWidth: 0.185, groundClearance: 0.13 };
const d500e = { length: 3.632, width: 1.683, height: 1.527, wheelbase: 2.322, frontOverhang: 0.69, tireDiameter: 0.616, tireWidth: 0.205, groundClearance: 0.13 };
const dMini = { length: 3.876, width: 1.727, height: 1.432, wheelbase: 2.495, frontOverhang: 0.72, tireDiameter: 0.617, tireWidth: 0.205, groundClearance: 0.13 };
const dMiniE = { length: 3.845, width: 1.727, height: 1.432, wheelbase: 2.495, frontOverhang: 0.72, tireDiameter: 0.617, tireWidth: 0.205, groundClearance: 0.13 };
const dKona = { length: 4.35, width: 1.825, height: 1.585, wheelbase: 2.66, frontOverhang: 0.9, tireDiameter: 0.694, tireWidth: 0.235, groundClearance: 0.17 };
const dKonaE = { length: 4.355, width: 1.825, height: 1.575, wheelbase: 2.66, frontOverhang: 0.9, tireDiameter: 0.668, tireWidth: 0.215, groundClearance: 0.16 };

const MEB_BATTERY = { battery: '77 kWh net', cells: '12 modules × 24 pouch cells', ac: '11 kW AC' };

export const PAIRS: VehiclePair[] = [
  pair(
    'compact',
    'Volkswagen',
    'Compact hatchback',
    {
      id: 'golf',
      name: 'Golf',
      trim: '1.5 eTSI · 7-speed DSG',
      style: 'hatch',
      dims: dGolf,
      rearBrake: 'disc',
      rearSuspension: 'multilink',
      layout: ETSI,
      powertrain: { engine: '1.5 eTSI four-cylinder (EA211 evo)', displacement: '1,498 cc', power: '110 kW (150 PS)', torque: '250 Nm', gearbox: '7-speed DSG (dual-clutch)', drive: 'Front-wheel drive', tank: '50 L', turbo: 'Variable turbine geometry (VTG)' },
      overview: basics(dGolf, [['Platform', 'MQB evo'], ['Power', '110 kW / 150 PS'], ['Torque', '250 Nm'], ['0–100 km/h', '≈ 8.5 s'], ['Fuel tank', '50 L']], 1370),
      notes: VW_ETSI_NOTES,
    },
    {
      id: 'id3',
      name: 'ID.3',
      trim: 'Pro S · 77 kWh',
      style: 'hatchEV',
      dims: dId3,
      rearBrake: 'drum',
      rearSuspension: 'multilink',
      layout: MEB_REAR,
      modules: 12,
      powertrain: { motor: 'Permanent-magnet synchronous motor (rear)', power: '150 kW (204 PS)', torque: '310 Nm', gearbox: 'Single-speed reduction gear', drive: 'Rear-wheel drive', ...MEB_BATTERY, dc: 'up to ≈ 175 kW DC', range: 'up to ≈ 550 km WLTP' },
      overview: basics(dId3, [['Platform', 'MEB'], ['Power', '150 kW / 204 PS'], ['Torque', '310 Nm'], ['0–100 km/h', '≈ 7.9 s'], ['Battery', '77 kWh net'], ['Range (WLTP)', 'up to ≈ 550 km']], 1930),
    },
  ),
  pair(
    'suv',
    'Volkswagen',
    'Compact SUV',
    {
      id: 'tiguan',
      name: 'Tiguan',
      trim: '1.5 eTSI · 7-speed DSG',
      style: 'suv',
      dims: dTiguan,
      rearBrake: 'disc',
      rearSuspension: 'multilink',
      layout: ETSI,
      powertrain: { engine: '1.5 eTSI four-cylinder (EA211 evo)', displacement: '1,498 cc', power: '110 kW (150 PS)', torque: '250 Nm', gearbox: '7-speed DSG (dual-clutch)', drive: 'Front-wheel drive', tank: '≈ 55 L', turbo: 'Variable turbine geometry (VTG)' },
      overview: basics(dTiguan, [['Platform', 'MQB evo'], ['Power', '110 kW / 150 PS'], ['Torque', '250 Nm'], ['0–100 km/h', '≈ 9.1 s'], ['Boot', '≈ 650 L']], 1600),
      notes: VW_ETSI_NOTES,
    },
    {
      id: 'id4',
      name: 'ID.4',
      trim: 'Pro · 77 kWh',
      style: 'suvEV',
      dims: dId4,
      rearBrake: 'drum',
      rearSuspension: 'multilink',
      layout: MEB_REAR,
      modules: 12,
      powertrain: { motor: 'APP550 permanent-magnet synchronous motor (rear)', power: '210 kW (286 PS)', torque: '545 Nm', gearbox: 'Single-speed reduction gear', drive: 'Rear-wheel drive', ...MEB_BATTERY, dc: 'up to ≈ 135–175 kW DC', range: 'up to ≈ 550 km WLTP' },
      overview: basics(dId4, [['Platform', 'MEB'], ['Power', '210 kW / 286 PS'], ['Torque', '545 Nm'], ['0–100 km/h', '≈ 6.7 s'], ['Battery', '77 kWh net'], ['Range (WLTP)', 'up to ≈ 550 km']], 2100),
    },
  ),
  pair(
    'midsize',
    'Volkswagen',
    'Mid-size saloon',
    {
      id: 'passat',
      name: 'Passat Pro',
      trim: '1.5 TSI · 7-speed DSG',
      style: 'fastback',
      dims: dPassat,
      rearBrake: 'disc',
      rearSuspension: 'multilink',
      layout: { ...ETSI, hybrid: undefined },
      powertrain: { engine: '1.5 TSI four-cylinder (EA211)', displacement: '1,498 cc', power: '≈ 118 kW (160 PS)', torque: '250 Nm', gearbox: '7-speed DSG (dual-clutch)', drive: 'Front-wheel drive', tank: '≈ 60 L' },
      overview: basics(dPassat, [['Platform', 'MQB evo'], ['Power', '≈ 118 kW / 160 PS'], ['Torque', '250 Nm'], ['Market', 'China (SAIC-VW)'], ['Boot', '≈ 560 L']], 1500),
    },
    {
      id: 'id7',
      name: 'ID.7',
      trim: 'Pro · 77 kWh',
      style: 'fastback',
      dims: dId7,
      rearBrake: 'drum',
      rearSuspension: 'multilink',
      layout: MEB_REAR,
      modules: 12,
      powertrain: { motor: 'APP550 permanent-magnet synchronous motor (rear)', power: '210 kW (286 PS)', torque: '545 Nm', gearbox: 'Single-speed reduction gear', drive: 'Rear-wheel drive', ...MEB_BATTERY, dc: 'up to ≈ 175 kW DC', range: 'up to ≈ 620 km WLTP' },
      overview: basics(dId7, [['Platform', 'MEB'], ['Power', '210 kW / 286 PS'], ['Torque', '545 Nm'], ['0–100 km/h', '≈ 6.5 s'], ['Battery', '77 kWh net'], ['Range (WLTP)', 'up to ≈ 620 km']], 2170),
    },
  ),
  pair(
    'bmw3',
    'BMW',
    'Premium saloon',
    {
      id: 'bmw330i',
      name: '330i',
      trim: '2.0 turbo · 8-speed Steptronic',
      style: 'fastback',
      dims: d330,
      rearBrake: 'disc',
      rearSuspension: 'multilink',
      layout: { driven: 'rear', cylinders: 4, engineMount: 'longitudinal', turbo: true, gearbox: 'automatic', gears: 8, oilSensor: true },
      powertrain: { engine: 'B48 2.0 four-cylinder turbo', displacement: '1,998 cc', power: '180 kW (245 PS)', torque: '400 Nm', gearbox: '8-speed Steptronic (ZF 8HP automatic)', drive: 'Rear-wheel drive', tank: '59 L', turbo: 'Twin-scroll' },
      overview: basics(d330, [['Platform', 'CLAR'], ['Power', '180 kW / 245 PS'], ['Torque', '400 Nm'], ['0–100 km/h', '≈ 5.8 s'], ['Fuel tank', '59 L']], 1545),
      notes: { turbo: { summary: 'Twin-scroll turbo: exhaust pulses from cylinders 1+4 and 2+3 reach the turbine separately, so boost builds sooner.' } },
    },
    {
      id: 'bmwi4',
      name: 'i4',
      trim: 'eDrive40 · 81 kWh',
      style: 'fastback',
      dims: dI4,
      rearBrake: 'disc',
      rearSuspension: 'multilink',
      layout: { driven: 'rear', motor: 'eesm' },
      modules: 4,
      powertrain: { motor: 'Current-excited synchronous motor (rear, no magnets)', power: '250 kW (340 PS)', torque: '430 Nm', gearbox: 'Single-speed reduction gear', drive: 'Rear-wheel drive', battery: '≈ 81 kWh net', cells: 'Prismatic cells in 4 modules (≈)', ac: '11 kW AC', dc: 'up to ≈ 205 kW DC', range: 'up to ≈ 590 km WLTP' },
      overview: basics(dI4, [['Platform', 'CLAR (gen 5 eDrive)'], ['Power', '250 kW / 340 PS'], ['Torque', '430 Nm'], ['0–100 km/h', '≈ 5.7 s'], ['Battery', '≈ 81 kWh net'], ['Range (WLTP)', 'up to ≈ 590 km']], 2125),
    },
  ),
  pair(
    'mbc',
    'Mercedes-Benz',
    'Premium saloon',
    {
      id: 'c200',
      name: 'C 200',
      trim: '1.5 turbo + 48 V EQ Boost · 9G-TRONIC',
      style: 'fastback',
      dims: dC,
      rearBrake: 'disc',
      rearSuspension: 'multilink',
      layout: { driven: 'rear', cylinders: 4, engineMount: 'longitudinal', turbo: true, gearbox: 'automatic', gears: 9, hybrid: { volts: 48, starter: 'integrated' }, oilSensor: true },
      powertrain: { engine: 'M254 1.5 four-cylinder turbo', displacement: '1,496 cc', power: '150 kW (204 PS) + 15 kW boost', torque: '300 Nm (+ 200 Nm boost)', gearbox: '9G-TRONIC (9-speed automatic)', drive: 'Rear-wheel drive', tank: '66 L' },
      overview: basics(dC, [['Platform', 'MRA II'], ['Power', '150 kW / 204 PS'], ['Torque', '300 Nm'], ['0–100 km/h', '≈ 7.3 s'], ['Fuel tank', '66 L']], 1650),
    },
    {
      id: 'eqe',
      name: 'EQE',
      trim: '350+ · 90 kWh',
      style: 'fastback',
      dims: dEqe,
      rearBrake: 'disc',
      rearSuspension: 'multilink',
      layout: { driven: 'rear', motor: 'pmsm' },
      modules: 10,
      powertrain: { motor: 'Permanent-magnet synchronous motor (rear)', power: '215 kW (292 PS)', torque: '565 Nm', gearbox: 'Single-speed reduction gear', drive: 'Rear-wheel drive', battery: '≈ 90 kWh net', cells: '10 modules', ac: '11 kW AC (22 kW optional)', dc: 'up to ≈ 170 kW DC', range: 'up to ≈ 650 km WLTP' },
      overview: basics(dEqe, [['Platform', 'EVA2'], ['Power', '215 kW / 292 PS'], ['Torque', '565 Nm'], ['0–100 km/h', '≈ 6.4 s'], ['Battery', '≈ 90 kWh net'], ['Range (WLTP)', 'up to ≈ 650 km']], 2355),
    },
  ),
  pair(
    'audiq',
    'Audi',
    'Premium SUV',
    {
      id: 'q5',
      name: 'Q5',
      trim: '45 TFSI quattro · 7-speed S tronic',
      style: 'suv',
      dims: dQ5,
      rearBrake: 'disc',
      rearSuspension: 'multilink',
      layout: { driven: 'all', cylinders: 4, engineMount: 'longitudinal', turbo: true, gearbox: 'dct', gears: 7, hybrid: { volts: 12, starter: 'belt' } },
      powertrain: { engine: 'EA888 2.0 TFSI four-cylinder', displacement: '1,984 cc', power: '≈ 195 kW (265 PS)', torque: '370 Nm', gearbox: '7-speed S tronic (dual-clutch)', drive: 'quattro all-wheel drive (ultra)', tank: '70 L' },
      overview: basics(dQ5, [['Platform', 'MLB evo'], ['Power', '≈ 195 kW / 265 PS'], ['Torque', '370 Nm'], ['0–100 km/h', '≈ 6.1 s'], ['Fuel tank', '70 L']], 1830),
      notes: {
        driveshafts: {
          summary: 'Propeller shaft to the rear axle plus driveshafts to all four wheels.',
          how: '"quattro ultra" normally drives only the front wheels to save fuel. When sensors predict slip — a wet road, a hard launch, a fast corner — a clutch at the end of the gearbox and a decoupler at the rear axle connect the propeller shaft within a fraction of a second.',
        },
      },
    },
    {
      id: 'q4etron',
      name: 'Q4 e-tron',
      trim: '40 · 77 kWh',
      style: 'suvEV',
      dims: dQ4,
      rearBrake: 'drum',
      rearSuspension: 'multilink',
      layout: MEB_REAR,
      modules: 12,
      powertrain: { motor: 'Permanent-magnet synchronous motor (rear)', power: '150 kW (204 PS)', torque: '310 Nm', gearbox: 'Single-speed reduction gear', drive: 'Rear-wheel drive', ...MEB_BATTERY, dc: 'up to ≈ 125 kW DC', range: 'up to ≈ 520 km WLTP' },
      overview: basics(dQ4, [['Platform', 'MEB (shared with the ID.4)'], ['Power', '150 kW / 204 PS'], ['Torque', '310 Nm'], ['0–100 km/h', '≈ 8.5 s'], ['Battery', '77 kWh net'], ['Range (WLTP)', 'up to ≈ 520 km']], 2050),
    },
  ),
  pair(
    'fiat500',
    'Fiat',
    'City car',
    {
      id: 'fiat500',
      name: '500',
      trim: '1.0 Hybrid · 6-speed manual',
      style: 'hatch',
      dims: d500,
      rearBrake: 'drum',
      rearSuspension: 'torsion',
      layout: { driven: 'front', cylinders: 3, engineMount: 'transverse', turbo: false, gearbox: 'manual', gears: 6, hybrid: { volts: 12, starter: 'belt' } },
      powertrain: { engine: 'FireFly 1.0 three-cylinder (naturally aspirated)', displacement: '999 cc', power: '51 kW (70 PS)', torque: '92 Nm', gearbox: '6-speed manual', drive: 'Front-wheel drive', tank: '35 L' },
      overview: basics(d500, [['Engine', '1.0 three-cylinder'], ['Power', '51 kW / 70 PS'], ['Torque', '92 Nm'], ['0–100 km/h', '≈ 13.8 s'], ['Fuel tank', '35 L']], 980),
    },
    {
      id: 'fiat500e',
      name: '500e',
      trim: '42 kWh',
      style: 'hatchEV',
      dims: d500e,
      rearBrake: 'disc',
      rearSuspension: 'torsion',
      layout: { driven: 'front', motor: 'pmsm' },
      modules: 6,
      powertrain: { motor: 'Permanent-magnet synchronous motor (front)', power: '87 kW (118 PS)', torque: '220 Nm', gearbox: 'Single-speed reduction gear', drive: 'Front-wheel drive', battery: '42 kWh (≈ 37 kWh net)', cells: '≈ 6 modules', ac: '11 kW AC', dc: 'up to 85 kW DC', range: 'up to ≈ 320 km WLTP' },
      overview: basics(d500e, [['Platform', 'Dedicated EV'], ['Power', '87 kW / 118 PS'], ['Torque', '220 Nm'], ['0–100 km/h', '≈ 9.0 s'], ['Battery', '42 kWh'], ['Range (WLTP)', 'up to ≈ 320 km']], 1365),
    },
  ),
  pair(
    'mini',
    'MINI',
    'Premium small car',
    {
      id: 'minicoopers',
      name: 'Cooper S',
      trim: '2.0 turbo · 7-speed Steptronic DCT',
      style: 'hatch',
      dims: dMini,
      rearBrake: 'disc',
      rearSuspension: 'multilink',
      layout: { driven: 'front', cylinders: 4, engineMount: 'transverse', turbo: true, gearbox: 'dct', gears: 7, oilSensor: true },
      powertrain: { engine: 'B48 2.0 four-cylinder turbo', displacement: '1,998 cc', power: '131 kW (178 PS)', torque: '280 Nm', gearbox: '7-speed Steptronic (dual-clutch)', drive: 'Front-wheel drive', tank: '44 L', turbo: 'Twin-scroll' },
      overview: basics(dMini, [['Platform', 'UKL1'], ['Power', '131 kW / 178 PS'], ['Torque', '280 Nm'], ['0–100 km/h', '≈ 6.7 s'], ['Fuel tank', '44 L']], 1265),
    },
    {
      id: 'minicooperse',
      name: 'Cooper SE',
      trim: '32.6 kWh',
      style: 'hatchEV',
      dims: dMiniE,
      rearBrake: 'disc',
      rearSuspension: 'multilink',
      layout: { driven: 'front', motor: 'pmsm' },
      modules: 12,
      powertrain: { motor: 'Synchronous motor (front, from the BMW i3)', power: '135 kW (184 PS)', torque: '270 Nm', gearbox: 'Single-speed reduction gear', drive: 'Front-wheel drive', battery: '32.6 kWh (28.9 kWh net)', cells: '12 modules of prismatic cells', ac: '11 kW AC', dc: 'up to 50 kW DC', range: 'up to ≈ 230 km WLTP' },
      overview: basics(dMiniE, [['Platform', 'UKL1 (converted)'], ['Power', '135 kW / 184 PS'], ['Torque', '270 Nm'], ['0–100 km/h', '≈ 7.3 s'], ['Battery', '28.9 kWh net'], ['Range (WLTP)', 'up to ≈ 230 km']], 1365),
      notes: {
        'battery-modules': { how: 'The Cooper SE was converted from the petrol car, so its battery is T-shaped: it fills the old exhaust tunnel and the space under the rear seat instead of the whole floor. That keeps the boot, but limits capacity. When charging, lithium ions move into the graphite anode; when driving, they move back and release electrons into the circuit.' },
      },
    },
  ),
  pair(
    'kona',
    'Hyundai',
    'Compact SUV',
    {
      id: 'kona',
      name: 'Kona',
      trim: '1.6 T-GDi · 7-speed DCT',
      style: 'suv',
      dims: dKona,
      rearBrake: 'disc',
      rearSuspension: 'torsion',
      layout: { driven: 'front', cylinders: 4, engineMount: 'transverse', turbo: true, gearbox: 'dct', gears: 7 },
      powertrain: { engine: 'Smartstream G1.6 T-GDi four-cylinder', displacement: '1,598 cc', power: '146 kW (198 PS)', torque: '265 Nm', gearbox: '7-speed DCT (dual-clutch)', drive: 'Front-wheel drive', tank: '47 L' },
      overview: basics(dKona, [['Platform', 'K3'], ['Power', '146 kW / 198 PS'], ['Torque', '265 Nm'], ['0–100 km/h', '≈ 7.8 s'], ['Fuel tank', '47 L']], 1445),
    },
    {
      id: 'konaev',
      name: 'Kona Electric',
      trim: '65.4 kWh',
      style: 'suvEV',
      dims: dKonaE,
      rearBrake: 'disc',
      rearSuspension: 'multilink',
      layout: { driven: 'front', motor: 'pmsm' },
      modules: 10,
      powertrain: { motor: 'Permanent-magnet synchronous motor (front)', power: '150 kW (204 PS)', torque: '255 Nm', gearbox: 'Single-speed reduction gear', drive: 'Front-wheel drive', battery: '65.4 kWh', cells: '≈ 10 modules', ac: '11 kW AC', dc: 'up to ≈ 100 kW DC', range: 'up to ≈ 514 km WLTP' },
      overview: basics(dKonaE, [['Platform', 'K3 (EV version)'], ['Power', '150 kW / 204 PS'], ['Torque', '255 Nm'], ['0–100 km/h', '≈ 7.8 s'], ['Battery', '65.4 kWh'], ['Range (WLTP)', 'up to ≈ 514 km']], 1700),
      notes: { 'charge-port': { summary: 'Combined Charging System socket behind a flap in the nose.' } },
    },
  ),
];

/** Every brand, in catalogue order. */
export const BRANDS = [...new Set(PAIRS.map((p) => p.brand))];

export function findVehicle(pairId: string, drivetrain: Drivetrain): Vehicle {
  const pair = PAIRS.find((p) => p.id === pairId) ?? PAIRS[0];
  return pair[drivetrain];
}
