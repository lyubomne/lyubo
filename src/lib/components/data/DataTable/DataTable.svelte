<script lang="ts" generics="TTableData extends IBaseTableData">
	import { LiveDB, getDB } from '$lib/db';
	import { tick } from 'svelte';
	import type { TNillable } from '$lib/common/types';
	import { Table, type ITableColumns, type IBaseTableData } from '$lib/components/ui';

	const { columns, name }: { columns: ITableColumns<TTableData>[]; name: string } = $props();

	let tableDBLive: TNillable<LiveDB<TTableData>> = $state();
	const dbStore = getDB();

	// db Listener is not ready yet on this microtask loop. So we need to run live on the next one.
	// Otherwise live will be start but no listeners will be triggered
	tick().then(() => {
		if (dbStore.db) {
			tableDBLive = new LiveDB<TTableData>(
				dbStore.db,
				`SELECT * FROM ${name} ORDER BY created_at DESC`
			);
		}
	});
</script>

<!-- TODO: Use placeholder, check empty table -->
{#if tableDBLive?.data}
	<Table {columns} data={tableDBLive.data} />
{/if}
