<script lang="ts">
	import type { IButtonProps } from './types';

	let {
		icon: IconComponent,
		iconPosition = 'end',
		variant = 'neutral',
		class: className,
		ref = $bindable(null),
		type = 'button',
		children,
		...restProps
	}: IButtonProps = $props();
</script>

<button
	bind:this={ref}
	class={['button', variant, !children && 'icon-only', className]}
	{type}
	{...restProps}
>
	{#if IconComponent && iconPosition === 'start'}
		<IconComponent />
	{/if}
	{@render children?.()}
	{#if IconComponent && iconPosition === 'end'}
		<IconComponent />
	{/if}
</button>

<style>
	.neutral {
		--button-background: var(--color-surface);
		--button-label: var(--color-dark);
		--button-icon: var(--color-unaccent-1);
	}

	.accent {
		--button-background: var(--color-accent-1);
		--button-label: var(--color-white);
		--button-icon: var(--color-white);
	}

	/* The parent sets the height through `--button-size` */
	.button {
		position: relative;
		display: inline-flex;
		flex: none;
		align-items: center;
		justify-content: center;
		gap: var(--space-4);
		box-sizing: border-box;
		min-width: var(--button-size, var(--size-32));
		height: var(--button-size, var(--size-32));
		padding-inline: var(--space-8);
		background: var(--button-background);
		border: var(--border-2) solid var(--color-white);
		border-radius: var(--radius-8);
		box-shadow: var(--shadow-key-raised);
		color: var(--button-label);
		font-size: var(--font-14);
		white-space: nowrap;
		transition: box-shadow var(--duration-fast);

		:global(svg) {
			flex: none;
			width: var(--size-16);
			height: var(--size-16);
			fill: var(--button-icon);
		}

		&:active,
		&[aria-pressed='true'],
		&[aria-expanded='true'],
		&[aria-current='true'] {
			box-shadow: var(--shadow-key-pressed);
		}

		&:disabled {
			cursor: default;
			opacity: 0.4;
			box-shadow: none;
		}

		&:focus-visible {
			outline-offset: var(--border-2);
		}
	}

	.icon-only {
		width: var(--button-size, var(--size-32));
		padding: 0;

		:global(svg) {
			width: 60%;
			height: 60%;
		}
	}

	/* Touch target around the key, measured from inside the border; `min()` keeps larger keys */
	@media (pointer: coarse) {
		.button::after {
			content: '';
			position: absolute;
			inset: min(
				0px,
				calc((var(--button-size, var(--size-32)) - var(--size-44)) / 2 - var(--border-2))
			);
		}
	}
</style>
