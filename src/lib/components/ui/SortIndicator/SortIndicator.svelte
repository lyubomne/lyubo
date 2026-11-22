<script lang="ts">
	import type { ISortIndicatorProps } from './types';

	const { direction }: ISortIndicatorProps = $props();
</script>

<!-- Always the same size, so a label does not move when its sort changes -->
<span class={['sort-indicator', direction ?? 'none']} aria-hidden="true"></span>

<style>
	.sort-indicator {
		display: inline-flex;
		flex: none;
		flex-direction: column;
		justify-content: space-between;
		width: var(--size-8);
		height: var(--size-10);

		&::before,
		&::after {
			content: '';
			height: var(--size-4);
			background: currentColor;
		}

		&::before {
			clip-path: polygon(50% 0, 100% 100%, 0 100%);
		}

		&::after {
			clip-path: polygon(0 0, 100% 0, 50% 100%);
		}
	}

	.none {
		color: var(--color-unaccent-2);
	}

	.asc::after,
	.desc::before {
		visibility: hidden;
	}
</style>
