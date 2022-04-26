<script>
	let hovering;
	let selected;

	function enter() {
		hovering = true;
	}

	function leave() {
		hovering = false || selected;
	}

</script>

<div on:mouseenter={enter} on:mouseleave={leave}>
	<slot hovering={hovering}></slot>
</div>