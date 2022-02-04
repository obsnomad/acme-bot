import { Bot } from '../';
import { Command } from './';

const { JIRA_URL = '' } = process.env;

export const register: Command = {
  regexp: /\/register/,
  auth: false,
  callback: async (msg) => {
    const chatId = msg.chat.id;

    await Bot.sendMessage(
      msg.chat.id,
      `Введи токен (получить его можно <a href="${JIRA_URL}/secure/ViewProfile.jspa?selectedTab=com.atlassian.pats.pats-plugin:jira-user-personal-access-tokens">здесь</a>)`
    );

    Bot.setState(chatId, {
      type: 'requestToken',
    });
  },
};
