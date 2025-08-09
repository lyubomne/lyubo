<script lang="ts">
	import { LyuboTable } from '$lib/containers/LyuboTable';
</script>

<LyuboTable />

<!-- <script lang="ts">
	import { setDB } from '$lib/db';
	import ChangeLogSynchronizer from '$lib/db/sync.js';
	import { v4 as uuidv4 } from 'uuid';
	import { onMount, tick } from 'svelte';

	let lyuboList = $state([]);
	let isEditing = $state(false);

	let writePathSync = $state();

	async function createItem(event) {
		event.preventDefault();

		const form = event.target;
		const formData = new FormData(form);

		const name = formData.get('name');
		const rating = Number(formData.get('rating'));
		const review = formData.get('review');
		const favorite = formData.get('favorite') !== null;

		await dbStore.db.sql`
		  INSERT INTO lyubo (
		    id,
		    name,
            rating,
            review,
            favorite,
            tags,
            created_at
		  )
		  VALUES (
		    ${uuidv4()},
		    ${name},
            ${rating},
            ${review},
            ${favorite},
            ${['Test']},
            ${new Date()}
		  )
		`;

		form.reset();
	}

	async function updateItem(event, item) {
		event.preventDefault();

		const form = event.target;
		const formData = new FormData(form);

		const updated = {
			id: item.id,
			name: formData.get('name') ?? item.name,
			rating: formData.get('rating') ? Number(formData.get('rating')) : item.rating,
			review: formData.get('review') ?? item.review,
			favorite: formData.get('favorite') !== null ? formData.get('favorite') : false,
			tags: item.tags,
			created_at: item.created_at
		};

		await dbStore.db.sql`
        UPDATE lyubo
        SET name = ${updated.name},
            rating = ${updated.rating},
            review = ${updated.review},
            favorite = ${updated.favorite},
            tags = ${updated.tags},
            created_at = ${updated.created_at}
        WHERE id = ${updated.id}
    `;

		isEditing = false;
	}

	async function deleteItem(event, item) {
		event.preventDefault();

		await dbStore.db.sql`
      DELETE FROM lyubo
        WHERE id = ${item.id}
    `;
	}
</script>

<div>
	<h3>Lyubo</h3>
	<ul>
		{#each lyuboList as item (item.id)}
			<li>
				{#if isEditing}
					<form on:submit|preventDefault={(e) => updateItem(e, item)}>
						<input type="text" name="name" value={item.name} />
						<input type="number" name="rating" value={item.rating} />
						<input type="text" name="review" value={item.review} />
						<label>
							<input type="checkbox" name="favorite" checked={item.favorite} /> Favorite
						</label>
						<button type="submit">Save</button>
					</form>
				{:else}
					<span>{item.name}</span>
					<span>{item.rating}</span>
					<span>{item.review}</span>
					<span>{item.tags}</span>
					<span>{item.favorite}</span>
					<span>{item.created_at}</span>
					<button on:click={() => (isEditing = true)}>Edit</button>
					<a href="#delete" on:click={(event) => deleteItem(event, item)}>✕</a>
				{/if}
			</li>
		{/each}
		{#if lyuboList.length === 0}
			<li>No items</li>
		{/if}
	</ul>
	<form on:submit|preventDefault={createItem}>
		<input type="text" name="name" placeholder="Name" required />
		<input type="number" name="rating" placeholder="Rating" required />
		<input type="text" name="review" placeholder="Review" />
		<label>
			<input type="checkbox" name="favorite" /> Favorite
		</label>
		<button type="submit">Add</button>
	</form>
</div> -->
