import TelegramBot from 'node-telegram-bot-api';
import { User } from '../../db/entity/user';
import { start } from './start';
import { register } from './register';
import { issue } from './issue';
import { assigned } from './assigned';
import { worklog } from './worklog';
import { plan } from './plan';

export interface CommandWithoutAuth {
  regexp: RegExp;
  auth: false;
  callback: (msg: TelegramBot.Message, match: RegExpExecArray | null) => void;
}

export interface CommandWihAuth {
  regexp: RegExp;
  auth: true;
  callback: (msg: TelegramBot.Message, user: User, match: RegExpExecArray | null) => void;
}

export type Command = CommandWithoutAuth | CommandWihAuth;

export default [start, register, issue, assigned, worklog, plan];
