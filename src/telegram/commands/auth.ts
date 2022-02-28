import { clearState, editStateMessage, sendError, sendMessage, setState, setUser } from '../';
import { Command } from './';
import { User as JiraUser } from '../../jira';
import { User } from '../../db/entity/user';
import { Message } from 'node-telegram-bot-api';

const { JIRA_URL = '' } = process.env;

export const auth: Command = {
  auth: false,
  callback: async ({ chat: { id: chatId } }: Message) => {
    const message = await sendMessage(
      chatId,
      `Введи токен (получить его можно <a href="${JIRA_URL}/secure/ViewProfile.jspa?selectedTab=com.atlassian.pats.pats-plugin:jira-user-personal-access-tokens">здесь</a>)`
    );

    return await setState(chatId, {
      type: 'auth',
      message,
    });
  },
  stateCallback: async ({ chat: { id: chatId, username: userName = '' }, text = '' }: Message) => {
    const token = text.trim();

    if (!token || !token.match(/^[\w\d]{44}$/)) {
      await sendError(chatId, 'Неверный формат токена');
      return;
    }

    const jiraUser = await JiraUser.getCurrent(token);

    if (!jiraUser) {
      await sendError(chatId, 'Не удалось авторизоваться');
      return;
    }

    let user = await User.findOne({ where: { chatId } });

    if (!user) {
      user = new User();
      user.chatId = chatId;
      user.chatUserName = userName;
    }
    user.name = jiraUser.name;
    user.displayName = jiraUser.displayName;
    user.email = jiraUser.emailAddress;
    user.token = token;

    await user.save();

    await editStateMessage(
      chatId,
      `${user.displayName}, твои данные сохранены. Можно пользоваться всеми командами :)`
    );

    await setUser(chatId, user);

    return clearState(chatId);
  },
};
