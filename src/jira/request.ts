import fetch from 'node-fetch';

const { JIRA_URL = '' } = process.env;

export type JiraToken = string;

const request = (path: string, token: JiraToken, params?: { [key: string]: any }) => {
  const url = new URL(`/rest/api/latest/${path}`, JIRA_URL);

  if (params) {
    url.search = new URLSearchParams(params).toString();
  }

  return fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  }).then((response) => response.json());
};

export default request;
