import { State } from './';
import { Bot } from '../bot';
import { User as JiraUser } from '../../jira';
import { User } from '../../db/entity/user';

export const requestToken: State = {
  auth: false,
  callback: async (msg) => {
    const { id: chatId, username: chatUserName = '' } = msg.chat;
    const token = msg.text?.trim();

    if (!token || !token.match(/^[\w\d]{44}$/)) {
      await Bot.sendMessage(chatId, 'Неверный формат токена');
      return false;
    }

    const jiraUser = await JiraUser.getCurrent(token);

    if (!jiraUser) {
      await Bot.sendMessage(chatId, 'Не удалось авторизоваться. Попробуй ещё раз.');
      return false;
    }

    let user = await User.findOne({ where: { chatId } });

    if (!user) {
      user = new User();
      user.chatId = chatId;
      user.chatUserName = chatUserName;
    }
    user.name = jiraUser.name;
    user.displayName = jiraUser.displayName;
    user.email = jiraUser.emailAddress;
    user.token = token;

    await user.save();

    await Bot.sendMessage(
      chatId,
      `${user.displayName}, твои данные сохранены. Можно пользоваться всеми командами :)`
    );
    await Bot.setUser(chatId, user);

    return true;
  },
};
