<script lang="ts">
	import { getLocalTimeZone, today } from '@internationalized/date';
	import { getDB } from '$lib/db';
	import { Button } from '$lib/components/ui';
	import { v4 as uuidv4 } from 'uuid';
	import type { IAddButtonProps } from './types';

	const { collectionId }: IAddButtonProps = $props();

	const dbStore = getDB();

	const addNewItem = () => {
		if (!dbStore.db) {
			return;
		}

		// Today in the user's time zone; CURRENT_DATE in PGlite is the date in UTC
		const ratedOn = today(getLocalTimeZone()).toString();

		void dbStore.db.sql`
			INSERT INTO lyubo (id, collection_id, rated_on) VALUES (${uuidv4()}, ${collectionId}, ${ratedOn})
		`;
	};
</script>

<Button onclick={addNewItem}>
	<span>add</span>
</Button>
