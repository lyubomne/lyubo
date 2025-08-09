<script lang="ts">
	import { setDB } from '$lib/db';
	import { ChangeLogSynchronizer } from '$lib/db';
	import { onMount } from 'svelte';

	let { children } = $props();

	const dbStore = setDB();

	onMount(() => {
		let changeLogSynchronizer: ChangeLogSynchronizer;

		const init = async () => {
			await dbStore.loadPGlite();

			if (dbStore.db) {
				changeLogSynchronizer = new ChangeLogSynchronizer(dbStore.db);
				changeLogSynchronizer.start();
			}
		};

		init();

		return () => {
			if (changeLogSynchronizer) {
				changeLogSynchronizer.stop();
			}
		};
	});
</script>

{#if dbStore?.db}
	{@render children()}
{/if}
