import { describe, expect, it } from 'vitest';

import { OptimisticValue } from './optimisticValue.svelte';

// The DB value a live query brings: the test changes it the way new query results would
const createValue = <TValue>(initial: TValue) => {
	let dbValue = initial;

	return {
		optimistic: new OptimisticValue(() => dbValue),
		setDBValue: (value: TValue) => {
			dbValue = value;
		}
	};
};

// A write the test finishes or fails when it wants
const createWrite = () => {
	const calls: { value: unknown; finish: () => void; fail: (err: Error) => void }[] = [];
	const write = (value: unknown) =>
		new Promise<void>((resolve, reject) => {
			calls.push({ value, finish: resolve, fail: reject });
		});

	return { write, calls };
};

describe('OptimisticValue', () => {
	it('shows the DB value while nothing is edited or written', () => {
		const { optimistic, setDBValue } = createValue('Alien');

		setDBValue('Aliens');

		expect(optimistic.value).toBe('Aliens');
	});

	describe('a toggle (written values)', () => {
		it('shows the latest written value while writes run, not the results of earlier writes', () => {
			const { optimistic, setDBValue } = createValue(false);
			const { write } = createWrite();
			void optimistic.save(write, true);
			void optimistic.save(write, false);

			setDBValue(true);

			expect(optimistic.value).toBe(false);
		});

		it('keeps the written value after the write finished until the DB shows it', async () => {
			const { optimistic } = createValue(false);
			const { write, calls } = createWrite();
			const saving = optimistic.save(write, true);

			calls[0].finish();
			await saving;

			expect(optimistic.value).toBe(true);
		});

		it('follows the DB again once it showed the latest written value', async () => {
			const { optimistic, setDBValue } = createValue(false);
			const { write, calls } = createWrite();
			const saving = optimistic.save(write, true);
			calls[0].finish();
			await saving;
			setDBValue(true);
			void optimistic.value;

			setDBValue(false);

			expect(optimistic.value).toBe(false);
		});

		it('follows the DB again when it already showed the written value as the write finished', async () => {
			const { optimistic, setDBValue } = createValue(false);
			const { write, calls } = createWrite();
			const saving = optimistic.save(write, true);
			setDBValue(true);
			calls[0].finish();
			await saving;

			setDBValue(false);

			expect(optimistic.value).toBe(false);
		});

		it('keeps the written value while a later write still runs, even if the DB shows it', async () => {
			const { optimistic, setDBValue } = createValue(false);
			const { write, calls } = createWrite();
			const first = optimistic.save(write, true);
			void optimistic.save(write, false);
			calls[0].finish();
			await first;

			setDBValue(true);

			expect(optimistic.value).toBe(false);
		});

		it('writes the value back when it equals the DB value but an earlier write still runs', () => {
			const { optimistic } = createValue(false);
			const { write, calls } = createWrite();
			void optimistic.save(write, true);

			void optimistic.save(write, false);

			expect(calls.map((call) => call.value)).toEqual([true, false]);
		});

		it('shows the DB value again after a failed write and rethrows the error', async () => {
			const { optimistic } = createValue(false);
			const { write, calls } = createWrite();
			const saving = optimistic.save(write, true);

			calls[0].fail(new Error('refused'));

			await expect(saving).rejects.toThrow('refused');
			expect(optimistic.value).toBe(false);
		});

		it('tells a written undefined apart from no write', () => {
			const { optimistic } = createValue<string | undefined>('a');
			const { write } = createWrite();

			void optimistic.save(write, undefined);

			expect(optimistic.value).toBeUndefined();
		});
	});

	describe('a text field (a draft)', () => {
		it('keeps the draft while a live query brings another DB value', () => {
			const { optimistic, setDBValue } = createValue('Alien');
			optimistic.value = 'Arrival';

			setDBValue('Alien 3');

			expect(optimistic.value).toBe('Arrival');
		});

		it('shows the written text, not the old DB value, until the DB shows it', async () => {
			const { optimistic, setDBValue } = createValue('Alien');
			const { write, calls } = createWrite();
			optimistic.value = 'Arrival';
			const saving = optimistic.save(write);
			calls[0].finish();
			await saving;

			const beforeDB = optimistic.value;
			setDBValue('Arrival');
			const afterDB = optimistic.value;
			setDBValue('Arrival 2');

			expect([beforeDB, afterDB, optimistic.value]).toEqual(['Arrival', 'Arrival', 'Arrival 2']);
		});

		it('writes nothing without a draft or when the draft equals the DB value', async () => {
			const { optimistic } = createValue('Alien');
			const { write, calls } = createWrite();

			await optimistic.save(write);
			optimistic.value = 'Alien';
			await optimistic.save(write);

			expect(calls).toEqual([]);
		});

		it('returns the refused text to the draft', async () => {
			const { optimistic } = createValue('Alien');
			const { write, calls } = createWrite();
			optimistic.value = 'Arrival';
			const saving = optimistic.save(write);

			calls[0].fail(new Error('duplicate'));

			await expect(saving).rejects.toThrow('duplicate');
			expect(optimistic.value).toBe('Arrival');
		});
	});
});
