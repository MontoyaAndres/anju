import { and, eq, type SQL } from 'drizzle-orm';
import { db } from '@anju/db';
import type { Database } from '@anju/db';

// The transaction handle drizzle passes to `db.create(c).transaction(tx => …)`.
// Derived from the Database type so the conflict check can run inside the same
// transaction as the channel insert.
type ChannelTransaction = Parameters<
  Parameters<Database['transaction']>[0]
>[0];

interface ChannelConflictOptions {
  // The platform of the channel being created (CHANNEL_PLATFORM_*).
  platform: string;
  // Predicate(s) that match an already-connected channel with the same bot
  // identity — e.g. the bot id encoded in `metadata`. ANDed with the platform.
  match: SQL[];
  // How to name the bot/app in the error, e.g. `Telegram bot @foo`.
  subject: string;
  // The noun for the "use a different X" hint — `bot` or `app`.
  noun: string;
  userId: string;
  organizationId: string;
}

// A bot/app may only be connected to one project at a time. If the same bot
// identity is already connected, throw an actionable error scoped to what the
// caller can see: their own org (where it lives + how to remove it), another
// org they belong to (named), or one they don't (kept vague). Shared by every
// platform's create path — they differ only in the match predicate and wording.
export const assertNoChannelConflict = async (
  tx: ChannelTransaction,
  options: ChannelConflictOptions
): Promise<void> => {
  const [conflict] = await tx
    .select({
      projectName: db.schema.project.name,
      organizationId: db.schema.project.organizationId,
      organizationName: db.schema.organization.name
    })
    .from(db.schema.channel)
    .innerJoin(
      db.schema.artifact,
      eq(db.schema.channel.artifactId, db.schema.artifact.id)
    )
    .innerJoin(
      db.schema.project,
      eq(db.schema.artifact.projectId, db.schema.project.id)
    )
    .innerJoin(
      db.schema.organization,
      eq(db.schema.project.organizationId, db.schema.organization.id)
    )
    .where(
      and(eq(db.schema.channel.platform, options.platform), ...options.match)
    )
    .limit(1);

  if (!conflict) return;

  if (conflict.organizationId === options.organizationId) {
    throw new Error(
      `${options.subject} is already connected to project "${conflict.projectName}" in this organization. Remove it there first or use a different ${options.noun}.`
    );
  }

  const [membership] = await tx
    .select({ organizationId: db.schema.organizationUser.organizationId })
    .from(db.schema.organizationUser)
    .where(
      and(
        eq(db.schema.organizationUser.userId, options.userId),
        eq(db.schema.organizationUser.organizationId, conflict.organizationId)
      )
    )
    .limit(1);

  if (membership) {
    throw new Error(
      `${options.subject} is already connected to project "${conflict.projectName}" in your organization "${conflict.organizationName}". Remove it there first or use a different ${options.noun}.`
    );
  }

  throw new Error(
    `${options.subject} is already connected to a project in another organization you don't have access to. Use a different ${options.noun}.`
  );
};
