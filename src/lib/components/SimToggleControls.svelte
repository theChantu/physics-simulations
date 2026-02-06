<script lang="ts">
	import simSettings from '$lib/state/simSettings.svelte';
</script>

<div
	class="mt-1 grid grid-cols-3 place-items-center gap-4 self-center rounded-xl bg-base-200/40 p-4"
>
	<div class="flex flex-col">
		<label class="label" for="field-lines-toggle">
			<span class="label-text">Fields</span>
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
			<span class="label-text">Vectors</span>
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
			<span class="label-text">Gravity</span>
		</label>
		<input
			type="checkbox"
			id="gravity-toggle"
			class="toggle self-center toggle-xl"
			bind:checked={simSettings.enableGravity}
		/>
	</div>
</div>
