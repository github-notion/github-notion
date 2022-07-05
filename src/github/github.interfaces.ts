export interface GithubModuleOptions {
  domain: string;
  githubUsername?: string;
  githubPersonalAccessToken?: string;
  githubOrganization?: string;
  manageAutolinks: boolean;
  managedRepos: string[];
}

export interface GithubRepo {
  id: number;
  name: string;
  fullName: string;
  isPrivate: boolean;
  gitUrl: string;
  sshUrl: string;
  cloneUrl: string;
  // this is the url to access from web
  svnUrl: string;
}

export interface RawAutolinks {
  id: number;
  key_prefix: string;
  url_template: string;
}

export interface RawWebhooks {
  id: number;
  url: string;
  ping_url: string;
  deliveries_url: string;
  name: 'web';
  events: string[];
  active: boolean;
  config: {
    /** this is our handler url */
    url: string;
    /** json */
    content_type: string;
  };
  updated_at: Date;
  created_at: Date;
  type: string;
}

export interface RawHookPullsOpened {
  action: 'opened';
  number: number;
  pull_request: {
    url: string;
    id: number;
    node_id: string;
    html_url: string;
    diff_url: string;
    patch_url: string;
    issue_url: string;
    number: number;
    state: 'open';
    locked: boolean;
    title: 'Webhooks';
    user: {
      login: string;
      id: number;
      node_id: string;
      avatar_url: string;
      gravatar_id: string;
      url: string;
      html_url: string;
      followers_url: string;
      following_url: string;
      gists_url: string;
      starred_url: string;
      subscriptions_url: string;
      organizations_url: string;
      repos_url: string;
      events_url: string;
      received_events_url: string;
      type: 'User';
      site_admin: boolean;
    };
    body: string;
    created_at: Date;
    updated_at: Date;
    commits_url: string;
    review_comments_url: string;
    review_comment_url: string;
    comments_url: string;
    statuses_url: string;
  };
  repository: {
    id: number;
    node_id: string;
    name: string;
    full_name: string;
    private: boolean;
  };
}

export interface RawCommits {
  url: string;
  sha: string;
  node_id: string;
  html_url: string;
  comments_url: string;
  commit: {
    url: string;
    author: {
      name: string;
      email: string;
      date: Date;
    };
    committer: {
      name: string;
      email: string;
      date: Date;
    };
    message: string;
    tree: {
      url: string;
      sha: string;
    };
    comment_count: number;
    verification: {
      verified: false;
      reason: string;
      signature: null;
      payload: null;
    };
  };
  author: {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
    site_admin: boolean;
  };
  committer: {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
    site_admin: boolean;
  };
  parents: [
    {
      url: string;
      sha: string;
    },
  ];
}
