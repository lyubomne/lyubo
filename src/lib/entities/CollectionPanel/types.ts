export interface ICollection {
	id: string;
	name: string;
	position: number;
	sort_column: string | null;
	sort_direction: 'asc' | 'desc' | null;
	created_at: Date;
}

export interface ICollectionSummary extends Pick<ICollection, 'id' | 'name' | 'position'> {
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
