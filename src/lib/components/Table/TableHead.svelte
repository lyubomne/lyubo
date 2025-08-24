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
	th {
		box-sizing: border-box;
		font-weight: normal;
		border-top: var(--border-2) solid var(--color-white);
		border-bottom: var(--border-1) solid var(--color-white);
		box-shadow: inset 0 8px 8px -8px var(--color-shadow-1);
	}

	th:first-child {
		padding-left: var(--space-16);
		border-left: var(--border-2) solid var(--color-white);
		border-top-left-radius: var(--radius-16);
		box-shadow:
			inset 8px 0 8px -8px var(--color-shadow-1),
			inset 0 8px 8px -8px var(--color-shadow-1);
	}

	th:last-child {
		padding-right: var(--space-16);
		border-right: var(--border-2) solid var(--color-white);
		border-top-right-radius: var(--radius-16);
	}
</style>
