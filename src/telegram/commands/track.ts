import { sendMessage, setState } from '../';
import { Command } from './';
import { trackKeyboard } from '../states';

export const track: Command = {
  regexp: /\/track/,
  auth: true,
  callback: async (msg, user) => {
    const chatId = msg.chat.id;

    await sendMessage(
      chatId,
      'Выбери задачу из списка открытых или введи номер задачи',
      await trackKeyboard(user)
    );

    await setState(chatId, {
      type: 'track',
    });
  },
};
