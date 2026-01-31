export type TableDescriptor = {
	table: string;
	primaryKey: string[];
	writableColumns: readonly string[];
	allow: {
		insert: boolean;
		update: boolean;
		delete: boolean;
	};
};
