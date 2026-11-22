<script lang="ts">
	import type { ITextAreaProps } from './types';

	let { value = $bindable(), ref = $bindable(null), ...restProps }: ITextAreaProps = $props();

	// Firefox and older Safari lack `field-sizing`: grow to the content height by hand
	const hasFieldSizing = typeof CSS !== 'undefined' && CSS.supports('field-sizing', 'content');

	const fitHeight = (textArea: HTMLTextAreaElement) => {
		textArea.style.height = 'auto';
		textArea.style.height = `${textArea.scrollHeight}px`;
	};

	$effect(() => {
		// Reading `value` refits after typing and after the live query brings a new value
		if (!hasFieldSizing && ref && value !== undefined) {
			fitHeight(ref);
		}
	});
</script>

<textarea bind:value bind:this={ref} rows="1" {...restProps}></textarea>

<style>
	textarea {
		display: block;
		width: 100%;
		box-sizing: border-box;
		min-height: var(--size-24);
		field-sizing: content;
		resize: none;
		overflow: hidden;
		border-radius: var(--radius-4);
		padding-inline: var(--space-8);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
</style>
