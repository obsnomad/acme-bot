import TelegramBot, {
  ChatId,
  InlineKeyboardMarkup,
  Message,
  SendMessageOptions,
} from 'node-telegram-bot-api';
import commands, { CommandWithState } from './commands';
import {
  checkUser,
  clearState,
  getState,
  getKeyboardMarkup,
  getCommand,
  setState,
} from './helpers';

const { TELEGRAM_TOKEN = '' } = process.env;

const bot: TelegramBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

export const sendMessage = async (
  chatId: ChatId,
  text: string,
  options: SendMessageOptions = {}
): Promise<Message> => {
  const { reply_markup = await getKeyboardMarkup(chatId), ...restOptions } = options;
  return await bot.sendMessage(chatId, text, {
    parse_mode: 'HTML',
    reply_markup,
    ...restOptions,
  });
};

export const sendError = async (chatId: ChatId, text: string): Promise<boolean | Message> => {
  const state = await getState(chatId);

  if (!state.message) {
    return false;
  }

  await setState(chatId, { ...state, error: text });

  return await editStateMessage(chatId, state.message.text ?? '', 'keep');
};

export const editStateMessage = async (
  chatId: ChatId,
  text: string,
  markup?: 'keep' | InlineKeyboardMarkup
): Promise<boolean | Message> => {
  const { error, ...state } = await getState(chatId);

  if (!state.message) {
    return false;
  }

  state.message.text = text;
  state.message.reply_markup = markup === 'keep' ? state.message.reply_markup : markup;

  await setState(chatId, state);

  const prefix = error ? `<b>${error}</b>\n\n` : '';

  return await bot.editMessageText(`${prefix}${text}`, {
    chat_id: chatId,
    message_id: state.message.message_id,
    reply_markup: state.message.reply_markup,
    parse_mode: 'HTML',
  });
};

export const deleteStateMessage = async (chatId: ChatId) => {
  const { message } = await getState(chatId);

  if (message) {
    await deleteMessage(message);
  }
};

export const stopPolling = (callback?: () => void) => {
  bot.stopPolling().then(callback);
};

export const deleteMessage = async (msg: Message, onlyUser: boolean = false) => {
  if (onlyUser && msg.from?.is_bot) {
    return;
  }
  await bot.deleteMessage(msg.chat.id, String(msg.message_id));
};

const messageCallback = async (msg: Message) => {
  const chatId = msg.chat.id;
  const message = msg.text;

  const start = message === '/start';

  if (!message) {
    return;
  }

  if (start) {
    setTimeout(async () => await deleteMessage(msg, true), 50);
  } else {
    await deleteMessage(msg, true);
  }

  const command: CommandWithState | undefined = start
    ? commands.start
    : await getCommand(chatId, message);

  if (command) {
    if (!command.fromState) {
      await deleteStateMessage(chatId);
      await clearState(chatId, true);
    }

    if (command.auth) {
      const user = await checkUser(chatId);
      if (!user) {
        return;
      }
      command.fromState && command.stateCallback
        ? command.stateCallback(msg, user)
        : command.callback(msg, user);
    } else {
      command.fromState && command.stateCallback
        ? command.stateCallback(msg)
        : command.callback(msg);
    }

    return;
  }
};

export const startCommandListeners = () => {
  bot.on('callback_query', async (query) => {
    if (query.message) {
      await messageCallback({ ...query.message, text: query.data });
    }
  });
  bot.on('message', async (msg) => {
    await messageCallback(msg);
  });
};
