<script lang="ts">
	import { IconButton, TrashIcon, type IIconButtonProps } from '$lib/components/ui';
	import { getDB } from '$lib/db';
	import { identifier } from '@electric-sql/pglite/template';
	import type { IDataRemoveButtonSnippetProps } from './types';

	const {
		rowId,
		tableName,
		...restProps
	}: IDataRemoveButtonSnippetProps & Omit<IIconButtonProps, 'icon'> = $props();

	const dbStore = getDB();

	const remove = () => {
		if (!dbStore?.db) {
			return;
		}

		void dbStore.db.sql`DELETE FROM ${identifier`${tableName}`} WHERE id = ${rowId}`;
	};
</script>

<div class="remove-button">
	<IconButton title="remove" {...restProps} icon={TrashIcon} onclick={remove} aria-label="remove" />
</div>

<style>
	.remove-button {
		display: contents;

		:global {
			svg {
				fill: var(--color-dark-1);
			}
		}
	}
</style>
