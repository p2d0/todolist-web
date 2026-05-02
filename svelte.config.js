import adapter from "@sveltejs/adapter-node";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			pages: "build",
			assets: "build",
			fallback: "index.html",
			precompress: false,
		}),
		paths: {
			base: "/pomotask",
		},
		alias: {
			$lib: "src/lib",
			$server: "src/lib/server",
		},
	},
};

export default config;
