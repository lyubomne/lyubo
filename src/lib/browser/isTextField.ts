// Single-key shortcuts must not fire while the user types
export const isTextField = (target: EventTarget | null): boolean =>
	target instanceof HTMLElement &&
	(target.isContentEditable ||
		target instanceof HTMLTextAreaElement ||
		target instanceof HTMLSelectElement ||
		(target instanceof HTMLInputElement &&
			!['button', 'checkbox', 'radio', 'submit', 'reset'].includes(target.type)));
