<script lang="ts">
	import { onMount } from 'svelte';
	import init, { return_message } from '../../../engine/pkg/engine';

	import SimControls from '$lib/components/SimControls.svelte';
	import simSettings from '$lib/state/simSettings.svelte';
	import { generateRandomCharge, generateRandomParticle } from '$lib/sim/utils';
	import QuadTree from '$lib/sim/QuadTree';
	import {
		WIDTH,
		HEIGHT,
		bounce,
		EPS,
		kSep,
		INITIAL_PARTICLES,
		MAX_STEPS,
		DT,
		TREE_CAPACITY
	} from '$lib/sim/constants';

	import type { Particle } from '$lib/sim/types';
	import drawFieldLines from '$lib/sim/draw/drawFieldLines';
	import drawVelocityVectors from '$lib/sim/draw/drawVelocityVectors';
	import drawParticleLabel from '$lib/sim/draw/drawParticleLabel';
	import drawParticle from '$lib/sim/draw/drawParticle';
	import drawParticleOutline from '$lib/sim/draw/drawParticleOutline';

	let canvas: HTMLCanvasElement, context: CanvasRenderingContext2D | null;
	let animationFrameId: ReturnType<typeof requestAnimationFrame>;

	let particles: Particle[] = [];

	// Mouse interaction variables
	let isMouseDown = false;
	let mouseX = 0,
		mouseY = 0,
		lastMouseX = 0,
		lastMouseY = 0;

	let last = performance.now();
	let acc = 0;

	onMount(() => {
		init().then(() => {
			console.log(return_message(Math.round(Math.random() * 30)));
		});

		context = canvas.getContext('2d');

		animationFrameId = requestAnimationFrame(loop);

		return () => {
			cancelAnimationFrame(animationFrameId);
		};
	});

	for (let i = 0; i < INITIAL_PARTICLES; i++) {
		const charge = i % 2 === 0 ? generateRandomCharge(1) : generateRandomCharge(-1);
		particles.push(generateRandomParticle(charge));
	}

	function buildQuadTree() {
		const tree = new QuadTree({ x: 0, y: 0, width: WIDTH, height: HEIGHT }, TREE_CAPACITY);
		for (const p of particles) {
			tree.insert(p);
		}
		tree.root.calculateTotal();
		return tree;
	}

	function update() {
		const root = buildQuadTree();

		for (const p of particles) {
			const { fx, fy } = root.root.calculateForceOn(p);

			// Update acceleration
			const ax = fx;
			const ay = fy;

			// Collision stabilization (prevents sticking/jitter)
			const neighbors = root.query({
				x: p.x - p.radius * 2,
				y: p.y - p.radius * 2,
				width: p.radius * 4,
				height: p.radius * 4
			});
			for (const other of neighbors) {
				if (other === p) continue;

				const dx = p.x - other.x;
				const dy = p.y - other.y;
				const dist = Math.hypot(dx, dy) || EPS;
				const minDist = p.radius + other.radius;

				if (dist < minDist) {
					const nx = dx / dist;
					const ny = dy / dist;
					const overlap = minDist - dist;

					// positional correction (split)
					const corr = overlap * 0.5 * kSep;
					p.x += nx * corr;
					p.y += ny * corr;
					other.x -= nx * corr;
					other.y -= ny * corr;

					// kill relative velocity into each other (normal damping)
					const rvx = p.vx - other.vx;
					const rvy = p.vy - other.vy;
					const relN = rvx * nx + rvy * ny;

					if (relN < 0) {
						const damp = -relN * 0.5 * simSettings.kDamp;
						p.vx += nx * damp;
						p.vy += ny * damp;
						other.vx -= nx * damp;
						other.vy -= ny * damp;
					}
				}
			}

			// Integrate velocity
			p.vx += ax * DT;
			p.vy += ay * DT;

			// Add gravity if enabled
			if (simSettings.enableGravity) {
				p.vy += simSettings.gravity * DT;
			}

			// Integrate position
			p.x += p.vx * DT;
			p.y += p.vy * DT;

			// Boundary conditions
			if (p.x < p.radius || p.x > WIDTH - p.radius) p.vx *= -bounce;
			if (p.y < p.radius || p.y > HEIGHT - p.radius) p.vy *= -bounce;

			// Push it out of the wall so it doesn't get stuck
			p.x = Math.max(p.radius, Math.min(WIDTH - p.radius, p.x));
			p.y = Math.max(p.radius, Math.min(HEIGHT - p.radius, p.y));

			// Move particle with mouse if close enough
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
		}
	}

	function draw() {
		if (!context) return;
		context.clearRect(0, 0, WIDTH, HEIGHT);

		context.font = '18px Arial';
		context.textAlign = 'center';
		context.textBaseline = 'middle';

		const fieldTree = simSettings.enableFieldLines
			? new QuadTree({ x: 0, y: 0, width: WIDTH, height: HEIGHT }, TREE_CAPACITY)
			: null;
		const negativeTree = simSettings.enableFieldLines
			? new QuadTree({ x: 0, y: 0, width: WIDTH, height: HEIGHT }, TREE_CAPACITY)
			: null;

		let maxRadius = 0;
		let hasNegativeParticles = false;

		if (simSettings.enableFieldLines) {
			if (!fieldTree || !negativeTree) return;

			for (const p of particles) {
				fieldTree.insert(p);

				// Insert negative particles into a separate tree
				if (p.charge >= 0) continue;
				negativeTree.insert(p);
				hasNegativeParticles = true;
				if (p.radius > maxRadius) maxRadius = p.radius;
			}

			fieldTree.root.calculateTotal();
		}

		for (const p of particles) {
			drawParticle(context, p);

			drawParticleLabel(context, p);

			if (simSettings.enableVelocityVectors) drawVelocityVectors(context, p);

			if (simSettings.enableFieldLines)
				drawFieldLines(context, p, fieldTree, negativeTree, hasNegativeParticles, maxRadius);

			// Draw particle outline if mouse is hovering over it
			const mouseDist = Math.hypot(mouseX - p.x, mouseY - p.y);
			if (mouseDist <= p.radius * 2) {
				drawParticleOutline(context, p);
			}
		}
	}

	function loop() {
		const now = performance.now();
		const frameDt = (now - last) / 1000;
		last = now;

		// prevent massive dt after tab-switch / lag spikes
		acc += Math.min(frameDt * simSettings.timeScale, 0.05);

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
</script>

<div class="flex min-h-screen flex-col items-center justify-center">
	<h1 class="p-4 text-3xl font-semibold">Particle Simulation</h1>
	<div class="flex w-full flex-col items-center justify-center gap-4">
		<canvas
			id="particle-simulation"
			class="block"
			bind:this={canvas}
			width={WIDTH}
			height={HEIGHT}
			onmousedown={handleMouseDown}
			onmouseup={handleMouseUp}
			onmousemove={handleMoveMouse}
			onauxclick={handleAuxClick}
		></canvas>
		<SimControls bind:particles />
	</div>
</div>

<style>
	#particle-simulation {
		border: 1px solid rgba(255, 255, 255, 0.1);
	}
</style>
