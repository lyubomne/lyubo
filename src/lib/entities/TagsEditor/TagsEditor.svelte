<script lang="ts">
	import type { ITagsEditorProps } from './types';
	import { Popover } from 'bits-ui';
	import { Button, DownIcon } from '$lib/components/ui';
	import { getCollectionTagsContext } from '$lib/entities/CollectionTags';
	import TagsEditorNewItem from './TagsEditorNewItem.svelte';
	import TagsEditorItem from './TagsEditorItem.svelte';

	const { collectionId }: ITagsEditorProps = $props();

	const tags = getCollectionTagsContext();
</script>

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
					{#each tags.list as tag (tag.id)}
						<TagsEditorItem {tag} />
					{/each}
				</Popover.Content>
			</div>
		</Popover.Portal>
	</Popover.Root>
</div>

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
