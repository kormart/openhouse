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
	let c2i = -1;

	let selectedTag = "data";
	let tagSelection = JSON.parse(JSON.stringify(data.tags));

</script>
<div class="main-page">

<div class="topnav">
	<a class="active" href="#home"> </a>
	<a href="#news"> </a>
	<a href="#contact"> </a>
	<a href="#about"> </a>
	<span>{current1}, {c1i}, {current2}, {c2i}</span>
</div>

<div class="jumbo">
	<img src="../rise-csai-logo.png" height="170px" alt="RISE CS&AI"> <br>
	<b>Open House, May 10, 2022</b>
</div>

<div class="grid-container">

	<div class="column1" >
		{#each data.sections as section, index}
				<Hoverable let:hovering={active} >
					<div class="card" class:active="{active || c1i == index}" on:click={() => {current1 = section.title; c1i = index; current2 = 'foo'; c2i = -1;}}>
						<p>
							<b style='font-size: 20px;text-transform: uppercase;'>{section.title} &rarr</b><br>
							<small>{section.text}</small> <br>
							<small><a href="{section.link}">Teams link</a> </small> <br>
						</p>
					</div>
				</Hoverable>
		{/each}
	</div>

	{#if current1 == 'keynotes' }
	<div class="column2">
		{#each data.keynotes as keynote, index}
				<Hoverable let:hovering={active}>
					<div class="card" class:active="{active || c2i == index}" on:click={() => {current2 = keynote.title; c2i = index;}}>
						<p
							><b>{keynote.title} &rarr</b> <br>
							<small>{keynote.text}</small> <br>
							<small><a href="{keynote.link}">Teams link</a> </small>
						</p>
					</div>
				</Hoverable>
		{/each}
	</div>
	{/if}

	{#if current1 == 'presentations' }
	<div class="column2">
		{#each data.presentations as pres, index}
				<Hoverable let:hovering={active}>
					<div class="card" class:active="{active || c2i == index}" on:click={() => {current2 = pres.title; c2i = index;}}>
						<p><b>{pres.title} &rarr</b> <br>
							<small>{pres.presenter}</small> <br>
							<small><a href="{pres.link}">Teams link</a> </small>
						</p>
						</div>
				</Hoverable>
		{/each}
	</div>
	{/if}

	{#if current1 == 'posters' }
	<div class="column2">
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
		</span>
		<!-- <small>Current: {tagSelection}</small> -->
		{#each data.posters as poster, index}
			{#if poster.tags.some(tag => tagSelection.includes(tag)) }
				<Hoverable let:hovering={active}>
					<div class="card" class:active="{active || c2i == index}" on:click={() => {current2 = poster.title; c2i = index;}}>
						<p>
							<b>{poster.title} &rarr</b> <br>
							<small>{poster.contact}</small> <br>
							<small>Tags: {poster.tags}</small> <br>
							<small><a href="{poster.teams}">Teams link</a> </small>
						</p>
					</div>
				</Hoverable>
			{/if}
		{/each}
	</div>
	{/if}

	{#if current2 != 'foo' }
	<div class="column3">
		<div class="card" >
			<p><b>{data[current1][c2i].title}</b> <br>
				{#if data[current1][c2i].contact} 
					<small>{data[current1][c2i].contact}</small> <br>	
				{/if}
				{#if data[current1][c2i].tags} 
					<small>Tags: {data[current1][c2i].tags}</small> <br>
				{/if}
				<small><a href="{data[current1][c2i].teams}">Teams link</a> </small>
			</p>
			<small>{data[current1][c2i].text}</small>	
		</div>
	</div>
	{/if}

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
		background-image: url("../RISE_NEG.png");
		background-repeat: no-repeat;
		background-position-x: center;
		background-size: auto 100%;
	}
	.main-page {
		overflow-y: scroll;
		height: 100%;
		width:100%;
		background-color: #8dc8c7;
	}
	.card {
		padding: 1em;
		margin: 1em 0 1em 0;
		background-color: #eee;
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
		padding: 34px 36px;
		background-color: #333;
		overflow: hidden;
		width:100%;
		font-size: 37px;
		/* background-image: url("../background.jpeg"); */
	}

	/* Add a black background color to the top navigation */
	.topnav {
		background-color: #333;
		overflow: hidden;
		width:100%;
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

	/* Change the color of links on hover */
	.topnav a:hover {
		background-color: #ddd;
		color: black;
	}

	/* Add a color to the active/current link */
	.topnav a.active {
		background-color: #04AA6D;
		color: white;
	}

	footer {
		background-color: #333;
		color: white;
		overflow: hidden;
		text-align: center;
		font-size: 14px;
		/* position:absolute; */
		bottom:0;
		left: 0;
		width:100%;
		height:80px;
		line-height: 80px;
	}
</style>