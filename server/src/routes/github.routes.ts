import { Router } from 'express';
import {
  getGithubCommits,
  getGithubIssues,
  getGithubPullRequests,
  getGithubRepository,
  getGithubStatus,
} from '../controllers/github.controller';
import { asyncHandler } from '../utils/async-handler';

export const githubRouter = Router();

githubRouter.get('/status', asyncHandler(getGithubStatus));
githubRouter.get('/commits', asyncHandler(getGithubCommits));
githubRouter.get('/pull-requests', asyncHandler(getGithubPullRequests));
githubRouter.get('/issues', asyncHandler(getGithubIssues));
githubRouter.get('/repository', asyncHandler(getGithubRepository));
