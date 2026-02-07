import type { Particle } from '../types';

export default function drawVelocityVectors(context: CanvasRenderingContext2D, currentP: Particle) {
	const speed = Math.hypot(currentP.vx, currentP.vy);
	const dirX = speed > 0 ? currentP.vx / speed : 1;
	const dirY = speed > 0 ? currentP.vy / speed : 0;
	const startX = currentP.x + dirX * currentP.radius;
	const startY = currentP.y + dirY * currentP.radius;
	context.beginPath();
	context.moveTo(startX, startY);
	context.lineTo(currentP.x + currentP.vx, currentP.y + currentP.vy);
	context.strokeStyle = 'green';
	context.stroke();
}
