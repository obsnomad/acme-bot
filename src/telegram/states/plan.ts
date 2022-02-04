import TelegramBot from 'node-telegram-bot-api';
import moment from 'moment';
import { Bot } from '../';
import { User } from '../../db/entity/user';
import { State } from './';
import { Issue } from '../../jira';

const ISSUES_PER_KEYBOARD_ROW = 3;
const FINISH_MESSAGE = 'Завершить';

export const getIssuesKeyboard = async (
  user: User,
  excludeKeys?: string[]
): Promise<TelegramBot.KeyboardButton[][]> => {
  const issues = await Issue.getAssigned(user.token);
  issues.push({ key: FINISH_MESSAGE });
  return issues.reduce((keyboard: TelegramBot.KeyboardButton[][], issue: Issue) => {
    if (excludeKeys && excludeKeys.includes(issue.key)) {
      return keyboard;
    }
    if (
      keyboard.length === 0 ||
      keyboard[keyboard.length - 1]?.length === ISSUES_PER_KEYBOARD_ROW
    ) {
      keyboard.push([]);
    }
    keyboard[keyboard.length - 1]?.push({ text: issue.key });
    return keyboard;
  }, [] as TelegramBot.KeyboardButton[][]);
};

export const plan: State = {
  auth: true,
  callback: async (msg, user) => {
    const chatId = msg.chat.id;
    const reply = msg.text;

    const state = Bot.getState(chatId);

    if (state) {
      const items = (state?.params?.['items'] ?? []) as (Issue | string)[];

      if (reply === FINISH_MESSAGE) {
        items.sort((a, b) => Number(b instanceof Issue) - Number(a instanceof Issue));

        const message = `<b>${moment().format('DD.MM.YYYY')}</b>\n` + items.map(String).join('\n');
        await Bot.sendMessage(chatId, message, { reply_markup: { remove_keyboard: true } });

        return true;
      }

      if (reply?.match(/^[a-zA-Z]+-\d+$/)) {
        const issues = (items.filter((item) => item instanceof Issue) as Issue[]).map(
          ({ key }) => key
        );

        if (issues.includes(reply)) {
          await Bot.sendMessage(chatId, `Задача уже есть в списке`);
          return false;
        }

        const issue = await Issue.getOne(reply, user.token);

        if (issue) {
          items.push(issue);
          Bot.setState(chatId, { ...state, params: { items } });

          await Bot.sendMessage(chatId, `Добавлена задача ${issue}`, {
            reply_markup: {
              keyboard: await getIssuesKeyboard(user, issues),
            },
          });
        }
      } else if (reply) {
        items.push(reply);
        Bot.setState(chatId, { ...state, params: { items } });

        await Bot.sendMessage(chatId, `Добавлено событие`);
      }
    }

    return false;
  },
};
