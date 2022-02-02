import { Bot } from '../';
import { Command } from './';
import { Issue } from '../../jira';

export const issue: Command = {
  regexp: /\/issue (.+)/,
  auth: true,
  callback: async (msg, match, user) => {
    const chatId = msg.chat.id;
    const issueKey = match?.[1] ?? '';

    if (issueKey) {
      const issue = await Issue.getOne(issueKey, user.token);
      const message = issue ? String(issue) : 'Задача не найдена';

      await Bot.sendMessage(chatId, message);
    }
  },
};
