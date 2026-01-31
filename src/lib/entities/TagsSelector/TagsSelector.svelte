<script lang="ts">
	import { ZodError } from 'zod';
	import type { ITagsSelectorProps } from './types';
	import { Select } from 'bits-ui';
	import { assignRelation, getDB, LiveDB, unassignRelation } from '$lib/db';
	import TableTag from './Tag.svelte';
	import { DotSmallIcon, DownIcon, IconButton } from '$lib/components/ui';
	import TagInput from './TagInput.svelte';
	import { tick } from 'svelte';
	import type { TNillable } from '$lib/common/types';

	const { value, rowId, placeholder = 'Select a tag' }: ITagsSelectorProps = $props();

	const dbStore = getDB();
	let tagsDBLive: TNillable<LiveDB<{ id: string; name: string }>> = $state();

	// db Listener is not ready yet on this microtask loop. So we need to run live on the next one.
	// Otherwise live will be start but no listeners will be triggered
	tick().then(() => {
		if (dbStore.db) {
			tagsDBLive = new LiveDB<{ id: string; name: string }>(
				dbStore.db,
				`SELECT * FROM tags ORDER BY created_at DESC`
			);
		}
	});

	const items = $derived(
		tagsDBLive?.data.map((item) => ({ value: item.id, label: item.name })) ?? []
	);

	const selectedTags = $derived(items.filter((item) => value.includes(item.value)) ?? []);

	let error = $state('');

	const commit = async (tagId: string) => {
		try {
			if (selectedTags.some((item) => item.value === tagId)) {
				void unassignRelation({
					db: dbStore.db,
					table: 'lyubo_tags',
					leftKey: 'lyubo_id',
					rightKey: 'tag_id',
					leftId: rowId,
					rightId: tagId
				});
			} else {
				void assignRelation({
					db: dbStore.db,
					table: 'lyubo_tags',
					leftKey: 'lyubo_id',
					rightKey: 'tag_id',
					leftId: rowId,
					rightId: tagId
				});
			}
		} catch (err) {
			if (err instanceof ZodError) {
				error = err.issues[0]?.message || 'Invalid value';
			}
		}
	};
</script>

{#if items.length > 0}
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
							<TagInput />
							{#each items as item, i (i + item.value)}
								<Select.Item
									label={item.label}
									value={item.value}
									onclick={() => commit(item.value)}
								>
									{#snippet children({ selected })}
										{item.label}
										{#if selected}
											<DotSmallIcon />
										{/if}
									{/snippet}
								</Select.Item>
							{/each}
						</Select.Viewport>
					</Select.Content>
				</div>
			</Select.Portal>
		</Select.Root>
	</div>
	{#if error}
		<div class="error" role="alert">{error}</div>
	{/if}
{/if}

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
				border: var(--border-1) solid var(--color-white);
				border-radius: var(--radius-4);
				box-shadow: 0px 8px 8px 0px var(--color-shadow-1);
			}

			[data-select-item] {
				display: flex;
				justify-content: space-between;
				align-items: center;
				gap: var(--space-8);
				margin: var(--space-2);
				padding: var(--space-2);
				border-radius: var(--border-4);
				font-size: var(--font-14);
				cursor: default;
			}

			[data-highlighted] {
				outline: var(--border-1) solid var(--color-accent-1);
			}
		}
	}
</style>
