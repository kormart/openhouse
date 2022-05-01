<script>
	import { getContext } from 'svelte';
	import { BUTTON_GROUP } from './ButtonGroup.svelte';
	const { selectButton, values } = getContext(BUTTON_GROUP);
	
	export let value;
	export let active = true;
	$: active = $values.includes(value);
</script>

<style>
	.active {
		background-color: #f5a9ab;
		color: white;
	}
</style>

<button on:click={() => selectButton(value)} class:active>
	<slot />
</button>