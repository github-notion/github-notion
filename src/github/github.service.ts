import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
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
} from './github.interfaces';

const GITHUB_API = 'https://api.github.com';

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
    const created = await this.authRequest(
      `/repos/${githubOrganization}/${repoName}/autolinks`,
      {
        method: 'POST',
        body: {
          key_prefix: keyPrefix,
          url_template: urlTemplate,
        },
      },
    );
    console.log(created);
  }

  async orgCheckUp() {
    const { githubOrganization } = this.options;
    if (!githubOrganization) return;
    const repos = await this.getRepos();
    if (repos && repos.length > 0) {
      const { database } = await this.notionService.validateDatabase();
      // we still need to enter loop for webhook check even if database returns undefined
      const tags = database?.tags || [];
      for (let i = 0; i < repos.length; i++) {
        const repo = repos[i];
        if (tags.length > 0) await this.updateAutolinks(repo.name, tags);
      }
    }
  }

  async updateAutolinks(name: string, tags: string[]) {
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
      const fomattedDomain =
        domain.charAt(domain.length - 1) === '/' ? domain.slice(0, -1) : domain;
      const keyPrefix = `${tag}-`;
      const urlTemplate = `${fomattedDomain}/notion/ticket/<num>`;
      const exists = autolinksKeys[keyPrefix];
      if (!exists || exists.urlTemplate !== urlTemplate) {
        // create
        const created = await this.createAutolinkForRepo(
          name,
          keyPrefix,
          urlTemplate,
        );
        // if exists, delete
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
        const transformedRepo = this.transformRepo(cur);
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

  transformRepo({
    id,
    name,
    full_name,
    private: isPrivate,
    git_url,
    ssh_url,
    clone_url,
    svn_url,
  }): GithubRepo {
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
