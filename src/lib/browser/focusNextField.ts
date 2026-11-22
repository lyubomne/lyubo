const FOCUSABLE_SELECTOR = 'input, button, select, textarea, [tabindex]';

const isDisabled = (element: HTMLElement): boolean =>
	(element instanceof HTMLInputElement ||
		element instanceof HTMLButtonElement ||
		element instanceof HTMLSelectElement ||
		element instanceof HTMLTextAreaElement) &&
	element.disabled;

/*
 * Moves focus to the next visible field in document order, as Enter does in a form. Skips
 * disabled fields, those taken out of the tab order (`tabindex="-1"`), and those `isCandidate`
 * rejects.
 */
export const focusNextField = (
	current: HTMLElement,
	isCandidate: (element: HTMLElement) => boolean = () => true
): void => {
	const focusable = Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
		(element) =>
			element === current ||
			(element.tabIndex >= 0 &&
				!isDisabled(element) &&
				element.offsetParent !== null &&
				isCandidate(element))
	);
	const index = focusable.indexOf(current);

	if (index > -1 && index + 1 < focusable.length) {
		focusable[index + 1].focus();
	}
};
