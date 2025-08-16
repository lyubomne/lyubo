export interface ILyuboTable {
	id: string;
	name: string;
	rating: number;
	review: string | null;
	tags: string[];
	favorite: boolean;
	created_at: Date;
	watched_on: string;
}
