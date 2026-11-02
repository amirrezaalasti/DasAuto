import type { Drivetrain, Vehicle } from './vehicles';

export interface PartContent {
  name: string;
  /** What it is. */
  summary: string;
  /** How it works — the mechanism, in plain language. */
  how: string;
  /** Set for parts that exist only because of the drivetrain type. */
  only?: Drivetrain;
  /** Animated explainer diagram to show alongside. */
  diagram?: DiagramId;
  /** What a mechanic looks at during a service. */
  check?: string;
}

export type DiagramId = 'four-stroke' | 'turbo' | 'dsg' | 'motor' | 'battery' | 'charging' | 'regen' | 'brakes' | 'heatpump';

export const CONTENT: Record<string, PartContent> = {
  // ── Body ──────────────────────────────────────────────────────────────
  body: {
    name: 'Body',
    summary: 'The painted steel body: the welded safety shell plus the bonnet, doors, tailgate, bumpers and mirrors bolted to it.',
    how: 'Underneath the paint is the body-in-white, a welded cage of high-strength and hot-formed steel around the occupants. The front and rear sections are softer on purpose and fold up like an accordion in a crash, absorbing energy while the cabin stays intact. Each door carries a steel impact beam that passes side-impact loads into the pillars and sill. The bumper covers hide crash beams on replaceable "crash boxes", plus the parking and radar sensors. Petrol cars need large grille openings for cooling air; the electric cars can keep their nose almost closed, which cuts drag.',
  },
  biw: {
    name: 'Body-in-white',
    summary: 'The welded steel shell of the car, before paint, doors and hood are added. It carries every load and forms the safety cell.',
    how: 'High-strength and hot-formed steels make a rigid cage around the occupants. The front and rear sections are softer on purpose and fold up in a crash like an accordion, absorbing energy while the cabin stays intact. Stiffness also matters for handling: a body that does not twist lets the suspension do its job precisely.',
  },
  hood: {
    name: 'Bonnet (hood)',
    summary: 'Hinged panel covering the front compartment.',
    how: 'Leaves space underneath so it can deform if it hits a pedestrian, spreading the impact over a larger area. On a petrol car it covers the engine bay; on most electric cars there is no engine beneath it, only the thermal module, 12 V battery and electronics — or a front motor.',
  },
  roof: {
    name: 'Roof panel',
    summary: 'Outer skin of the roof, bonded and welded to the roof frame.',
    how: 'Roof bows and side rails carry the loads; the panel itself is thin. In a rollover the A-, B- and C-pillars plus the roof rails form a hoop that keeps survival space.',
  },
  'doors-front': {
    name: 'Front doors',
    summary: 'Front side doors with window regulators, speakers, locks and side-impact beams.',
    how: 'A high-strength steel beam runs through each door. In a side impact it transfers the load into the stiff A- and B-pillars and the sill, instead of letting it push into the cabin.',
  },
  'doors-rear': {
    name: 'Rear doors',
    summary: 'Rear side doors, shaped around the rear wheel arch.',
    how: 'Same principle as the front doors: an internal impact beam passes side-impact loads into the B- and C-pillars. Child locks disable the inner handle.',
  },
  tailgate: {
    name: 'Tailgate',
    summary: 'Rear hatch giving access to the boot, including the rear window and wiper.',
    how: 'Gas struts carry its weight so it stays open. On many trims an electric motor opens and closes it, and a foot sensor under the bumper can trigger it.',
  },
  'bumper-front': {
    name: 'Front bumper',
    summary: 'Plastic bumper cover with a crash beam and energy absorbers behind it.',
    how: 'The cover is cosmetic and aerodynamic. Behind it, an aluminium or steel crash beam sits on "crash boxes" that crumple in low-speed bumps, so they can be replaced without repairing the main rails. It also houses parking and radar sensors.',
  },
  'bumper-rear': {
    name: 'Rear bumper',
    summary: 'Rear bumper cover with crash beam, parking sensors and diffuser.',
    how: 'Works like the front bumper. On the petrol cars the exhaust ends behind it; electric cars do not need any openings here.',
  },
  grille: {
    name: 'Grille & air intakes',
    summary: 'Openings that let cooling air reach the radiators.',
    how: 'A combustion engine turns roughly two thirds of its fuel energy into heat, so it needs large openings. Electric cars produce far less waste heat; their noses can stay almost closed, which cuts drag. Active shutters close the openings when cooling is not needed.',
  },
  mirrors: {
    name: 'Exterior mirrors',
    summary: 'Door mirrors with heating, folding motors, indicators and blind-spot warning lights.',
    how: 'A radar sensor in the rear bumper watches the blind spot and lights a warning symbol in the mirror glass if a car is alongside.',
  },

  // ── Glass & lighting ──────────────────────────────────────────────────
  glazing: {
    name: 'Glazing',
    summary: 'Windscreen, side windows and rear window.',
    how: 'The windscreen is laminated: two glass layers glued to a plastic film, so it cracks without shattering and helps hold occupants in. It is bonded into the body and adds stiffness. Side windows are usually tempered glass that breaks into small blunt pieces.',
  },
  headlights: {
    name: 'LED headlights',
    summary: 'LED headlight units; IQ.LIGHT versions use LED matrix modules.',
    how: 'A matrix headlight has many LEDs that can be switched individually. A front camera finds oncoming cars, and the control unit turns off just the LEDs that would dazzle them, keeping high beam on everywhere else.',
  },
  taillights: {
    name: 'Tail lights',
    summary: 'LED rear lights, brake lights and indicators.',
    how: 'LEDs reach full brightness about 0.2 s faster than old filament bulbs. At 100 km/h that gives the driver behind roughly five extra metres to react.',
  },
  lightbar: {
    name: 'Light strip',
    summary: 'Illuminated strip linking the lamps — a common design signature on electric cars.',
    how: 'A light guide spreads the light from a few LEDs along the whole strip. Some models use it to "greet" the driver and to show charging status.',
  },

  // ── Interior ──────────────────────────────────────────────────────────
  cabin: {
    name: 'Interior',
    summary: 'Seats, dashboard, steering wheel, displays and centre console.',
    how: 'A hidden cross-car beam inside the dashboard ties the A-pillars together and carries the steering column, airbags and air-conditioning box. Turning the steering wheel turns a column that drives a pinion on the steering rack. Seat frames are anchored to floor cross-members; in a crash, pyrotechnic pretensioners pull the belts tight within milliseconds. On the electric cars the whole cabin sits on top of the battery, which is why the floor is flat and the seating position slightly higher.',
  },
  'seats-front': {
    name: 'Front seats',
    summary: 'Driver and passenger seats with side airbags and belt tensioners.',
    how: 'The seat frame is anchored to the floor cross-members. In a crash, pyrotechnic pretensioners pull the belt tight within milliseconds, then load limiters let it give a little so the chest is not overloaded.',
  },
  'seats-rear': {
    name: 'Rear bench',
    summary: 'Split-folding rear seats with ISOFIX anchors.',
    how: 'ISOFIX connects a child seat directly to the body structure instead of through the seat belt. On the electric cars the rear bench sits on top of the battery, so the floor is flat.',
  },
  dashboard: {
    name: 'Dashboard',
    summary: 'Instrument panel with a magnesium or steel cross-car beam inside.',
    how: 'The hidden cross-car beam ties the A-pillars together and carries the steering column, airbags and HVAC box. The heater/AC box sends air through ducts to the vents and windscreen.',
  },
  'steering-wheel': {
    name: 'Steering wheel',
    summary: 'Steering wheel with driver airbag and touch controls.',
    how: 'Turning it rotates the steering column, which drives a pinion on the steering rack. Sensors in the rim detect your hands for assisted-driving functions.',
  },
  displays: {
    name: 'Displays',
    summary: 'Digital instrument cluster and central infotainment touchscreen.',
    how: 'The cockpit display shows speed, assistance and energy flow. The touchscreen runs navigation, media and climate. In the electric cars it also plans charging stops along a route and preheats the battery before a fast charger.',
  },
  console: {
    name: 'Centre console',
    summary: 'Storage, cupholders, wireless charging — and on the petrol car, the gear selector.',
    how: 'Petrol cars usually have the gear selector here, connected electronically (shift-by-wire) to the gearbox. Many electric cars move the drive selector to the steering column or display, which frees space between the seats.',
  },

  // ── Chassis ───────────────────────────────────────────────────────────
  underbody: {
    name: 'Floor pan & sills',
    summary: 'Floor of the body structure, with the side sills and cross-members.',
    how: 'The sills are strong box sections that carry side-impact loads. On electric platforms the floor sits on top of the battery, and the battery frame adds a lot of stiffness.',
  },
  'subframe-front': {
    name: 'Front subframe',
    summary: 'Separate frame bolted under the front of the body that carries the suspension arms and steering rack.',
    how: 'Rubber bushings between subframe and body filter out road noise and vibration. In a petrol car the engine and gearbox mounts are nearby; in the electric cars the front is almost empty.',
  },
  'suspension-front': {
    name: 'Front suspension (MacPherson)',
    summary: 'Strut suspension: a coil spring around a damper, with a lower control arm.',
    how: 'The spring carries the car’s weight and lets the wheel move over bumps. The damper (shock absorber) pushes oil through small valves to stop the spring from bouncing. The strut also acts as the steering pivot.',
  },
  'suspension-rear': {
    name: 'Rear suspension',
    summary: 'Multi-link rear axle with separate spring and damper.',
    how: 'Several arms (links) control the wheel’s angle independently, so it stays upright and on track as it moves up and down. That improves grip and comfort over a simpler torsion-beam axle.',
  },
  'steering-rack': {
    name: 'Steering rack & column',
    summary: 'Rack-and-pinion steering with electromechanical power assistance.',
    how: 'The pinion at the end of the steering column meshes with a toothed rack and turns rotation into side-to-side motion. Tie rods push the wheels to steer. An electric motor on the rack adds assistance — more when parking, less at speed — and lets lane-keeping assist steer the car.',
  },

  // ── Wheels & brakes ───────────────────────────────────────────────────
  wheels: {
    name: 'Wheels & tyres',
    summary: 'Alloy rims with tyres. The only parts that actually touch the road.',
    how: 'Each tyre’s contact patch is about the size of a postcard. Every force — acceleration, braking, cornering — goes through these four patches. Electric cars often use low-rolling-resistance tyres, because rolling resistance takes a big share of the energy at city speeds.',
  },
  'brakes-front': {
    name: 'Front disc brakes',
    summary: 'Ventilated brake discs and callipers.',
    how: 'Pressing the pedal raises hydraulic pressure. That pushes pistons in the calliper, which squeeze pads against the spinning disc. Friction turns kinetic energy into heat, and the vents inside the disc carry it away. The front brakes do most of the work because weight shifts forward when you brake.',
    diagram: 'brakes',
  },
  'brakes-rear': {
    name: 'Rear brakes',
    summary: 'Rear disc or drum brakes.',
    how: 'The rear brakes do less work than the front ones, because weight shifts forward when braking. Electric cars slow down mostly by regenerative braking, so some makers fit enclosed drum brakes at the rear: they resist corrosion when seldom used, last almost the life of the car and produce less brake dust.',
    diagram: 'brakes',
  },

  // ── ICE powertrain ────────────────────────────────────────────────────
  'engine-block': {
    name: 'Engine block',
    summary: 'Aluminium crankcase of the 1.5 eTSI four-cylinder engine. The cylinders are bored into it.',
    how: 'The block holds the four cylinders, the crankshaft bearings and passages for coolant and oil. In each cylinder, a burning mixture of air and petrol pushes a piston down thousands of times a minute. Mounted sideways (transverse), it drives the front wheels through the gearbox.',
    only: 'ice',
    diagram: 'four-stroke',
  },
  'cylinder-head': {
    name: 'Cylinder head',
    summary: 'Top of the engine: valves, camshafts, injectors and spark plugs.',
    how: 'Two belt-driven camshafts open the intake and exhaust valves at exactly the right moments. Injectors spray petrol straight into the cylinder at up to ≈350 bar, and the spark plug ignites it.',
    only: 'ice',
    diagram: 'four-stroke',
  },
  pistons: {
    name: 'Pistons & connecting rods',
    summary: 'Four pistons that ride up and down in the cylinders, linked to the crankshaft.',
    how: 'Each piston goes through four strokes: intake (down, pulling in air), compression (up), power (the ignited fuel forces it down) and exhaust (up, pushing out burnt gas). Only one stroke in four produces power, so the four cylinders are timed to fire one after another (order 1-3-4-2).',
    only: 'ice',
    diagram: 'four-stroke',
  },
  crankshaft: {
    name: 'Crankshaft',
    summary: 'Turns the pistons’ up-and-down motion into rotation.',
    how: 'The connecting rods attach to offset "crank pins", much like your legs on bicycle pedals. A flywheel on the end smooths out the separate power pulses. Engine speed (rpm) is how fast this shaft turns.',
    only: 'ice',
    diagram: 'four-stroke',
  },
  turbo: {
    name: 'Turbocharger',
    summary: 'Exhaust-driven compressor that squeezes more air into the engine.',
    how: 'Hot exhaust gas spins a turbine at well over 100,000 rpm. The turbine shares a shaft with a compressor that squeezes fresh air into the engine. More air allows more fuel, so a small engine makes the power of a bigger one. A wastegate (or adjustable vanes) bleeds off exhaust so the boost pressure never gets too high.',
    only: 'ice',
    diagram: 'turbo',
  },
  intake: {
    name: 'Air intake & charge-air cooler',
    summary: 'Air filter box, throttle and intake manifold with a water-cooled intercooler.',
    how: 'Air is filtered, compressed by the turbo (which heats it), then cooled again by the charge-air cooler. Cooler air is denser, so more oxygen fits in each cylinder. The throttle valve sets how much air the engine gets — that is what the accelerator pedal really controls.',
    only: 'ice',
    diagram: 'turbo',
  },
  bsg: {
    name: '48 V belt starter-generator',
    summary: 'Electric motor-generator driven by the engine’s belt — the "e" in eTSI.',
    how: 'When braking or coasting, it works as a generator and charges a small 48 V battery. When pulling away it gives an electric boost and restarts the engine smoothly. It lets the engine switch off completely while coasting, which saves fuel. It is a mild hybrid: it cannot drive the car on its own.',
    only: 'ice',
  },
  gearbox: {
    name: 'DSG dual-clutch gearbox',
    summary: '7-speed direct-shift gearbox, mounted next to the engine. Includes the differential.',
    how: 'A petrol engine only works well in a narrow speed range, so it needs many gears. The DSG is like two manual gearboxes in one: one clutch handles gears 1-3-5-7, the other gears 2-4-6. The next gear is already engaged, so a shift is just swapping one clutch for the other — in a few hundredths of a second. The differential lets the left and right wheels turn at different speeds in corners.',
    only: 'ice',
    diagram: 'dsg',
  },
  driveshafts: {
    name: 'Front driveshafts',
    summary: 'Shafts carrying torque from the gearbox to the front wheels.',
    how: 'Constant-velocity (CV) joints at each end let the shaft keep turning smoothly while the wheels steer and the suspension moves.',
    only: 'ice',
  },

  // ── ICE energy / exhaust / thermal ────────────────────────────────────
  'fuel-tank': {
    name: 'Fuel tank',
    summary: 'Plastic fuel tank under the rear seats, with an in-tank pump.',
    how: 'Petrol holds about 9 kWh of energy per litre, so a 50 L tank stores around 450 kWh — roughly six times a 77 kWh battery. But only about a quarter to a third of it ends up moving the car; the rest leaves as heat. An electric pump in the tank feeds the engine at low pressure, and a pump on the engine then raises it to ≈350 bar for injection.',
    only: 'ice',
  },
  'fuel-system': {
    name: 'Fuel lines & filler neck',
    summary: 'Filler neck on the right rear side and the line to the engine.',
    how: 'A carbon canister traps petrol vapour from the tank. The engine burns those vapours later instead of letting them escape into the air.',
    only: 'ice',
  },
  'battery-48v': {
    name: '48 V lithium-ion battery',
    summary: 'Compact battery (well under 1 kWh) under the front passenger seat for the mild-hybrid system.',
    how: 'Stores the energy the belt starter-generator recovers when braking and returns it as a boost when pulling away. A DC/DC converter also feeds the 12 V system from it.',
    only: 'ice',
  },
  catalyst: {
    name: 'Catalytic converter & particulate filter',
    summary: 'Close-coupled three-way catalyst plus a gasoline particulate filter (GPF).',
    how: 'Exhaust passes over a ceramic honeycomb coated with platinum-group metals. It turns carbon monoxide, unburnt fuel and nitrogen oxides into CO₂, water and nitrogen — but only above ≈300 °C, so it sits right behind the engine to warm up fast. The GPF traps soot particles and burns them off now and then.',
    only: 'ice',
  },
  mufflers: {
    name: 'Exhaust pipes & silencers',
    summary: 'Pipes under the car and silencers that quieten the exhaust pulses.',
    how: 'Each combustion event sends a pressure pulse down the pipe. Chambers and perforated tubes inside the silencers make the sound waves reflect and cancel, and absorb the rest. Before leaving the car, the gas has cooled from ≈900 °C to a few hundred degrees.',
    only: 'ice',
  },
  radiator: {
    name: 'Radiator',
    summary: 'Main engine-coolant radiator behind the grille.',
    how: 'A water pump circulates coolant (water + glycol) through channels in the engine block and head, where it picks up heat. Hot coolant flows through the thin fins of the radiator, and the air passing through them carries the heat away. A thermostat keeps the engine near ≈90 °C.',
    only: 'ice',
  },
  'cooling-fan': {
    name: 'Cooling fan',
    summary: 'Electric fan behind the radiator.',
    how: 'At speed, the airflow from driving is enough. In traffic, the engine control unit switches the fan on to pull air through the radiator.',
    only: 'ice',
  },
  'battery-12v': {
    name: '12 V battery',
    summary: 'Low-voltage battery powering lights, control units, locks and infotainment.',
    how: 'Every car — petrol or electric — still runs its everyday electronics at 12 V. In the petrol car it is charged by the generator; in the electric car a DC/DC converter charges it from the high-voltage battery. In an EV it also has to "wake up" the car and close the high-voltage contactors.',
  },
  ecu: {
    name: 'Engine control unit',
    summary: 'Computer that manages injection, ignition, boost and emissions.',
    how: 'It reads dozens of sensors — air mass, oxygen in the exhaust (lambda), knock, temperature, pedal position — and recalculates injection timing, spark timing and turbo boost for every combustion event, many times per second.',
    only: 'ice',
  },

  // ── EV powertrain ─────────────────────────────────────────────────────
  'motor-stator': {
    name: 'Electric motor — stator',
    summary: 'The fixed outer part of the rear motor: a ring of copper windings.',
    how: 'Three sets of windings get alternating current, each one shifted a third of a cycle from the next. Together they create a magnetic field that rotates around the inside of the stator. The faster the inverter alternates the current, the faster the field spins.',
    only: 'ev',
    diagram: 'motor',
  },
  'motor-rotor': {
    name: 'Electric motor — rotor',
    summary: 'The spinning core, fitted with permanent magnets. Up to ≈16,000 rpm.',
    how: 'The rotor’s magnets are pulled along by the stator’s rotating field. They follow it in sync, which is why it is called a synchronous motor. It delivers full torque from 0 rpm, so the car accelerates hard right away. It is very efficient, typically over 90 %.',
    only: 'ev',
    diagram: 'motor',
  },
  'reduction-gear': {
    name: 'Single-speed gearbox',
    summary: 'Fixed-ratio reduction gear plus differential, typically around 9–12 : 1.',
    how: 'The motor spins much faster than the wheels, so two gear stages slow it down and multiply torque. One gear is enough because an electric motor works efficiently from standstill up to very high rpm. Reverse is just the motor turning the other way.',
    only: 'ev',
  },
  inverter: {
    name: 'Inverter (power electronics)',
    summary: 'Converts the battery’s direct current (DC) into three-phase alternating current (AC) for the motor.',
    how: 'Power transistors switch the battery voltage on and off thousands of times per second (pulse-width modulation). This builds three smooth sine-wave currents. By changing their frequency and amplitude, the inverter controls motor speed and torque. It is the motor’s "throttle". It works in reverse during regenerative braking.',
    only: 'ev',
    diagram: 'motor',
  },
  halfshafts: {
    name: 'Rear driveshafts',
    summary: 'Shafts carrying torque from the rear drive unit to the rear wheels.',
    how: 'Rear-wheel drive means the front wheels only steer. Without driveshafts at the front, they can turn sharply — the ID.3 turns in about 10.2 m. When accelerating, weight shifts to the rear, which also improves traction.',
    only: 'ev',
  },

  // ── EV energy ─────────────────────────────────────────────────────────
  'battery-cover': {
    name: 'Battery top cover',
    summary: 'Sealed lid of the high-voltage battery pack.',
    how: 'Keeps water and dirt out (sealed to IP67/IP6K9K-type standards) and is part of the fire protection between the cells and the cabin.',
    only: 'ev',
    diagram: 'battery',
  },
  'battery-modules': {
    name: 'Battery modules',
    summary: 'Lithium-ion cell modules — the energy store of the car.',
    how: 'Each module holds 24 pouch cells. Twelve modules give ≈77 kWh usable at a nominal ≈350–400 V. When charging, lithium ions move from the cathode to the graphite anode; when driving, they move back and release electrons into the circuit. Mounted in the floor, the heavy battery gives a very low centre of gravity.',
    only: 'ev',
    diagram: 'battery',
  },
  'cooling-plate': {
    name: 'Battery cooling plate',
    summary: 'Coolant plate under the modules.',
    how: 'Lithium-ion cells like about 20–40 °C. Coolant flows through channels in this plate to remove heat during fast charging and hard driving, or to warm the cells in winter so they can charge quickly.',
    only: 'ev',
    diagram: 'battery',
  },
  'battery-housing': {
    name: 'Battery housing & crash frame',
    summary: 'Aluminium tray and side rails that hold and protect the modules.',
    how: 'Extruded aluminium profiles form a strong frame that protects the cells in a side impact, and a bottom plate guards against stones and bollards. The housing is bolted into the body and stiffens it considerably.',
    only: 'ev',
    diagram: 'battery',
  },
  bms: {
    name: 'Battery management system',
    summary: 'Electronics that monitor every cell’s voltage and temperature.',
    how: 'The BMS calculates state of charge and health, balances cells so none overcharges, and limits charge and discharge power to protect the battery. It also controls the contactors — heavy relays that disconnect the high voltage when the car is off or in a crash.',
    only: 'ev',
    diagram: 'battery',
  },
  'charge-port': {
    name: 'Charging port (CCS2)',
    summary: 'Combined Charging System socket on the rear right wing.',
    how: 'The upper part takes AC from a home wallbox (Type 2). Two large DC pins below are used at fast chargers. Before any power flows, the car and the charger "talk" over signal pins to agree on voltage and current.',
    only: 'ev',
    diagram: 'charging',
  },
  obc: {
    name: 'On-board charger',
    summary: '11 kW charger that converts AC from the grid into DC for the battery.',
    how: 'The battery can only store DC. At home, mains AC goes through the on-board charger, which rectifies it — up to 11 kW on three-phase power, ≈7 h for a full charge. At a DC fast charger, the conversion happens in the charging station, which feeds the battery directly at well over 100 kW.',
    only: 'ev',
    diagram: 'charging',
  },
  'hv-cables': {
    name: 'High-voltage cables',
    summary: 'Orange shielded cables linking the battery, drive unit, charger and climate compressor.',
    how: 'Orange is the industry warning colour for high voltage (here ≈400 V DC). The cables are shielded so their switching currents do not interfere with the radio and electronics. An interlock loop makes the battery disconnect if a plug is opened.',
    only: 'ev',
  },
  'radiator-ev': {
    name: 'Front radiator',
    summary: 'Low-temperature radiator for the battery, motor and power-electronics circuit.',
    how: 'An electric drive wastes only ≈10–15 % of its energy as heat, so it needs much less cooling than a combustion engine. Active shutters stay closed most of the time to keep the car slippery.',
    only: 'ev',
  },
  'heat-pump': {
    name: 'Heat pump',
    summary: 'Uses the air-conditioning circuit backwards to heat the cabin (CO₂ refrigerant, R744).',
    how: 'An electric car has no hot engine to heat the cabin. Instead of burning battery energy in a resistive heater, the heat pump draws heat from the outside air and the drive components. It can deliver about 2–3 kWh of heat per kWh of electricity, which noticeably extends winter range.',
    only: 'ev',
    diagram: 'heatpump',
  },
  dcdc: {
    name: 'DC/DC converter',
    summary: 'Steps the ≈400 V battery voltage down to 12 V.',
    how: 'It replaces the alternator of a petrol car: whenever the car is on, it keeps the 12 V battery charged and powers lights, screens and control units from the high-voltage battery.',
    only: 'ev',
  },
};

