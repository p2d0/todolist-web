import { writeFileSync, readFileSync, rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = join(root, 'svelte.config.js');
const wwwDir = join(root, 'www');

// 1. Backup node config
const origConfig = readFileSync(configPath, 'utf-8');

// 2. Write static config
writeFileSync(configPath, `import adapter from "@sveltejs/adapter-static";

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
`);

try {
	// 3. Clean www
	if (existsSync(wwwDir)) rmSync(wwwDir, { recursive: true });
	
	// 4. Build with static adapter
	execSync('npx svelte-kit sync && npx vite build', { 
		cwd: root, stdio: 'inherit' 
	});
	
	console.log('\nwww/ built for Capacitor');
} finally {
	// 5. Restore node config
	writeFileSync(configPath, origConfig);
}