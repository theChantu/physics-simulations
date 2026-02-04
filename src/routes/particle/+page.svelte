<script lang="ts">
	import { onMount } from 'svelte';
	import { Plus, Minus } from 'lucide-svelte';

	let canvas: HTMLCanvasElement, context: CanvasRenderingContext2D | null;

	onMount(() => {
		context = canvas.getContext('2d');
	});

	class Particle {
		x: number;
		y: number;
		vx: number;
		vy: number;
		charge: number;
		radius: number;
		color: string;

		constructor(x: number, y: number, vx: number, vy: number, charge: number, radius: number) {
			this.x = x;
			this.y = y;
			this.vx = vx;
			this.vy = vy;
			this.charge = charge;
			this.radius = radius;
			this.color = charge > 0 ? 'red' : 'blue';
		}
	}

	let isMouseDown = false;
	let mouseX = 0,
		mouseY = 0,
		lastMouseX = 0,
		lastMouseY = 0;

	const WIDTH = 1000;
	const HEIGHT = 600;

	const particles: Particle[] = [];
	const NUM_PARTICLES = 5;
	const MAX_CHARGE = 4;
	const MIN_CHARGE = 1;

	let TIME_STEP = 0.1;
	const K = 80000; // Coulomb's constant (scaled for simulation)
	const airResistance = 0.99;
	const bounce = 0.5;

	type ChargeSign = -1 | 1;

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

	for (let i = 0; i < NUM_PARTICLES; i++) {
		const charge = i % 2 === 0 ? generateRandomCharge(1) : generateRandomCharge(-1);
		particles.push(generateRandomParticle(charge));
	}

	function update() {
		for (const i of particles) {
			let ax = 0;
			let ay = 0;

			for (const j of particles) {
				if (i === j) continue;

				const dx = j.x - i.x;
				const dy = j.y - i.y;
				const distSq = dx ** 2 + dy ** 2 || 0.01; // Prevent division by zero
				const dist = Math.sqrt(distSq);

				const force = Math.abs(K * i.charge * j.charge) / distSq;

				if (i.charge * j.charge > 0) {
					// Repulsive force
					ax -= (force * dx) / dist;
					ay -= (force * dy) / dist;
				} else {
					// Attractive force
					ax += (force * dx) / dist;
					ay += (force * dy) / dist;
				}

				// To prevent extreme accelerations at very close distances
				if (dist < i.radius + j.radius) {
					ax -= (force * dx) / dist;
					ay -= (force * dy) / dist;
				}
			}

			if (isMouseDown) {
				const dist = Math.hypot(mouseX - i.x, mouseY - i.y);
				if (dist <= i.radius * 2) {
					const newX = i.x + mouseX;
					const newY = i.y + mouseY;

					if (newX > i.radius || newX > WIDTH - i.radius) i.x = mouseX;
					if (newY > i.radius || newY > HEIGHT - i.radius) i.y = mouseY;

					i.vx = (mouseX - lastMouseX) / (TIME_STEP || 0.01);
					i.vy = (mouseY - lastMouseY) / (TIME_STEP || 0.01);
				}
			}

			i.vx += ax * TIME_STEP;
			i.vy += ay * TIME_STEP;

			// Optional: Apply air resistance
			// i.vx *= airResistance;
			// i.vy *= airResistance;
		}

		for (const p of particles) {
			p.x += p.vx * TIME_STEP;
			p.y += p.vy * TIME_STEP;

			// Boundary conditions
			if (p.x < p.radius || p.x > WIDTH - p.radius) p.vx *= -bounce;
			if (p.y < p.radius || p.y > HEIGHT - p.radius) p.vy *= -bounce;

			// Push it out of the wall so it doesn't get stuck
			if (p.x < p.radius) p.x = p.radius + 1;
			else if (p.x > WIDTH - p.radius) p.x = WIDTH - p.radius;

			if (p.y < p.radius) p.y = p.radius;
			else if (p.y > HEIGHT - p.radius) p.y = HEIGHT - p.radius;

			p.x = Math.max(p.radius, Math.min(WIDTH - p.radius, p.x));
			p.y = Math.max(p.radius, Math.min(HEIGHT - p.radius, p.y));
		}
	}

	function draw() {
		if (!context) return;
		context.clearRect(0, 0, WIDTH, HEIGHT);

		for (const p of particles) {
			// Draw particle
			context.beginPath();
			context.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
			context.fillStyle = p.color;
			context.fill();
			// Draw charge sign
			context.font = '18px Arial';
			context.fillStyle = 'white';
			context.fillText(`${p.charge > 0 ? '+' : '-'}${Math.abs(p.charge)}`, p.x, p.y);
			context.textAlign = 'center';
			context.textBaseline = 'middle';

			// Draw velocity vector
			const speed = Math.hypot(p.vx, p.vy);
			const dirX = speed > 0 ? p.vx / speed : 1;
			const dirY = speed > 0 ? p.vy / speed : 0;
			const startX = p.x + dirX * p.radius;
			const startY = p.y + dirY * p.radius;
			context.beginPath();
			context.moveTo(startX, startY);
			context.lineTo(p.x + p.vx, p.y + p.vy);
			context.strokeStyle = 'red';
			context.stroke();

			if (p.charge < 0) continue;

			// Draw field lines
			context.strokeStyle = 'black';
			for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4 / Math.abs(p.charge)) {
				let currentX = p.x + Math.cos(angle) * p.radius;
				let currentY = p.y + Math.sin(angle) * p.radius;

				context.beginPath();
				context.moveTo(currentX, currentY);

				// Limit steps so it doesn't freeze
				outer: for (let step = 0; step < 100; step++) {
					let netFx = 0;
					let netFy = 0;

					for (const j of particles) {
						const dx = j.x - currentX;
						const dy = j.y - currentY;
						const distSq = dx ** 2 + dy ** 2 || 0.01;
						const dist = Math.sqrt(distSq);

						const force = Math.abs(K * 1 * j.charge) / distSq;

						if (j.charge > 0) {
							// Repulsive force
							netFx -= (force * dx) / dist;
							netFy -= (force * dy) / dist;
						} else {
							// Attractive force
							netFx += (force * dx) / dist;
							netFy += (force * dy) / dist;
						}
					}

					const totalForce = Math.hypot(netFx, netFy);
					if (totalForce <= 0) break;

					currentX = currentX + (netFx / totalForce) * 5;
					currentY = currentY + (netFy / totalForce) * 5;

					// Check for collision with negative particles
					for (const j of particles) {
						if (j.charge >= 0) continue;
						const dx = currentX - j.x;
						const dy = currentY - j.y;

						const dist = Math.hypot(dx, dy);
						if (dist < j.radius) {
							context.lineTo(j.x + (dx / dist) * j.radius, j.y + (dy / dist) * j.radius);
							break outer;
						}
					}

					context.lineTo(currentX, currentY);
				}
				context.stroke();
			}
		}
	}

	(function loop() {
		update();
		draw();
		requestAnimationFrame(loop);
	})();

	function handleMouseUp(event: MouseEvent) {
		isMouseDown = false;
	}

	function handleMouseDown(event: MouseEvent) {
		isMouseDown = true;
	}

	function handleMoveMouse(event: MouseEvent) {
		lastMouseX = mouseX;
		lastMouseY = mouseY;

		const rect = canvas.getBoundingClientRect();
		mouseX = event.clientX - rect.left;
		mouseY = event.clientY - rect.top;
	}

	function handleAddParticle(charge: ChargeSign) {
		const newParticle = generateRandomParticle(generateRandomCharge(charge));
		particles.push(newParticle);
	}
