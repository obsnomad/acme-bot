import TelegramBot from 'node-telegram-bot-api';
import { User } from '../../db/entity/user';
import { Issue } from '../../jira';

const ISSUES_PER_KEYBOARD_ROW = 3;

export const issuesKeyboard = async (
  user: User,
  excludeKeys?: string[]
): Promise<TelegramBot.KeyboardButton[][]> =>
  (await Issue.getAssigned(user.token)).reduce(
    (keyboard: TelegramBot.KeyboardButton[][], issue: Issue) => {
      if (excludeKeys?.includes(issue.key)) {
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
    },
    [] as TelegramBot.KeyboardButton[][]
  );
