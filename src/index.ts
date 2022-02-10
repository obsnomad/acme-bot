import 'dotenv/config';
import 'reflect-metadata';

import { createConnection } from 'typeorm';
import { startCommandListeners, stopPolling } from './telegram';

(async () => {
  await createConnection();
  startCommandListeners();
})();

process.on('uncaughtException', (e) => {
  console.error(e.message);
  stopPolling();
});

process.once('SIGUSR2', () => {
  stopPolling(() => {
    process.kill(process.pid, 'SIGUSR2');
  });
});
