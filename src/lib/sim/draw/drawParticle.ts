import type { Particle } from '../types';

export default function drawParticle(context: CanvasRenderingContext2D, currentP: Particle) {
	context.beginPath();
	context.arc(currentP.x, currentP.y, currentP.radius, 0, Math.PI * 2);
	context.fillStyle = currentP.color;
	context.fill();
}
