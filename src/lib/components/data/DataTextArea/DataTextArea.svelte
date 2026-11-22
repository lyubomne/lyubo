<script lang="ts">
	import { ZodError } from 'zod';
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import type { IDataTextAreaSnippetProps } from './types';
	import { TextArea, getTableFocus } from '$lib/components/ui';
	import { getDB, updateFieldById } from '$lib/db';
	import { focusNextField, isTextField } from '$lib/common/dom';

	const {
		tableName,
		validationSchema,
		name,
		value,
		rowId,
		...restProps
	}: Omit<HTMLTextareaAttributes, 'value'> & IDataTextAreaSnippetProps = $props();

	const dbStore = getDB();
	const tableFocus = getTableFocus();

	let localValue = $derived(value ?? '');
	let error = $state('');
	let textArea = $state<HTMLTextAreaElement | null>(null);

	const validateValue = (e: Event & { currentTarget: EventTarget & HTMLTextAreaElement }) => {
		try {
			validationSchema?.shape[name].parse(e.currentTarget.value);
			error = '';
		} catch (err) {
			if (err instanceof ZodError) {
				error = err.issues[0]?.message || 'Invalid value';
			}
		}
	};

	const commit = async () => {
		if (error || (value ?? '') === localValue) {
			return;
		}

		await updateFieldById({ db: dbStore.db, name, value: localValue, rowId, tableName });
	};

	// Enter is a line break; there is no Ctrl/Cmd+Enter on a phone keyboard, so blur commits too
	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			void commit();

			// Text fields only: the next key in the row may be remove, which deletes at once
			if (textArea) {
				focusNextField(textArea, isTextField);
			}
		}

		if (e.key === 'Escape') {
			textArea?.blur();
		}
	};
</script>

<div class="data-text-area">
	<TextArea
		bind:value={localValue}
		bind:ref={textArea}
		{@attach (field) => {
			if (tableFocus?.take(rowId, name)) field.focus();
		}}
		aria-invalid={error ? 'true' : 'false'}
		oninput={validateValue}
		onblur={commit}
		onkeydown={handleKeyDown}
		autocomplete="off"
		{...restProps}
	/>
	{#if error}
		<div class="error" role="alert">{error}</div>
	{/if}
</div>
