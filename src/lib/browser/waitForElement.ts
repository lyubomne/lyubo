/*
 * Waits until a selector matches, e.g. a row the live query has not rendered yet. Resolves with
 * `null` after `timeoutMs`.
 */
export const waitForElement = <TElement extends Element = HTMLElement>(
	root: ParentNode & Node,
	selector: string,
	timeoutMs = 2_000
): Promise<TElement | null> =>
	new Promise((resolve) => {
		const existing = root.querySelector<TElement>(selector);

		if (existing) {
			resolve(existing);
			return;
		}

		const finish = (element: TElement | null) => {
			observer.disconnect();
			clearTimeout(timeout);
			resolve(element);
		};

		const observer = new MutationObserver(() => {
			const element = root.querySelector<TElement>(selector);

			if (element) {
				finish(element);
			}
		});

		const timeout = setTimeout(() => finish(null), timeoutMs);

		observer.observe(root, { childList: true, subtree: true });
	});
