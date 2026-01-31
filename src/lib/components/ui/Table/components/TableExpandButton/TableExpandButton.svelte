<script lang="ts">
	import { VerticalDotsSmallIcon, IconButton, getTableContext } from '$lib/components/ui';
	import type { ITableExpandButtonProps } from './types';

	const { rowId }: ITableExpandButtonProps = $props();

	const tableContext = getTableContext();

	const expand = () => {
		tableContext.expandRow(rowId);
	};
</script>

<div class="expand-button">
	<IconButton icon={VerticalDotsSmallIcon} onclick={expand} aria-label="expand" title="expand" />
</div>

<style>
	.expand-button {
		display: contents;

		:global {
			svg {
				fill: var(--color-unaccent-1);
			}
		}
	}
</style>
