import { z } from 'zod';

const ORGANIZATION_CREATE = z.object({
  userId: z.uuid(),
  name: z.string().min(3).max(100),
  projectName: z.string().min(3).max(100),
  projectDescription: z.string().max(500),
});

const ORGANIZATION_CREATE_VIEW = z.object({
  name: z.string().min(3).max(100),
  projectName: z.string().min(3).max(100),
  projectDescription: z.string().max(500),
});

const ORGANIZATION_UPDATE = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  name: z.string().min(3).max(100),
});

const ORGANIZATION_GET = z.object({
  id: z.uuid(),
  userId: z.uuid(),
});

const AUTH_USER_GET = z.object({
  userId: z.uuid(),
});

const PROJECT_CREATE = z.object({
  userId: z.uuid(),
  organizationId: z.uuid(),
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
});

const PROJECT_UPDATE = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  organizationId: z.uuid(),
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
});

const PROJECT_GET = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  userId: z.uuid(),
});

const ARTIFACT_CREATE_PROMPT = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  schema: z.looseObject({}),
  projectId: z.uuid(),
  userId: z.uuid(),
  organizationId: z.uuid(),
});

const ARTIFACT_REMOVE_PROMPT = z.object({
  promptId: z.uuid(),
  projectId: z.uuid(),
  userId: z.uuid(),
  organizationId: z.uuid(),
});

export const Schema = {
  ORGANIZATION_CREATE,
  ORGANIZATION_CREATE_VIEW,
  ORGANIZATION_UPDATE,
  ORGANIZATION_GET,
  AUTH_USER_GET,
  PROJECT_CREATE,
  PROJECT_UPDATE,
  PROJECT_GET,
  ARTIFACT_CREATE_PROMPT,
  ARTIFACT_REMOVE_PROMPT,
};
