// First line that has text, without surrounding spaces. Empty when the text is blank
export const getFirstLine = (text: string | null | undefined): string =>
	text
		?.split('\n')
		.map((line) => line.trim())
		.find((line) => line.length > 0) ?? '';
