import TelegramBot from 'node-telegram-bot-api';
import commands from './commands';
import states, { AvailableState } from './states';
import { User } from '../db/entity/user';

const { TELEGRAM_TOKEN = '' } = process.env;

export class Bot {
  protected static _instance: TelegramBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
  protected static _users: Map<TelegramBot.ChatId, User> = new Map();
  protected static _state?: AvailableState;

  constructor() {
    if (Bot._instance) {
      throw new Error('Instantiation failed: use Singleton.getInstance() instead of new.');
    }
  }

  public static getInstance(): TelegramBot {
    return Bot._instance;
  }

  public static setState(state: AvailableState) {
    Bot._state = state;
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
        Bot._users.set(chatId, user);
      }
    }
    return Bot._users.get(chatId);
  }

  public static async setUser(chatId: TelegramBot.ChatId, user: User) {
    Bot._users.set(chatId, user);
  }

  private static async checkUser(chatId: TelegramBot.ChatId): Promise<User | void> {
    const user = await Bot.findUser(chatId);

    if (user) {
      return user;
    }

    await Bot.sendMessage(
      chatId,
      'Чтобы использовать эту команду, зарегистрируйся командой /register.'
    );
  }

  public static startCommandListeners() {
    commands.forEach((command) => {
      Bot._instance.onText(command.regexp, async (msg, match) => {
        Bot._state = undefined;
        if (command.auth) {
          const user = await Bot.checkUser(msg.chat.id);
          if (!user) {
            return;
          }
          command.callback(msg, match, user);
        } else {
          command.callback(msg, match);
        }
      });
    });
    Bot._instance.on('message', async (msg) => {
      if (msg.text === '/exit') {
        Bot._state = undefined;
        return;
      }

      if (Bot._state && states[Bot._state]) {
        const state = states[Bot._state];
        let finished;

        if (state.auth) {
          const user = await Bot.checkUser(msg.chat.id);
          if (!user) {
            return;
          }
          finished = await state.callback(msg, user);
        } else {
          finished = await state.callback(msg);
        }

        if (finished) {
          Bot._state = undefined;
        }
      }
    });
  }
}
