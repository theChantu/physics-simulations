import QuadTree from '../QuadTree';
import { HEIGHT, WIDTH, K, MAX_CHARGE, EPS, EPS2 } from '../constants';

import type { Particle } from '../types';

const FIELD_THETA = 0.3;
const FIELD_CANCELLATION_THRESHOLD = 0.15;

const REF = (K * MAX_CHARGE) / (EPS2 * EPS);
function forceToColor(totalForce: number): string {
	const x = Math.abs(totalForce) / REF;

	const intensity = Math.min(1, Math.sqrt(x));

	const hue = (1 - intensity) * 240;
	const alpha = Math.max(0.3, intensity);

	return `hsla(${hue}, 100%, 50%, ${alpha})`;
}

export default function drawFieldLines(
	context: CanvasRenderingContext2D,
	currentP: Particle,
	fieldTree: QuadTree | null,
	negativeTree: QuadTree | null,
	hasNegativeParticles: boolean,
	maxRadius: number
) {
	// Only draw field lines for positive particles
	if (currentP.charge <= 0) return;

	context.strokeStyle = 'black';
	for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4 / Math.abs(currentP.charge)) {
		let currentX = currentP.x + Math.cos(angle) * currentP.radius;
		let currentY = currentP.y + Math.sin(angle) * currentP.radius;

		// Limit steps so it doesn't freeze
		outer: for (let step = 0; step < 120; step++) {
			let netFx = 0;
			let netFy = 0;

			const prevX = currentX;
			const prevY = currentY;

			const field = fieldTree!.calculateFieldAt(
				currentX,
				currentY,
				FIELD_THETA,
				FIELD_CANCELLATION_THRESHOLD
			);
			netFx = field.fx;
			netFy = field.fy;

			const totalForce = Math.hypot(netFx, netFy);
			if (totalForce <= 0) break;

			const STEP_MIN = 1;
			const STEP_MAX = 6;
			const STEP_K = 80;

			const stepLen = Math.max(STEP_MIN, Math.min(STEP_MAX, STEP_K / (totalForce + 1)));
			currentX = currentX + (netFx / totalForce) * stepLen;
			currentY = currentY + (netFy / totalForce) * stepLen;

			// Stop drawing lines if it goes out of bounds
			if (currentX < 0 || currentX > WIDTH || currentY < 0 || currentY > HEIGHT) {
				break;
			}

			// Check for collision with nearby negative particles only
			if (!hasNegativeParticles) break;
			const queryRadius = maxRadius + EPS;
			const nearbyNegatives =
				negativeTree && queryRadius > 0
					? negativeTree.query({
							x: currentX - queryRadius,
							y: currentY - queryRadius,
							width: queryRadius * 2,
							height: queryRadius * 2
						})
					: [];
			for (const negative of nearbyNegatives) {
				const dx = currentX - negative.x;
				const dy = currentY - negative.y;

				const dist = Math.hypot(dx, dy) || EPS;
				if (dist < negative.radius) {
					context.lineTo(
						negative.x + (dx / dist) * negative.radius,
						negative.y + (dy / dist) * negative.radius
					);
					break outer;
				}
			}

			context.beginPath();
			context.moveTo(prevX, prevY);
			context.lineTo(currentX, currentY);
			context.strokeStyle = forceToColor(totalForce);
			context.stroke();
		}
	}
}
