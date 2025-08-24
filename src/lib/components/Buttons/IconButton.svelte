<script lang="ts">
	import type { Component } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	const {
		icon: IconComponent,
		class: className,
		size = 'sm',
		...restProps
	}: {
		icon: Component;
		class?: string;
		size?: 'sm' | 'md';
	} & HTMLButtonAttributes = $props();
</script>

<button class={['icon-button', className, size]} {...restProps}>
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
		width: var(--size-24);
		height: var(--size-24);

		:global {
			svg {
				transition: transform 0.2s ease;
				filter: url($lib/components/Filters/shadowFilterActive.svg#shadow);
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
