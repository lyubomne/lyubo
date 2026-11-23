<script lang="ts">
	import type { ITagsEditorProps } from './types';
	import { Popover } from 'bits-ui';
	import { MediaQuery } from 'svelte/reactivity';
	import { Button, DownIcon } from '$lib/components/ui';
	import { getCollectionTagsContext } from '$lib/entities/CollectionTags';
	import TagsEditorNewItem from './TagsEditorNewItem.svelte';
	import TagsEditorItem from './TagsEditorItem.svelte';

	const { collectionId }: ITagsEditorProps = $props();

	const tags = getCollectionTagsContext();

	// Below `sm` a floating popover cannot be pinned to the bottom: use the static part as a sheet
	const isNarrow = new MediaQuery('width < 40rem');
</script>

{#snippet Items()}
	<TagsEditorNewItem {collectionId} />
	{#each tags.list as tag (tag.id)}
		<TagsEditorItem {tag} />
	{/each}
{/snippet}

<div class="tags-editor">
	<Popover.Root>
		<Popover.Trigger>
			{#snippet child({ props })}
				<Button {...props} icon={DownIcon}>Edit tags</Button>
			{/snippet}
		</Popover.Trigger>
		<Popover.Portal>
			<div class="tags-editor-content">
				{#if isNarrow.current}
					<Popover.ContentStatic class="tags-editor-sheet">
						{@render Items()}
					</Popover.ContentStatic>
				{:else}
					<Popover.Content sideOffset={10}>
						{@render Items()}
					</Popover.Content>
				{/if}
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
				z-index: 30 !important;
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

			.tags-editor-sheet {
				position: fixed;
				inset: auto 0 0;
				z-index: 30;
				max-height: 80dvh;
				overflow-y: auto;
				gap: var(--space-8);
				padding: var(--space-8) calc(var(--space-8) + var(--space-safe-right))
					calc(var(--space-8) + var(--space-safe-bottom))
					calc(var(--space-8) + var(--space-safe-left));
				border-radius: var(--radius-16) var(--radius-16) 0 0;
				font-size: var(--font-16);

				@media (pointer: coarse) {
					input {
						min-height: var(--size-44);
					}
				}
			}
		}
	}
</style>
