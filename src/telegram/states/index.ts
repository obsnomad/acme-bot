import TelegramBot from 'node-telegram-bot-api';
import { User } from '../../db/entity/user';
import { requestToken } from './requestToken';
import { worklog } from './worklog';

export interface StateWithoutAuth {
  auth: false;
  callback: (msg: TelegramBot.Message) => Promise<boolean>;
}

export interface StateWihAuth {
  auth: true;
  callback: (msg: TelegramBot.Message, user: User) => Promise<boolean>;
}

export type State = StateWithoutAuth | StateWihAuth;

const states = { requestToken, worklog };

export type AvailableState = keyof typeof states;

export default states;
