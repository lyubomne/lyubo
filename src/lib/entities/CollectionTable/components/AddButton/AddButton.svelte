<script lang="ts">
	import { getDB } from '$lib/db';
	import { Button } from '$lib/components/ui';
	import { v4 as uuidv4 } from 'uuid';

	const dbStore = getDB();

	const addNewItem = () => {
		if (!dbStore.db) {
			return;
		}

		void dbStore.db.sql` INSERT INTO lyubo (id)	VALUES (${uuidv4()})`;
	};
</script>

<Button onclick={addNewItem}>
	<span>add</span>
</Button>
