import type { Particle as ParticleType, ParticleColor } from './types';

export default class Particle implements ParticleType {
	constructor(
		public x: number,
		public y: number,
		public vx: number,
		public vy: number,
		public charge: number,
		public radius: number
	) {}

	get color(): ParticleColor {
		return this.charge > 0 ? 'red' : 'blue';
	}
}
