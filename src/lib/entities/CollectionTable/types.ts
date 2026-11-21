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
}
