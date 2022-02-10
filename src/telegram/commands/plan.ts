import { sendMessage, setState } from '../';
import { Command } from './';
import { planKeyboard } from '../states';

export const plan: Command = {
  regexp: /\/plan/,
  auth: true,
  callback: async (msg, user) => {
    const chatId = msg.chat.id;

    await sendMessage(
      chatId,
      'Выбери задачу из списка открытых, введи номер задачи или название события',
      await planKeyboard(user)
    );

    await setState(chatId, {
      type: 'plan',
    });
  },
};
