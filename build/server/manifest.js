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
		client: {start:"_app/immutable/entry/start.Ct651n-l.js",app:"_app/immutable/entry/app.-JIcv6mZ.js",imports:["_app/immutable/entry/start.Ct651n-l.js","_app/immutable/chunks/DKwDV4rS.js","_app/immutable/chunks/_y4FIVLh.js","_app/immutable/chunks/DWKU23-s.js","_app/immutable/entry/app.-JIcv6mZ.js","_app/immutable/chunks/_y4FIVLh.js","_app/immutable/chunks/WnC5OhIG.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-DheqlSGB.js')),
			__memo(() => import('./chunks/1-CBiLdQqD.js')),
			__memo(() => import('./chunks/2-BXL-3lkF.js'))
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
				endpoint: __memo(() => import('./chunks/_server.ts-CNQmSkti.js'))
			},
			{
				id: "/api/habits/[id]",
				pattern: /^\/api\/habits\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DvYg2wji.js'))
			},
			{
				id: "/api/sessions",
				pattern: /^\/api\/sessions\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-30lAd7zY.js'))
			},
			{
				id: "/api/stats",
				pattern: /^\/api\/stats\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CMjuGxbM.js'))
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
