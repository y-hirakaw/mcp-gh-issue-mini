export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

export interface Issue {
  number: number;
  title: string;
  html_url: string;
  state: string;
  user: { login: string };
  created_at: string;
  updated_at: string;
  body?: string;
  labels?: { name: string }[];
}

export interface IssueComment {
  id: number;
  body: string;
  user: { login: string };
  created_at: string;
  html_url: string;
}

export interface SearchIssuesResponse {
  items: Issue[];
}

export interface AuthenticationResult {
  success: boolean;
  token?: string;
  method: 'PAT' | 'GitHub CLI';
  error?: string;
}

export interface GitHubAuthClient {
  authenticate(): Promise<AuthenticationResult>;
  makeRequest<T>(url: string, options?: RequestOptions): Promise<T>;
}