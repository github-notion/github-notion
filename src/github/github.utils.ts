import { GithubRepo } from './github.interfaces';

export const transformRepo = ({
  id,
  name,
  full_name,
  private: isPrivate,
  git_url,
  ssh_url,
  clone_url,
  svn_url,
}): GithubRepo => {
  return {
    id,
    name,
    fullName: full_name,
    isPrivate,
    gitUrl: git_url,
    sshUrl: ssh_url,
    cloneUrl: clone_url,
    svnUrl: svn_url,
  };
};

export const formatDomain = (domain: string) => {
  return domain.charAt(domain.length - 1) === '/'
    ? domain.slice(0, -1)
    : domain;
};

export const makeWebhookUrl = (domain: string) => {
  const formattedDomain = formatDomain(domain);
  return `${formattedDomain}/github/webhook`.toLowerCase();
};
