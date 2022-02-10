import TelegramBot from 'node-telegram-bot-api';
import { AvailableState } from '../states';
import { sendMessage } from '../';
import { User } from '../../db/entity/user';

interface UserParams {
  user: User;
  state?: AvailableState;
}

const users: Map<TelegramBot.ChatId, UserParams> = new Map();

export const getState = async (chatId: TelegramBot.ChatId) => {
  const user = await findUser(chatId);
  return user?.state;
};

export const setState = async (chatId: TelegramBot.ChatId, state: AvailableState) => {
  const user = await findUser(chatId);
  if (user) {
    user.state = state;
  }
};

export const clearState = async (chatId: TelegramBot.ChatId) => {
  const user = await findUser(chatId);
  if (user) {
    delete user.state;
  }
};

export const findUser = async (chatId: TelegramBot.ChatId) => {
  if (!users.has(chatId)) {
    const user = await User.findOne({ where: { chatId } });
    if (user) {
      setUser(chatId, user);
    }
  }
  return users.get(chatId);
};

export const setUser = (chatId: TelegramBot.ChatId, user: User) => {
  users.set(chatId, { user });
};

export const checkUser = async (chatId: TelegramBot.ChatId): Promise<User | void> => {
  const user = await findUser(chatId);

  if (user) {
    return user.user;
  }

  await sendMessage(chatId, 'Чтобы использовать эту команду, зарегистрируйся командой /register.');
};
