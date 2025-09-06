<script lang="ts">
	import { pxToRem } from '$lib/common/utils';
	import { getTableContext } from './context.svelte';

	const tableContext = getTableContext();
</script>

<thead>
	<tr>
		{#each tableContext.columns as column (column.name)}
			<th style={column.width ? `width: ${pxToRem(column.width)}` : ''}>
				{'title' in column ? column.title : null}
			</th>
		{/each}
	</tr>
</thead>

<style>
	tr {
		position: sticky;
		top: 0;
		background-color: var(--color-surface);
		z-index: 10;
	}

	tr::after {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		border-top-left-radius: var(--radius-16);
		box-shadow:
			0px 4px 8px -4px var(--color-shadow-1),
			inset 8px 0 8px -8px var(--color-shadow-1),
			inset 0 8px 8px -8px var(--color-shadow-1);
	}

	th {
		text-align: left;
		padding: var(--space-8);
		box-sizing: border-box;
		font-weight: normal;
		border-bottom: var(--border-2) solid var(--color-white);
	}

	th:first-child {
		padding-left: var(--space-16);
	}

	th:last-child {
		padding-right: var(--space-16);
	}
</style>
