import { clearState, editStateMessage, sendError, sendMessage, setState } from '../';
import { Command } from './';
import { Issue, Worklog } from '../../jira';
import moment from 'moment';

const { JIRA_MEETINGS_ISSUE } = process.env;

const getDate = (queryDate: string) => {
  switch (queryDate) {
    case 'prev':
      const date = moment();
      do {
        date.subtract(1, 'days');
      } while ([0, 6].includes(date.day()));
      return date;
    case 'today':
      return moment();
    default:
      if (queryDate.match(/^\d{2}.\d{2}.\d{4}$/)) {
        return moment(queryDate, 'DD.MM.YYYY');
      }
  }
  return undefined;
};

const reduceByNameAndTime = (result: { rows: string[]; timeSpent: number }, issue: Issue) => {
  const issueText = String(issue);
  const mapComments = ({ comment }: Worklog) =>
    comment || (JIRA_MEETINGS_ISSUE === issue.key ? null : issueText);
  const filterText = (item: string | null) => item !== null;

  const entries = (issue.worklog?.map(mapComments).filter(filterText) ?? [issueText]) as string[];

  result.rows.push(...new Set(entries));
  result.timeSpent += issue.worklogTotalTimeSpent;

  return result;
};

export const worklog: Command = {
  auth: true,
  callback: async ({ chat: { id: chatId } }) => {
    const message = await sendMessage(chatId, 'Выбери день или введи дату в формате DD.MM.YYYY', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Прошлый рабочий день', callback_data: 'prev' }],
          [{ text: 'Сегодня', callback_data: 'today' }],
        ],
      },
    });

    return await setState(chatId, {
      type: 'worklog',
      message,
    });
  },
  stateCallback: async ({ chat: { id: chatId }, text = '' }, user) => {
    const workDay = getDate(text.trim())?.startOf('day');

    if (!workDay) {
      await sendError(chatId, 'Неверный формат даты');
      return;
    }

    const issues = await Issue.getByWorklogDate(workDay, user.token, user.name);

    const formatted = issues.reduce(reduceByNameAndTime, { rows: [], timeSpent: 0 });

    const issuesText =
      formatted.timeSpent > 0
        ? formatted.rows.join('\n') +
          `\n\nЗатрачено времени: ${(formatted.timeSpent / 3600).toFixed(2)}ч`
        : 'Нет записей за день';

    const message = `<b>${workDay.format('DD.MM.YYYY')}</b>\n\n${issuesText}`;

    await editStateMessage(chatId, message);

    return clearState(chatId);
  },
};
