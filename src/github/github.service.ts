import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import * as fetch from 'node-fetch';
import { CONFIG_OPTIONS } from 'src/common/common.constants';
import { HttpRequestOptions } from 'src/common/common.interfaces';
import { makeSearchParams } from 'src/common/common.utils';
import { NotionService } from 'src/notion/notion.service';
import {
  GithubModuleOptions,
  GithubRepo,
  RawAutolinks,
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
      'Github authentication failed! Please provide a valid Personal Access Token.',
    );
    return false;
  }

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

  async createWebhookForOrg(): Promise<boolean> {
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
      console.log(created);
      return false;
    }
    return true;
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
      const formattedDomain = formatDomain(domain);
      const keyPrefix = `${tag}-`;
      const urlTemplate = `${formattedDomain}/notion/ticket/<num>`;
      const exists = autolinksKeys[keyPrefix];
      if (!exists || exists.urlTemplate !== urlTemplate) {
        // create
        await this.createAutolinkForRepo(name, keyPrefix, urlTemplate);
        // if exists, delete
        if (exists)
          await this.deleteAutolinkForRepo(name, exists.id, keyPrefix);
      }
    }
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
        // hook exists, check whether we need to update it
        if (hook.config.url === makeWebhookUrl(domain)) {
          // this needs to change if we want to subscribe to more events
          if (
            hook.events.length !== 1 ||
            hook.events[0] !== WEBHOOK_EVENTS[0]
          ) {
            console.log('Webhook events not matching! Updating it!');
            await this.updateWebhook(hook.id);
          }
          // avoid creating hook if there's matching webhook
          return;
        }
      }
    }
    // create webhook if exist check failed
    console.log('No valid webhook found, creating one.');
    await this.createWebhookForOrg();
  }

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

  async getRepos(): Promise<GithubRepo[]> {
    const { managePublicRepoAutolinks, githubOrganization } = this.options;
    if (!this.shouldRun()) return;
    const rawRepos = await this.authRequest(
      `/orgs/${githubOrganization}/repos`,
      {
        params: {
          type: managePublicRepoAutolinks ? 'all' : 'private',
        },
      },
    );
    console.log(`Found ${rawRepos.length} repos:`);

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

  async shouldRun() {
    const { githubPersonalAccessToken, githubUsername } = this.options;
    return githubPersonalAccessToken && githubUsername;
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

  async onModuleInit() {
    // github integration is turned off if githubUsername/githubPersonalAccessToken is not provided
    if (!this.shouldRun()) return;
    await this.checkAuth();
  }

  @Interval(10000)
  async healthChecks() {
    await this.orgCheckUp();
  }
}
