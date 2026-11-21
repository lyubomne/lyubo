export type TJsonBody =
	{ ok: true; body: unknown } | { ok: false; status: 400 | 403 | 413 | 415; error: string };

const readText = async (request: Request, maxBytes: number): Promise<string | undefined> => {
	if (!request.body) {
		return '';
	}

	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;

	for (;;) {
		const { done, value } = await reader.read();

		if (done) {
			break;
		}

		size += value.byteLength;

		if (size > maxBytes) {
			await reader.cancel();

			return;
		}

		chunks.push(value);
	}

	const bytes = new Uint8Array(size);
	let offset = 0;

	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}

	return new TextDecoder().decode(bytes);
};

/*
 * Reads the JSON body of a same-origin request, at most `maxBytes` long.
 * SvelteKit's own CSRF check covers only form content types, and a cross-site request without a
 * Content-Type (a `no-cors` fetch of a Blob) passes it. Requiring `application/json` forces a
 * CORS preflight, which fails, and the Origin check refuses what gets through anyway.
 */
export const readJsonBody = async (request: Request, maxBytes: number): Promise<TJsonBody> => {
	if (request.headers.get('origin') !== new URL(request.url).origin) {
		return { ok: false, status: 403, error: 'cross-site request' };
	}

	const mediaType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();

	if (mediaType !== 'application/json') {
		return { ok: false, status: 415, error: 'expected application/json' };
	}

	// The declared length refuses early; the counted length covers a missing or false header
	const declaredLength = Number(request.headers.get('content-length') ?? 0);
	const text = declaredLength > maxBytes ? undefined : await readText(request, maxBytes);

	if (text === undefined) {
		return { ok: false, status: 413, error: 'body too large' };
	}

	try {
		return { ok: true, body: JSON.parse(text) };
	} catch (_err) {
		return { ok: false, status: 400, error: 'invalid json' };
	}
};
