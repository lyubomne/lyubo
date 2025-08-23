<script lang="ts">
	import { getTableContext } from './context.svelte';

	const tableContext = getTableContext();
</script>

<thead>
	<tr>
		{#each tableContext.columns as column (column.name)}
			<th>{'title' in column ? column.title : null}</th>
		{/each}
	</tr>
</thead>

<style>
	th {
		font-weight: normal;
		border-top: var(--border-sm) solid var(--color-white);
		border-bottom: var(--border-xs) solid var(--color-white);
		box-shadow: inset 0 8px 8px -8px var(--color-shadow-1);
	}

	th:first-child {
		padding-left: var(--space-md);
		border-left: var(--border-sm) solid var(--color-white);
		border-top-left-radius: var(--radius-lg);
		box-shadow:
			inset 8px 0 8px -8px var(--color-shadow-1),
			inset 0 8px 8px -8px var(--color-shadow-1);
	}

	th:last-child {
		padding-right: var(--space-md);
		border-right: var(--border-sm) solid var(--color-white);
		border-top-right-radius: var(--radius-lg);
	}
</style>
