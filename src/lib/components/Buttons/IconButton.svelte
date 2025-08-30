<script lang="ts">
	import type { Component } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	const {
		icon: IconComponent,
		class: className,
		size = 'sm',
		label,
		...restProps
	}: {
		icon: Component;
		class?: string;
		size?: 'sm' | 'md';
		label?: string;
	} & HTMLButtonAttributes = $props();
</script>

<button class={['icon-button', className, size]} {...restProps}>
	{#if label}
		{label}
	{/if}
	<IconComponent />
</button>

<style>
	.sm {
		--size: var(--size-20);
	}

	.md {
		--size: var(--size-24);
	}

	.icon-button {
		vertical-align: top;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-4);
		min-width: var(--size-24);
		height: var(--size-24);
		border-radius: var(--radius-4);

		:global {
			svg {
				transition: transform 0.2s ease;
				filter: url($lib/components/Filters/shadowFilterBase.svg#shadow);
				width: var(--size);
				height: var(---size);
			}

			svg:hover {
				transform: scale(1.1);
			}

			svg:active {
				transform: scale(1);
			}
		}
	}
</style>
