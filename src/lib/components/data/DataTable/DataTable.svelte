<script lang="ts" generics="TTableData extends IBaseTableData">
	import { tick, untrack } from 'svelte';
	import { LiveDB, getDB } from '$lib/db';
	import type { TNillable } from '$lib/types';
	import { Table, type IBaseTableData } from '$lib/components/ui';
	import type { IDataTableProps } from './types';
	import { buildDataTableQuery } from './utils';

	const {
		columns,
		name,
		filter = {},
		where,
		sort,
		onSortChange,
		orderBy,
		empty,
		focus
	}: IDataTableProps<TTableData> = $props();

	const dbStore = getDB();

	const liveQuery = $derived(buildDataTableQuery({ name, filter, where, sort, orderBy }));
	// The props are new objects whenever their owner re-renders: restart only for another query
	const liveQueryKey = $derived(JSON.stringify(liveQuery));

	let tableDBLive: TNillable<LiveDB<TTableData>> = $state();
	// Shown until the query that replaces it has answered, so the rows do not blink on a new sort
	let previousDBLive: TNillable<LiveDB<TTableData>> = $state();

	$effect(() => {
		void liveQueryKey;
		const nextQuery = untrack(() => liveQuery);

		// db Listener is not ready yet on this microtask loop. So we need to run live on the next one.
		// Otherwise live will be start but no listeners will be triggered
		void tick().then(() => {
			if (!dbStore.db) {
				return;
			}

			if (tableDBLive?.hasResult) {
				previousDBLive = tableDBLive;
			}

			tableDBLive = new LiveDB<TTableData>(dbStore.db, nextQuery);
		});
	});

	const shownDBLive = $derived(
		tableDBLive?.hasResult || !previousDBLive ? tableDBLive : previousDBLive
	);
</script>

<!-- The frame shows at once; "empty" only once the query has answered, or it flashes on start -->
{#if shownDBLive}
	<Table
		{columns}
		data={shownDBLive.data}
		empty={shownDBLive.hasResult ? empty : undefined}
		{focus}
		{sort}
		{onSortChange}
	/>
{/if}
