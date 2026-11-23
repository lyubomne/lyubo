<script lang="ts">
	import type { ITagsSelectorProps } from './types';
	import { Select } from 'bits-ui';
	import { MediaQuery } from 'svelte/reactivity';
	import { assignRelation, getDB, unassignRelation } from '$lib/db';
	import { getCollectionTagsContext } from '$lib/entities/CollectionTags';
	import TableTag from './Tag.svelte';
	import { DotSmallIcon, DownIcon, IconButton } from '$lib/components/ui';

	const { value, rowId, placeholder = 'Select a tag' }: ITagsSelectorProps = $props();

	const dbStore = getDB();
	const tags = getCollectionTagsContext();

	// Below `sm` a floating list cannot be pinned to the bottom: use the static part as a sheet
	const isNarrow = new MediaQuery('width < 40rem');

	const items = $derived(tags.list.map((tag) => ({ value: tag.id, label: tag.name })));
	const selectedTags = $derived(items.filter((item) => value.includes(item.value)));

	const commit = (tagId: string) => {
		const relation = {
			db: dbStore.db,
			table: 'lyubo_tags',
			leftKey: 'lyubo_id',
			rightKey: 'tag_id',
			leftId: rowId,
			rightId: tagId
		};

		void (value.includes(tagId) ? unassignRelation(relation) : assignRelation(relation));
	};
</script>

{#snippet Items()}
	<Select.Viewport>
		{#each items as item (item.value)}
			<Select.Item label={item.label} value={item.value} onclick={() => commit(item.value)}>
				{#snippet children({ selected })}
					{item.label}
					{#if selected}
						<DotSmallIcon />
					{/if}
				{/snippet}
			</Select.Item>
		{:else}
			<div class="tags-selector-empty">No tags yet. Add them with Edit tags.</div>
		{/each}
	</Select.Viewport>
{/snippet}

<div class="tags-selector">
	<!-- TODO: Maybe it should be one big select button -->
	{#each selectedTags as selectedTag (selectedTag.value)}
		<TableTag value={selectedTag.label} />
	{/each}
	<Select.Root type="multiple" {items} {value}>
		<Select.Trigger aria-label="Select a tag">
			{#snippet child({ props })}
				<IconButton icon={DownIcon} label={selectedTags.length ? '' : placeholder} {...props} />
			{/snippet}
		</Select.Trigger>
		<Select.Portal>
			<div class="tags-selector-content">
				{#if isNarrow.current}
					<Select.ContentStatic class="tags-selector-sheet">
						{@render Items()}
					</Select.ContentStatic>
				{:else}
					<Select.Content sideOffset={10}>
						{@render Items()}
					</Select.Content>
				{/if}
			</div>
		</Select.Portal>
	</Select.Root>
</div>

<style>
	.tags-selector {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-4);
		font-size: var(--font-14);
		align-items: center;
	}

	.tags-selector-content {
		display: contents;

		:global {
			[data-bits-floating-content-wrapper] {
				z-index: 30 !important;
			}

			[data-select-content] {
				background-color: var(--color-surface);
				border: var(--border-2) solid var(--color-white);
				border-radius: var(--radius-8);
				box-shadow: var(--shadow-panel);
			}

			[data-select-item] {
				display: flex;
				justify-content: space-between;
				align-items: center;
				gap: var(--space-8);
				margin: var(--space-4);
				padding: var(--space-2);
				border-radius: var(--radius-4);
				font-size: var(--font-14);
				cursor: default;
			}

			.tags-selector-empty {
				margin: var(--space-4);
				padding: var(--space-2);
				font-size: var(--font-14);
				color: var(--color-unaccent-1);
			}

			[data-highlighted] {
				outline: var(--border-1) solid var(--color-accent-1);
			}

			.tags-selector-sheet {
				position: fixed;
				inset: auto 0 0;
				z-index: 30;
				max-height: 80dvh;
				overflow-y: auto;
				padding: var(--space-4) calc(var(--space-4) + var(--space-safe-right))
					calc(var(--space-4) + var(--space-safe-bottom))
					calc(var(--space-4) + var(--space-safe-left));
				border-radius: var(--radius-16) var(--radius-16) 0 0;
				font-size: var(--font-16);

				:is([data-select-item], .tags-selector-empty) {
					padding: var(--space-4) var(--space-8);
					font-size: var(--font-16);
				}

				[data-select-item] {
					border-radius: var(--radius-8);
				}
			}

			@media (pointer: coarse) {
				[data-select-item] {
					min-height: var(--size-44);
				}
			}
		}
	}
</style>
