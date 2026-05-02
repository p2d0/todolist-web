import http from 'http';
import { handler } from './build/handler.js';
import { initWebSocket } from './ws-server.js';

const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';
const basePath = process.env.BASE_PATH || '/pomotask';

const server = http.createServer((req, res) => {
  handler(req, res);
});

initWebSocket(server, basePath);

server.listen(port, host, () => {
  console.log(`Server listening on ${host}:${port} (base: ${basePath})`);
});
