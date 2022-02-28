import { ChatId } from 'node-telegram-bot-api';
import {
  clearState,
  deleteStateMessage,
  editStateMessage,
  getState,
  sendError,
  sendMessage,
  setState,
} from '../';
import { Command } from './';
import { Issue } from '../../jira';
import moment from 'moment';
import { User } from '../../db/entity/user';
import { getIssuesKeyboardMarkup } from '../helpers/';

type Entry = Issue | string;

const keyboard = async (user: User, excludeIssues?: Entry[]) => {
  const keyboard = await getIssuesKeyboardMarkup(user, excludeIssues);
  if (excludeIssues?.length) {
    keyboard.inline_keyboard.push([{ text: 'Завершить', callback_data: 'finish' }]);
  }
  return keyboard;
};

const getItems = async (chatId: ChatId) =>
  ((await getState(chatId)).params?.['items'] ?? []) as Entry[];

const issueAction = async (chatId: ChatId, text: string, user: User) => {
  const items = await getItems(chatId);

  const filterEntriesByIssue = (item: Entry) => item instanceof Issue;
  const mapEntriesByKey = (item: Entry) => item instanceof Issue && item.key;

  const issues = items.filter(filterEntriesByIssue).map(mapEntriesByKey);

  if (issues.includes(text)) {
    await sendError(chatId, 'Задача уже есть в списке');
    return;
  }

  const issue = await Issue.getOne(text, user.token);

  if (issue) {
    const state = await getState(chatId);

    items.push(issue);
    await setState(chatId, { ...state, params: { items } });

    const message = `${state.message?.text}\n------\n${items.join('\n')}\n-------`;
    await editStateMessage(chatId, message, await keyboard(user, items));

    return;
  }

  await sendError(chatId, 'Задача не найдена');
};

const eventAction = async (chatId: ChatId, text: string, user: User) => {
  const state = await getState(chatId);
  const items = await getItems(chatId);

  items.push(text);
  await setState(chatId, { ...state, params: { items } });

  const message = `${state.message?.text}\n------\n${items.join('\n')}\n-------`;
  await editStateMessage(chatId, message, await keyboard(user, items));
};

const finishAction = async (chatId: ChatId) => {
  const items = await getItems(chatId);

  if (items.length > 0) {
    const sortByEntryType = (a: Entry, b: Entry) =>
      Number(b instanceof Issue) - Number(a instanceof Issue);

    items.sort(sortByEntryType);

    const message = `<b>${moment().format('DD.MM.YYYY')}</b>\n` + items.map(String).join('\n');
    await editStateMessage(chatId, message);
  } else {
    await deleteStateMessage(chatId);
  }

  await clearState(chatId);
};

export const plan: Command = {
  auth: true,
  callback: async ({ chat: { id: chatId } }, user) => {
    const message = await sendMessage(
      chatId,
      'Выбери задачу из списка открытых, введи номер задачи или название события',
      { reply_markup: await keyboard(user) }
    );

    return await setState(chatId, {
      type: 'plan',
      message,
    });
  },
  stateCallback: async ({ chat: { id: chatId }, text = '' }, user) => {
    if (text === 'finish') {
      return finishAction(chatId);
    }

    if (text.match(/^[a-zA-Z]+-\d+$/)) {
      return issueAction(chatId, text, user);
    }

    if (text) {
      return eventAction(chatId, text, user);
    }
  },
};
