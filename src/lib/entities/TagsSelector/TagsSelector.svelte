<script lang="ts">
	import type { ITagsSelectorProps } from './types';
	import { Select } from 'bits-ui';
	import { assignRelation, getDB, unassignRelation } from '$lib/db';
	import { getCollectionTagsContext } from '$lib/entities/CollectionTags';
	import TableTag from './Tag.svelte';
	import { DotSmallIcon, DownIcon, IconButton } from '$lib/components/ui';

	const { value, rowId, placeholder = 'Select a tag' }: ITagsSelectorProps = $props();

	const dbStore = getDB();
	const tags = getCollectionTagsContext();

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
				<Select.Content sideOffset={10}>
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
				</Select.Content>
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

		:global {
			svg {
				fill: var(--color-unaccent-1);
			}
		}
	}

	.tags-selector-content {
		display: contents;

		:global {
			[data-bits-floating-content-wrapper] {
				z-index: 10 !important;
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
		}
	}
</style>