/** Things you check under the bonnet, plus mechanic's notes for parts that already exist. */
const SERVICE: Record<string, PartContent> = {
  'oil-filler': {
    name: 'Oil filler cap',
    summary: 'Where engine oil is topped up, on top of the cam cover. Usually marked with an oil-can symbol.',
    how: 'Engine oil forms a thin film between every moving metal surface — bearings, pistons, camshafts — so they never actually touch. It also carries heat away from the pistons and holds soot in suspension until it is drained. Over time it thins and fills with combustion by-products, which is why it is changed at every service.',
    only: 'ice',
    check: 'Top up with the oil grade printed in the handbook (for example 0W-20), a little at a time, and re-check the level. Oil and filter are usually changed every 15,000–30,000 km or once a year.',
  },
  dipstick: {
    name: 'Oil dipstick',
    summary: 'A long metal blade reaching into the sump: the simplest way to read the oil level.',
    how: 'With the engine off for a few minutes, all the oil drains back into the sump. The dipstick shows where its surface is. Too little oil starves the bearings; too much gets whipped into foam by the crankshaft.',
    only: 'ice',
    check: 'Car level, engine warm but off for 5 minutes. Pull it out, wipe it, push it fully back in, pull it out again: the film should sit between MIN and MAX. Dark oil is normal; milky oil can mean coolant is leaking in.',
  },
  'coolant-tank': {
    name: 'Coolant expansion tank',
    summary: 'Translucent bottle connected to the cooling circuit, with MIN and MAX marks.',
    how: 'Coolant expands as it heats up. The extra volume is pushed into this tank and drawn back as it cools, so the circuit stays full without bursting. The cap holds the system under pressure, which raises the boiling point to well above 100 °C.',
    check: 'Read the level when the system is cold — between MIN and MAX. Never open the cap on a hot engine: the coolant is under pressure and can spray out boiling. Coolant (water + glycol) is replaced every few years because its anti-corrosion additives wear out.',
  },
  'brake-fluid': {
    name: 'Brake fluid reservoir',
    summary: 'Small reservoir on top of the brake master cylinder, by the bulkhead on the driver’s side.',
    how: 'Pressing the pedal pushes a piston in the master cylinder, and the brake fluid — which barely compresses — transmits that force to the callipers at every wheel. The fluid slowly absorbs water from the air, which lowers its boiling point; boiling fluid makes vapour bubbles, and the pedal sinks to the floor.',
    check: 'The level should be between MIN and MAX; it falls slowly as the pads wear. A sudden drop means a leak — stop driving. The fluid is renewed every two years regardless of mileage, because of the absorbed water.',
  },
  'washer-fluid': {
    name: 'Washer fluid bottle',
    summary: 'Reservoir for windscreen washer fluid, marked with a windscreen symbol and usually a blue cap.',
    how: 'A small electric pump sprays the fluid through jets on the bonnet or wiper arms. In winter the mixture needs antifreeze, otherwise it freezes in the lines.',
    check: 'Top it up whenever it runs low, with a winter mix below about 0 °C. It is the only fluid under the bonnet you can safely top up with almost anything sensible.',
  },
  'fuse-box': {
    name: 'Fuse & relay box',
    summary: 'Black box holding the main fuses and relays for the engine bay circuits.',
    how: 'Each fuse is a thin metal strip that melts if a circuit draws too much current, protecting the wiring from overheating. Relays let a small control current switch a large one — for example the cooling fan or the horn. The lid usually has a map showing which fuse protects what.',
    check: 'If one device stops working, check its fuse: a blown fuse has a broken strip. Replace it only with the same rating (the number on top, in amps); a bigger one can let the wiring burn.',
  },
};

