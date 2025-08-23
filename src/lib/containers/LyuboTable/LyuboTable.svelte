<script lang="ts">
	import type { ILyuboTable } from './types';
	import { LiveDB, getDB } from '$lib/db';
	import { tick } from 'svelte';
	import type { TNillable } from '$lib/common/types';
	import { Table, type ITableColumns, type ITableExpandableColumns } from '$lib/components/Table';
	import {
		createTableInputRenderer,
		createTableTagsSelectorRenderer,
		TableFavoriteButtonSnippet,
		TableDatePickerSnippet,
		TableRemoveButtonSnippet,
		TableExpandButtonSnippet
	} from './components';
	import { validationSchema } from './validationSchema';

	import { Button } from 'bits-ui';
	import { v4 as uuidv4 } from 'uuid';

	let lyuboDBLive: TNillable<LiveDB<ILyuboTable>> = $state();
	const dbStore = getDB();

	// db Listener is not ready yet on this microtask loop. So we need to run live on the next one.
	// Otherwise live will be start but no listeners will be triggered
	tick().then(() => {
		if (dbStore.db) {
			lyuboDBLive = new LiveDB<ILyuboTable>(
				dbStore.db,
				'SELECT * FROM lyubo ORDER BY created_at DESC'
			);
		}
	});

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
			name: 'favorite',
			title: 'Fav',
			renderer: TableFavoriteButtonSnippet
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
			name: 'watched_on',
			title: 'Watched on',
			renderer: TableDatePickerSnippet
		},
		{
			name: 'actions',
			renderer: TableExpandButtonSnippet,
			style: {
				paddingRight: 'var(--space-xs)'
			}
		}
	];

	const expandableColumns: ITableExpandableColumns<ILyuboTable>[] = [
		{
			name: 'review',
			colSpan: 5,
			...createTableInputRenderer({
				validationSchema
			})
		},
		{
			name: 'actions',
			renderer: TableRemoveButtonSnippet,
			style: {
				paddingRight: 'var(--space-xs)'
			}
		}
	];

	const addNewItem = () => {
		if (!dbStore.db) {
			return;
		}

		void dbStore.db.sql` INSERT INTO lyubo (id)	VALUES (${uuidv4()})`;
	};
</script>

<!-- TODO: Use placeholder, check empty table -->
{#if lyuboDBLive?.data}
	<Button.Root onclick={addNewItem}>add</Button.Root>
	<Table {columns} data={lyuboDBLive.data} {expandableColumns} />
{/if}
