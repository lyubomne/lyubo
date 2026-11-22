import type { TableFocus } from '$lib/components/ui';

export interface IAddButtonProps {
	// The collection the new record goes into
	collectionId: string;
	// Focus of the collection's table: the new record's name gets it
	focus: TableFocus;
}
