/*
 * A request to focus one field of a row. The row may not exist yet (a new record comes back with
 * the live query): the field takes the request when it mounts, so nothing waits on the DOM.
 */
export class TableFocus {
	#request = $state<{ rowId: string; column: string } | null>(null);

	request(rowId: string, column: string) {
		this.#request = { rowId, column };
	}

	// True once, for the field the request is for
	take(rowId: string, column: string): boolean {
		const isRequested = this.#request?.rowId === rowId && this.#request.column === column;

		if (isRequested) {
			this.#request = null;
		}

		return isRequested;
	}
}