/** Mechanic's notes for parts that are already in the atlas. */
const CHECKS: Record<string, string> = {
  'battery-12v': 'A weak 12 V battery is the most common breakdown cause — in electric cars too. A healthy one shows about 12.6 V at rest. Terminals should be tight and free of white corrosion.',
  intake: 'The air filter inside the box is replaced every 30,000–60,000 km, more often on dusty roads. A clogged filter starves the engine of air.',
  'cylinder-head': 'Under the coil packs sit the spark plugs, usually replaced every 60,000 km or so. Worn plugs cause misfires and rough running.',
  wheels: 'Tyre pressure (on a sticker in the driver’s door frame) once a month, and tread depth: the legal minimum in the EU is 1.6 mm, but grip in the wet drops noticeably below 3 mm.',
  'brakes-front': 'Pads are checked through the wheel spokes; replace them at about 3 mm of friction material. Discs have a minimum thickness stamped on them.',
  'hv-cables': 'Orange means high voltage — never touch, cut or unplug these. Only trained technicians work on them, after disconnecting the battery and checking the system is dead.',
  radiator: 'The fins should be clear of leaves and insects, and the hoses firm, not cracked or swollen.',
  'radiator-ev': 'Keep the fins clear of leaves and insects. The drive and battery coolant is usually changed only at long intervals.',
  bsg: 'The ribbed belt is checked for cracks and fraying; it is usually changed every 100,000 km or so.',
};

