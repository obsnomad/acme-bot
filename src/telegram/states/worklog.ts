import { sendMessage } from '../';
import { State } from './';
import { Issue } from '../../jira';
import moment from 'moment';
import { removeKeyboard } from '../helpers';

const { JIRA_MEETINGS_ISSUE } = process.env;

export const dateLabels = {
  prev: 'Прошлый рабочий день',
  today: 'Сегодня',
};

const getDate = (queryDate?: string) => {
  switch (queryDate) {
    case dateLabels.prev:
      const date = moment();
      do {
        date.subtract(1, 'days');
      } while ([0, 6].includes(date.day()));
      return date;
    case dateLabels.today:
      return moment();
    default:
      if (queryDate?.match(/^\d{2}.\d{2}.\d{4}$/)) {
        return moment(queryDate, 'DD.MM.YYYY');
      }
  }
  return undefined;
};

export const worklog: State = {
  auth: true,
  callback: async (msg, user) => {
    const chatId = msg.chat.id;
    const workDay = getDate(msg.text?.trim())?.startOf('day');

    if (!workDay) {
      await sendMessage(chatId, 'Неверный формат даты');
      return false;
    }

    const issues = await Issue.getByWorklogDate(workDay, user.token, user.name);

    const formatted = issues.reduce(
      (result: { rows: string[]; timeSpent: number }, issue: Issue) => {
        if (issue.key === JIRA_MEETINGS_ISSUE) {
          const rows = issue.worklog
            ? issue.worklog.filter(({ comment }) => comment).map(({ comment }) => comment)
            : [];
          result.rows.push(...rows);
        } else {
          result.rows.push(String(issue));
        }
        result.timeSpent += issue.worklogTotalTimeSpent;
        return result;
      },
      { rows: [], timeSpent: 0 }
    );

    const message =
      `<b>${workDay.format('DD.MM.YYYY')}</b>\n` +
      formatted.rows.join('\n') +
      `\nЗатрачено времени: ${(formatted.timeSpent / 3600).toFixed(2)}ч`;

    await sendMessage(msg.chat.id, message, removeKeyboard());

    return true;
  },
};
