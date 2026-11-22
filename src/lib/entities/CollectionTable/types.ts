import type { ITableSort, TableFocus } from '$lib/components/ui';
import type { CollectionFilterStore } from '$lib/entities/CollectionFilter';

export interface ICollectionTable {
	id: string;
	collection_id: string;
	name: string;
	rating: number;
	review: string;
	tags: string[];
	favorite: boolean;
	created_at: Date;
	// 'YYYY-MM-DD'
	rated_on: string;
}

export interface ICollectionTableProps {
	collectionId: string;
	filter: CollectionFilterStore;
	sort: ITableSort | null;
	onSortChange: (sort: ITableSort | null) => void;
	focus?: TableFocus;
}
