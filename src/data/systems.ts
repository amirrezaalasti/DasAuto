export type SystemId =
  | 'body'
  | 'glass'
  | 'lighting'
  | 'interior'
  | 'chassis'
  | 'wheels'
  | 'powertrain'
  | 'energy'
  | 'exhaust'
  | 'thermal'
  | 'electrical'
  | 'service';

export interface SystemInfo {
  id: SystemId;
  name: string;
  color: string;
  blurb: string;
}

export const SYSTEMS: SystemInfo[] = [
  { id: 'body', name: 'Body & closures', color: '#6b8afd', blurb: 'The steel body structure and the panels that open: doors, hood, tailgate.' },
  { id: 'glass', name: 'Glazing', color: '#67c6e8', blurb: 'Windscreen, side and rear glass. Laminated glass at the front keeps occupants inside in a crash.' },
  { id: 'lighting', name: 'Lighting', color: '#f2c94c', blurb: 'LED headlights, signatures and tail lamps.' },
  { id: 'interior', name: 'Interior', color: '#e879a6', blurb: 'Seats, cockpit, displays and controls — where the driver meets the machine.' },
  { id: 'chassis', name: 'Chassis & steering', color: '#a68bf0', blurb: 'Subframes, suspension and steering: they keep the tyres on the road and point the car.' },
  { id: 'wheels', name: 'Wheels & brakes', color: '#9aa4b2', blurb: 'Tyres, rims and the friction brakes that turn motion into heat.' },
  { id: 'powertrain', name: 'Powertrain', color: '#f08a3c', blurb: 'Everything that makes torque and delivers it to the wheels.' },
  { id: 'energy', name: 'Energy storage', color: '#3fbf7f', blurb: 'Where the energy lives: a fuel tank or a high-voltage battery.' },
  { id: 'exhaust', name: 'Exhaust & aftertreatment', color: '#a3978c', blurb: 'Cleans and silences the combustion gases. Electric cars have none.' },
  { id: 'thermal', name: 'Thermal management', color: '#4aa8f0', blurb: 'Radiators, pumps and heat pumps that keep every component in its happy temperature range.' },
  { id: 'electrical', name: 'Electrical & electronics', color: '#e0b43a', blurb: 'Low-voltage batteries, converters and control units.' },
  { id: 'service', name: 'Service points', color: '#fb7185', blurb: 'What a mechanic checks under the bonnet: fluids, caps, fuses and filters.' },
];

export const SYSTEM_BY_ID = Object.fromEntries(SYSTEMS.map((s) => [s.id, s])) as Record<SystemId, SystemInfo>;
