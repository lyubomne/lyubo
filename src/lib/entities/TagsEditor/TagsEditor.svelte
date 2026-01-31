<script lang="ts">
	import type { ITag } from './types';
	import { Popover } from 'bits-ui';
	import { getDB, LiveDB } from '$lib/db';
	import { Button, DownIcon } from '$lib/components/ui';
	import TagsEditorNewItem from './TagsEditorNewItem.svelte';
	import { tick } from 'svelte';
	import type { TNillable } from '$lib/common/types';
	import TagsEditorItem from './TagsEditorItem.svelte';

	// const liveDB = useLiveDB<ITagsTable>('SELECT * FROM tags ORDER BY created_at DESC');
	let tableDBLive: TNillable<LiveDB<ITag>> = $state();
	const dbStore = getDB();

	// db Listener is not ready yet on this microtask loop. So we need to run live on the next one.
	// Otherwise live will be start but no listeners will be triggered
	tick().then(() => {
		if (dbStore.db) {
			tableDBLive = new LiveDB<ITag>(dbStore.db, `SELECT * FROM tags ORDER BY created_at DESC`);
		}
	});
</script>

<!-- FIXME: Skipping this check will prevent the next tableDBLive call (e.g., when fetching a collection) from executing -->
{#if tableDBLive?.data}
	<div class="tags-editor">
		<Popover.Root>
			<Popover.Trigger aria-label="Select a tag">
				{#snippet child({ props })}
					<Button {...props}>Edit tags <DownIcon /></Button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Portal>
				<div class="tags-editor-content">
					<Popover.Content sideOffset={10}>
						<TagsEditorNewItem />
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

		:global {
			svg {
				fill: var(--color-unaccent-1);
				height: var(--size-20);
			}
		}
	}

	.tags-editor-content {
		display: contents;

		:global {
			[data-bits-floating-content-wrapper] {
				z-index: 10 !important;
			}

			[data-popover-content] {
				background-color: var(--color-surface);
				border: var(--border-1) solid var(--color-white);
				border-radius: var(--radius-4);
				box-shadow: 0px 8px 8px 0px var(--color-shadow-1);
				display: flex;
				flex-direction: column;
				gap: var(--space-4);
				padding: var(--space-4);
			}
		}
	}
</style>
