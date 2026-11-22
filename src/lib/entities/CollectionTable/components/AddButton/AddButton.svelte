<script lang="ts">
	import { getDB } from '$lib/db';
	import { Button, PlusIcon } from '$lib/components/ui';
	// Not the barrel: it exports this component, a cycle at runtime
	import { addRecord } from '$lib/entities/CollectionTable/utils';
	import type { IAddButtonProps } from './types';

	const { collectionId, focus, filter }: IAddButtonProps = $props();

	const dbStore = getDB();
</script>

<Button
	icon={PlusIcon}
	variant="accent"
	aria-label="Add a record"
	title="Add a record (N)"
	aria-keyshortcuts="N"
	onclick={() => void addRecord({ db: dbStore.db, collectionId, focus, filter })}
/>
