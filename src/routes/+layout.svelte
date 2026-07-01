<script lang="ts">
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { onNavigate, afterNavigate } from '$app/navigation';
	import { gsap } from 'gsap';
	import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
	import { ScrollTrigger } from 'gsap/ScrollTrigger';
	import Lenis from 'lenis';

	import Navbar from '$lib/components/Navbar.svelte';
	import LoadingIntro from '$lib/components/LoadingIntro.svelte';
	import PageTransition from '$lib/components/PageTransition.svelte';
	import { imagesRaw } from '$lib/data/gallery';
	import { navbarInverted, navbarHidden } from '$lib/stores/navbar';

	import '$lib/styles/reset.css';
	import '$lib/styles/tokens.css';
	import '$lib/styles/base.css';
	import '$lib/styles/utilities.css';

	gsap.registerPlugin(DrawSVGPlugin, ScrollTrigger);

	let { children } = $props();

	const isVolunteerPage = $derived(page.url.pathname.startsWith('/volunteer'));
	const isCategoryDetailPage = $derived(page.url.pathname.startsWith('/category/'));
	const isGalleryPage = $derived(page.url.pathname.startsWith('/gallery'));
	const isHome = $derived(page.url.pathname === '/');

	$effect(() => {
		if (!browser) return;

		document.body.style.setProperty(
			'--page-top-padding',
			isVolunteerPage || isCategoryDetailPage ? '0px' : 'var(--navbar-height)'
		);
	});

	$effect(() => {
		if (!browser) return;

		document.body.style.backgroundColor = '';
		document.documentElement.style.backgroundColor = '';
	});

	// ── Loading intro ───────────────────────────────────────────────────────
	let showIntro = $state(false);
	let introSrc = $state<string | null>(null);

	$effect(() => {
		if (!browser || introSrc || showIntro) return;

		const forceIntroPreview = page.url.searchParams.get('intro') === '1';
		const seen = sessionStorage.getItem('introSeen');

		if (!seen || forceIntroPreview) {
			const preview =
				imagesRaw.find((img) => img.name === 'Rudy Bre') ??
				imagesRaw.find((img) => !!img.name);

			if (preview?.src) {
				introSrc = preview.src;
				showIntro = true;
			}
		}
	});

	// ── Smooth scrolling Lenis — homepage only ──────────────────────────────
	let lenis: Lenis | null = null;

	$effect(() => {
		if (!browser || !isHome) return;

		const l = new Lenis({
			duration: 1.1,
			smoothWheel: true
		});

		lenis = l;
		l.on('scroll', ScrollTrigger.update);

		const tickerFn = (time: number) => l.raf(time * 1000);

		gsap.ticker.add(tickerFn);
		gsap.ticker.lagSmoothing(0);

		return () => {
			gsap.ticker.remove(tickerFn);
			gsap.ticker.lagSmoothing(500, 33);
			l.destroy();
			lenis = null;
		};
	});

	// ── Global navbar hide/show on native vertical scroll ───────────────────
	$effect(() => {
		if (!browser) return;

		// Nella home la gestione resta affidata alla home,
		// perché lì c'è Lenis + ScrollTrigger.
		if (isHome) return;

		let lastY = window.scrollY;
		let ticking = false;

		function updateNavbar() {
			const currentY = window.scrollY;
			const delta = currentY - lastY;

			if (currentY <= 20) {
				navbarHidden.set(false);
			} else if (Math.abs(delta) > 4) {
				navbarHidden.set(delta > 0);
			}

			lastY = currentY;
			ticking = false;
		}

		function onScroll() {
			if (ticking) return;

			ticking = true;
			requestAnimationFrame(updateNavbar);
		}

		function onPointerMove(e: PointerEvent) {
			if (e.pointerType === 'touch') return;

			if (e.clientY <= 80) {
				navbarHidden.set(false);
			}
		}

		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('pointermove', onPointerMove, { passive: true });

		return () => {
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('pointermove', onPointerMove);
		};
	});

	// ── Navigation cleanup ──────────────────────────────────────────────────
	afterNavigate(() => {
		document.documentElement.style.overflow = '';
		document.body.style.overflow = '';
		document.body.style.paddingTop = '';
		navbarHidden.set(false);

		if (lenis) {
			lenis.scrollTo(0, { immediate: true });
		} else {
			window.scrollTo(0, 0);
		}

		ScrollTrigger.refresh();
	});

	// ── Page transition ─────────────────────────────────────────────────────
	function ptEls(): { overlay: HTMLElement; path: SVGPathElement } | null {
		const overlay = document.querySelector<HTMLElement>('#pt-overlay');
		const path = document.querySelector<SVGPathElement>('#pt-path');

		return overlay && path ? { overlay, path } : null;
	}

	$effect(() => {
		const els = ptEls();

		if (els) {
			gsap.set(els.path, {
				drawSVG: '0%',
				strokeWidth: 300
			});
		}
	});

	let flushTransition: (() => void) | null = null;

	const TRANSITION_SECTIONS = new Set(['', 'gallery', 'category', 'about']);

	function navSection(pathname: string): string {
		return pathname.split('/')[1] ?? '';
	}

	onNavigate((navigation) => {
		const fromSection = navSection(navigation.from?.url.pathname ?? '');
		const toSection = navSection(navigation.to?.url.pathname ?? '');

		if (fromSection === toSection) return;
		if (!TRANSITION_SECTIONS.has(fromSection) || !TRANSITION_SECTIONS.has(toSection)) return;

		flushTransition?.();
		flushTransition = null;

		const els = ptEls();
		if (!els) return;

		const { overlay, path } = els;

		gsap.killTweensOf([overlay, path]);

		gsap.set(overlay, {
			opacity: 0
		});

		gsap.set(path, {
			drawSVG: '0%',
			strokeWidth: 300
		});

		return new Promise<void>((resolve) => {
			flushTransition = resolve;

			gsap
				.timeline({
					onComplete() {
						flushTransition = null;
						resolve();

						navigation.complete
							.then(() => {
								const e = ptEls();
								if (!e) return;

								gsap
									.timeline({
										onComplete() {
											gsap.set(e.overlay, {
												opacity: 0
											});

											gsap.set(e.path, {
												drawSVG: '0%',
												strokeWidth: 300
											});
										}
									})
									.to(e.path, {
										drawSVG: '100% 100%',
										duration: 1.8,
										ease: 'power2.inOut'
									})
									.to(
										e.overlay,
										{
											opacity: 0,
											duration: 0.6,
											ease: 'power2.inOut'
										},
										1.4
									);
							})
							.catch(() => {
								const e = ptEls();
								if (!e) return;

								gsap.set(e.overlay, {
									opacity: 0
								});

								gsap.set(e.path, {
									drawSVG: '0%',
									strokeWidth: 300
								});
							});
					}
				})
				.to(overlay, {
					opacity: 1,
					duration: 0.4,
					ease: 'power2.inOut'
				})
				.to(
					path,
					{
						drawSVG: '100%',
						duration: 1.8,
						ease: 'power2.inOut'
					},
					0
				);
		});
	});
</script>

<svelte:head>
	<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
	<link rel="stylesheet" href="https://use.typekit.net/rja4qrb.css" />
</svelte:head>

<Navbar inverted={$navbarInverted} hidden={$navbarHidden} flat={isGalleryPage} pinned />

{#if showIntro && introSrc}
	<LoadingIntro
		src={introSrc}
		on:complete={() => {
			if (page.url.searchParams.get('intro') !== '1') {
				sessionStorage.setItem('introSeen', '1');
			}

			showIntro = false;
		}}
	/>
{/if}

{@render children()}

<PageTransition />

<style>
	:global(body) {
		cursor: auto;
		padding-top: var(--page-top-padding, var(--navbar-height));
	}
</style>