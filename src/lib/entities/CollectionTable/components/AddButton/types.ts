import type { TableFocus } from '$lib/components/ui';
import type { CollectionFilterStore } from '$lib/entities/CollectionFilter';

export interface IAddButtonProps {
	// The collection the new record goes into
	collectionId: string;
	// Focus of the collection's table: the new record's name gets it
	focus: TableFocus;
	// Search and filters of the panel, cleared so the new record shows
	filter?: CollectionFilterStore;
}
