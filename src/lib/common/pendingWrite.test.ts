import { describe, expect, it } from 'vitest';

import { PendingWrite } from './pendingWrite';

describe('PendingWrite', () => {
	it('shows the DB value when nothing was written', () => {
		const pending = new PendingWrite<boolean>();

		expect(pending.resolve(true)).toBe(true);
	});

	it('shows the latest written value while writes run, not the results of earlier writes', () => {
		const pending = new PendingWrite<boolean>();
		pending.start(true);
		pending.start(false);

		const shown = pending.resolve(true);

		expect(shown).toBe(false);
	});

	it('keeps the written value after the write finished until the DB shows it', () => {
		const pending = new PendingWrite<boolean>();
		pending.start(true);
		pending.start(false);
		pending.finish(true);
		pending.finish(true);

		const shown = pending.resolve(true);

		expect(shown).toBe(false);
	});

	it('follows the DB again once it showed the latest written value', () => {
		const pending = new PendingWrite<boolean>();
		pending.start(true);
		pending.finish(false);
		pending.resolve(true);

		const shown = pending.resolve(false);

		expect(shown).toBe(false);
	});

	it('follows the DB again when it already showed the written value as the write finished', () => {
		const pending = new PendingWrite<boolean>();
		pending.start(true);
		pending.start(false);
		pending.finish(false);
		pending.finish(false);

		const shown = pending.resolve(true);

		expect(shown).toBe(true);
	});

	it('keeps the written value while a later write still runs, even if the DB shows it', () => {
		const pending = new PendingWrite<boolean>();
		pending.start(true);
		pending.start(false);
		pending.finish(false);

		const shown = pending.resolve(true);

		expect(shown).toBe(false);
	});

	it('shows the DB value again after a failed write', () => {
		const pending = new PendingWrite<boolean>();
		pending.start(true);
		pending.fail();

		const shown = pending.resolve(false);

		expect(shown).toBe(false);
	});

	it('tells a written undefined apart from no write', () => {
		const pending = new PendingWrite<string | undefined>();
		pending.start(undefined);

		const shown = pending.resolve('a');

		expect(shown).toBeUndefined();
	});
});
