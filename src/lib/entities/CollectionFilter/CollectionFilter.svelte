<script lang="ts">
	import { Popover } from 'bits-ui';
	import { MediaQuery } from 'svelte/reactivity';
	import {
		Button,
		DownIcon,
		HeartIcon,
		MagnifyingGlassIcon,
		SortIndicator,
		getNextSort
	} from '$lib/components/ui';
	import { getCollectionTagsContext } from '$lib/entities/CollectionTags';
	import type { ICollectionFilterProps } from './types';

	const { filter, sort, onSortChange }: ICollectionFilterProps = $props();

	const tags = getCollectionTagsContext();

	// Below `sm` a floating popover cannot be pinned to the bottom: use the static part as a sheet
	const isNarrow = new MediaQuery('width < 40rem');

	// The columns of the table that sort. Some have no header to click: they are in the expanded row
	const SORT_OPTIONS = [
		{ column: 'name', title: 'Name' },
		{ column: 'rating', title: 'Rating' },
		{ column: 'favorite', title: 'Favorite' },
		{ column: 'tags', title: 'Tags' },
		{ column: 'rated_on', title: 'Rated on' }
	] as const;

	const handleSearchKeyDown = (e: KeyboardEvent) => {
		// Chromium clears a search field on Escape; here Escape only leaves it
		if (e.key === 'Escape' && e.currentTarget instanceof HTMLInputElement) {
			e.preventDefault();
			e.currentTarget.blur();
		}
	};
</script>

{#snippet SearchField()}
	<input
		class="collection-filter-search"
		type="search"
		placeholder="Search"
		aria-label="Search names and reviews"
		autocomplete="off"
		enterkeyhint="search"
		bind:value={() => filter.searchText, filter.setSearchText}
		onkeydown={handleSearchKeyDown}
	/>
{/snippet}

{#snippet FilterKeys()}
	<div class="collection-filter-group" role="group" aria-label="Show only">
		<Button
			icon={HeartIcon}
			iconPosition="start"
			aria-pressed={filter.isFavoriteOnly}
			onclick={filter.toggleFavoriteOnly}
		>
			Favorites
		</Button>
		{#each tags.list as tag (tag.id)}
			<Button
				aria-pressed={filter.tagIds.includes(tag.id)}
				onclick={() => filter.toggleTag(tag.id)}
			>
				<span class="collection-filter-tag">{tag.name}</span>
			</Button>
		{/each}
	</div>
{/snippet}

{#snippet SortKeys()}
	<div class="collection-filter-group" role="group" aria-label="Sort by">
		{#each SORT_OPTIONS as option (option.column)}
			{@const direction = sort?.column === option.column ? sort.direction : undefined}
			<Button
				aria-pressed={direction !== undefined}
				onclick={() => onSortChange(getNextSort(sort, option.column))}
			>
				{option.title}
				<SortIndicator {direction} />
				{#if direction}
					<span class="visually-hidden">{direction === 'asc' ? 'ascending' : 'descending'}</span>
				{/if}
			</Button>
		{/each}
	</div>
{/snippet}

<div class="collection-filter">
	{#if !isNarrow.current}
		{@render SearchField()}
	{/if}
	<Popover.Root>
		<Popover.Trigger>
			{#snippet child({ props })}
				{#if isNarrow.current}
					<span class={['collection-filter-key', filter.isActive && 'active']}>
						<Button
							{...props}
							icon={MagnifyingGlassIcon}
							aria-label={filter.isActive
								? 'Search, filter and sort (filtered)'
								: 'Search, filter and sort'}
							title="Search, filter and sort"
						/>
					</span>
				{:else}
					<Button
						{...props}
						icon={DownIcon}
						aria-label={filter.hasFilters ? 'Filter (on)' : 'Filter'}
					>
						{#if filter.hasFilters}
							<span class="collection-filter-dot"></span>
						{/if}
						Filter
					</Button>
				{/if}
			{/snippet}
		</Popover.Trigger>
		<Popover.Portal>
			<div class="collection-filter-content">
				{#if isNarrow.current}
					<Popover.ContentStatic class="collection-filter-sheet">
						{@render SearchField()}
						<span class="collection-filter-label">Show only</span>
						{@render FilterKeys()}
						<span class="collection-filter-label">Sort by</span>
						{@render SortKeys()}
						<div class="collection-filter-actions">
							<Button disabled={!filter.isActive} onclick={filter.clear}>Clear</Button>
						</div>
					</Popover.ContentStatic>
				{:else}
					<Popover.Content align="end" sideOffset={6}>
						<span class="collection-filter-label">Show only</span>
						{@render FilterKeys()}
						<span class="collection-filter-label">Sort by</span>
						{@render SortKeys()}
						<div class="collection-filter-actions">
							<Button disabled={!filter.hasFilters} onclick={filter.clearFilters}>Clear</Button>
						</div>
					</Popover.Content>
				{/if}
			</div>
		</Popover.Portal>
	</Popover.Root>
</div>

<style>
	.collection-filter {
		display: flex;
		flex: none;
		align-items: center;
		gap: var(--space-8);
	}

	.collection-filter-search {
		box-sizing: border-box;
		width: var(--size-150);
		height: var(--size-32);
		padding-inline: var(--space-8);
		background: var(--color-bg);
		border-radius: var(--radius-8);
		box-shadow: var(--shadow-key-pressed);
		font-size: var(--font-14);

		&::placeholder {
			color: var(--color-unaccent-1);
		}

		/* Chrome's clear key is blue */
		&::-webkit-search-cancel-button {
			filter: grayscale(1);
		}

		@media (pointer: coarse) {
			font-size: var(--font-16);
		}
	}

	.collection-filter-dot {
		width: var(--size-4);
		height: var(--size-4);
		border-radius: var(--radius-full);
		background: var(--color-dark);
	}

	.collection-filter-key {
		display: contents;

		&.active :global(.button)::before {
			content: '';
			position: absolute;
			top: var(--space-4);
			right: var(--space-4);
			width: var(--size-4);
			height: var(--size-4);
			border-radius: var(--radius-full);
			background: var(--color-dark);
		}
	}

	.collection-filter-tag {
		max-width: var(--size-150);
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.collection-filter-content {
		display: contents;

		:global {
			[data-bits-floating-content-wrapper] {
				z-index: 30 !important;
			}

			[data-popover-content] {
				display: flex;
				flex-direction: column;
				gap: var(--space-8);
				box-sizing: border-box;
				max-width: var(--size-448);
				padding: var(--space-8);
				background: var(--color-surface);
				border: var(--border-2) solid var(--color-white);
				border-radius: var(--radius-16);
				box-shadow: var(--shadow-panel);
			}

			.collection-filter-sheet {
				position: fixed;
				inset: auto 0 0;
				z-index: 30;
				max-width: none;
				max-height: 80dvh;
				overflow-y: auto;
				padding: var(--space-8) calc(var(--space-8) + var(--space-safe-right))
					calc(var(--space-8) + var(--space-safe-bottom))
					calc(var(--space-8) + var(--space-safe-left));
				border-radius: var(--radius-16) var(--radius-16) 0 0;

				.collection-filter-search {
					width: 100%;
					height: var(--size-44);
				}
			}
		}
	}

	.collection-filter-group {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-8);
	}

	.collection-filter-label {
		font-size: var(--font-12);
		color: var(--color-unaccent-1);
	}

	.collection-filter-actions {
		display: flex;
		justify-content: flex-end;
	}
</style>
