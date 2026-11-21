<script lang="ts">
	import { AlertDialog, DropdownMenu } from 'bits-ui';
	import { MediaQuery } from 'svelte/reactivity';
	import { Button, VerticalDotsSmallIcon } from '$lib/components/ui';
	import { getDB } from '$lib/db';
	import type { ICollectionPanelMenuProps } from './types';
	import { UNTITLED_COLLECTION, deleteCollection } from './utils';

	const { collection, canMoveLeft, canMoveRight, onMove, onRename }: ICollectionPanelMenuProps =
		$props();

	const dbStore = getDB();

	// Below `sm` a floating menu cannot be pinned to the bottom: use the static part as a sheet
	const isNarrow = new MediaQuery('width < 40rem');

	let isDeleteDialogOpen = $state(false);
	let triggerElement = $state<HTMLButtonElement | null>(null);
	// The menu returns focus to its trigger on close: Rename and the dialog take it after that
	let isRenameRequested = false;
	let isDeleteRequested = false;

	const title = $derived(collection.name || UNTITLED_COLLECTION);
	const recordsLabel = $derived(
		collection.record_count === 1 ? '1 record' : `${collection.record_count} records`
	);

	const handleCloseAutoFocus = (e: Event) => {
		if (isRenameRequested) {
			isRenameRequested = false;
			e.preventDefault();
			onRename();
		} else if (isDeleteRequested) {
			isDeleteRequested = false;
			e.preventDefault();
			isDeleteDialogOpen = true;
		}
	};

	// The item that opened the dialog is gone with the menu: focus goes back to the menu key
	const handleDialogCloseAutoFocus = (e: Event) => {
		e.preventDefault();
		triggerElement?.focus();
	};

	const remove = () => {
		isDeleteDialogOpen = false;
		void deleteCollection({ db: dbStore.db, id: collection.id });
	};
</script>

{#snippet MenuItems()}
	<DropdownMenu.Item onSelect={() => (isRenameRequested = true)}>Rename</DropdownMenu.Item>
	<DropdownMenu.Item disabled={!canMoveLeft} onSelect={() => onMove(-1)}>
		Move left
	</DropdownMenu.Item>
	<DropdownMenu.Item disabled={!canMoveRight} onSelect={() => onMove(1)}>
		Move right
	</DropdownMenu.Item>
	<DropdownMenu.Separator />
	<DropdownMenu.Item onSelect={() => (isDeleteRequested = true)}>Delete…</DropdownMenu.Item>
{/snippet}

<div class="collection-panel-menu">
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button
					bind:ref={triggerElement}
					icon={VerticalDotsSmallIcon}
					aria-label="Collection menu"
					title="Collection menu"
					{...props}
				/>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Portal>
			<div class="collection-panel-menu-content">
				{#if isNarrow.current}
					<DropdownMenu.ContentStatic
						class="collection-panel-menu-sheet"
						onCloseAutoFocus={handleCloseAutoFocus}
					>
						{@render MenuItems()}
					</DropdownMenu.ContentStatic>
				{:else}
					<DropdownMenu.Content align="end" sideOffset={6} onCloseAutoFocus={handleCloseAutoFocus}>
						{@render MenuItems()}
					</DropdownMenu.Content>
				{/if}
			</div>
		</DropdownMenu.Portal>
	</DropdownMenu.Root>

	<AlertDialog.Root bind:open={isDeleteDialogOpen}>
		<AlertDialog.Portal>
			<div class="collection-panel-dialog">
				<AlertDialog.Overlay />
				<AlertDialog.Content onCloseAutoFocus={handleDialogCloseAutoFocus}>
					<AlertDialog.Title>Delete “{title}”?</AlertDialog.Title>
					<AlertDialog.Description>
						Its {recordsLabel} and tags are deleted with it, on every device. This cannot be undone.
					</AlertDialog.Description>
					<div class="collection-panel-dialog-actions">
						<AlertDialog.Cancel>
							{#snippet child({ props })}
								<Button {...props}>Cancel</Button>
							{/snippet}
						</AlertDialog.Cancel>
						<AlertDialog.Action onclick={remove}>
							{#snippet child({ props })}
								<Button {...props} variant="accent">Delete</Button>
							{/snippet}
						</AlertDialog.Action>
					</div>
				</AlertDialog.Content>
			</div>
		</AlertDialog.Portal>
	</AlertDialog.Root>
</div>

<style>
	.collection-panel-menu {
		display: contents;
	}

	.collection-panel-menu-content {
		display: contents;

		:global {
			[data-bits-floating-content-wrapper] {
				z-index: 30 !important;
			}

			[data-dropdown-menu-content] {
				display: flex;
				flex-direction: column;
				gap: var(--space-2);
				min-width: var(--size-150);
				padding: var(--space-4);
				background: var(--color-surface);
				border: var(--border-2) solid var(--color-white);
				border-radius: var(--radius-8);
				box-shadow: var(--shadow-panel);
				font-size: var(--font-14);
			}

			[data-dropdown-menu-item] {
				padding: var(--space-4) var(--space-8);
				border-radius: var(--radius-4);
				cursor: default;
				outline: none;
			}

			[data-dropdown-menu-item][data-highlighted] {
				outline: var(--border-1) solid var(--color-accent-1);
			}

			[data-dropdown-menu-item][data-disabled] {
				color: var(--color-unaccent-2);
			}

			[data-dropdown-menu-separator] {
				height: var(--border-1);
				margin-block: var(--space-2);
				background: var(--color-unaccent-2);
			}

			.collection-panel-menu-sheet {
				position: fixed;
				inset: auto 0 0;
				z-index: 30;
				padding: var(--space-8) calc(var(--space-8) + var(--space-safe-right))
					calc(var(--space-8) + var(--space-safe-bottom))
					calc(var(--space-8) + var(--space-safe-left));
				border-radius: var(--radius-16) var(--radius-16) 0 0;
				font-size: var(--font-16);

				[data-dropdown-menu-item] {
					border-radius: var(--radius-8);
				}
			}

			@media (pointer: coarse) {
				[data-dropdown-menu-item] {
					display: flex;
					align-items: center;
					min-height: var(--size-44);
				}
			}
		}
	}

	.collection-panel-dialog {
		display: contents;

		:global {
			[data-alert-dialog-overlay] {
				position: fixed;
				inset: 0;
				z-index: 40;
				background: oklch(from var(--color-dark) l c h / 0.2);
			}

			[data-alert-dialog-content] {
				position: fixed;
				top: 50%;
				left: 50%;
				z-index: 40;
				translate: -50% -50%;
				box-sizing: border-box;
				width: min(var(--size-448), calc(100% - 2 * var(--space-16)));
				padding: var(--space-16);
				background: var(--color-surface);
				border: var(--border-2) solid var(--color-white);
				border-radius: var(--radius-24);
				box-shadow: var(--shadow-panel);
			}

			[data-alert-dialog-title] {
				margin: 0 0 var(--space-8);
				font-size: var(--font-16);
				font-weight: 600;
				overflow-wrap: anywhere;
			}

			[data-alert-dialog-description] {
				margin: 0;
				font-size: var(--font-14);
				color: var(--color-unaccent-1);
			}

			button {
				min-height: var(--size-32);
			}

			@media (pointer: coarse) {
				button {
					min-height: var(--size-44);
				}
			}
		}
	}

	.collection-panel-dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-8);
		margin-top: var(--space-16);
	}
</style>
