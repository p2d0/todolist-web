import { existsSync, readFileSync } from "fs";
import http from "http";
import { dirname, join, posix } from "path";
import { fileURLToPath } from "url";
import { initWebSocket } from "./ws-server.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const wwwDir = join(__dirname, "www");
const basePath = process.env.BASE_PATH || "/pomotask";
const port = process.env.PORT || 3000;
const host = process.env.HOST || "0.0.0.0";

const mimeTypes = {
	".html": "text/html",
	".js": "application/javascript",
	".css": "text/css",
	".json": "application/json",
	".png": "image/png",
	".jpg": "image/jpeg",
	".gif": "image/gif",
	".svg": "image/svg+xml",
	".ico": "image/x-icon",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".ttf": "font/ttf",
	".webp": "image/webp",
	".svg": "image/svg+xml",
};

const server = http.createServer((req, res) => {
	// API/websocket paths pass through (handled elsewhere or 404)
	if (req.url.startsWith("/api/") || req.url.startsWith("/ws/")) {
		return;
	}

	let url = new URL(req.url, `http://${req.headers.host}`).pathname;
	if (url.startsWith(basePath)) {
		url = url.slice(basePath.length) || "/";
	}

	// Serve actual file if it exists
	const filePath = join(wwwDir, url);
	if (existsSync(filePath)) {
		const ext = posix.extname(filePath);
		const contentType = mimeTypes[ext] || "application/octet-stream";
		res.writeHead(200, { "Content-Type": contentType });
		res.end(readFileSync(filePath));
		return;
	}

	// SPA fallback
	const indexPath = join(wwwDir, "index.html");
	if (existsSync(indexPath)) {
		res.writeHead(200, { "Content-Type": "text/html" });
		res.end(readFileSync(indexPath));
		return;
	}

	res.writeHead(404);
	res.end("Not found");
});

initWebSocket(server, basePath);

server.listen(port, host, () => {
	console.log(`Server listening on ${host}:${port} (base: ${basePath})`);
});
