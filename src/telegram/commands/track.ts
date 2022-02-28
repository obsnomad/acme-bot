import { ChatId, InlineKeyboardButton, InlineKeyboardMarkup, Message } from 'node-telegram-bot-api';
import {
  editStateMessage,
  getIssuesKeyboardMarkup,
  getState,
  sendError,
  sendMessage,
  setState,
} from '../';
import { Command } from './';
import { User } from '../../db/entity/user';
import { Issue } from '../../jira';
import moment from 'moment';

const { JIRA_MEETINGS_ISSUE } = process.env;
const MEETING_LABEL = 'meeting';
const DATE_FORMAT = 'DD.MM.YYYY HH:mm';

enum Action {
  Issue = 'issue',
  TimeSpent = 'timeSpent',
  Date = 'date',
  WorklogType = 'worklogType',
}

interface Params {
  type?: Action;
  issue?: Issue;
  timeSpent?: string | number;
  date?: string;
  worklogType?: string;
}

const issuesKeyboard = async (user: User): Promise<InlineKeyboardMarkup> => {
  const keyboard = await getIssuesKeyboardMarkup(user);
  if (JIRA_MEETINGS_ISSUE) {
    keyboard.inline_keyboard.unshift([{ text: 'Встречи', callback_data: MEETING_LABEL }]);
  }
  return keyboard;
};

const worklogKeyboard = async (user: User): Promise<InlineKeyboardMarkup> => {
  const state = await getState(user.chatId);
  const { issue, timeSpent, date, worklogType = 'Анализ' } = state.params ?? {};

  const buttons: InlineKeyboardButton[][] = [
    [{ text: `Задача: ${issue ? issue.toCleanString() : 'n/a'}`, callback_data: Action.Issue }],
    [{ text: `Затраченное время: ${timeSpent || 'n/a'}`, callback_data: Action.TimeSpent }],
    [{ text: `Дата и время: ${date || 'n/a'}`, callback_data: Action.Date }],
    [{ text: `Тип записи: ${worklogType}`, callback_data: Action.WorklogType }],
  ];

  if (issue && timeSpent && date && worklogType) {
    buttons.push([{ text: 'Отправить', callback_data: 'finish' }]);
  }

  return {
    inline_keyboard: buttons,
  };
};

const dateKeyboard = (): InlineKeyboardMarkup => ({
  inline_keyboard: [[{ text: 'Сейчас', callback_data: 'now' }]],
});

const setWorklogState = async (
  user: User,
  params: Partial<Params>,
  resetMessage: boolean = false
) => {
  const { chatId } = user;
  const state = await getState(chatId);
  await setState(chatId, {
    ...state,
    params: { ...(state.params || {}), ...params },
  });
  if (resetMessage) {
    await editStateMessage(chatId, 'Укажи параметры записи', await worklogKeyboard(user));
  }
};

const worklogAction = async (chatId: ChatId, text: string, user: User) => {
  switch (text) {
    case Action.Issue:
      await editStateMessage(
        chatId,
        'Выбери задачу из списка открытых или введи номер задачи',
        await issuesKeyboard(user)
      );
      return await setWorklogState(user, { type: text });
    case Action.TimeSpent:
      await editStateMessage(
        chatId,
        'Укажи затраченное время в секундах или в формате Nd Nh Nm Ns'
      );
      return await setWorklogState(user, { type: text });
    case Action.Date:
      await editStateMessage(
        chatId,
        'Укажи дату в формате DD.MM.YYYY HH:MM или установи текущее время кнопкой',
        dateKeyboard()
      );
      return await setWorklogState(user, { type: text });
  }
};

const issueAction = async (chatId: ChatId, text: string, user: User) => {
  const issueText = (text === MEETING_LABEL && JIRA_MEETINGS_ISSUE) || text;

  if (!issueText.match(/^[a-zA-Z]+-\d+$/)) {
    await sendError(chatId, 'Неверный формат задачи');
    return;
  }

  const issue = await Issue.getOne(issueText, user.token);

  if (!issue) {
    await sendError(chatId, 'Задача не найдена');
    return;
  }

  return await setWorklogState(user, { issue, type: undefined }, true);
};

const timeSpentAction = async (chatId: ChatId, text: string, user: User) => {
  const match = text.match(/^(\d+|(\d+d)?\s*(\d+h)?\s*(\d+m)?\s*(\d+s)?)?$/);

  if (!match) {
    await sendError(chatId, 'Неверный формат времени');
    return false;
  }

  const [, full, ...values] = match;
  const timeSpent = values.filter((value) => value).join(' ') || parseInt(full || '');

  return await setWorklogState(user, { timeSpent, type: undefined }, true);
};

const dateAction = async (chatId: ChatId, text: string, user: User) => {
  const date = text === 'now' ? moment() : moment(text, DATE_FORMAT);

  if (!date.isValid()) {
    await sendError(chatId, 'Неверный формат времени');
    return false;
  }

  return await setWorklogState(user, { date: date.format(DATE_FORMAT), type: undefined }, true);
};

export const track: Command = {
  auth: true,
  callback: async ({ chat: { id: chatId } }: Message, user: User) => {
    const message = await sendMessage(
      chatId,
      'Выбери задачу из списка открытых или введи номер задачи',
      { reply_markup: await issuesKeyboard(user) }
    );

    await setState(chatId, {
      type: 'track',
      message,
    });
  },
  stateCallback: async ({ chat: { id: chatId }, text = '' }: Message, user: User) => {
    const state = await getState(chatId);

    if (!state.params) {
      return await issueAction(chatId, text, user);
    }

    const extraState = state.params?.['type'] as Action;

    switch (extraState) {
      case Action.Issue:
        return await issueAction(chatId, text, user);
      case Action.TimeSpent:
        return await timeSpentAction(chatId, text, user);
      case Action.Date:
        return await dateAction(chatId, text, user);
      default:
        return await worklogAction(chatId, text, user);
    }
  },
};
