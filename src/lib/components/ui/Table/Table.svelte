<script lang="ts" generics="TTableData extends IBaseTableData">
	import { prepareColumns } from './utils';
	import { setTableContext } from './context.svelte';
	import TableBody from './TableBody.svelte';
	import TableHead from './TableHead.svelte';
	import type { IBaseTableData, ITableProps } from './types';
	import { throttle } from '$lib/utils';
	import { TableFocus } from './focus.svelte';

	const { columns, data, empty, focus, sort, onSortChange }: ITableProps<TTableData> = $props();

	const ownFocus = new TableFocus();

	// Own width, not the window's: a panel is narrower than the window
	let width = $state(0);

	const setWidth = throttle((newWidth: number) => (width = newWidth), 500);

	const { mainColumns, expandableRowsColumns } = $derived(prepareColumns(columns, width));

	setTableContext(() => ({
		columns: mainColumns,
		data,
		expandableRowsColumns,
		focus: focus ?? ownFocus,
		sort,
		onSortChange
	}));
</script>

<div class="table" bind:clientWidth={null, setWidth}>
	<div class="table-scroll-container">
		<table>
			<TableHead />
			<TableBody />
			{#if empty && data.length === 0}
				<tbody>
					<tr>
						<td class="table-empty" colspan={mainColumns.length || 1}>{@render empty()}</td>
					</tr>
				</tbody>
			{/if}
		</table>
	</div>
</div>

<style>
	.table {
		display: flex;
		min-height: 0;
		position: relative;
		border-radius: var(--radius-8);
		border: var(--border-2) solid var(--color-white);
		background: var(--color-surface);
		/* Height of the sticky row in TableHead */
		--table-head-height: calc(var(--size-24) + 2 * var(--space-8) + var(--border-2));
		/* Lets the header base sit under the rows but over this box */
		isolation: isolate;
	}

	/* The scrollbar gutter lies outside the table: continue the header behind it */
	.table::before {
		content: '';
		position: absolute;
		inset: 0 0 auto;
		z-index: -1;
		box-sizing: border-box;
		height: var(--table-head-height);
		background: var(--color-surface);
		border-bottom: var(--border-2) solid var(--color-white);
		border-radius: calc(var(--radius-8) - var(--border-2)) calc(var(--radius-8) - var(--border-2)) 0
			0;
		box-shadow: inset 0 -1px 0 0 var(--color-shadow-1);
		pointer-events: none;
	}

	/* The face is one step below the rim: a hairline, no blur. Over the sticky header row (TableHead) */
	.table:after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 15;
		pointer-events: none;
		border-radius: calc(var(--radius-8) - var(--border-2));
		box-shadow: inset 1px 1px 0 0 var(--color-shadow-1);
	}

	.table-scroll-container {
		width: 100%;
		border-radius: inherit;
		overflow-y: auto;
		overflow-x: hidden;

		/* The transparent borders narrow the groove and slider inside the gutter */
		&::-webkit-scrollbar {
			width: var(--scrollbar-size);
		}

		&::-webkit-scrollbar-track {
			margin-block: var(--table-head-height) 0;
			background: var(--color-bg);
			background-clip: padding-box;
			border: var(--border-2) solid transparent;
			border-radius: var(--radius-8);
			box-shadow:
				inset 1px 1px 2px 0 var(--color-shadow-2),
				inset -1px -1px 1px 0 var(--color-white);
		}

		&::-webkit-scrollbar-thumb {
			background: var(--color-unaccent-2);
			background-clip: padding-box;
			border: var(--border-2) solid transparent;
			border-radius: var(--radius-8);
		}
	}
	/* Firefox only: in Chrome, scrollbar-color would disable the ::-webkit-scrollbar styles */
	@supports not selector(::-webkit-scrollbar) {
		.table-scroll-container {
			scrollbar-width: thin;
			scrollbar-color: var(--color-unaccent-2) transparent;
		}
	}

	table {
		border-spacing: 0 0;
		width: 100%;
	}

	.table-empty {
		padding: var(--space-16);
		background: var(--color-surface);
		color: var(--color-unaccent-1);
		font-size: var(--font-14);
		text-align: center;
	}
</style>
