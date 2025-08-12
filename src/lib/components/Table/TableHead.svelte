<script lang="ts">
	import { getTableContext } from './context.svelte';

	const tableContext = getTableContext();
</script>

<thead>
	<tr>
		{#each tableContext.columns as column (column.name)}
			<th>{column.title}</th>
		{/each}
	</tr>
</thead>
