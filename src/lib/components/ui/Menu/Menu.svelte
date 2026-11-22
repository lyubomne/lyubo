<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import { MediaQuery } from 'svelte/reactivity';
	import type { IMenuProps } from './types';

	const { trigger, children, onCloseAutoFocus }: IMenuProps = $props();

	// Below `sm` a floating menu cannot be pinned to the bottom: use the static part as a sheet
	const isNarrow = new MediaQuery('width < 40rem');
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			{@render trigger(props)}
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<div class="menu-content">
			{#if isNarrow.current}
				<DropdownMenu.ContentStatic class="menu-sheet" {onCloseAutoFocus}>
					{@render children()}
				</DropdownMenu.ContentStatic>
			{:else}
				<DropdownMenu.Content align="end" sideOffset={6} {onCloseAutoFocus}>
					{@render children()}
				</DropdownMenu.Content>
			{/if}
		</div>
	</DropdownMenu.Portal>
</DropdownMenu.Root>

<style>
	.menu-content {
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

			:is([data-dropdown-menu-item], [data-dropdown-menu-radio-item]) {
				display: flex;
				align-items: center;
				gap: var(--space-8);
				padding: var(--space-4) var(--space-8);
				border-radius: var(--radius-4);
				cursor: default;
				outline: none;
			}

			:is([data-dropdown-menu-item], [data-dropdown-menu-radio-item])[data-highlighted] {
				outline: var(--border-1) solid var(--color-accent-1);
			}

			:is([data-dropdown-menu-item], [data-dropdown-menu-radio-item])[data-disabled] {
				color: var(--color-unaccent-2);
			}

			[data-dropdown-menu-separator] {
				height: var(--border-1);
				margin-block: var(--space-2);
				background: var(--color-unaccent-2);
			}

			.menu-sheet {
				position: fixed;
				inset: auto 0 0;
				z-index: 30;
				padding: var(--space-8) calc(var(--space-8) + var(--space-safe-right))
					calc(var(--space-8) + var(--space-safe-bottom))
					calc(var(--space-8) + var(--space-safe-left));
				border-radius: var(--radius-16) var(--radius-16) 0 0;
				font-size: var(--font-16);

				:is([data-dropdown-menu-item], [data-dropdown-menu-radio-item]) {
					border-radius: var(--radius-8);
				}
			}

			@media (pointer: coarse) {
				:is([data-dropdown-menu-item], [data-dropdown-menu-radio-item]) {
					min-height: var(--size-44);
				}
			}
		}
	}
</style>
