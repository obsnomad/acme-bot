import { Bot } from '../';
import { Command } from './';
import { getIssuesKeyboard } from '../states';

export const plan: Command = {
  regexp: /\/plan/,
  auth: true,
  callback: async (msg, user) => {
    const chatId = msg.chat.id;

    await Bot.sendMessage(
      chatId,
      'Выбери задачу из списка открытых, введи номер задачи или название встречи',
      { reply_markup: { keyboard: await getIssuesKeyboard(user) } }
    );

    Bot.setState(chatId, {
      type: 'plan',
    });
  },
};
