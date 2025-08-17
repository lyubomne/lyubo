export interface ILyuboTable {
	id: string;
	name: string;
	rating: number;
	review: string;
	tags: string[];
	favorite: boolean;
	created_at: Date;
	watched_on: string;
}
