import adapter from "@sveltejs/adapter-static";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			pages: "www",
			assets: "www",
			fallback: "index.html",
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
