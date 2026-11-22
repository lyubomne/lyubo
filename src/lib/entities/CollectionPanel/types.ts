import type { COLLECTION_SORT_COLUMNS } from '$lib/constants';
import type { TSortDirection } from '$lib/types';

export interface ICollection {
	id: string;
	name: string;
	position: number;
	// Both NULL: newest first
	sort_column: (typeof COLLECTION_SORT_COLUMNS)[number] | null;
	sort_direction: TSortDirection | null;
	created_at: Date;
}

export interface ICollectionSummary extends Pick<
	ICollection,
	'id' | 'name' | 'position' | 'sort_column' | 'sort_direction'
> {
	record_count: number;
}

export type ICollectionMoveOffset = -1 | 1;

export interface ICollectionPanelProps {
	collection: ICollectionSummary;
	canMoveLeft: boolean;
	canMoveRight: boolean;
	onMove: (offset: ICollectionMoveOffset) => void;
}

export interface ICollectionPanelMenuProps {
	collection: ICollectionSummary;
	canMoveLeft: boolean;
	canMoveRight: boolean;
	onMove: (offset: ICollectionMoveOffset) => void;
	onRename: () => void;
}