const GEARBOX: Record<'dct' | 'automatic' | 'manual', (n: number) => Omit<PartContent, 'summary'>> = {
  dct: (n) => ({
    name: 'Dual-clutch gearbox',
    how: `A petrol engine only works well in a narrow speed range, so it needs many gears. A dual-clutch box is like two manual gearboxes in one: one clutch handles the odd gears (1-3-5${n > 6 ? '-7' : ''}), the other the even ones. The next gear is already engaged on the other shaft, so a shift is just swapping one clutch for the other — in a few hundredths of a second.`,
    only: 'ice',
    diagram: 'dsg',
  }),
  automatic: (n) => ({
    name: 'Automatic gearbox',
    how: `A torque converter — two fan wheels in oil — couples the engine to the gearbox, so the car can idle at a standstill and pull away smoothly. Behind it, planetary gear sets give ${n} ratios; hydraulic clutches and brakes lock different parts of the planet gears together to pick each gear. Once moving, a lock-up clutch bridges the converter so no power is lost in the oil.`,
    only: 'ice',
  }),
  manual: (n) => ({
    name: 'Manual gearbox & clutch',
    how: `The clutch pedal separates a friction disc from the engine’s flywheel, so you can change gear without grinding. The gearbox has ${n} pairs of gears that are always in mesh; moving the lever slides a collar that locks one pair to its shaft. Brass synchronisers first match the speeds, so the collar can slide in smoothly.`,
    only: 'ice',
  }),
};

