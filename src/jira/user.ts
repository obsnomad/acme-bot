import request, { JiraToken } from './request';

export interface UserData {
  key: string;
  name: string;
  displayName: string;
  emailAddress: string;
}

export class User {
  key: string;
  name: string;
  displayName: string;
  emailAddress: string;

  constructor(data: UserData) {
    this.key = data.key;
    this.name = data.name.toLowerCase();
    this.displayName = data.displayName;
    this.emailAddress = data.emailAddress.toLowerCase();
  }

  public toString() {
    return this.displayName;
  }

  public static async getCurrent(token: JiraToken) {
    try {
      const user = await request('myself', token);
      if (user['status-code'] && user['status-code'] !== 200) {
        throw new Error(user.message);
      }
      return new User(user);
    } catch (e: any) {
      console.error(e.message);
      return undefined;
    }
  }
}
