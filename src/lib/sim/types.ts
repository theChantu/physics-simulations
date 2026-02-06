interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	charge: number;
	radius: number;
	color: string;
}

type ParticleColor = 'red' | 'blue';

type ChargeSign = -1 | 1;

export type { ChargeSign, ParticleColor, Particle };
