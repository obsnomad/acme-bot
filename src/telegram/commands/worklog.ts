import { Bot } from '../';
import { Command } from './';
import { dateLabels } from '../states/worklog';

export const worklog: Command = {
  regexp: /\/worklog/,
  auth: false,
  callback: async (msg, _) => {
    Bot.setState('worklog');

    await Bot.sendMessage(msg.chat.id, 'Выбери день или введи дату в формате DD.MM.YYYY', {
      reply_markup: {
        keyboard: [[{ text: dateLabels.prev }, { text: dateLabels.today }]],
      },
    });
  },
};
