import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import * as fetch from 'node-fetch';
import { CONFIG_OPTIONS } from 'src/common/common.constants';
import { HttpRequestOptions } from 'src/common/common.interfaces';
import {
  findTicketRefInString,
  makeSearchParams,
} from 'src/common/common.utils';
import { NotionService } from 'src/notion/notion.service';
import {
  GithubModuleOptions,
  GithubRepo,
  RawAutolinks,
  RawCommits,
  RawHookPullsOpened,
  RawWebhooks,
} from './github.interfaces';
import { formatDomain, makeWebhookUrl, transformRepo } from './github.utils';

const GITHUB_API = 'https://api.github.com';
const WEBHOOK_EVENTS = ['pull_request'];

@Injectable()
export class GithubService implements OnModuleInit {
  auth: boolean;
  constructor(
    @Inject(CONFIG_OPTIONS) private readonly options: GithubModuleOptions,
    private readonly notionService: NotionService,
  ) {
    this.auth = false;
  }

  isGithubIntegrationOn() {
    const { githubPersonalAccessToken, githubUsername } = this.options;
    return githubPersonalAccessToken && githubUsername;
  }

  async authRequest(
    path: string,
    { method = 'GET', body, headers, params }: HttpRequestOptions,
  ) {
    try {
      const { githubUsername, githubPersonalAccessToken } = this.options;
      const queryString = params ? makeSearchParams(params) : '';
      const encodedAuthToken = Buffer.from(
        `${githubUsername}:${githubPersonalAccessToken}`,
      ).toString('base64');
      const rawaData = await fetch(`${GITHUB_API}${path}${queryString}`, {
        method,
        body: JSON.stringify(body),
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `Basic ${encodedAuthToken}`,
          'Content-Type': 'application/json',
          ...headers,
        },
      });
      const jsonData = await rawaData.json();
      return jsonData;
    } catch (error) {
      return error;
    }
  }

  async checkAuth(): Promise<boolean> {
    const data = await this.authRequest('/user', {});
    if (data && data.login) {
      console.log(`Github auth is valid. Using ${data.login} for Github APIs`);
      this.auth = true;
      return true;
    }
    console.log(
      'Github authentication failed! Please provide a valid Personal Access Token. Error from github:',
    );
    console.log(data);
    return false;
  }

  //... autolinks management
  // list all existing autolinks of repo and ticket types available on notion
  // for each tag from notion, check if the repo has autolink with matching tag
  // if no, create autolink for tag
  // if yes, but domain not matching, replace the autolink with same tag but this domain
  // old one has to be deleted because same tags with different links cannot co-exist

  async createAutolinkForRepo(
    repoName: string,
    keyPrefix: string,
    urlTemplate: string,
  ) {
    console.log(`[${repoName}] Creating autolink with key ${keyPrefix}`);
    const { githubOrganization } = this.options;
    return await this.authRequest(
      `/repos/${githubOrganization}/${repoName}/autolinks`,
      {
        method: 'POST',
        body: {
          key_prefix: keyPrefix,
          url_template: urlTemplate,
        },
      },
    );
  }

  async deleteAutolinkForRepo(
    repoName: string,
    autolinkId: number,
    keyPrefix: string,
  ) {
    console.log(`[${repoName}] Deleting autolink with key ${keyPrefix}`);
    const { githubOrganization } = this.options;
    return await this.authRequest(
      `/repos/${githubOrganization}/${repoName}/autolinks/${autolinkId}`,
      { method: 'DELETE' },
    );
  }

  async manageAutolinks(name: string, tags: string[]) {
    const { domain, manageAutolinks, githubOrganization } = this.options;
    if (!manageAutolinks) return;
    const autolinks: RawAutolinks[] = await this.authRequest(
      `/repos/${githubOrganization}/${name}/autolinks`,
      {},
    );
    // format autolinks for exist check
    const autolinksKeys = {};
    for (let i = 0; i < autolinks.length; i++) {
      const cur = autolinks[i];
      autolinksKeys[cur.key_prefix] = {
        id: cur.id,
        urlTemplate: cur.url_template,
      };
    }
    // check if autolink exists and match, if not, create and delete unmatching autolinks
    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];
      const keyPrefix = `${tag}-`;
      const urlTemplate = `${formatDomain(domain)}/notion/ticket/<num>`;
      const exists = autolinksKeys[keyPrefix];
      if (exists && exists.urlTemplate === urlTemplate) return;

      if (!exists || exists.urlTemplate !== urlTemplate) {
        // create
        await this.createAutolinkForRepo(name, keyPrefix, urlTemplate);
        // if exists, urlTemplate isn't matching, hence, delete
        if (exists)
          await this.deleteAutolinkForRepo(name, exists.id, keyPrefix);
      }
    }
  }

  // ... webhook managements
  // check if there's webhook sending to this domain
  // if not, create one
  // otherwise, check if the existing webhook is triggered by right events
  // if not, update it
  // Will not delete any existing hooks in case there's other services using webhooks

  async createWebhookForOrg(): Promise<boolean> {
    if (!this.auth) {
      console.log('Trying to create webhook but github is not authenticated');
      return false;
    }
    const { domain, githubOrganization } = this.options;
    const url = makeWebhookUrl(domain);
    const created = await this.authRequest(
      `/orgs/${githubOrganization}/hooks`,
      {
        method: 'POST',
        body: {
          // this should always be `web` according to github documentation
          name: 'web',
          config: {
            url,
            content_type: 'json',
          },
          events: WEBHOOK_EVENTS,
        },
      },
    );
    if (created.errors) {
      console.log('Failed to create webhook for organization, error details:');
      console.log(created);
      return false;
    }
    return true;
  }

  // TODO: Add secret to config for more secured usage
  async updateWebhook(hookId: number): Promise<boolean> {
    const { domain, githubOrganization } = this.options;
    const url = makeWebhookUrl(domain);
    const updated = await this.authRequest(
      `/orgs/${githubOrganization}/hooks/${hookId}`,
      {
        method: 'PATCH',
        body: {
          config: {
            url,
            content_type: 'json',
          },
          events: WEBHOOK_EVENTS,
        },
      },
    );
    if (updated.errors) {
      console.log(updated.errors);
      return false;
    }
    return true;
  }

  async manageWebhooks() {
    const { domain, githubOrganization } = this.options;
    const webhooks: RawWebhooks[] = await this.authRequest(
      `/orgs/${githubOrganization}/hooks`,
      {},
    );
    // check if webhook already exists
    if (webhooks && webhooks.length > 0) {
      for (let i = 0; i < webhooks.length; i++) {
        const hook = webhooks[i];
        // check if there's hook matching our doamin
        if (hook.config.url.toLowerCase() === makeWebhookUrl(domain)) {
          // make sure the hook is triggered for the right events
          let hasRequiredEvents = true;
          WEBHOOK_EVENTS.forEach((requiredEvent) => {
            const index = hook.events.findIndex(
              (cur) => cur.toUpperCase() === requiredEvent.toUpperCase(),
            );
            if (index < 0 && hasRequiredEvents) hasRequiredEvents = false;
          });
          // avoid creating hook if there's matching webhook
          if (hasRequiredEvents) return;
          if (this.auth) {
            console.log('Webhook events not matching! Trying to update it!');
            await this.updateWebhook(hook.id);
          } else {
            console.log("Github not authenticated, can't update webhook");
          }
        }
      }
    }
    // create webhook if exist check failed
    console.log('No valid webhook found, creating one.');
    await this.createWebhookForOrg();
  }

  // ... check if everything is healthy

  async orgCheckUp() {
    const { githubOrganization } = this.options;
    if (!githubOrganization) return;
    await this.manageWebhooks();
    const repos = await this.getRepos();
    if (repos && repos.length > 0) {
      const { database } = await this.notionService.validateDatabase();
      if (!database) {
        console.log('Error getting notion database');
        return;
      }
      if (database.tags.length === 0) {
        console.log('No ticket type found!');
        return;
      }
      // manage autolinks for each repos
      for (let i = 0; i < repos.length; i++) {
        const repo = repos[i];
        await this.manageAutolinks(repo.name, database.tags);
      }
    }
  }

  // ... methods required for webhooks to access more information on github

  async getCommitsFromCommitsUrl(url: string): Promise<RawCommits[]> {
    const res = await this.authRequest(url, { params: { per_page: 100 } });
    if (res?.length === undefined) {
      console.log('Error getting commits from PR');
      return [];
    }
    return res;
  }

  async getDiffFromDiffUrl(url: string): Promise<any> {
    const res = await this.authRequest(url, {});
    console.log(res);
    return res;
  }

  async getRepos(): Promise<GithubRepo[]> {
    const { managePublicRepoAutolinks, githubOrganization } = this.options;
    const shouldRun = this.isGithubIntegrationOn();
    if (!shouldRun || !this.auth) return;
    const rawRepos = await this.authRequest(
      `/orgs/${githubOrganization}/repos`,
      {
        params: {
          type: managePublicRepoAutolinks ? 'all' : 'private',
        },
      },
    );
    console.log(`Found ${rawRepos.length} managed repos:`);

    const repos: GithubRepo[] = [];
    if (repos && rawRepos.length > 0) {
      for (let i = 0; i < rawRepos.length; i++) {
        const cur = rawRepos[i];
        const transformedRepo = transformRepo(cur);
        console.log(
          `${i + 1}: [${transformedRepo.isPrivate ? 'private' : 'public'}] ${
            transformedRepo.name
          }`,
        );
        repos.push(transformedRepo);
      }
    }
    return repos;
  }

  // ... all webhooks

  async pullRequestOpened({
    pull_request: { title, html_url, diff_url, commits_url, id },
  }: RawHookPullsOpened) {
    const { database } = await this.notionService.validateDatabase();
    if (!database) {
      console.log('Error getting notion database');
      return;
    }
    const diff = await this.getDiffFromDiffUrl(diff_url);
    console.log(diff);
    const commits = await this.getCommitsFromCommitsUrl(commits_url);
    console.log(commits);
    let summary = title;
    commits.forEach((commit) => {
      summary += commit.commit.message;
    });
    const titleMentions = findTicketRefInString(summary, database.tags);
    console.log(titleMentions);
    if (titleMentions.length === 0)
      return console.log(`No ticket mentioned in PR #${id}`);
  }

  async onModuleInit() {
    // github integration is turned off if githubUsername/githubPersonalAccessToken is not provided
    await this.checkAuth();
  }

  @Interval(10000)
  async healthChecks() {
    // github integration is turned off if githubUsername/githubPersonalAccessToken is not provided
    const shouldRun = this.isGithubIntegrationOn();
    if (!shouldRun) return;
    if (this.auth) {
      await this.orgCheckUp();
    } else {
      this.checkAuth();
    }
  }
}
