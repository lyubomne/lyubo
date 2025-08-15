<script lang="ts">
	import type { ILyuboTable } from './types';
	import { LiveDB, getDB } from '$lib/db';
	import { tick } from 'svelte';
	import type { TNillable } from '$lib/common/types';
	import { Table, type ITableColumns } from '$lib/components/Table';
	import { createTableInputRenderer } from './components/TableInput';
	import { validationSchema } from './validationSchema';
	import { createTableTagsSelectorRenderer } from './components/TableTagsSelector';

	let lyuboDBLive: TNillable<LiveDB<ILyuboTable>> = $state();
	const dbStore = getDB();

	const columns: ITableColumns<ILyuboTable>[] = [
		{
			name: 'name',
			title: 'Name',
			...createTableInputRenderer({
				validationSchema
			})
		},
		{
			name: 'rating',
			title: 'Rating',
			...createTableInputRenderer({
				validationSchema,
				type: 'number'
			})
		},
		{
			name: 'review',
			title: 'Review'
			// renderer: TableInputSnippet,
			// rendererProps: {
			// 	validationSchema,
			// 	component: InputSnippet,
			// 	multiline: true
			// }
		},
		{
			name: 'tags',
			title: 'Tags',
			...createTableTagsSelectorRenderer({
				validationSchema,
				items: [
					{ id: 'Test', name: 'Test' },
					{ id: 'Test2', name: 'Test2' }
				]
			})
		},
		{
			name: 'favorite',
			title: 'Favorite'
			// renderer: FavoriteSnippet,
			// rendererProps: {
			// 	validationSchema
			// }
		},
		{
			name: 'created_at',
			title: 'Created At'
			// renderer: ({ value }) =>
			// 	new Intl.DateTimeFormat('en-GB', {
			// 		day: '2-digit',
			// 		month: '2-digit',
			// 		year: 'numeric'
			// 	}).format(new Date(value))
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

<!-- TODO: Use placeholder, check empty table -->
{#if lyuboDBLive?.data}
	<Table {columns} data={lyuboDBLive.data} />
{/if}
