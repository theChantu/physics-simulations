import { Particle } from './Particle';
import { WIDTH, HEIGHT, MAX_CHARGE, MIN_CHARGE } from './constants';

import type { ChargeSign } from '../sim/types';

function generateRandomSign(): ChargeSign {
	return Math.random() < 0.5 ? -1 : 1;
}

function generateRandomCharge(chargeSign?: ChargeSign) {
	if (chargeSign === undefined) chargeSign = generateRandomSign();

	const magnitude = Math.floor(Math.random() * (MAX_CHARGE - MIN_CHARGE + 1)) + MIN_CHARGE;

	return chargeSign === 1 ? magnitude : -magnitude;
}

function generateRandomParticle(charge?: number) {
	const chargeSign = generateRandomSign();
	if (!charge) charge = generateRandomCharge(chargeSign);

	return new Particle(
		Math.random() * WIDTH,
		Math.random() * HEIGHT,
		(Math.random() - 0.5) * 50,
		(Math.random() - 0.5) * 50,
		charge,
		10
	);
}
export { generateRandomParticle, generateRandomCharge, generateRandomSign };
