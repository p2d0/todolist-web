const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "pomotask/_app",
	assets: new Set(["icons/icon-192.png","icons/icon-512.png","manifest.json","sw/service-worker.js"]),
	mimeTypes: {".png":"image/png",".json":"application/json",".js":"text/javascript"},
	_: {
		client: {start:"_app/immutable/entry/start.BRTVAzeV.js",app:"_app/immutable/entry/app.CHe-D7n_.js",imports:["_app/immutable/entry/start.BRTVAzeV.js","_app/immutable/chunks/CuXDau2h.js","_app/immutable/chunks/COipS8HM.js","_app/immutable/chunks/DUlXpj5z.js","_app/immutable/entry/app.CHe-D7n_.js","_app/immutable/chunks/COipS8HM.js","_app/immutable/chunks/C6jfGU_t.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-BO-Ggxdj.js')),
			__memo(() => import('./chunks/1-CkMqXXb4.js')),
			__memo(() => import('./chunks/2-BEUMSW8-.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/api/habits",
				pattern: /^\/api\/habits\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Bb7xHfFz.js'))
			},
			{
				id: "/api/habits/[id]",
				pattern: /^\/api\/habits\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DIQrSaYw.js'))
			},
			{
				id: "/api/sessions",
				pattern: /^\/api\/sessions\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BArc5Cai.js'))
			},
			{
				id: "/api/stats",
				pattern: /^\/api\/stats\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BZSufNs9.js'))
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

const prerendered = new Set([]);

export { manifest, prerendered };
//# sourceMappingURL=manifest.js.map
