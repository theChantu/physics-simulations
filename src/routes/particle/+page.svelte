<script lang="ts">
	import { onMount } from 'svelte';
	import { Plus, Minus } from 'lucide-svelte';
	import init from '../../../engine/pkg/engine';

	const WIDTH = 1000;
	const HEIGHT = 600;

	let canvas: HTMLCanvasElement, context: CanvasRenderingContext2D | null;
	let animationFrameId: ReturnType<typeof requestAnimationFrame>;

	onMount(() => {
		init().then(() => {
			console.log('WASM module initialized');
		});

		context = canvas.getContext('2d');

		animationFrameId = requestAnimationFrame(loop);

		return () => {
			cancelAnimationFrame(animationFrameId);
		};
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

	// Mouse interaction variables
	let isMouseDown = false;
	let mouseX = 0,
		mouseY = 0,
		lastMouseX = 0,
		lastMouseY = 0;

	// Particle system variables
	const INITIAL_PARTICLES = 5;
	const MAX_CHARGE = 4;
	const MIN_CHARGE = 1;
	const particles: Particle[] = [];

	// Timing variables
	const MAX_STEPS = 10;
	const DT = 1 / 120;
	let timeScale = 1; // 1 = real-time, <1 = slow-mo, >1 = fast-forward;
	let last = performance.now();
	let acc = 0;

	// Simulation constants
	const K = 80000; // Coulomb's constant (scaled for simulation)
	const airResistance = 0.99;
	const bounce = 0.5;
	const EPS = 6;
	const EPS2 = EPS * EPS;

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

	for (let i = 0; i < INITIAL_PARTICLES; i++) {
		const charge = i % 2 === 0 ? generateRandomCharge(1) : generateRandomCharge(-1);
		particles.push(generateRandomParticle(charge));
	}

	function update() {
		const n = particles.length;

		const ax = new Float32Array(n);
		const ay = new Float32Array(n);

		ax.fill(0, 0, n);
		ay.fill(0, 0, n);

		const kSep = 0.6; // positional correction strength (0.2–1.2)
		const kDamp = 0.25; // normal damping (0.1–0.6)

		for (let a = 0; a < n; a++) {
			const A = particles[a];
			for (let b = a + 1; b < n; b++) {
				const B = particles[b];

				const dx = A.x - B.x;
				const dy = A.y - B.y;

				// softened distance for force
				const distSq = dx * dx + dy * dy + EPS2;
				const dist = Math.sqrt(distSq);
				const invDist3 = 1 / (distSq * dist);

				// signed pair strength
				const s = K * A.charge * B.charge * invDist3;

				// apply equal/opposite acceleration
				ax[a] += s * dx;
				ay[a] += s * dy;
				ax[b] -= s * dx;
				ay[b] -= s * dy;

				// collision stabilization (prevents sticking/jitter)
				const minDist = A.radius + B.radius;
				const realDistSq = dx * dx + dy * dy;
				const realDist = Math.sqrt(realDistSq) || EPS;

				if (realDist < minDist) {
					const nx = dx / realDist;
					const ny = dy / realDist;
					const overlap = minDist - realDist;

					// positional correction (split)
					const corr = overlap * 0.5 * kSep;
					A.x += nx * corr;
					A.y += ny * corr;
					B.x -= nx * corr;
					B.y -= ny * corr;

					// kill relative velocity into each other (normal damping)
					const rvx = A.vx - B.vx;
					const rvy = A.vy - B.vy;
					const relN = rvx * nx + rvy * ny;

					if (relN < 0) {
						const damp = -relN * 0.5 * kDamp;
						A.vx += nx * damp;
						A.vy += ny * damp;
						B.vx -= nx * damp;
						B.vy -= ny * damp;
					}
				}
			}
		}

		// integrate velocities
		for (let i = 0; i < n; i++) {
			const p = particles[i];
			p.vx += ax[i] * DT;
			p.vy += ay[i] * DT;
		}

		// integrate positions + walls
		for (const p of particles) {
			if (isMouseDown) {
				const dist = Math.hypot(mouseX - p.x, mouseY - p.y);
				if (dist <= p.radius * 2) {
					p.x = Math.max(p.radius, Math.min(WIDTH - p.radius, mouseX));
					p.y = Math.max(p.radius, Math.min(HEIGHT - p.radius, mouseY));

					const VMAX = 2000;
					p.vx = Math.max(-VMAX, Math.min(VMAX, (mouseX - lastMouseX) / DT));
					p.vy = Math.max(-VMAX, Math.min(VMAX, (mouseY - lastMouseY) / DT));
				}
			}

			p.x += p.vx * DT;
			p.y += p.vy * DT;

			// Boundary conditions
			if (p.x < p.radius || p.x > WIDTH - p.radius) p.vx *= -bounce;
			if (p.y < p.radius || p.y > HEIGHT - p.radius) p.vy *= -bounce;

			// Push it out of the wall so it doesn't get stuck
			p.x = Math.max(p.radius, Math.min(WIDTH - p.radius, p.x));
			p.y = Math.max(p.radius, Math.min(HEIGHT - p.radius, p.y));
		}
	}
	const REF = (K * MAX_CHARGE) / (EPS2 * EPS);
	function forceToColor(totalForce: number): string {
		const x = Math.abs(totalForce) / REF;

		const intensity = Math.min(1, Math.sqrt(x));

		const hue = (1 - intensity) * 240;
		const alpha = Math.max(0.3, intensity);

		return `hsla(${hue}, 100%, 50%, ${alpha})`;
	}

	function draw() {
		if (!context) return;
		context.clearRect(0, 0, WIDTH, HEIGHT);

		context.font = '18px Arial';
		context.textAlign = 'center';
		context.textBaseline = 'middle';

		for (const p of particles) {
			// Draw particle
			context.beginPath();
			context.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
			context.fillStyle = p.color;
			context.fill();
			// Draw charge sign
			context.fillStyle = 'white';
			context.fillText(`${p.charge > 0 ? '+' : '-'}${Math.abs(p.charge)}`, p.x, p.y);

			// Draw velocity vector
			const speed = Math.hypot(p.vx, p.vy);
			const dirX = speed > 0 ? p.vx / speed : 1;
			const dirY = speed > 0 ? p.vy / speed : 0;
			const startX = p.x + dirX * p.radius;
			const startY = p.y + dirY * p.radius;
			context.beginPath();
			context.moveTo(startX, startY);
			context.lineTo(p.x + p.vx, p.y + p.vy);
			context.strokeStyle = 'green';
			context.stroke();

			if (p.charge > 0) {
				// Draw field lines
				context.strokeStyle = 'black';
				for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4 / Math.abs(p.charge)) {
					let currentX = p.x + Math.cos(angle) * p.radius;
					let currentY = p.y + Math.sin(angle) * p.radius;

					// Limit steps so it doesn't freeze
					outer: for (let step = 0; step < 120; step++) {
						let netFx = 0;
						let netFy = 0;

						const prevX = currentX;
						const prevY = currentY;

						for (const j of particles) {
							const dx = currentX - j.x;
							const dy = currentY - j.y;
							const distSq = dx * dx + dy * dy + EPS;
							const dist = Math.sqrt(distSq);

							const invDist3 = 1 / (distSq * dist);
							const s = K * j.charge * invDist3;

							netFx += s * dx;
							netFy += s * dy;
						}

						const totalForce = Math.hypot(netFx, netFy);
						if (totalForce <= 0) break;

						const STEP_MIN = 1;
						const STEP_MAX = 6;
						const STEP_K = 80;

						const stepLen = Math.max(STEP_MIN, Math.min(STEP_MAX, STEP_K / (totalForce + 1)));
						currentX = currentX + (netFx / totalForce) * stepLen;
						currentY = currentY + (netFy / totalForce) * stepLen;

						// Check for collision with negative particles
						for (const j of particles) {
							if (j.charge >= 0) continue;
							const dx = currentX - j.x;
							const dy = currentY - j.y;

							const dist = Math.hypot(dx, dy) || EPS;
							if (dist < j.radius) {
								context.lineTo(j.x + (dx / dist) * j.radius, j.y + (dy / dist) * j.radius);
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

			// Draw outline if mouse is near
			const mouseDist = Math.hypot(mouseX - p.x, mouseY - p.y);
			if (mouseDist <= p.radius * 2) {
				context.beginPath();
				context.arc(p.x, p.y, p.radius + 5, 0, Math.PI * 2);
				context.strokeStyle = 'red';
				context.stroke();
			}
		}
	}

	function loop() {
		const now = performance.now();
		const frameDt = (now - last) / 1000;
		last = now;

		// prevent massive dt after tab-switch / lag spikes
		acc += Math.min(frameDt * timeScale, 0.05);

		let steps = 0;
		while (acc >= DT && steps < MAX_STEPS) {
			update();
			acc -= DT;
			steps++;
		}

		draw();
		animationFrameId = requestAnimationFrame(loop);
	}

	function handleMouseUp() {
		isMouseDown = false;
	}

	function handleMouseDown() {
		isMouseDown = true;
	}

	function handleMoveMouse(event: MouseEvent) {
		lastMouseX = mouseX;
		lastMouseY = mouseY;

		const rect = canvas.getBoundingClientRect();
		mouseX = event.clientX - rect.left;
		mouseY = event.clientY - rect.top;
	}

	function handleAuxClick(event: MouseEvent) {
		event.preventDefault();

		const particle = particles.find((p) => Math.hypot(mouseX - p.x, mouseY - p.y) <= p.radius * 2);
		if (!particle) return;
		particles.splice(particles.indexOf(particle), 1);
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
							max="10"
							step="0.01"
							bind:value={timeScale}
						/>
					</div>
					<div class="flex flex-col">
						<label class="label" for="particle-buttons">
							<span class="label-text">New Particle</span>
						</label>
						<div id="particle-buttons" class="flex gap-2">
							<button class="btn btn-error" on:click={() => handleAddParticle(1)}><Plus /></button>

							<button class="btn btn-primary" on:click={() => handleAddParticle(-1)}
								><Minus /></button
							>
						</div>
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
			on:auxclick={handleAuxClick}
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
