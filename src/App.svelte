<script>
	import Hoverable from './Hoverable.svelte';
	import Button from './Button.svelte';
	import ButtonGroup from './ButtonGroup.svelte';
	import data from './data';
	import posters from './posters';

	data.posters = posters.posters;

	let current1 = 'keynotes';
	let current2 = 'foo';
	let c1i = 0;
	let c2i = 0;

	// let tagSelection = JSON.parse(JSON.stringify(data.tags));
	let tagSelection = [];

	function shuffle(array) {
		let currentIndex = array.length,  randomIndex;

		// While there remain elements to shuffle.
		while (currentIndex != 0) {

			// Pick a remaining element.
			randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex--;

			// And swap it with the current element.
			[array[currentIndex], array[randomIndex]] = [
			array[randomIndex], array[currentIndex]];
		}

		return array;
	}
	data.posters.map((poster,i) => data.posters[i]["index"]=i);
	let randIndex = shuffle([...Array(data.posters.length).keys()]);
	let randPosters = data.posters.map((poster,i) => data.posters[randIndex[i]]);
	data.posters = randPosters;
	
	data.posters.forEach(poster => {
		poster['search'] = poster.title + ' ' + poster.text + ' ' + poster.presenter;
	});

	let searchTerm = "";
	$: taggedList = [...Array(data.posters.length).keys()].filter(i => tagSelection.every(tag => data.posters[i].tags.includes(tag)));
	$: filteredList = [...Array(data.posters.length).keys()].filter(i => data.posters[i].search.toLowerCase().indexOf(searchTerm) !== -1);
	
</script>
<head>
	<link href='https://fonts.googleapis.com/css?family=Lato' rel='stylesheet' type='text/css'>
</head>

<div class="main-page">

<div class="topnav">
	<img style="width: 75px; height=96px;" width="75" height="96" src="RISE_BLACK.png" alt="RISE">
	<!-- <a class="active" href="#home"> </a>
	<a href="#news"> </a>
	<a href="#contact"> </a>
	<a href="#about"> </a>
	<span>{current1}, {c1i}, {current2}, {c2i}</span> -->
</div>

<div class="jumbo">
	<strong style="font-size: 40px; line-height: 50px;">RISE Computer Science & AI open house<br></strong>
	<strong style="font-size: 24px;">10/05/2022 08:30 - 13:00</strong>
</div>

