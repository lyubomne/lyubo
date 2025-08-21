<script lang="ts">
	import type { Component } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	const {
		icon: IconComponent,
		class: className,
		active,
		...restProps
	}: { icon: Component; class?: string; active?: boolean } & HTMLButtonAttributes = $props();
</script>

<button class={['icon-button', active && 'active', className]} {...restProps}>
	<IconComponent />
</button>

<style>
	.icon-button {
		vertical-align: top;
		display: flex;
		align-items: center;
		justify-content: center;

		:global {
			svg {
				transition: transform 0.2s ease;
				stroke: var(--color-white);
				filter: url(../Filters/shadowFilterInactive.svg#shadow);
				width: var(--size-sm);
				height: var(--size-sm);
			}

			svg:hover {
				transform: scale(1.1);
			}

			svg:active {
				transform: scale(1);
			}
		}
	}

	.active {
		:global {
			svg {
				stroke: var(--color-accent-1);
				filter: url(../Filters/shadowFilterActive.svg#shadow);
			}

			svg:hover {
				stroke: var(--color-accent-1);
			}
		}
	}
</style>
