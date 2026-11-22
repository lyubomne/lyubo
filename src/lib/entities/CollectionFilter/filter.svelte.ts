import { debounce } from '$lib/utils';
import type { ITag } from '$lib/entities/CollectionTags';

// Each change of the search starts a new live query: wait until typing pauses
const SEARCH_DELAY_MS = 200;

/*
 * The search and filters of one panel. They are not saved: a panel starts with all its records.
 */
export class CollectionFilterStore {
	// What the search field shows; `search` follows it once typing pauses
	searchText = $state('');
	search = $state('');
	isFavoriteOnly = $state(false);
	#tagIds: string[] = $state([]);
	#tags: () => ITag[];

	#applySearch = debounce(() => {
		this.search = this.searchText.trim();
	}, SEARCH_DELAY_MS);

	constructor(tags: () => ITag[]) {
		this.#tags = tags;
	}

	// A deleted tag no longer filters
	get tagIds(): string[] {
		return this.#tagIds.filter((id) => this.#tags().some((tag) => tag.id === id));
	}

	get hasFilters(): boolean {
		return this.isFavoriteOnly || this.tagIds.length > 0;
	}

	get isActive(): boolean {
		return this.search !== '' || this.hasFilters;
	}

	setSearchText = (text: string) => {
		this.searchText = text;
		this.#applySearch();
	};

	toggleFavoriteOnly = () => {
		this.isFavoriteOnly = !this.isFavoriteOnly;
	};

	toggleTag = (id: string) => {
		this.#tagIds = this.tagIds.includes(id)
			? this.tagIds.filter((tagId) => tagId !== id)
			: [...this.tagIds, id];
	};

	clearFilters = () => {
		this.isFavoriteOnly = false;
		this.#tagIds = [];
	};

	clear = () => {
		this.searchText = '';
		this.search = '';
		this.clearFilters();
	};
}
