import { z } from 'zod';

const ORGANIZATION_CREATE = z.object({
  userId: z.string().uuid(),
  name: z.string().min(3).max(100),
  projectName: z.string().min(3).max(100),
  projectDescription: z.string().max(500),
});

const ORGANIZATION_UPDATE = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(3).max(100),
});

const ORGANIZATION_GET = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
});

const AUTH_USER_GET = z.object({
  userId: z.string().uuid(),
});

const PROJECT_CREATE = z.object({
  userId: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
});

const PROJECT_UPDATE = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
});

const PROJECT_GET = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const Schema = {
  ORGANIZATION_CREATE,
  ORGANIZATION_UPDATE,
  ORGANIZATION_GET,
  AUTH_USER_GET,
  PROJECT_CREATE,
  PROJECT_UPDATE,
  PROJECT_GET,
};
