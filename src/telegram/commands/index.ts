import { Message } from 'node-telegram-bot-api';
import { User } from '../../db/entity/user';
import { start } from './start';
import { auth } from './auth';
import { assigned } from './assigned';
import { worklog } from './worklog';
import { plan } from './plan';
import { track } from './track';

export interface CommandWithoutAuth {
  auth: false;
  callback: (msg: Message) => void;
  stateCallback?: (msg: Message) => void;
}

export interface CommandWihAuth {
  auth: true;
  callback: (msg: Message, user: User) => void;
  stateCallback?: (msg: Message, user: User) => void;
}

export type Command = CommandWithoutAuth | CommandWihAuth;
export type CommandWithState = Command & { fromState?: boolean };

const commands = { start, auth, assigned, worklog, plan, track };

export type AvailableCommand = keyof typeof commands;

export default commands;
