import { getState, sendMessage, setState } from '../';
import { State } from './';
import { Issue } from '../../jira';
import { User } from '../../db/entity/user';
import { issuesKeyboard, removeKeyboard } from '../helpers';

const { JIRA_MEETINGS_ISSUE } = process.env;

const MEETINGS_MESSAGE = 'Встречи';
const FINISH_MESSAGE = 'Завершить';

export const keyboard = async (user: User) => {
  const keyboard = await issuesKeyboard(user);
  if (JIRA_MEETINGS_ISSUE) {
    keyboard.unshift([{ text: MEETINGS_MESSAGE }]);
  }
  return { reply_markup: { keyboard } };
};

export const track: State = {
  auth: true,
  callback: async (msg, user) => {
    const chatId = msg.chat.id;
    const reply = (msg.text === MEETINGS_MESSAGE && JIRA_MEETINGS_ISSUE) || msg.text;

    const state = await getState(chatId);

    if (state) {
      if (reply?.match(/^[a-zA-Z]+-\d+$/)) {
        const issue = await Issue.getOne(reply, user.token);

        console.log(issue);

        if (issue) {
          await setState(chatId, { ...state, params: { issue } });

          await sendMessage(
            chatId,
            `Сколько затрекать в задачу ${issue}?` +
              ' Можно использовать количество секунд или набор в формате:\n<pre>Nd Nh Nm Ns</pre>',
            removeKeyboard()
          );
        } else {
          await sendMessage(chatId, 'Задача не найдена');
        }

        return false;
      }

      const { issue } = state.params || {};

      if (issue) {
        const match = reply?.match(/^(\d+|(\d+d)?\s*(\d+h)?\s*(\d+m)?\s*(\d+s)?)?$/);

        if (!match) {
          await sendMessage(chatId, 'Неверный формат времени');
          return false;
        }

        const [, full, ...values] = match;
        const time = values.filter((value) => value).join(' ') || parseInt(full || '');

        await setState(chatId, { ...state, params: { issue, time } });

        await sendMessage(chatId, 'Оставь комментарий или заверши ввод', {
          reply_markup: { keyboard: [[{ text: FINISH_MESSAGE }]] },
        });
      }
    }

    return false;
  },
};
