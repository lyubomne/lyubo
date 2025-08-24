<script lang="ts">
	import type { ILyuboTable } from './types';
	import { LiveDB, getDB } from '$lib/db';
	import { tick } from 'svelte';
	import type { TNillable } from '$lib/common/types';
	import { Table, type ITableColumns } from '$lib/components/Table';
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
			name: 'review',
			title: null,
			...createTableInputRenderer({
				validationSchema
			}),
			expandable: [
				{
					breakpoint: 'fullWidth',
					colSpan: 5
				},
				{
					breakpoint: 'sm',
					colSpan: 2
				}
			]
		},
		{
			name: 'name',
			title: 'Name',
			...createTableInputRenderer({
				validationSchema
			}),
			width: 200
		},
		{
			name: 'rating',
			title: 'Rating',
			...createTableInputRenderer({
				validationSchema,
				type: 'number'
			}),
			width: 72
		},
		{
			name: 'favorite',
			title: 'Fav',
			renderer: TableFavoriteButtonSnippet,
			width: 48,
			style: {
				textAlign: 'center'
			}
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
			}),
			width: 120,
			expandable: [
				{
					breakpoint: 'sm'
				}
			]
		},
		{
			// TODO: watched_on is too specific. Column name should be more generic
			name: 'watched_on',
			title: 'Watched on',
			renderer: TableDatePickerSnippet,
			width: 120,
			expandable: [
				{
					breakpoint: 'sm'
				}
			]
		},
		{
			name: 'expand',
			renderer: TableExpandButtonSnippet,
			style: {
				paddingRight: 'var(--space-4)'
			},
			width: 36
		},
		{
			name: 'remove',
			renderer: TableRemoveButtonSnippet,
			style: {
				paddingRight: 'var(--space-4)'
			},
			expandable: [
				{
					breakpoint: 'fullWidth'
				}
			]
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
	<div class="lyubo-table">
		<Table {columns} data={lyuboDBLive.data} />
	</div>
{/if}

<style>
	.lyubo-table :global {
		display: contents;

		table {
			table-layout: fixed;
			width: fit-content;
		}
	}
</style>
