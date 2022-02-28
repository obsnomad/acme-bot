import { Message } from 'node-telegram-bot-api';
import { findUser, sendMessage } from '../';
import { Command } from './';

export const start: Command = {
  auth: false,
  callback: async ({ chat: { id: chatId } }: Message) => {
    const user = await findUser(chatId);

    if (user) {
      await sendMessage(
        chatId,
        'И снова привет! Если давно не заходил, рекомендую сразу обновить авторизацию.'
      );
      return;
    }

    await sendMessage(chatId, 'Привет! Похоже, мы незнакомы. Сначала нужно авторизоваться.');
  },
};
