import http from 'http';
import app from '../apps/api/src/app';
import { initSocket } from '../apps/api/src/socket';

const server = http.createServer(app);
initSocket(server);

export default function handler(req: any, res: any) {
  server.emit('request', req, res);
}
