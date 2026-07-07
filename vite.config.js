import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	// esbuild's default CSS minifier drops the unprefixed `backdrop-filter`
	// declaration whenever it sits next to an identical `-webkit-backdrop-filter`
	// one (it wrongly treats them as duplicates) — that's what was killing the
	// carousel blur only in production builds. lightningcss minifies without
	// that bug and keeps both declarations intact.
	build: {
		cssMinify: 'lightningcss'
	}
});
