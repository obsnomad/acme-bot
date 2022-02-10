import moment from 'moment';
import { getState, sendMessage, setState } from '../';
import { State } from './';
import { Issue } from '../../jira';
import { User } from '../../db/entity/user';
import { issuesKeyboard, removeKeyboard } from '../helpers';

const FINISH_MESSAGE = 'Завершить';

export const keyboard = async (user: User, excludeKeys?: string[]) => ({
  reply_markup: {
    keyboard: [...(await issuesKeyboard(user, excludeKeys)), [{ text: FINISH_MESSAGE }]],
  },
});

export const plan: State = {
  auth: true,
  callback: async (msg, user) => {
    const chatId = msg.chat.id;
    const reply = msg.text;

    const state = await getState(chatId);

    if (state) {
      const items = (state.params?.['items'] ?? []) as (Issue | string)[];

      if (reply === FINISH_MESSAGE) {
        items.sort((a, b) => Number(b instanceof Issue) - Number(a instanceof Issue));

        const message = `<b>${moment().format('DD.MM.YYYY')}</b>\n` + items.map(String).join('\n');
        await sendMessage(chatId, message, removeKeyboard());

        return true;
      }

      if (reply?.match(/^[a-zA-Z]+-\d+$/)) {
        const issues = (items.filter((item) => item instanceof Issue) as Issue[]).map(
          ({ key }) => key
        );

        if (issues.includes(reply)) {
          await sendMessage(chatId, `Задача уже есть в списке`);
          return false;
        }

        const issue = await Issue.getOne(reply, user.token);

        if (issue) {
          items.push(issue);
          await setState(chatId, { ...state, params: { items } });

          await sendMessage(chatId, `Добавлена задача ${issue}`, await keyboard(user, issues));
        } else {
          await sendMessage(chatId, 'Задача не найдена');
        }
      } else if (reply) {
        items.push(reply);
        await setState(chatId, { ...state, params: { items } });

        await sendMessage(chatId, 'Добавлено событие');
      }
    }

    return false;
  },
};
