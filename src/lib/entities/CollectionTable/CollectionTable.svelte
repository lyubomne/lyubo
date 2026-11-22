<script lang="ts">
	import type { ICollectionTable, ICollectionTableProps } from './types';
	import { type ITableColumns, TableExpandButtonSnippet } from '$lib/components/ui';
	import { validationSchema } from './validationSchema';
	import { ColumnLimits } from '$lib/constants';
	import { createTagsSelectorRenderer } from '$lib/entities/TagsSelector';
	import {
		DataTable,
		createDataInputRenderer,
		createDataRemoveButtonRenderer,
		createDataTextAreaRenderer
	} from '$lib/components/data';
	import {
		CollectionTableDatePickerSnippet,
		CollectionTableFavoriteButtonSnippet,
		createCollectionTableNameRenderer
	} from './components';

	const { collectionId, focus }: ICollectionTableProps = $props();

	// TODO: tableName should be defined as prop in table component and be set to context
	const columns: ITableColumns<ICollectionTable>[] = $derived([
		{
			name: 'review',
			title: null,
			...createDataTextAreaRenderer({
				validationSchema,
				placeholder: 'Enter review',
				maxlength: ColumnLimits.lyubo.review,
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
			...createCollectionTableNameRenderer({
				validationSchema,
				placeholder: 'Enter name',
				maxlength: ColumnLimits.lyubo.name,
				tableName: 'lyubo'
			}),
			style: {
				paddingLeft: 'var(--space-8)'
			}
			// No width: Name takes the remaining space
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
			...createTagsSelectorRenderer({ collectionId }),
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
			name: 'rated_on',
			title: 'Rated on',
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
	]);
</script>

{#snippet empty()}
	No records yet. Add the first one with the + key.
{/snippet}

<DataTable
	{columns}
	name="lyubo_with_tags"
	filter={{ collection_id: collectionId }}
	{empty}
	{focus}
/>
