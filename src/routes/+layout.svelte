<script lang="ts">
	import '../app.css';
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

<div class="main">
	{#if dbStore?.db}
		{@render children()}
	{/if}
</div>

<style>
	.main {
		display: flex;
		place-content: center;
		width: 100%;
		height: 100%;
	}
</style>
