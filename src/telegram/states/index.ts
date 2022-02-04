import TelegramBot from 'node-telegram-bot-api';
import { User } from '../../db/entity/user';
import { requestToken } from './requestToken';
import { worklog } from './worklog';
import { plan } from './plan';

export { getIssuesKeyboard } from './plan';

export interface StateParams {
  [key: string]: any;
}

export interface StateWithoutAuth {
  auth: false;
  callback: (msg: TelegramBot.Message, params?: StateParams) => Promise<boolean>;
}

export interface StateWihAuth {
  auth: true;
  callback: (msg: TelegramBot.Message, user: User, params?: StateParams) => Promise<boolean>;
}

export type State = StateWithoutAuth | StateWihAuth;

const states = { requestToken, worklog, plan };

export type AvailableState = {
  type: keyof typeof states;
  params?: StateParams;
};

export default states;
