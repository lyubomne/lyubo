<script lang="ts">
	import type { IIconButtonProps } from './types';

	const { icon: IconComponent, class: className, label, ...restProps }: IIconButtonProps = $props();
</script>

<button class={['icon-button', className]} {...restProps}>
	{#if label}
		{label}
	{/if}
	<IconComponent />
</button>

<style>
	/* A printed symbol in the row; it rises as a key under the pointer and sinks when pressed */
	.icon-button {
		vertical-align: top;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-4);
		min-width: var(--size-24);
		height: var(--size-24);
		border-radius: var(--radius-4);
		transition: box-shadow var(--duration-fast);

		:global(svg) {
			flex: none;
			width: var(--size-16);
			height: var(--size-16);
			fill: var(--color-unaccent-1);
		}

		&:active {
			background: var(--color-surface);
			box-shadow: var(--shadow-key-pressed);
		}
	}

	/* The white edge is an outline: a border would move the symbol. Focus keeps its own outline */
	@media (hover: hover) {
		.icon-button:hover:not(:active) {
			background: var(--color-surface);
			box-shadow: var(--shadow-key-raised);

			&:not(:focus-visible) {
				outline: var(--border-2) solid var(--color-white);
			}
		}
	}
</style>
