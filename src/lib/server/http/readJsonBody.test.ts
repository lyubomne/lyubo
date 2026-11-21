import { describe, expect, it } from 'vitest';

import { readJsonBody } from './readJsonBody';

const URL = 'http://localhost:5173/api/x';
const ORIGIN = 'http://localhost:5173';
const MAX_BYTES = 16;

const request = ({
	headers = {},
	body = '{"a":1}'
}: {
	headers?: Record<string, string>;
	body?: BodyInit;
}) =>
	new Request(URL, {
		method: 'POST',
		headers: { origin: ORIGIN, 'content-type': 'application/json', ...headers },
		body
	});

// A body without a declared length, as a chunked upload sends it
const stream = (text: string) =>
	new Request(URL, {
		method: 'POST',
		headers: { origin: ORIGIN, 'content-type': 'application/json' },
		body: new Blob([text]).stream(),
		duplex: 'half'
	} as RequestInit);

describe('readJsonBody', () => {
	it('returns the parsed body of a same-origin JSON request', async () => {
		const result = await readJsonBody(
			request({ headers: { 'content-type': 'application/json; charset=utf-8' } }),
			MAX_BYTES
		);

		expect(result).toEqual({ ok: true, body: { a: 1 } });
	});

	it.each([
		{ name: 'without an Origin', headers: { origin: '' } },
		{ name: 'from another site', headers: { origin: 'https://evil.example' } },
		{ name: 'from another port', headers: { origin: 'http://localhost:4173' } }
	])('refuses a request $name with 403', async ({ headers }) => {
		const result = await readJsonBody(request({ headers }), MAX_BYTES);

		expect(result).toMatchObject({ ok: false, status: 403 });
	});

	it.each([
		// What a cross-site form or a `no-cors` fetch of a string sends
		{ name: 'text/plain', body: '{"a":1}' },
		// A `no-cors` fetch of a Blob sends no Content-Type at all
		{ name: 'no type', body: new Blob(['{"a":1}']) }
	])('refuses a body with $name with 415', async ({ body }) => {
		const simple = new Request(URL, { method: 'POST', headers: { origin: ORIGIN }, body });

		const result = await readJsonBody(simple, MAX_BYTES);

		expect(result).toMatchObject({ ok: false, status: 415 });
	});

	it('refuses a body whose declared length is over the limit with 413', async () => {
		const result = await readJsonBody(
			request({ headers: { 'content-length': String(MAX_BYTES + 1) } }),
			MAX_BYTES
		);

		expect(result).toMatchObject({ ok: false, status: 413 });
	});

	it('refuses a body over the limit without a declared length with 413', async () => {
		const result = await readJsonBody(stream(`"${'a'.repeat(MAX_BYTES)}"`), MAX_BYTES);

		expect(result).toMatchObject({ ok: false, status: 413 });
	});

	it('counts bytes, not characters', async () => {
		// 8 characters, 16 bytes in UTF-8, plus the quotes
		const result = await readJsonBody(stream(`"${'ж'.repeat(8)}"`), MAX_BYTES);

		expect(result).toMatchObject({ ok: false, status: 413 });
	});

	it('accepts a body of exactly the limit', async () => {
		const result = await readJsonBody(stream(`"${'a'.repeat(MAX_BYTES - 2)}"`), MAX_BYTES);

		expect(result).toEqual({ ok: true, body: 'a'.repeat(MAX_BYTES - 2) });
	});

	it('refuses a body that is not JSON with 400', async () => {
		const result = await readJsonBody(request({ body: '{' }), MAX_BYTES);

		expect(result).toEqual({ ok: false, status: 400, error: 'invalid json' });
	});
});
