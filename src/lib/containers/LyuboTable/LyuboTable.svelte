<script lang="ts">
	import type { ILyuboTable } from './types';
	import { LiveDB, getDB } from '$lib/db';
	import { tick } from 'svelte';
	import type { TNillable } from '$lib/common/types';
	import { Table, type ITableColumns } from '$lib/components/Table';

	let lyuboDBLive: TNillable<LiveDB<ILyuboTable>> = $state();
	const dbStore = getDB();

	const columns: ITableColumns<ILyuboTable>[] = [
		{
			name: 'name',
			title: 'Name'
		},
		{
			name: 'rating',
			title: 'Rating'
		},
		{
			name: 'review',
			title: 'Review'
		},
		{
			name: 'tags',
			title: 'Tags'
		},
		{
			name: 'favorite',
			title: 'Favorite'
		},
		{
			name: 'created_at',
			title: 'Created At',
			renderer: (value) =>
				new Intl.DateTimeFormat('en-GB', {
					day: '2-digit',
					month: '2-digit',
					year: 'numeric'
				}).format(new Date(value))
		}
	];

	// db Listener is not ready yet on this microtask loop. So we need to run live on the next one.
	// Otherwise live will be start but no listeners will be triggered
	tick().then(() => {
		if (dbStore.db) {
			lyuboDBLive = new LiveDB<ILyuboTable>(dbStore.db, 'SELECT * FROM lyubo ORDER BY created_at');
		}
	});
</script>

<!-- TODO: Use placeholder -->
{#if lyuboDBLive?.data}
	<Table {columns} data={lyuboDBLive.data} />
{/if}
