import { sendMessage } from '../';
import TelegramBot from 'node-telegram-bot-api';
import { Command } from './';

export const start: Command = {
  regexp: /\/start/,
  auth: false,
  callback: async (msg: TelegramBot.Message) =>
    await sendMessage(
      msg.chat.id,
      'Привет! Похоже, мы незнакомы.' +
        ' Чтобы получать данные из JIRA, пройди регистрацию командой /register.'
    ),
};
