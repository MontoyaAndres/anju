import { Context } from 'hono';
import { and, eq } from 'drizzle-orm';
import { utils } from '@anju/utils';
import { db } from '@anju/db';

import { getCalendarAccessToken, listCalendars } from '../../utils';

import type { AppEnv } from '../../types';

const PROVIDER = utils.constants.OAUTH_PROVIDER_GOOGLE_CALENDAR;

const calendars = async (c: Context<AppEnv>) => {
  const projectId = c.req.param('projectId');
  const organizationId = c.req.param('organizationId');

  const dbInstance = db.create(c);

  const [project] = await dbInstance
    .select()
    .from(db.schema.project)
    .where(
      and(
        eq(db.schema.project.id, projectId),
        eq(db.schema.project.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!project) {
    throw new Error('Project not found');
  }

  const [artifactRow] = await dbInstance
    .select()
    .from(db.schema.artifact)
    .where(eq(db.schema.artifact.projectId, projectId))
    .limit(1);

  if (!artifactRow) {
    throw new Error('Artifact not found for the project');
  }

  const [credential] = await dbInstance
    .select({
      id: db.schema.artifactCredential.id,
      metadata: db.schema.artifactCredential.metadata
    })
    .from(db.schema.artifactCredential)
    .where(
      and(
        eq(db.schema.artifactCredential.artifactId, artifactRow.id),
        eq(db.schema.artifactCredential.provider, PROVIDER)
      )
    )
    .limit(1);

  if (!credential) {
    throw new Error('Connect Google Calendar for this project first.');
  }

  if (utils.isCredentialNeedingReauth(credential.metadata)) {
    throw new Error('Google Calendar credential needs reauth for this project.');
  }

  const accessToken = await getCalendarAccessToken(c, artifactRow.id);
  const items = await listCalendars(accessToken);

  return c.json({ calendars: items });
};

export const GoogleCalendarController = {
  calendars
};
