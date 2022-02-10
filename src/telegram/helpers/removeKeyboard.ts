import TelegramBot from 'node-telegram-bot-api';

export const removeKeyboard = (): TelegramBot.SendMessageOptions => ({
  reply_markup: { remove_keyboard: true },
});
