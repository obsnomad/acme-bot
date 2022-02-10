import TelegramBot from 'node-telegram-bot-api';
import commands from './commands';
import states, { AvailableState } from './states';
import { User } from '../db/entity/user';
import { removeKeyboard } from './helpers';

const { TELEGRAM_TOKEN = '' } = process.env;

interface UserParams {
  user: User;
  state?: AvailableState;
}

const bot: TelegramBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
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

export const sendMessage = async (
  chatId: TelegramBot.ChatId,
  message: string,
  options: TelegramBot.SendMessageOptions = {}
): Promise<TelegramBot.Message> => {
  return await bot.sendMessage(chatId, message, {
    parse_mode: 'HTML',
    ...options,
  });
};

export const stopPolling = (callback?: () => void) => {
  bot.stopPolling().then(callback);
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

export const startCommandListeners = () => {
  commands.forEach((command) => {
    bot.onText(command.regexp, async (msg, match) => {
      const chatId = msg.chat.id;

      await clearState(chatId);

      if (command.auth) {
        const user = await checkUser(chatId);
        if (!user) {
          return;
        }
        command.callback(msg, user, match);
      } else {
        command.callback(msg, match);
      }
    });
  });
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    if (msg.text === '/exit') {
      await sendMessage(chatId, 'Хорошо, давай поговорим о чём-то другом', removeKeyboard());
      await clearState(chatId);
      return;
    }

    const state = await getState(chatId);

    if (state) {
      const stateObj = states[state.type];
      let finished;

      if (stateObj.auth) {
        const user = await checkUser(msg.chat.id);
        if (!user) {
          return;
        }
        finished = await stateObj.callback(msg, user, state.params);
      } else {
        finished = await stateObj.callback(msg, state.params);
      }

      if (finished) {
        await clearState(chatId);
      }
    }
  });
};
