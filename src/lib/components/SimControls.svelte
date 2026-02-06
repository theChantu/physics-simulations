<script lang="ts">
	import { Plus, Minus } from 'lucide-svelte';

	import simSettings from '$lib/state/simSettings.svelte';
	import { generateRandomCharge, generateRandomParticle } from '$lib/sim/utils';

	import type { Particle, ChargeSign } from '$lib/sim/types';

	export let particles: Particle[];

	function handleAddParticle(charge: ChargeSign) {
		const newParticle = generateRandomParticle(generateRandomCharge(charge));
		particles.push(newParticle);
	}
</script>

<div class="flex self-start">
	<div id="particle-simulation-settings">
		<h1 class="text-3xl font-semibold">Particle Simulation</h1>
		<div class="flex gap-4">
			<div class="mb-1">
				<label class="label" for="time-step">
					<span class="label-text">Time Step: {simSettings.timeScale}</span>
				</label>
				<input
					class="range"
					type="range"
					id="time-step"
					min="0"
					max="10"
					step="0.01"
					bind:value={simSettings.timeScale}
				/>
			</div>
			<div class="mb-1">
				<label class="label" for="kDamp">
					<span class="label-text">kDamp: {simSettings.kDamp}</span>
				</label>
				<input
					class="range"
					type="range"
					id="kDamp"
					min="0.1"
					max="0.6"
					step="0.01"
					bind:value={simSettings.kDamp}
				/>
			</div>
			<div class="flex flex-col">
				<label class="label" for="particle-buttons">
					<span class="label-text">New Particle</span>
				</label>
				<div id="particle-buttons" class="flex gap-2">
					<button class="btn btn-error" onclick={() => handleAddParticle(1)}><Plus /></button>

					<button class="btn btn-primary" onclick={() => handleAddParticle(-1)}><Minus /></button>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	#particle-simulation-settings {
		margin-bottom: 1rem;
	}
</style>
