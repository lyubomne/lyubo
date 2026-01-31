<script lang="ts">
	import { Button } from 'bits-ui';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	const { children, ...restProps }: HTMLButtonAttributes = $props();
</script>

<div class="button">
	<Button.Root {...restProps}>{@render children?.()}</Button.Root>
</div>

<style>
	.button {
		display: contents;

		:global {
			button {
				display: inline-flex;
				align-items: center;
				gap: var(--space-2);
				position: relative;
				width: fit-content;
				padding-inline: var(--space-8);
				background: var(--color-surface);
				border: var(--border-2) solid var(--color-white);
				border-radius: var(--radius-4);
				box-shadow:
					inset 4px 4px 8px -8px var(--color-shadow-1),
					inset -4px -4px 8px -8px var(--color-shadow-1),
					6px 6px 12px 1px var(--color-shadow-2);
			}
		}
	}
</style>