/** The part explanation for a particular car: generic text adjusted to its layout, then its own notes. */
export function contentFor(id: string, v: Vehicle): PartContent | undefined {
  const base = CONTENT[id] ?? SERVICE[id];
  const L = v.layout;
  const P = v.powertrain;
  const n = L.cylinders ?? 4;
  const word = n === 3 ? 'three' : 'four';
  const front = L.driven === 'front';
  let c: Partial<PartContent> = {};
  switch (id) {
    case 'engine-block':
      c = {
        summary: `Aluminium crankcase of the ${P.engine}. The cylinders are bored into it.`,
        how: `The block holds the ${word} cylinders, the crankshaft bearings and passages for coolant and oil. In each cylinder, a burning mixture of air and petrol pushes a piston down thousands of times a minute. ${
          L.engineMount === 'longitudinal'
            ? `It is mounted lengthways (longitudinally), so its power flows straight back through the gearbox ${L.driven === 'all' ? 'and is split between both axles' : 'to the rear wheels'}.`
            : 'Mounted sideways (transverse), it drives the front wheels through a gearbox right next to it.'
        }`,
      };
      break;
    case 'pistons':
      c = {
        summary: `${n === 3 ? 'Three' : 'Four'} pistons that ride up and down in the cylinders, linked to the crankshaft.`,
        how: `Each piston goes through four strokes: intake (down, pulling in air), compression (up), power (the ignited fuel forces it down) and exhaust (up, pushing out burnt gas). Only one stroke in four produces power, so the cylinders are timed to fire one after another (order ${n === 3 ? '1-2-3' : '1-3-4-2'}).${n === 3 ? ' A three-cylinder engine fires every 240° of crank rotation, which is why it has its typical thrum.' : ''}`,
      };
      break;
    case 'intake':
      if (!L.turbo)
        c = {
          name: 'Air intake',
          summary: 'Air filter box, throttle and intake manifold.',
          how: 'This engine is naturally aspirated: no turbo, so each piston simply sucks air in on its way down. The throttle valve sets how much air the engine gets — that is what the accelerator pedal really controls. The manifold’s runner lengths are tuned so pressure waves help fill the cylinders.',
          diagram: undefined,
        };
      break;
    case 'bsg': {
      const h = L.hybrid;
      if (!h) break;
      c =
        h.starter === 'integrated'
          ? {
              name: `${h.volts} V integrated starter-generator`,
              summary: 'An electric motor-generator built in between the engine and the gearbox.',
              how: `Sitting right on the crankshaft, it starts the engine almost silently, adds a short electric boost when you accelerate, and recovers energy when you brake or coast, storing it in a small ${h.volts} V battery. It replaces both the starter motor and the alternator. It is a mild hybrid: it cannot drive the car on its own.`,
            }
          : {
              name: `${h.volts} V belt starter-generator`,
              summary: base?.summary.replace(' — the "e" in eTSI', '').replace('48 V', `${h.volts} V`),
              how: `When braking or coasting, it works as a generator and charges a small ${h.volts} V battery. When pulling away it gives a little electric help and restarts the engine smoothly, so the engine can switch off at a standstill${h.volts === 48 ? ' and even while coasting' : ''}. It is a mild hybrid: it cannot drive the car on its own.`,
            };
      break;
    }
    case 'battery-48v':
      if (L.hybrid) c = { name: `${L.hybrid.volts} V lithium-ion battery`, how: `Stores the energy the ${L.hybrid.starter === 'integrated' ? 'integrated' : 'belt'} starter-generator recovers when braking and returns it when pulling away.` };
      break;
    case 'gearbox': {
      const g = GEARBOX[L.gearbox ?? 'dct'](L.gears ?? 7);
      c = { ...g, summary: `${P.gearbox}, ${L.engineMount === 'longitudinal' ? 'bolted behind the engine' : 'mounted next to the engine. Includes the differential'}.` };
      break;
    }
    case 'driveshafts':
      if (L.driven === 'rear')
        c = {
          name: 'Propeller shaft & rear axle',
          summary: 'A long shaft under the car takes torque to the rear differential, which drives the rear wheels.',
          how: 'The propeller shaft runs through a tunnel in the floor. At the rear axle, the differential turns the drive through 90° and splits it between the two rear wheels, letting them turn at different speeds in corners. Driving the rear wheels leaves the front wheels to steer alone, which keeps the steering pure and gives better traction when accelerating.',
        };
      else if (L.driven === 'all') c = { name: 'All-wheel-drive driveline', summary: 'Propeller shaft to the rear axle plus driveshafts to all four wheels.' };
      break;
    case 'motor-stator':
      c = { summary: `The fixed outer part of the ${front ? 'front' : 'rear'} motor: a ring of copper windings.` };
      break;
    case 'motor-rotor':
      if (L.motor === 'eesm')
        c = {
          summary: 'The spinning core. Instead of permanent magnets it carries copper windings, fed with current through brushes.',
          how: 'The rotor becomes an electromagnet: a small direct current flows in through slip rings and turns it into a magnet whose strength the car can control. The stator’s rotating field pulls it along in sync. This avoids rare-earth magnets entirely, and at high speed the rotor field can be weakened instead of fought against, which keeps efficiency high on the motorway.',
        };
      break;
    case 'halfshafts':
      c = front
        ? {
            name: 'Front driveshafts',
            summary: 'Shafts carrying torque from the front drive unit to the front wheels.',
            how: 'Front-wheel drive keeps the motor, gearbox and power electronics together in the nose and leaves the rear free for passengers and luggage. CV joints let the shafts keep turning while the front wheels steer.',
          }
        : { how: 'Rear-wheel drive means the front wheels only steer. Without driveshafts at the front, they can turn sharply, giving a small turning circle. When accelerating, weight shifts to the rear, which also improves traction.' };
      break;
    case 'battery-modules':
      c = {
        summary: `Lithium-ion cell modules — ${P.battery} of energy.`,
        how: `The cells are grouped into ${P.cells.toLowerCase()} and wired in series to reach a nominal ≈350–400 V. When charging, lithium ions move from the cathode to the graphite anode; when driving, they move back and release electrons into the circuit. Mounted in the floor, the heavy battery gives a very low centre of gravity.`,
      };
      break;
    case 'charge-port':
      c = { summary: 'Combined Charging System (CCS2) socket for AC and DC charging.' };
      break;
    case 'obc':
      c = { summary: `${P.ac.replace(' AC', '')} charger that converts AC from the grid into DC for the battery.` };
      break;
    case 'fuel-tank':
      c = { how: `Petrol holds about 9 kWh of energy per litre, so a ${P.tank} tank stores several hundred kWh — many times a car battery. But only about a quarter to a third of it ends up moving the car; the rest leaves as heat. An electric pump in the tank feeds the engine.` };
      break;
  }
  if (CHECKS[id] && !c.check) c.check = CHECKS[id];
  if (id === 'oil-filler' && v.layout.oilSensor) c.check = 'This engine has no dipstick: an electronic sensor measures the oil level and the car shows it on the dashboard. Top up through this cap with the grade from the handbook. Oil and filter are usually changed every 15,000–30,000 km or once a year.';
  const merged = { ...base, ...c, ...v.notes?.[id] } as PartContent;
  return base || Object.keys(c).length ? merged : undefined;
}
