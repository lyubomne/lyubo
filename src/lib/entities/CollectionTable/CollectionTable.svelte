<script lang="ts">
	import type { ICollectionTable } from './types';
	import { type ITableColumns, TableExpandButtonSnippet } from '$lib/components/ui';
	import { validationSchema } from './validationSchema';
	import { createTagsSelectorRenderer } from '$lib/entities/TagsSelector';
	import {
		DataTable,
		createDataInputRenderer,
		createDataRemoveButtonRenderer
	} from '$lib/components/data';
	import {
		CollectionTableDatePickerSnippet,
		CollectionTableFavoriteButtonSnippet
	} from './components';

	// TODO: tableName should be defined as prop in table component and be set to context
	const columns: ITableColumns<ICollectionTable>[] = [
		{
			name: 'review',
			title: null,
			...createDataInputRenderer({
				validationSchema,
				placeholder: 'Enter review',
				tableName: 'lyubo'
			}),
			style: {
				paddingLeft: 'var(--space-8)'
			},
			expandableRows: [
				[
					{
						breakpoint: 'fullWidth',
						colSpan: 5
					}
				]
			]
		},
		{
			name: 'name',
			title: 'Name',
			...createDataInputRenderer({
				validationSchema,
				placeholder: 'Enter name',
				tableName: 'lyubo'
			}),
			style: {
				paddingLeft: 'var(--space-8)'
			},
			width: 200
		},
		{
			name: 'rating',
			title: 'Rating',
			...createDataInputRenderer({
				validationSchema,
				type: 'number',
				tableName: 'lyubo'
			}),
			width: 72
		},
		{
			name: 'favorite',
			title: 'Fav',
			renderer: CollectionTableFavoriteButtonSnippet,
			width: 48,
			style: {
				textAlign: 'center'
			}
		},
		{
			name: 'tags',
			title: 'Tags',
			...createTagsSelectorRenderer(),
			width: 120,
			expandableRows: [
				null,
				[
					{
						breakpoint: 'fullWidth',
						colSpan: 4
					},
					{
						breakpoint: 'sm',
						colSpan: 1
					}
				]
			]
		},
		{
			// TODO: watched_on is too specific. Column name should be more generic
			name: 'watched_on',
			title: 'Watched on',
			renderer: CollectionTableDatePickerSnippet,
			width: 120,
			expandableRows: [
				null,
				[
					{
						breakpoint: 'sm',
						colSpan: 2
					}
				]
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
			...createDataRemoveButtonRenderer({ tableName: 'lyubo' }),
			style: {
				paddingRight: 'var(--space-4)'
			},
			expandableRows: [
				null,
				[
					{
						breakpoint: 'fullWidth'
					}
				]
			]
		}
	];
</script>

<DataTable {columns} name="lyubo_with_tags" />
