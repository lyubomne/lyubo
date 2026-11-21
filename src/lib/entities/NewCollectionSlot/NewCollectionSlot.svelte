<script lang="ts">
	import { PlusIcon } from '$lib/components/ui';
	import { getDB } from '$lib/db';
	import { addCollection } from '$lib/entities/CollectionPanel';

	const dbStore = getDB();
</script>

<button class="new-collection-slot" onclick={() => void addCollection({ db: dbStore.db })}>
	<PlusIcon />
	<span class="new-collection-slot-label">New collection</span>
	<span class="new-collection-slot-hint">
		A collection is a table of things to catalogue, rate and review.
	</span>
</button>

<style>
	.new-collection-slot {
		display: flex;
		flex: 0 0 min(100%, var(--size-448));
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-8);
		padding: var(--space-16);
		background: var(--color-surface);
		border: var(--border-2) dashed var(--color-unaccent-2);
		border-radius: var(--radius-16);
		color: var(--color-unaccent-1);
		transition:
			border-color var(--duration-fast),
			color var(--duration-fast);

		:global(svg) {
			width: var(--size-32);
			height: var(--size-32);
			fill: currentColor;
		}

		&:focus-visible {
			outline-offset: var(--border-2);
		}
	}

	@media (hover: hover) {
		.new-collection-slot:hover {
			border-color: var(--color-unaccent-1);
			color: var(--color-dark);
		}
	}

	.new-collection-slot-label {
		font-size: var(--font-16);
	}

	.new-collection-slot-hint {
		max-width: var(--size-200);
		font-size: var(--font-14);
		text-align: center;
	}
</style>