<div class="grid-container">

	<div class="column1" >
		<!-- {randIndex.length} {data.posters.length} {randPosters.length} -->
		Agenda sections:
		{#each data.sections as section, index}
				<Hoverable let:hovering={active} >
					<div class="card" class:active="{active || c1i == index}" on:click={() => {current1 = section.title; c1i = index; current2 = 'foo'; c2i = 0;}}>
						<p>
							<b style='font-size: 20px;text-transform: uppercase;'>{section.title} &rarr</b><br>
							<small>{section.text}</small> <br>
						{#if index == 2}
						<small>Poster rooms, separate for each poster </small> <br>
						{:else}
						<small><a target=”_blank” href="{section.teams}">Join the keynote/presentation session</a> </small> <br>
						{/if}
						</p>
					</div>
				</Hoverable>
		{/each}
	</div>

	{#if current1 == 'keynotes' }
	<div class="column2">
		For chosen section, click item for details:
		{#each data.keynotes as keynote, index}
				<Hoverable let:hovering={active}>
					<div class="card" class:active="{active || c2i == index}" on:click={() => {current2 = keynote.title; c2i = index;}}>
						<p
							><b>{keynote.title} &rarr</b> <br>
							<small>{keynote.byline}</small> <br>
							<small><a target=”_blank” href="{keynote.teams}">Join the keynote/presentation session</a> </small>
						</p>
					</div>
				</Hoverable>
		{/each}
	</div>
	{/if}

	{#if current1 == 'presentations' }
	<div class="column2">
		For chosen section, click item for details:
		{#each data.presentations as pres, index}
				<Hoverable let:hovering={active}>
					<div class="card" class:active="{active || c2i == index}" on:click={() => {current2 = pres.title; c2i = index;}}>
						<p><b>{pres.title} &rarr</b> <br>
							<small>{pres.byline}</small> <br>
							<small>{pres.presenter}</small> <br>
							<small><a target=”_blank” href="{pres.teams}">Join the keynote/presentation session</a> </small>
						</p>
						</div>
				</Hoverable>
		{/each}
	</div>
	{/if}

	{#if current1 == 'posters' }
	<div class="column2">
		For chosen section, click item for details:
		<span class="tags">
			<small><b>Tag Selector: </b></small>
			<ButtonGroup multiple bind:value={tagSelection}>
			{#each data.tags as tag, index}
				<Button value={tag}>
					{tag}
				</Button>
							<!-- <button let:active class:active on:click={() => {tagSelection.push(tag); let active=true;}} ><small>{tag}</small></button>				 -->
			{/each}
			</ButtonGroup>
			<small><b>Freetext search: </b></small>
			<input bind:value={searchTerm} />
		</span>
		<small>Current selection: {(taggedList.filter(i=>filteredList.includes(i))).length} posters (scroll to see all!)</small>
		{#each data.posters as poster, index}
			<!-- {#if poster.tags.every(tag => tagSelection.includes(tag)) } -->
			{#if (taggedList.indexOf(index)!== -1) && (filteredList.indexOf(index)!== -1) }
				<Hoverable let:hovering={active}>
					<div class="card" class:active="{active || c2i == index}" on:click={() => {current2 = poster.title; c2i = index;}}>
						<p>
							<b>{poster.index}. {poster.title} &rarr</b> <br>
							<small>{poster.presenter}</small> <br>
							<small>Tags: {poster.tags}</small> <br>
							<small><a style="background-color:#ffe500; color:black;" target=”_blank” href="{poster.teams}">Join poster room and engage with researchers</a> </small>
						</p>
					</div>
				</Hoverable>
			{/if}
		{/each}
	</div>
	{/if}

	<div class="column3">
		Details for chosen item:
		<!-- {#if current2 != 'foo' } -->
		<div class="card" >
			<p><b>{#if c1i==2} {data[current1][c2i].index}.{/if} {data[current1][c2i].title}</b> <br>
				{#if data[current1][c2i].byline} 
					<small>{data[current1][c2i].byline}</small> <br>	
				{/if}
				<small>{data[current1][c2i].presenter}</small> <br>	
				{#if c1i == 0} 
					<small><a target=”_blank” href="{data[current1][c2i].link}">{data[current1][c2i].link}</a></small> <br>
				{/if}
				{#if data[current1][c2i].tags} 
					<small>Tags: {data[current1][c2i].tags}</small> <br>
				{/if}
				{#if c1i == 2}
				<small><a style="background-color:#ffe500; color:black;" target=”_blank” href="{data[current1][c2i].teams}">Join poster room and engage with researchers</a> </small>
				{:else}
				<small><a target=”_blank” href="{data[current1][c2i].teams}">Join the keynote/presentation session</a> </small>
				{/if}
			</p>
			<small>{data[current1][c2i].text}</small>	
		</div>
		<!-- {/if} -->
	</div>

</div>
<footer class="text-center bg-dark text-muted">
	<!-- <div class="mt-2 mb-2">
		{#each footer_links as link}
		<Button text rounded>{link}</Button>
		{/each}
	</div> -->
	© 2022 -
	<b>RISE, Research Institutes of Sweden AB</b>
</footer>	

</div>

<style>
	.main-page {
		font-family: 'Lato', sans-serif;
		min-width: 300px;
		max-width: 3000px;
		/* min-height: 600px; */
		height: 700px;
		/* overflow-x: scroll; */
		/* height: 100%;
		width: 100%; */
	}
	.column1 {
		display: flex;
		flex-direction: column;

		/* gap: 30px; */
		/* background-color: #fff; */
		height: 100%;
	}
	.column2 {
		display: flex;
		flex-direction: column;
		/* gap: 30px; */
		/* background-color: #fff; */
		overflow-y: scroll;
		height: 100%;
	}
	.column3 {
		display: flex;
		flex-direction: column;
		/* gap: 30px; */
		/* background-color: #fff; */
		overflow-y: scroll;
		height: 100%;
	}
 	.grid-container {
		display: block;
	}
	@media (min-width: 700px) {
	.grid-container {
		display: grid;
		/* flex-direction: column; */
		grid-template-columns: repeat(3, 30%);
		gap: 30px;
		margin: 30px; 
		/* text-align: center; */
		/* grid-auto-rows: 11% ; */
		/* grid-template-rows: unset; */
		/* overflow: scroll; */
		/* background-color: #fff; */
		height: 100%;
	}
}
	.card {
		padding: 1em;
		margin: 1em 0 1em 0;
		background-color: #ebf5f0;
		/* justify-content: space-around; */
		/* border: 1px solid; */
	    border-radius: 10px;
		box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2);
		transition: 0.3s;

		/* --tw-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
      0 10px 10px -5px rgba(0, 0, 0, 0.04);
	    box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000),
      var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow); */

	}
	.active {
		background-color: #009ca6;
		color: white;
	}
	.tags {
		padding: 1em;
		margin: 1em 0 1em 0;
	    border-radius: 10px;
		box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2);
		background-color: #eee;
		float: left;
	}
	.jumbo {
		text-align: center;
		color: #f2f2f2;
		/* height: 300px; */
		margin-left: -12px;
		margin-right: -12px;
		padding: 150px;
		/* background-color: #333; */
		/* overflow: hidden; */
		/* width: 100%; */
		font-size: 45px;
		background-image: url("../back1.png");
		background-repeat: no-repeat;
		background-size: cover;
	}

	/* Add a black background color to the top navigation */
	.topnav {
		/* background-color: #333; */
		/* height: 170px; */
		min-width: 300px;
		max-width: 880px;
		/* overflow: hidden; */
		/* width:100%; */
		background-size: auto;
		text-align: left;
		padding: 30px;
		margin: auto;
	}

	/* Style the links inside the navigation bar */
	.topnav a {
		float: left;
		color: #f2f2f2;
		text-align: center;
		padding: 14px 16px;
		text-decoration: none;
		font-size: 17px;
	}

	/* a:link {
		background-color: #ddd;
		color: black;
	}
	.topnav a.active {
		background-color: #04AA6D;
		color: white;
	} */

	footer {
		background-color: #333;
		color: white;
		overflow: hidden;
		text-align: center;
		font-size: 14px;
		/* position:absolute; */
		/* bottom:0;
		left: 0; */
		margin-left: -12px;
		margin-right: -12px;
		width:100%;
		height:80px;
		line-height: 80px;
	}
</style>