<script>
	import "../lib/styles/tokens.css";
	import { imgNavbar, heroSamples } from "../lib/design/assets";
</script>

<div class="site">
	<header class="navbar">
		<div class="navbar-inner">
			<a class="logo" href="/" aria-label="Fuori campo home">
				<img src={imgNavbar} alt="" />
			</a>

			<nav class="nav-links" aria-label="Main navigation">
				<a href="/galleria">GALLERIA</a>
				<a href="/categorie">CATEGORIE</a>
				<a href="/about">ABOUT</a>
			</nav>
		</div>
	</header>

	<main>
		<section class="hero-outer">
			<div class="hero-inner">
				<div class="title-wrap">
					<h1 class="title-large title-line--filled">FUORI</h1>
					<h1 class="title-large title-line--outline">CAMPO</h1>
				</div>
			</div>
		</section>

		<section>
					<p class="lead-paragraph">Abbiamo chiesto ai volontari di raccontarsi. Le loro testimonianze sono raccolte in questo <strong style="color:var(--color-content-title)">archivio</strong>.</p>
		</section>

		<section style="text-align:center;">
			<h2 class="section-large-question">MA CHI SONO DAVVERO I VOLONTARI?</h2>
			<h2 class="section-large-question">PERCHÈ HANNO DECISO DI CANDIDARSI?</h2>
			<h2 class="section-large-question">COSA FACEVANO CONCRETAMENTE?</h2>
			<h2 class="section-large-question">NE È VALSA LA PENA? LO RIFAREBBERO?</h2>
		</section>

		<section class="gallery">
			{#each heroSamples as src}
				<img src={src} alt="gallery sample" />
			{/each}
		</section>
	</main>
</div>
