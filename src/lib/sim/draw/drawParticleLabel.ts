import type { Particle } from '../types';

export default function drawParticleLabel(context: CanvasRenderingContext2D, currentP: Particle) {
	context.fillStyle = 'white';
	context.fillText(
		`${currentP.charge > 0 ? '+' : '-'}${Math.abs(currentP.charge)}`,
		currentP.x,
		currentP.y
	);
}
