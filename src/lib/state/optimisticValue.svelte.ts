/*
 * The value a field shows while the DB catches up with the user: their draft while they edit,
 * then the latest written value until the DB shows it, then the DB value again. A live query
 * result that arrives in between neither wipes the draft nor flashes an older value, and quick
 * repeated writes (a toggle) show the latest one instead of every intermediate result.
 */
export class OptimisticValue<TValue> {
	#dbValue: () => TValue;
	#draft = $state<{ value: TValue } | null>(null);
	#pending = $state<{ value: TValue } | null>(null);
	// Set while reading `value` in markup, where state must not change: a plain field
	#isSettled = false;
	#inFlight = 0;

	constructor(dbValue: () => TValue) {
		this.#dbValue = dbValue;
	}

	get value(): TValue {
		if (this.#draft) {
			return this.#draft.value;
		}

		const dbValue = this.#dbValue();

		if (!this.#pending || this.#settle(dbValue)) {
			return dbValue;
		}

		return this.#pending.value;
	}

	// The draft: what `bind:value` writes while the user edits
	set value(value: TValue) {
		this.#draft = { value };
	}

	/*
	 * Writes the given value, or the draft when none is given (nothing without a draft). Skips the
	 * write when it equals the DB value and no other write runs. When the write fails, the draft
	 * comes back for correcting, the DB value shows again, and the error is rethrown.
	 */
	async save(
		write: (value: TValue) => Promise<unknown> | undefined,
		...value: [] | [TValue]
	): Promise<void> {
		const draft = this.#draft;
		const next = value.length === 1 ? { value: value[0] } : draft;
		this.#draft = null;

		if (!next) {
			return;
		}

		if (this.#inFlight === 0 && Object.is(next.value, this.#dbValue())) {
			this.#pending = null;
			return;
		}

		this.#pending = next;
		this.#isSettled = false;
		this.#inFlight += 1;

		try {
			await write(next.value);
		} catch (err) {
			this.#inFlight = 0;
			this.#pending = null;
			this.#draft = draft;
			throw err;
		}

		this.#inFlight = Math.max(this.#inFlight - 1, 0);
		this.#settle(this.#dbValue());
	}

	// The DB shows the latest written value and no write runs: follow the DB from now on
	#settle(dbValue: TValue): boolean {
		if (!this.#isSettled && this.#inFlight === 0 && Object.is(this.#pending?.value, dbValue)) {
			this.#isSettled = true;
		}

		return this.#isSettled;
	}
}
