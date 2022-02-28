import request, { JiraToken } from './request';
import moment from 'moment';
import { User } from './user';

const { JIRA_URL = '' } = process.env;

export interface Worklog {
  author: User;
  started: string;
  comment: string;
  timeSpentSeconds: number;
}

interface IssueData {
  id: string;
  key: string;
  fields: {
    summary: string;
    priority: {
      id: string;
      name: string;
    };
    status: {
      name: string;
    };
    assignee: User;
    creator: User;
    reporter: User;
    worklog: {
      worklogs: Worklog[];
    };
  };
}

export class Issue {
  id: number;
  key: string;
  name: string;
  link: string;
  priority?: string;
  status?: string;
  assignee?: User;
  creator?: User;
  reporter?: User;
  worklog?: Worklog[];
  worklogTotalTimeSpent: number;

  constructor(data: IssueData) {
    this.id = Number(data.id);
    this.key = data.key;
    this.name = data.fields.summary;
    this.link = `${JIRA_URL}/browse/${this.key}`;
    this.priority = data.fields.priority?.name;
    this.status = data.fields.status?.name;
    this.assignee = data.fields.assignee && new User(data.fields.assignee);
    this.creator = data.fields.creator && new User(data.fields.creator);
    this.reporter = data.fields.reporter && new User(data.fields.reporter);
    this.worklog = data.fields.worklog?.worklogs;
    this.worklogTotalTimeSpent = this.worklog
      ? this.worklog.reduce(
          (timeSpent: number, worklog: Worklog) => timeSpent + worklog.timeSpentSeconds,
          0
        )
      : 0;
  }

  public toString() {
    const { key, name, link } = this;
    return `<a href="${link}">${key}</a> ${name}`;
  }

  public toCleanString() {
    const { key, name } = this;
    return `[${key}] ${name}`;
  }

  public static async getOne(id: string | number, token: JiraToken) {
    try {
      return new Issue(await request(`issue/${id}`, token));
    } catch (e: any) {
      console.error(e.message);
      return undefined;
    }
  }

  public static async getByWorklogDate(date: moment.Moment, token: JiraToken, userName: string) {
    const withWorklogs = async (issue: IssueData) => {
      const worklog = await request(`issue/${issue.key}/worklog`, token, {
        startedAfter: Number(date),
        expand: 'wlType',
      });
      console.log(worklog);
      worklog.worklogs = worklog.worklogs.map(worklogMapper).filter(limitToUserAndDate);
      issue.fields.worklog = worklog;
      return issue;
    };

    const worklogMapper = (worklog: Worklog) => {
      worklog.author = new User(worklog.author);
      return worklog;
    };

    const limitToUserAndDate = (worklog: Worklog) => {
      const logDate = moment(worklog.started);
      const nextDate = moment(date).add(1, 'days');
      return worklog.author.name === userName && logDate >= date && logDate < nextDate;
    };

    const issues = await Promise.all(
      Array.from(
        (
          await request('search', token, {
            jql: `worklogAuthor = currentUser() AND worklogDate >= "${date.format('YYYY/MM/DD')}"`,
            fields: 'summary,priority,status,assignee,creator,reporter',
          })
        ).issues,
        withWorklogs
      )
    );

    return issues
      .filter((issue: IssueData) => issue.fields.worklog.worklogs.length > 0)
      .map((issue: IssueData) => new Issue(issue));
  }

  public static async getAssigned(token: JiraToken) {
    const result = await request('search', token, {
      jql: `assignee = currentUser() AND resolution = Unresolved order by updated DESC`,
      fields: 'summary,priority,status,assignee,creator,reporter',
    });

    return result.issues.map((issue: IssueData) => new Issue(issue));
  }
}
