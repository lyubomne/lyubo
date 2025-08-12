<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	const {
		value = $bindable(),
		type,
		handleKeyDown: originalHandleKeyDown,
		...restProps
	}: HTMLInputAttributes & {
		handleKeyDown: (e: KeyboardEvent) => void;
	} = $props();

	let localValue = $state(value);

	// TODO: The input could be improved towards inserting numbers, UX and a11y
	function restrictNumberInput(e: KeyboardEvent) {
		if (e.ctrlKey || e.metaKey || e.altKey) {
			return;
		}

		if (e.key.length > 1) {
			return;
		}

		if (/[eE+-]/.test(e.key)) {
			e.preventDefault();
			return;
		}

		if (/[0-9]/.test(e.key)) {
			return;
		}

		if (e.key === '.') {
			const strValue = localValue !== null ? `${localValue}` : '';

			if (strValue.length === 0 || strValue.includes('.')) {
				e.preventDefault();
			}

			return;
		}

		e.preventDefault();
	}

	const handleKeyDown = (e: KeyboardEvent) => {
		originalHandleKeyDown(e);

		if (type === 'number') {
			restrictNumberInput(e);
		}
	};
</script>

<input bind:value={localValue} {type} onkeydown={handleKeyDown} {...restProps} />

<style>
	input[type='number']::-webkit-inner-spin-button,
	input[type='number']::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
</style>
