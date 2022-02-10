import { sendMessage } from '../';
import { Command } from './';
import { Issue } from '../../jira';

export const assigned: Command = {
  regexp: /\/assigned/,
  auth: true,
  callback: async (msg, user) => {
    const chatId = msg.chat.id;

    const issues = (await Issue.getAssigned(user.token)).map(String);

    const message = issues.map(String).join('\n');

    await sendMessage(chatId, message);
  },
};
