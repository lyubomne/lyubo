<script lang="ts" generics="TTableData extends IBaseTableData">
	import { identifier, query, sql } from '@electric-sql/pglite/template';
	import { LiveDB, getDB } from '$lib/db';
	import { tick } from 'svelte';
	import type { TNillable } from '$lib/types';
	import { Table, type IBaseTableData } from '$lib/components/ui';
	import type { IDataTableProps } from './types';

	const { columns, name, filter = {}, empty, focus }: IDataTableProps<TTableData> = $props();

	let tableDBLive: TNillable<LiveDB<TTableData>> = $state();
	const dbStore = getDB();

	// db Listener is not ready yet on this microtask loop. So we need to run live on the next one.
	// Otherwise live will be start but no listeners will be triggered
	tick().then(() => {
		if (dbStore.db) {
			const conditions = Object.entries(filter).map(
				([column, value]) => sql`${identifier`${column}`} = ${value}`
			);
			const where = conditions.length
				? sql`WHERE ${conditions.reduce((left, right) => sql`${left} AND ${right}`)}`
				: sql``;

			tableDBLive = new LiveDB<TTableData>(
				dbStore.db,
				query`SELECT * FROM ${identifier`${name}`} ${where} ORDER BY created_at DESC`
			);
		}
	});
</script>

<!-- The frame shows at once; "empty" only once the query has answered, or it flashes on start -->
{#if tableDBLive}
	<Table
		{columns}
		data={tableDBLive.data}
		empty={tableDBLive.hasResult ? empty : undefined}
		{focus}
	/>
{/if}
