import { sendMessage } from '../';
import { Command } from './';
import { Issue } from '../../jira';

export const assigned: Command = {
  auth: true,
  callback: async ({ chat: { id: chatId } }, user) => {
    const issues = (await Issue.getAssigned(user.token)).map(String);

    const message = issues.map(String).join('\n');

    await sendMessage(chatId, message);
  },
};
