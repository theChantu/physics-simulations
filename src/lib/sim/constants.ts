// Canvas constants
const WIDTH = 1000;
const HEIGHT = 600;

// Simulation constants
const K = 80000; // Coulomb's constant (scaled for simulation)
const airResistance = 0.99;
const bounce = 0.5;
const EPS = 6;
const EPS2 = EPS * EPS;
const kSep = 0.2; // positional correction strength (0.2–1.2)

// Particle system variables
const INITIAL_PARTICLES = 5;
const MAX_CHARGE = 4;
const MIN_CHARGE = 1;

// Timing variables
const MAX_STEPS = 10;
const DT = 1 / 120;

export {
	WIDTH,
	HEIGHT,
	K,
	airResistance,
	bounce,
	EPS,
	EPS2,
	kSep,
	INITIAL_PARTICLES,
	MAX_CHARGE,
	MIN_CHARGE,
	MAX_STEPS,
	DT
};
