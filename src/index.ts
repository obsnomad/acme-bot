import 'dotenv/config';
import 'reflect-metadata';

import { createConnection } from 'typeorm';
import { Bot } from './telegram';

(async () => {
  await createConnection();
  Bot.startCommandListeners();
})();

process.on('uncaughtException', (e) => {
  console.error(e.message);
  Bot.stopPolling();
});

process.once('SIGUSR2', () => {
  Bot.stopPolling(() => {
    process.kill(process.pid, 'SIGUSR2');
  });
});
