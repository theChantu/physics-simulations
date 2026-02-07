<script lang="ts">
	import { Plus, Minus } from 'lucide-svelte';

	import simSettings from '$lib/state/simSettings.svelte';
	import { generateRandomCharge, generateRandomParticle } from '$lib/sim/utils';
	import { onMount } from 'svelte';

	import type { Particle } from '$lib/sim/types';

	onMount(() => {
		window.addEventListener('keyup', (e) => {
			if (e.key === 'Enter') {
				handleSpawnParticle();
			}
		});

		return () => {
			window.removeEventListener('keyup', () => {});
		};
	});

	export let particles: Particle[];

	let charge: number | undefined;
	let amount: number = 1;

	function handleSpawnParticle() {
		if (charge === undefined || isNaN(charge) || charge === 0) {
			// Clear input if invalid
			charge = undefined;
			return;
		}

		for (let i = 0; i < amount; i++) {
			const newParticle = generateRandomParticle(charge || generateRandomCharge());
			particles.push(newParticle);
		}

		// Clear inputs
		charge = undefined;
		amount = 1;
	}

	function handleClearParticles() {
		// Clear the array while keeping the reference intact
		particles.splice(0, particles.length);
	}
</script>

<div class="flex w-full">
	<div id="particle-simulation-settings" class="w-full">
		<div class="flex flex-col items-stretch justify-center">
			<div class="mx-auto flex w-full max-w-2xl flex-col rounded-xl bg-base-200/40 p-4">
				<p class="self-center text-2xl font-semibold">Settings</p>
				<div class="grid grid-cols-2 gap-4">
					<!-- Slider settings -->
					<div class="flex flex-col gap-4">
						<div class="w-full">
							<label class="label" for="time-scale">
								<span>
									Time Scale: <span class="text-right tabular-nums"
										>{simSettings.timeScale.toFixed(1)}</span
									></span
								>
							</label>
							<input
								class="range"
								type="range"
								id="time-scale"
								min="0"
								max="10"
								step="0.1"
								bind:value={simSettings.timeScale}
							/>
						</div>
						<div class="w-full">
							<label class="label" for="gravity">
								<span>Gravity: </span>
								<span class="text-right tabular-nums">{simSettings.gravity}</span>
							</label>
							<input
								class="range"
								type="range"
								id="gravity"
								min="-2000"
								max="2000"
								step="1"
								bind:value={simSettings.gravity}
							/>
						</div>
						<div class="w-full">
							<label class="label" for="kDamp">
								<span
									>kDamp: <span class="text-right tabular-nums">{simSettings.kDamp.toFixed(2)}</span
									></span
								>
							</label>
							<input
								class="range"
								type="range"
								id="kDamp"
								min="0.1"
								max="1"
								step="0.01"
								bind:value={simSettings.kDamp}
							/>
						</div>
					</div>
					<!-- Particle controls -->
					<div class="flex flex-col justify-center">
						<div class="flex flex-col gap-4">
							<div class="flex flex-col gap-2">
								<div id="particle-buttons" class="flex gap-2">
									<label for="particle-charge">
										<span>Charge</span>
										<input
											id="particle-charge"
											type="number"
											class="input input-sm"
											required
											placeholder="Charge (+/-)"
											bind:value={charge}
										/>
									</label>
									<label for="particle-amount">
										<span>Amount</span>
										<input
											id="particle-amount"
											type="number"
											class="input input-sm"
											required
											min="1"
											placeholder="Amount"
											bind:value={amount}
										/>
									</label>
								</div>
								<button class="btn btn-sm btn-primary" onclick={handleSpawnParticle}
									>Spawn Particle(s)</button
								>
								<button class="btn btn-sm btn-error" onclick={handleClearParticles}
									>Clear Particle(s)</button
								>
							</div>
							<div class="flex gap-4">
								<div class="flex flex-col">
									<label class="label" for="field-lines-toggle">
										<span>Fields</span>
									</label>
									<input
										type="checkbox"
										id="field-lines-toggle"
										class="toggle self-center toggle-xl"
										bind:checked={simSettings.enableFieldLines}
									/>
								</div>
								<div class="flex flex-col">
									<label class="label" for="velocity-vectors-toggle">
										<span>Velocity</span>
									</label>
									<input
										type="checkbox"
										id="velocity-vectors-toggle"
										class="toggle self-center toggle-xl"
										bind:checked={simSettings.enableVelocityVectors}
									/>
								</div>
								<div class="flex flex-col">
									<label class="label" for="gravity-toggle">
										<span>Gravity</span>
									</label>
									<input
										type="checkbox"
										id="gravity-toggle"
										class="toggle self-center toggle-xl"
										bind:checked={simSettings.enableGravity}
									/>
								</div>
							</div>
						</div>
					</div>
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
