const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.Bmd0VeU1.js",app:"_app/immutable/entry/app.CD6f5FIg.js",imports:["_app/immutable/entry/start.Bmd0VeU1.js","_app/immutable/chunks/Cz8ie05D.js","_app/immutable/chunks/B4XEoMoH.js","_app/immutable/chunks/DhJnLVyG.js","_app/immutable/entry/app.CD6f5FIg.js","_app/immutable/chunks/B4XEoMoH.js","_app/immutable/chunks/B3KEWirv.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-DMoVmWW0.js')),
			__memo(() => import('./chunks/1-C9lEneBo.js')),
			__memo(() => import('./chunks/2-BJmZzWIl.js'))
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
				endpoint: __memo(() => import('./chunks/_server.ts-BFfTRyAd.js'))
			},
			{
				id: "/api/habits/[id]",
				pattern: /^\/api\/habits\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-ODkZ1u8w.js'))
			},
			{
				id: "/api/sessions",
				pattern: /^\/api\/sessions\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-B_wlq9Xn.js'))
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
