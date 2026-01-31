<script lang="ts">
	import type { WithElementRef } from '$lib/common/types';
	import type { HTMLInputAttributes } from 'svelte/elements';

	let {
		value = $bindable(),
		ref = $bindable(null),
		type,
		handleKeyDown: handleKeyDownOriginal,
		...restProps
	}: WithElementRef<
		HTMLInputAttributes & {
			handleKeyDown?: (e: KeyboardEvent) => void;
		}
	> = $props();

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
			const strValue = value !== null ? `${value}` : '';

			if (strValue.length === 0 || strValue.includes('.')) {
				e.preventDefault();
			}

			return;
		}

		e.preventDefault();
	}

	const handleKeyDown = (e: KeyboardEvent) => {
		if (type === 'number') {
			restrictNumberInput(e);
		}

		handleKeyDownOriginal?.(e);
	};
</script>

<input bind:value bind:this={ref} {type} onkeydown={handleKeyDown} {...restProps} />

<style>
	input[type='number']::-webkit-inner-spin-button,
	input[type='number']::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	input {
		width: 100%;
		box-sizing: border-box;
		border-radius: var(--radius-4);
		padding-inline: var(--space-8);
	}
</style>
