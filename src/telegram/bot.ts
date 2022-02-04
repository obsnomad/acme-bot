import TelegramBot from 'node-telegram-bot-api';
import commands from './commands';
import states, { AvailableState } from './states';
import { User } from '../db/entity/user';

const { TELEGRAM_TOKEN = '' } = process.env;

interface UserParams {
  user: User;
  state?: AvailableState;
}

export class Bot {
  protected static _instance: TelegramBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
  protected static _users: Map<TelegramBot.ChatId, UserParams> = new Map();

  constructor() {
    if (Bot._instance) {
      throw new Error('Instantiation failed: use Singleton.getInstance() instead of new.');
    }
  }

  public static getInstance(): TelegramBot {
    return Bot._instance;
  }

  public static getState(chatId: TelegramBot.ChatId) {
    return Bot._users.get(chatId)?.state;
  }

  public static setState(chatId: TelegramBot.ChatId, state: AvailableState) {
    const user = Bot._users.get(chatId);
    if (user) {
      user.state = state;
    }
  }

  public static clearState(chatId: TelegramBot.ChatId) {
    const user = Bot._users.get(chatId);
    if (user) {
      delete user.state;
    }
  }

  public static async sendMessage(
    chatId: TelegramBot.ChatId,
    message: string,
    options: TelegramBot.SendMessageOptions = {}
  ): Promise<TelegramBot.Message> {
    return await Bot._instance.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      ...options,
    });
  }

  public static stopPolling(callback?: () => void) {
    Bot._instance.stopPolling().then(callback);
  }

  public static async findUser(chatId: TelegramBot.ChatId) {
    if (!Bot._users.has(chatId)) {
      const user = await User.findOne({ where: { chatId } });
      if (user) {
        Bot.setUser(chatId, user);
      }
    }
    return Bot._users.get(chatId);
  }

  public static setUser(chatId: TelegramBot.ChatId, user: User) {
    Bot._users.set(chatId, { user });
  }

  private static async checkUser(chatId: TelegramBot.ChatId): Promise<User | void> {
    const user = await Bot.findUser(chatId);

    if (user) {
      return user.user;
    }

    await Bot.sendMessage(
      chatId,
      'Чтобы использовать эту команду, зарегистрируйся командой /register.'
    );
  }

  public static startCommandListeners() {
    commands.forEach((command) => {
      Bot._instance.onText(command.regexp, async (msg, match) => {
        const chatId = msg.chat.id;

        Bot.clearState(chatId);

        if (command.auth) {
          const user = await Bot.checkUser(chatId);
          if (!user) {
            return;
          }
          command.callback(msg, user, match);
        } else {
          command.callback(msg, match);
        }
      });
    });
    Bot._instance.on('message', async (msg) => {
      const chatId = msg.chat.id;

      if (msg.text === '/exit') {
        await Bot.sendMessage(chatId, 'Хорошо, давай поговорим о чём-то другом', {
          reply_markup: { remove_keyboard: true },
        });
        Bot.clearState(chatId);
        return;
      }

      const state = Bot.getState(chatId);

      if (state) {
        const stateObj = states[state.type];
        let finished;

        if (stateObj.auth) {
          const user = await Bot.checkUser(msg.chat.id);
          if (!user) {
            return;
          }
          finished = await stateObj.callback(msg, user, state.params);
        } else {
          finished = await stateObj.callback(msg, state.params);
        }

        if (finished) {
          Bot.clearState(chatId);
        }
      }
    });
  }
}
