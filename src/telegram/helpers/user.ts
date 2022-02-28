import { ChatId, Message } from 'node-telegram-bot-api';
import { AvailableCommand } from '../commands';
import { sendMessage } from '../';
import { User } from '../../db/entity/user';

interface Params {
  [key: string]: any;
}

export type State = {
  type?: AvailableCommand;
  message?: Message;
  error?: string;
  params?: Params;
};

interface UserParams {
  user: User;
  state?: State;
  needToken?: boolean;
}

const users: Map<ChatId, UserParams> = new Map();

export const getState = async (chatId: ChatId) => {
  const user = await findUser(chatId);
  return user?.state || {};
};

export const setState = async (chatId: ChatId, state: State) => {
  const user = await findUser(chatId);
  if (user) {
    user.state = state;
  }
};

export const clearState = async (chatId: ChatId, removeStateMessage: boolean = false) => {
  const user = await findUser(chatId);
  if (user) {
    if (removeStateMessage && user.state?.message) {
      // await deleteMessage(user.state.message);
    }
    delete user.state;
  }
};

export const findUser = async (chatId: ChatId) => {
  if (!users.has(chatId)) {
    const user = await User.findOne({ where: { chatId } });
    if (user) {
      setUser(chatId, user);
    }
  }
  return users.get(chatId);
};

export const setUser = (chatId: ChatId, user: User) => {
  users.set(chatId, { user });
};

export const checkUser = async (chatId: ChatId): Promise<User | void> => {
  const user = await findUser(chatId);

  if (user) {
    return user.user;
  }

  await sendMessage(chatId, 'Чтобы использовать эту команду, авторизуйся.');
};
