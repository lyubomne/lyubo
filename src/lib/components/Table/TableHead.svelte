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
