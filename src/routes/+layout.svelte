<script lang="ts">
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { beforeNavigate, onNavigate, afterNavigate } from '$app/navigation';
	import { gsap } from 'gsap';
	import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
	import { ScrollTrigger } from 'gsap/ScrollTrigger';
	import Lenis from 'lenis';
	import { initWindowSmoothScroll } from '$lib/actions/smoothScroll';

	import Navbar from '$lib/components/Navbar.svelte';
	import PageTransition from '$lib/components/PageTransition.svelte';
	import PhotoFlightOverlay from '$lib/components/PhotoFlightOverlay.svelte';
	import { navbarInverted, navbarHidden } from '$lib/stores/navbar';

	import '$lib/styles/reset.css';
	import '$lib/styles/tokens.css';
	import '$lib/styles/base.css';
	import '$lib/styles/utilities.css';

	gsap.registerPlugin(DrawSVGPlugin, ScrollTrigger);

	if (browser) history.scrollRestoration = 'manual';

	let { children } = $props();

	const isVolunteerPage = $derived(page.url.pathname.startsWith('/volunteer'));

	const isVolunteerZoom = $derived(
		page.url.pathname.startsWith('/volunteer/') && !page.url.pathname.endsWith('/profile')
	);

	const isCategoryDetailPage = $derived(page.url.pathname.startsWith('/category/'));
	const isGalleryPage = $derived(page.url.pathname.startsWith('/gallery'));
	const isHome = $derived(page.url.pathname === '/');

	/*
		Queste sono le route che possono gestire intenzionalmente una pagina fixed.
		Tutte le altre devono essere scrollabili e quindi non devono ereditare
		overflow:hidden da pagine precedenti.
	*/
	function routeKeepsWindowLocked(pathname: string) {
		const isAboutMobile =
			pathname === '/about' &&
			typeof window !== 'undefined' &&
			window.matchMedia('(max-width: 599px)').matches;

		return (
			pathname === '/gallery' ||
			pathname === '/category' ||
			pathname.startsWith('/category/') ||
			isAboutMobile
		);
	}

	function clearGlobalScrollLock() {
		if (!browser) return;

		const root = document.documentElement;
		const body = document.body;

		root.style.removeProperty('overflow');
		root.style.removeProperty('overflow-y');
		root.style.removeProperty('height');
		root.style.removeProperty('position');

		body.style.removeProperty('overflow');
		body.style.removeProperty('overflow-y');
		body.style.removeProperty('height');
		body.style.removeProperty('position');
		body.style.removeProperty('padding-top');

		root.classList.remove('lenis-stopped');
		body.classList.remove('lenis-stopped');
	}

	function restoreScrollableRoute(pathname: string) {
		if (!browser) return;
		if (routeKeepsWindowLocked(pathname)) return;

		clearGlobalScrollLock();

		if (lenis) {
			lenis.start();
			lenis.resize();
		}

		ScrollTrigger.refresh();
	}

	function scheduleScrollableRouteRestore(pathname: string) {
		if (!browser) return;

		restoreScrollableRoute(pathname);

		requestAnimationFrame(() => {
			restoreScrollableRoute(pathname);

			requestAnimationFrame(() => {
				restoreScrollableRoute(pathname);
			});
		});

		window.setTimeout(() => {
			restoreScrollableRoute(pathname);
		}, 80);

		window.setTimeout(() => {
			restoreScrollableRoute(pathname);
		}, 240);
	}

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

	let lenis: Lenis | null = null;

	$effect(() => {
		if (!browser || isGalleryPage) return;

		clearGlobalScrollLock();

		const scroll = initWindowSmoothScroll();
		lenis = scroll.lenis;

		if (lenis) {
			lenis.start();
			lenis.resize();
		}

		return () => {
			scroll.destroy();
			lenis = null;
			clearGlobalScrollLock();
		};
	});

	$effect(() => {
		if (!browser) return;

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

	beforeNavigate((navigation) => {
		const toPathname = navigation.to?.url.pathname ?? '';

		if (!routeKeepsWindowLocked(toPathname)) {
			clearGlobalScrollLock();
		}
	});

	afterNavigate((navigation) => {
		const pathname = navigation.to?.url.pathname ?? page.url.pathname;

		navbarHidden.set(false);
		navbarInverted.set(false);

		if (lenis) {
			lenis.start();
			lenis.resize();
			lenis.scrollTo(0, { immediate: true });
		} else {
			window.scrollTo(0, 0);
		}

		scheduleScrollableRouteRestore(pathname);
	});

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

		// Mobile crops the landscape transition path (viewBox 1316×664, slice)
		// into a short on-screen sweep, so the same timing reads as rushed. Run
		// the mobile transition noticeably slower so the draw stays smooth and
		// readable; desktop keeps its original, well-tuned timing.
		const ptMobile =
			typeof window !== 'undefined' && window.matchMedia('(max-width: 700px)').matches;
		const PT = ptMobile
			? { overlayIn: 0.55, cover: 2.6, reveal: 2.6, overlayOut: 0.8, overlayOutAt: 2.1 }
			: { overlayIn: 0.4, cover: 1.8, reveal: 1.8, overlayOut: 0.6, overlayOutAt: 1.4 };

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
										duration: PT.reveal,
										ease: 'power2.inOut'
									})
									.to(
										e.overlay,
										{
											opacity: 0,
											duration: PT.overlayOut,
											ease: 'power2.inOut'
										},
										PT.overlayOutAt
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
					duration: PT.overlayIn,
					ease: 'power2.inOut'
				})
				.to(
					path,
					{
						drawSVG: '100%',
						duration: PT.cover,
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

{#if !isVolunteerZoom}
	<Navbar inverted={$navbarInverted} hidden={$navbarHidden} flat={isGalleryPage} pinned />
{/if}

{@render children()}

<PageTransition />
<PhotoFlightOverlay />

<style>
	:global(body) {
		cursor: auto;
		padding-top: var(--page-top-padding, var(--navbar-height));
	}
</style>