import { z } from 'zod';

import { constants } from './constants';

const SCHEMA_DEFINITION = z.object({
  type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
  properties: z.record(z.string(), z.any()).optional(),
  required: z.array(z.string()).optional(),
  items: z.any().optional(),
  minimum: z.number().optional(),
  maximum: z.number().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  pattern: z.string().optional(),
  enum: z.array(z.any()).optional()
});

const ORGANIZATION_CREATE = z.object({
  userId: z.uuid(),
  name: z.string().min(3).max(100),
  projectName: z.string().min(3).max(100),
  projectDescription: z.string().max(500)
});

const ORGANIZATION_CREATE_VIEW = z.object({
  name: z.string().min(3).max(100),
  projectName: z.string().min(3).max(100),
  projectDescription: z.string().max(500)
});

const ORGANIZATION_UPDATE = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  name: z.string().min(3).max(100)
});

const ORGANIZATION_GET = z.object({
  id: z.uuid(),
  userId: z.uuid()
});

const AUTH_USER_GET = z.object({
  userId: z.uuid()
});

const PROJECT_CREATE = z.object({
  userId: z.uuid(),
  organizationId: z.uuid(),
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional()
});

const PROJECT_UPDATE = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  organizationId: z.uuid(),
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional()
});

const PROJECT_GET = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  userId: z.uuid()
});

const ARTIFACT_CREATE_PROMPT = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(constants.ROLE_MESSAGES),
        content: z.string()
      })
    )
    .min(1),
  schema: SCHEMA_DEFINITION,
  projectId: z.uuid(),
  userId: z.uuid(),
  organizationId: z.uuid()
});

const ARTIFACT_UPDATE_PROMPT = z.object({
  promptId: z.uuid(),
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(constants.ROLE_MESSAGES),
        content: z.string()
      })
    )
    .min(1),
  schema: SCHEMA_DEFINITION,
  projectId: z.uuid(),
  userId: z.uuid(),
  organizationId: z.uuid()
});

const ARTIFACT_REMOVE_PROMPT = z.object({
  promptId: z.uuid(),
  projectId: z.uuid(),
  userId: z.uuid(),
  organizationId: z.uuid()
});

const ARTIFACT_GET_PROMPT = z.object({
  projectId: z.uuid(),
  userId: z.uuid(),
  organizationId: z.uuid()
});

const BUSINESS_QUERY = z.object({
  hash: z.string().length(8).min(8).max(8)
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
  ARTIFACT_UPDATE_PROMPT,
  ARTIFACT_GET_PROMPT,
  ARTIFACT_REMOVE_PROMPT,
  BUSINESS_QUERY
};
