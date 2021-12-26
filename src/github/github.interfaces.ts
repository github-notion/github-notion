export interface GithubModuleOptions {
  domain: string;
  githubUsername?: string;
  githubPersonalAccessToken?: string;
  githubOrganization?: string;
  manageStatus: boolean;
  manageAutolinks: boolean;
  managePublicRepoAutolinks: boolean;
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
