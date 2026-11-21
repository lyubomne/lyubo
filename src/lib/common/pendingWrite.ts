/*
 * Keeps the value of the latest local write until the DB shows it. A field written several times
 * in a row (a toggle clicked quickly) then shows the latest written value instead of every
 * intermediate live query result, and the next write starts from what the user sees.
 */
export class PendingWrite<TValue> {
	#latest: { value: TValue } | undefined;
	#inFlight = 0;

	/* Call before the write starts, with the value being written */
	start(value: TValue) {
		this.#latest = { value };
		this.#inFlight += 1;
	}

	/* Call when the write is done, with the current DB value */
	finish(dbValue: TValue) {
		this.#inFlight = Math.max(this.#inFlight - 1, 0);
		this.#settle(dbValue);
	}

	/* Call when the write failed: the DB value is shown again */
	fail() {
		this.#latest = undefined;
		this.#inFlight = 0;
	}

	/* The value to show for a DB value. It follows the DB again once every write has finished and
	 * the DB shows the latest written value */
	resolve(dbValue: TValue): TValue {
		this.#settle(dbValue);
		return this.#latest ? this.#latest.value : dbValue;
	}

	#settle(dbValue: TValue) {
		if (this.#inFlight === 0 && this.#latest && Object.is(this.#latest.value, dbValue)) {
			this.#latest = undefined;
		}
	}
}
