import { ChatId, InlineKeyboardMarkup, ReplyKeyboardMarkup } from 'node-telegram-bot-api';
import { findUser, getState } from './user';
import chunk from 'lodash.chunk';
import commands, { AvailableCommand, CommandWithState } from '../commands';
import { User } from '../../db/entity/user';
import { Issue } from '../../jira';

type Button = { text: string; command: AvailableCommand };

type ButtonKey = 'auth' | 'updateAuth' | 'worklog' | 'plan' | 'track';

type ButtonGroup = ButtonKey[];
type ButtonGroupKey = 'start' | 'updateAuth' | 'common';

export const buttons: { [key in ButtonKey]: Button } = {
  auth: { text: 'Авторизоваться', command: 'auth' },
  updateAuth: { text: 'Авторизоваться заново', command: 'auth' },
  worklog: { text: 'Работа за день', command: 'worklog' },
  plan: { text: 'Спланировать день', command: 'plan' },
  track: { text: 'Добавить запись о работе', command: 'track' },
};

const buttonGroups: { [key in ButtonGroupKey]: ButtonGroup } = {
  start: ['auth'],
  updateAuth: ['updateAuth'],
  common: ['worklog', 'plan', 'track', 'updateAuth'],
};

const getButtonGroupByChatId = async (chatId?: ChatId): Promise<ButtonGroup> => {
  if (!chatId) {
    return buttonGroups['start'];
  }

  const user = await findUser(chatId);

  if (!user) {
    return buttonGroups['start'];
  }

  if (user.needToken) {
    return buttonGroups['updateAuth'];
  }

  return buttonGroups['common'];
};

export const getKeyboardMarkup = async (chatId?: ChatId): Promise<ReplyKeyboardMarkup> => {
  const group = await getButtonGroupByChatId(chatId);

  return {
    keyboard: chunk(group?.map((key) => ({ text: buttons[key].text })) || [], 2),
  };
};

export const getIssuesKeyboardMarkup = async (
  user: User,
  excludeIssues?: (Issue | string)[]
): Promise<InlineKeyboardMarkup> => {
  const excludeKeys = excludeIssues?.map((issue) => issue instanceof Issue && issue.key);
  return {
    inline_keyboard: chunk(
      (await Issue.getAssigned(user.token))
        .filter((issue: Issue) => !excludeKeys?.includes(issue.key))
        .map((issue: Issue) => ({ text: issue.key, callback_data: issue.key })),
      3
    ),
  };
};

export const getCommand = async (
  chatId: ChatId,
  text?: string
): Promise<CommandWithState | undefined> => {
  if (!text) {
    return undefined;
  }

  const group = await getButtonGroupByChatId(chatId);

  const command = Object.entries(buttons).find(
    ([key, button]) => group.includes(key as ButtonKey) && button.text === text
  )?.[1].command;

  if (command) {
    return commands[command];
  }

  const { type } = await getState(chatId);

  return type && { ...commands[type], fromState: true };
};
