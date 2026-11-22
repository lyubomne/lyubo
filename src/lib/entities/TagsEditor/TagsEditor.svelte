<script lang="ts">
	import { query } from '@electric-sql/pglite/template';
	import type { ITag, ITagsEditorProps } from './types';
	import { Popover } from 'bits-ui';
	import { getDB, LiveDB } from '$lib/db';
	import { Button, DownIcon } from '$lib/components/ui';
	import TagsEditorNewItem from './TagsEditorNewItem.svelte';
	import { tick } from 'svelte';
	import type { TNillable } from '$lib/types';
	import TagsEditorItem from './TagsEditorItem.svelte';

	const { collectionId }: ITagsEditorProps = $props();

	// const liveDB = useLiveDB<ITagsTable>('SELECT * FROM tags ORDER BY created_at DESC');
	let tableDBLive: TNillable<LiveDB<ITag>> = $state();
	const dbStore = getDB();

	// db Listener is not ready yet on this microtask loop. So we need to run live on the next one.
	// Otherwise live will be start but no listeners will be triggered
	tick().then(() => {
		if (dbStore.db) {
			tableDBLive = new LiveDB<ITag>(
				dbStore.db,
				query`SELECT * FROM tags WHERE collection_id = ${collectionId} ORDER BY created_at DESC`
			);
		}
	});
</script>

<!-- FIXME: Skipping this check will prevent the next tableDBLive call (e.g., when fetching a collection) from executing -->
{#if tableDBLive?.data}
	<div class="tags-editor">
		<Popover.Root>
			<Popover.Trigger>
				{#snippet child({ props })}
					<Button {...props} icon={DownIcon}>Edit tags</Button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Portal>
				<div class="tags-editor-content">
					<Popover.Content sideOffset={10}>
						<TagsEditorNewItem {collectionId} />
						{#each tableDBLive.data as tag, i (i + tag.id)}
							<TagsEditorItem {tag} />
						{/each}
					</Popover.Content>
				</div>
			</Popover.Portal>
		</Popover.Root>
	</div>
{/if}

<style>
	.tags-editor {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-4);
		align-items: center;
	}

	.tags-editor-content {
		display: contents;

		:global {
			[data-bits-floating-content-wrapper] {
				z-index: 10 !important;
			}

			[data-popover-content] {
				background-color: var(--color-surface);
				border: var(--border-2) solid var(--color-white);
				border-radius: var(--radius-8);
				box-shadow: var(--shadow-panel);
				display: flex;
				flex-direction: column;
				gap: var(--space-4);
				padding: var(--space-4);
			}
		}
	}
</style>
