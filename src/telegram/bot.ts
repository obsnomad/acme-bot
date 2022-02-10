import TelegramBot from 'node-telegram-bot-api';
import commands from './commands';
import states from './states';
import { removeKeyboard } from './helpers';
import { checkUser, clearState, getState } from './helpers';

const { TELEGRAM_TOKEN = '' } = process.env;

const bot: TelegramBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

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
