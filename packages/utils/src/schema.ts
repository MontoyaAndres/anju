import { z } from 'zod';

const ORGANIZATION_CREATE = z.object({
  userId: z.string().uuid(),
  name: z.string().min(3).max(100),
  projectName: z.string().min(3).max(100).optional(),
});

const ORGANIZATION_UPDATE = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(3).max(100),
});

export const Schema = {
  ORGANIZATION_CREATE,
  ORGANIZATION_UPDATE,
};
