import type { ITableSort } from '$lib/components/ui';
import type { CollectionFilterStore } from './filter.svelte';

export interface ICollectionFilterProps {
	filter: CollectionFilterStore;
	sort: ITableSort | null;
	onSortChange: (sort: ITableSort | null) => void;
}