</script>

<div class="flex w-full items-center justify-center">
	<div class="fit flex min-h-screen w-fit flex-col items-center justify-center">
		<div class="flex self-start">
			<div id="particle-simulation-settings">
				<h1 class="text-3xl font-semibold">Particle Simulation</h1>
				<div class="flex gap-4">
					<div class="mb-1">
						<label class="label" for="time-step">
							<span class="label-text">Time Step</span>
						</label>
						<input
							class="range"
							type="range"
							id="time-step"
							min="0"
							max="1"
							step="0.01"
							bind:value={TIME_STEP}
						/>
					</div>
					<div class="mb-1 flex flex-col">
						<label class="label" for="time-step">
							<span class="label-text">Proton</span>
						</label>
						<button class="btn btn-error" on:click={() => handleAddParticle(1)}><Plus /></button>
					</div>
					<div class="mb-1 flex flex-col">
						<label class="label" for="time-step">
							<span class="label-text">Electron</span>
						</label>
						<button class="btn btn-primary" on:click={() => handleAddParticle(-1)}><Minus /></button
						>
					</div>
				</div>
			</div>
		</div>
		<canvas
			id="particle-simulation"
			bind:this={canvas}
			width={WIDTH}
			height={HEIGHT}
			on:mousedown={handleMouseDown}
			on:mouseup={handleMouseUp}
			on:mousemove={handleMoveMouse}
		></canvas>
	</div>
</div>

<style>
	#particle-simulation {
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	#particle-simulation-settings {
		margin-bottom: 1rem;
	}
</style>
