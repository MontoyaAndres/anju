import { Context } from 'hono';
import { and, eq, sql } from 'drizzle-orm';
import { utils } from '@anju/utils';
import { db } from '@anju/db';

// types
import { AppEnv } from '../../types';

const createPrompt = async (c: Context<AppEnv>) => {
  const body = await c.req.json();
  const currentValues = await utils.Schema.ARTIFACT_CREATE_PROMPT.parseAsync({
    ...body,
    projectId: c.req.param('projectId'),
    userId: c.get('user').id,
    organizationId: c.req.param('organizationId')
  });

  utils.validateMessageVariables(currentValues.messages, currentValues.schema);

  const dbInstance = db.create(c);

  const result = await dbInstance.transaction(async tx => {
    const [project] = await tx
      .select()
      .from(db.schema.project)
      .where(
        and(
          eq(db.schema.project.id, currentValues.projectId),
          eq(db.schema.project.organizationId, currentValues.organizationId)
        )
      )
      .limit(1);

    if (!project) {
      throw new Error('Project not found');
    }

    const [currentArtifactByProject] = await tx
      .select()
      .from(db.schema.artifact)
      .where(eq(db.schema.artifact.projectId, currentValues.projectId))
      .limit(1);

    if (!currentArtifactByProject) {
      throw new Error('Artifact not found for the project');
    }

    const artifactPrompt = await tx
      .insert(db.schema.artifactPrompt)
      .values({
        title: currentValues.title,
        description: currentValues.description || null,
        messages: currentValues.messages,
        schema: currentValues.schema,
        artifactId: currentArtifactByProject.id
      })
      .returning();

    await tx
      .update(db.schema.artifact)
      .set({
        artifactPromptCount: sql`(${db.schema.artifact.artifactPromptCount}::int + 1)::int`
      })
      .where(eq(db.schema.artifact.id, currentArtifactByProject.id));

    return artifactPrompt[0];
  });

  return c.json(result);
};

const updatePrompt = async (c: Context<AppEnv>) => {
  const body = await c.req.json();
  const currentValues = await utils.Schema.ARTIFACT_UPDATE_PROMPT.parseAsync({
    ...body,
    promptId: c.req.param('promptId'),
    projectId: c.req.param('projectId'),
    userId: c.get('user').id,
    organizationId: c.req.param('organizationId')
  });

  utils.validateMessageVariables(currentValues.messages, currentValues.schema);

  const dbInstance = db.create(c);

  const result = await dbInstance.transaction(async tx => {
    const [project] = await tx
      .select()
      .from(db.schema.project)
      .where(
        and(
          eq(db.schema.project.id, currentValues.projectId),
          eq(db.schema.project.organizationId, currentValues.organizationId)
        )
      )
      .limit(1);

    if (!project) {
      throw new Error('Project not found');
    }

    const [currentArtifactByProject] = await tx
      .select()
      .from(db.schema.artifact)
      .where(eq(db.schema.artifact.projectId, currentValues.projectId))
      .limit(1);

    if (!currentArtifactByProject) {
      throw new Error('Artifact not found for the project');
    }

    const artifactPrompt = await tx
      .update(db.schema.artifactPrompt)
      .set({
        title: currentValues.title,
        description: currentValues.description || null,
        messages: currentValues.messages,
        schema: currentValues.schema
      })
      .where(
        and(
          eq(db.schema.artifactPrompt.id, currentValues.promptId),
          eq(db.schema.artifactPrompt.artifactId, currentArtifactByProject.id)
        )
      )
      .returning();

    if (!artifactPrompt[0]) {
      throw new Error('Prompt not found');
    }

    return artifactPrompt[0];
  });

  return c.json(result);
};

const listPrompts = async (c: Context<AppEnv>) => {
  const currentValues = await utils.Schema.ARTIFACT_GET_PROMPT.parseAsync({
    projectId: c.req.param('projectId'),
    userId: c.get('user').id,
    organizationId: c.req.param('organizationId')
  });

  const dbInstance = db.create(c);

  const artifact = await dbInstance.query.artifact.findFirst({
    where: eq(db.schema.artifact.projectId, currentValues.projectId),
    with: {
      artifactPrompts: true
    }
  });

  if (!artifact) {
    throw new Error('Artifact not found for the project');
  }

  return c.json(artifact.artifactPrompts);
};

const removePrompt = async (c: Context<AppEnv>) => {
  const currentValues = await utils.Schema.ARTIFACT_REMOVE_PROMPT.parseAsync({
    projectId: c.req.param('projectId'),
    userId: c.get('user').id,
    organizationId: c.req.param('organizationId'),
    promptId: c.req.param('promptId')
  });

  const dbInstance = db.create(c);

  await dbInstance.transaction(async tx => {
    const [project] = await tx
      .select()
      .from(db.schema.project)
      .where(
        and(
          eq(db.schema.project.id, currentValues.projectId),
          eq(db.schema.project.organizationId, currentValues.organizationId)
        )
      )
      .limit(1);

    if (!project) {
      throw new Error('Project not found');
    }

    const [currentArtifactByProject] = await tx
      .select()
      .from(db.schema.artifact)
      .where(eq(db.schema.artifact.projectId, currentValues.projectId))
      .limit(1);

    if (!currentArtifactByProject) {
      throw new Error('Artifact not found for the project');
    }

    const deletePrompt = await tx
      .delete(db.schema.artifactPrompt)
      .where(
        and(
          eq(db.schema.artifactPrompt.id, currentValues.promptId),
          eq(db.schema.artifactPrompt.artifactId, currentArtifactByProject.id)
        )
      )
      .returning();

    if (deletePrompt.length === 0) {
      throw new Error('Prompt not found');
    }

    await tx
      .update(db.schema.artifact)
      .set({
        artifactPromptCount: sql`(${db.schema.artifact.artifactPromptCount}::int - 1)::int`
      })
      .where(eq(db.schema.artifact.id, currentArtifactByProject.id));
  });

  return c.json(currentValues);
};

export const ArtifactController = {
  createPrompt,
  updatePrompt,
  removePrompt,
  listPrompts
};
