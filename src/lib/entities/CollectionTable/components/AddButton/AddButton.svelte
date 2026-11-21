<script lang="ts">
	import { getDB } from '$lib/db';
	import { Button, PlusIcon } from '$lib/components/ui';
	import { addRecord } from '../../utils';
	import type { IAddButtonProps } from './types';

	const { collectionId }: IAddButtonProps = $props();

	const dbStore = getDB();
</script>

<Button
	icon={PlusIcon}
	variant="accent"
	aria-label="Add a record"
	title="Add a record (N)"
	aria-keyshortcuts="N"
	onclick={() => void addRecord({ db: dbStore.db, collectionId })}
/>
