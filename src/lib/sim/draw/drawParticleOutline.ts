import type { Particle } from '../types';

export default function drawParticleOutline(context: CanvasRenderingContext2D, currentP: Particle) {
	context.beginPath();
	context.arc(currentP.x, currentP.y, currentP.radius + 5, 0, Math.PI * 2);
	context.strokeStyle = 'red';
	context.stroke();
}
