<script lang="ts">
	import type { ILyuboTable } from './types';
	import { LiveDB, getDB } from '$lib/db';
	import { tick } from 'svelte';
	import type { TNillable } from '$lib/common/types';
	import { Table, type ITableColumns, type ITableExpandableColumns } from '$lib/components/Table';
	import { createTableInputRenderer } from './components/TableInput';
	import { validationSchema } from './validationSchema';
	import { createTableTagsSelectorRenderer } from './components/TableTagsSelector';
	import { TableFavoriteButtonSnippet } from './components/TableFavoriteButton';
	import { TableDatePickerSnippet } from './components/TableDatePicker';

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
			title: 'Favorite',
			renderer: TableFavoriteButtonSnippet
		},
		{
			name: 'watched_on',
			title: 'Watched on',
			renderer: TableDatePickerSnippet
		}
	];

	const expandableRow: ITableExpandableColumns<ILyuboTable> = {
		name: 'review',
		...createTableInputRenderer({
			validationSchema
		})
	};

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
	<Table {columns} data={lyuboDBLive.data} expandable={expandableRow} />
{/if}
