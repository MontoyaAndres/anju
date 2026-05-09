import { Context } from 'hono';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { utils } from '@anju/utils';
import { db } from '@anju/db';

import { enqueueIndex, enqueueCrawlDiscover } from '../../utils';

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

const createResource = async (c: Context<AppEnv>) => {
  const body = await c.req.json();
  const projectId = c.req.param('projectId');
  const organizationId = c.req.param('organizationId');
  const userId = c.get('user').id;
  const isWebsite =
    body?.sourceType === utils.constants.RESOURCE_SOURCE_TYPE_WEBSITE;

  const dbInstance = db.create(c);

  const result = await dbInstance.transaction(async tx => {
    const [project] = await tx
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

    const [currentArtifactByProject] = await tx
      .select()
      .from(db.schema.artifact)
      .where(eq(db.schema.artifact.projectId, projectId))
      .limit(1);

    if (!currentArtifactByProject) {
      throw new Error('Artifact not found for the project');
    }

    if (isWebsite) {
      const websiteValues =
        await utils.Schema.ARTIFACT_CREATE_WEBSITE.parseAsync({
          ...body,
          projectId,
          userId,
          organizationId
        });

      const [conflicting] = await tx
        .select()
        .from(db.schema.artifactResource)
        .where(
          and(
            eq(
              db.schema.artifactResource.artifactId,
              currentArtifactByProject.id
            ),
            eq(db.schema.artifactResource.uri, websiteValues.uri)
          )
        )
        .limit(1);

      if (conflicting) {
        throw new Error('Resource URI must be unique');
      }

      const [created] = await tx
        .insert(db.schema.artifactResource)
        .values({
          title: websiteValues.title,
          uri: websiteValues.uri,
          type: utils.constants.RESOURCE_TYPE_STATIC,
          sourceType: utils.constants.RESOURCE_SOURCE_TYPE_WEBSITE,
          status: utils.constants.STATUS_PENDING,
          description: websiteValues.description ?? null,
          mimeType: utils.constants.MIMETYPE_TEXT,
          crawlConfig: websiteValues.crawlConfig,
          artifactId: currentArtifactByProject.id
        })
        .returning();

      await tx
        .update(db.schema.artifact)
        .set({
          artifactResourceCount: sql`(${db.schema.artifact.artifactResourceCount}::int + 1)::int`
        })
        .where(eq(db.schema.artifact.id, currentArtifactByProject.id));

      return created;
    }

    const fileValues = await utils.Schema.ARTIFACT_CREATE_RESOURCE.parseAsync({
      ...body,
      projectId,
      userId,
      organizationId
    });

    const [conflicting] = await tx
      .select()
      .from(db.schema.artifactResource)
      .where(
        and(
          eq(
            db.schema.artifactResource.artifactId,
            currentArtifactByProject.id
          ),
          eq(db.schema.artifactResource.uri, fileValues.uri)
        )
      )
      .limit(1);

    if (conflicting) {
      throw new Error('Resource URI must be unique');
    }

    const [created] = await tx
      .insert(db.schema.artifactResource)
      .values({
        title: fileValues.title,
        uri: fileValues.uri,
        type: fileValues.type,
        sourceType: fileValues.sourceType,
        status: utils.constants.STATUS_PENDING,
        description: fileValues.description ?? null,
        mimeType: fileValues.mimeType,
        content: fileValues.content ?? null,
        size: fileValues.size ?? null,
        encoding: fileValues.encoding ?? null,
        fileKey: fileValues.fileKey ?? null,
        fileName: fileValues.fileName ?? null,
        annotations: fileValues.annotations ?? null,
        icons: fileValues.icons ?? null,
        metadata: fileValues.metadata ?? null,
        crawlConfig: fileValues.crawlConfig ?? null,
        artifactId: currentArtifactByProject.id
      })
      .returning();

    await tx
      .update(db.schema.artifact)
      .set({
        artifactResourceCount: sql`(${db.schema.artifact.artifactResourceCount}::int + 1)::int`
      })
      .where(eq(db.schema.artifact.id, currentArtifactByProject.id));

    return created;
  });

  if (isWebsite) {
    await enqueueCrawlDiscover(c.env, result.id);
  } else {
    await enqueueIndex(c.env, result.id);
  }

  return c.json(result);
};

const updateResource = async (c: Context<AppEnv>) => {
  const body = await c.req.json();
  const projectId = c.req.param('projectId');
  const organizationId = c.req.param('organizationId');
  const resourceId = c.req.param('resourceId');
  const userId = c.get('user').id;

  const dbInstance = db.create(c);

  const { result, isWebsite } = await dbInstance.transaction(async tx => {
    const [project] = await tx
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

    const [currentArtifactByProject] = await tx
      .select()
      .from(db.schema.artifact)
      .where(eq(db.schema.artifact.projectId, projectId))
      .limit(1);

    if (!currentArtifactByProject) {
      throw new Error('Artifact not found for the project');
    }

    const [existing] = await tx
      .select()
      .from(db.schema.artifactResource)
      .where(
        and(
          eq(db.schema.artifactResource.id, resourceId),
          eq(db.schema.artifactResource.artifactId, currentArtifactByProject.id)
        )
      )
      .limit(1);

    if (!existing) {
      throw new Error('Resource not found');
    }

    if (
      existing.sourceType === utils.constants.RESOURCE_SOURCE_TYPE_WEBSITE
    ) {
      const websiteValues =
        await utils.Schema.ARTIFACT_UPDATE_WEBSITE.parseAsync({
          ...body,
          resourceId,
          projectId,
          userId,
          organizationId
        });

      const [updated] = await tx
        .update(db.schema.artifactResource)
        .set({
          title: websiteValues.title,
          description: websiteValues.description ?? null
        })
        .where(eq(db.schema.artifactResource.id, resourceId))
        .returning();

      return { result: updated, isWebsite: true };
    }

    const fileValues = await utils.Schema.ARTIFACT_UPDATE_RESOURCE.parseAsync({
      ...body,
      resourceId,
      projectId,
      userId,
      organizationId
    });

    const [conflicting] = await tx
      .select()
      .from(db.schema.artifactResource)
      .where(
        and(
          eq(
            db.schema.artifactResource.artifactId,
            currentArtifactByProject.id
          ),
          eq(db.schema.artifactResource.uri, fileValues.uri),
          sql`${db.schema.artifactResource.id} <> ${resourceId}`
        )
      )
      .limit(1);

    if (conflicting) {
      throw new Error('Resource URI must be unique');
    }

    const [updated] = await tx
      .update(db.schema.artifactResource)
      .set({
        title: fileValues.title,
        uri: fileValues.uri,
        type: fileValues.type,
        sourceType: fileValues.sourceType,
        status: utils.constants.STATUS_PENDING,
        description: fileValues.description || null,
        mimeType: fileValues.mimeType,
        content: fileValues.content || null,
        size: fileValues.size ?? null,
        encoding: fileValues.encoding || null,
        annotations: fileValues.annotations || null,
        icons: fileValues.icons || null,
        ...(fileValues.fileKey !== undefined && {
          fileKey: fileValues.fileKey
        }),
        ...(fileValues.fileName !== undefined && {
          fileName: fileValues.fileName
        }),
        ...(fileValues.metadata !== undefined && {
          metadata: fileValues.metadata
        })
      })
      .where(
        and(
          eq(db.schema.artifactResource.id, resourceId),
          eq(db.schema.artifactResource.artifactId, currentArtifactByProject.id)
        )
      )
      .returning();

    if (!updated) {
      throw new Error('Resource not found');
    }

    return { result: updated, isWebsite: false };
  });

  if (!isWebsite) {
    await enqueueIndex(c.env, result.id);
  }

  return c.json(result);
};

const listResources = async (c: Context<AppEnv>) => {
  const currentValues = await utils.Schema.ARTIFACT_GET_RESOURCE.parseAsync({
    projectId: c.req.param('projectId'),
    userId: c.get('user').id,
    organizationId: c.req.param('organizationId')
  });

  const parentResourceId = c.req.query('parentResourceId') || null;

  const dbInstance = db.create(c);

  const [artifactRow] = await dbInstance
    .select()
    .from(db.schema.artifact)
    .where(eq(db.schema.artifact.projectId, currentValues.projectId))
    .limit(1);

  if (!artifactRow) {
    throw new Error('Artifact not found for the project');
  }

  const list = await dbInstance
    .select()
    .from(db.schema.artifactResource)
    .where(
      and(
        eq(db.schema.artifactResource.artifactId, artifactRow.id),
        parentResourceId
          ? eq(
              db.schema.artifactResource.parentResourceId,
              parentResourceId
            )
          : isNull(db.schema.artifactResource.parentResourceId)
      )
    );

  return c.json(list);
};

const removeResource = async (c: Context<AppEnv>) => {
  const currentValues = await utils.Schema.ARTIFACT_REMOVE_RESOURCE.parseAsync({
    projectId: c.req.param('projectId'),
    userId: c.get('user').id,
    organizationId: c.req.param('organizationId'),
    resourceId: c.req.param('resourceId')
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

    const [{ count: childCount }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(db.schema.artifactResource)
      .where(
        eq(db.schema.artifactResource.parentResourceId, currentValues.resourceId)
      );

    const deleteResource = await tx
      .delete(db.schema.artifactResource)
      .where(
        and(
          eq(db.schema.artifactResource.id, currentValues.resourceId),
          eq(db.schema.artifactResource.artifactId, currentArtifactByProject.id)
        )
      )
      .returning();

    if (deleteResource.length === 0) {
      throw new Error('Resource not found');
    }

    const removedCount = 1 + Number(childCount || 0);

    await tx
      .update(db.schema.artifact)
      .set({
        artifactResourceCount: sql`(${db.schema.artifact.artifactResourceCount}::int - ${removedCount})::int`
      })
      .where(eq(db.schema.artifact.id, currentArtifactByProject.id));

    const removed = deleteResource[0];
    if (removed.parentResourceId) {
      await tx
        .update(db.schema.artifactResource)
        .set({
          childResourceCount: sql`GREATEST(${db.schema.artifactResource.childResourceCount}::int - 1, 0)`
        })
        .where(
          eq(db.schema.artifactResource.id, removed.parentResourceId)
        );
    }
  });

  return c.json(currentValues);
};

const createTool = async (c: Context<AppEnv>) => {
  const body = await c.req.json();
  const currentValues = await utils.Schema.ARTIFACT_CREATE_TOOL.parseAsync({
    ...body,
    projectId: c.req.param('projectId'),
    userId: c.get('user').id,
    organizationId: c.req.param('organizationId')
  });

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

    const [toolDef] = await tx
      .select()
      .from(db.schema.toolDefinition)
      .where(eq(db.schema.toolDefinition.id, currentValues.toolDefinitionId))
      .limit(1);

    if (!toolDef) {
      throw new Error('Tool definition not found');
    }

    const artifactTool = await tx
      .insert(db.schema.artifactTool)
      .values({
        toolDefinitionId: currentValues.toolDefinitionId,
        config: currentValues.config || null,
        metadata: currentValues.metadata || null,
        artifactId: currentArtifactByProject.id
      })
      .returning();

    await tx
      .update(db.schema.artifact)
      .set({
        artifactToolCount: sql`(${db.schema.artifact.artifactToolCount}::int + 1)::int`
      })
      .where(eq(db.schema.artifact.id, currentArtifactByProject.id));

    return artifactTool[0];
  });

  return c.json(result);
};

const updateTool = async (c: Context<AppEnv>) => {
  const body = await c.req.json();
  const currentValues = await utils.Schema.ARTIFACT_UPDATE_TOOL.parseAsync({
    ...body,
    toolId: c.req.param('toolId'),
    projectId: c.req.param('projectId'),
    userId: c.get('user').id,
    organizationId: c.req.param('organizationId')
  });

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

    const artifactTool = await tx
      .update(db.schema.artifactTool)
      .set({
        config: currentValues.config || null,
        metadata: currentValues.metadata || null
      })
      .where(
        and(
          eq(db.schema.artifactTool.id, currentValues.toolId),
          eq(db.schema.artifactTool.artifactId, currentArtifactByProject.id)
        )
      )
      .returning();

    if (!artifactTool[0]) {
      throw new Error('Tool not found');
    }

    return artifactTool[0];
  });

  return c.json(result);
};

const listTools = async (c: Context<AppEnv>) => {
  const currentValues = await utils.Schema.ARTIFACT_GET_TOOL.parseAsync({
    projectId: c.req.param('projectId'),
    userId: c.get('user').id,
    organizationId: c.req.param('organizationId')
  });

  const dbInstance = db.create(c);

  const artifact = await dbInstance.query.artifact.findFirst({
    where: eq(db.schema.artifact.projectId, currentValues.projectId),
    with: {
      artifactTools: {
        with: {
          toolDefinition: {
            with: {
              group: true
            }
          }
        }
      }
    }
  });

  if (!artifact) {
    throw new Error('Artifact not found for the project');
  }

  return c.json(artifact.artifactTools);
};

const removeTool = async (c: Context<AppEnv>) => {
  const currentValues = await utils.Schema.ARTIFACT_REMOVE_TOOL.parseAsync({
    projectId: c.req.param('projectId'),
    userId: c.get('user').id,
    organizationId: c.req.param('organizationId'),
    toolId: c.req.param('toolId')
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

    const deleteTool = await tx
      .delete(db.schema.artifactTool)
      .where(
        and(
          eq(db.schema.artifactTool.id, currentValues.toolId),
          eq(db.schema.artifactTool.artifactId, currentArtifactByProject.id)
        )
      )
      .returning();

    if (deleteTool.length === 0) {
      throw new Error('Tool not found');
    }

    await tx
      .update(db.schema.artifact)
      .set({
        artifactToolCount: sql`(${db.schema.artifact.artifactToolCount}::int - 1)::int`
      })
      .where(eq(db.schema.artifact.id, currentArtifactByProject.id));
  });

  return c.json(currentValues);
};

const uploadResourceFile = async (c: Context<AppEnv>) => {
  const currentValues =
    await utils.Schema.ARTIFACT_UPLOAD_RESOURCE_FILE.parseAsync({
      resourceId: c.req.param('resourceId'),
      projectId: c.req.param('projectId'),
      userId: c.get('user').id,
      organizationId: c.req.param('organizationId')
    });

  const formData = await c.req.formData();
  const file = formData.get('file');

  if (!file || !(file instanceof File)) {
    throw new Error('File is required');
  }

  if (file.size > utils.constants.MAX_FILE_SIZE) {
    throw new Error(
      `File size exceeds the ${utils.constants.MAX_FILE_SIZE / (1024 * 1024)}MB limit`
    );
  }

  if (!(utils.constants.MIMETYPES as readonly string[]).includes(file.type)) {
    throw new Error(`Unsupported mime type: ${file.type}`);
  }

  const dbInstance = db.create(c);
  const bucket = c.env.STORAGE_BUCKET;

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

    const key = `organizations/${currentValues.organizationId}/projects/${currentValues.projectId}/resources/${currentArtifactByProject.id}/${file.name}`;

    if (bucket) {
      await bucket.put(key, await file.arrayBuffer(), {
        httpMetadata: { contentType: file.type }
      });
    }

    const artifactResource = await tx
      .update(db.schema.artifactResource)
      .set({
        fileKey: key,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        status: utils.constants.STATUS_PENDING
      })
      .where(
        and(
          eq(db.schema.artifactResource.id, currentValues.resourceId),
          eq(db.schema.artifactResource.artifactId, currentArtifactByProject.id)
        )
      )
      .returning();

    if (!artifactResource[0]) {
      throw new Error('Resource not found');
    }

    return artifactResource[0];
  });

  await enqueueIndex(c.env, result.id);

  return c.json(result);
};

const listCredentials = async (c: Context<AppEnv>) => {
  const currentValues = await utils.Schema.ARTIFACT_GET_CREDENTIAL.parseAsync({
    projectId: c.req.param('projectId'),
    userId: c.get('user').id,
    organizationId: c.req.param('organizationId')
  });

  const dbInstance = db.create(c);

  const artifact = await dbInstance.query.artifact.findFirst({
    where: eq(db.schema.artifact.projectId, currentValues.projectId),
    with: {
      artifactCredentials: true
    }
  });

  if (!artifact) {
    throw new Error('Artifact not found for the project');
  }

  return c.json(
    artifact.artifactCredentials.map(
      ({ accessToken: _a, refreshToken, ...rest }) => ({
        ...rest,
        hasRefreshToken: Boolean(refreshToken)
      })
    )
  );
};

const removeCredential = async (c: Context<AppEnv>) => {
  const currentValues =
    await utils.Schema.ARTIFACT_REMOVE_CREDENTIAL.parseAsync({
      projectId: c.req.param('projectId'),
      userId: c.get('user').id,
      organizationId: c.req.param('organizationId'),
      credentialId: c.req.param('credentialId')
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

    const deleteCredential = await tx
      .delete(db.schema.artifactCredential)
      .where(
        and(
          eq(db.schema.artifactCredential.id, currentValues.credentialId),
          eq(
            db.schema.artifactCredential.artifactId,
            currentArtifactByProject.id
          )
        )
      )
      .returning();

    if (deleteCredential.length === 0) {
      throw new Error('Credential not found');
    }

    await tx
      .update(db.schema.artifact)
      .set({
        artifactCredentialCount: sql`(${db.schema.artifact.artifactCredentialCount}::int - 1)::int`
      })
      .where(eq(db.schema.artifact.id, currentArtifactByProject.id));
  });

  return c.json(currentValues);
};

const downloadResourceFile = async (c: Context<AppEnv>) => {
  const currentValues =
    await utils.Schema.ARTIFACT_DOWNLOAD_RESOURCE_FILE.parseAsync({
      resourceId: c.req.param('resourceId'),
      projectId: c.req.param('projectId'),
      userId: c.get('user').id,
      organizationId: c.req.param('organizationId')
    });

  const dbInstance = db.create(c);
  const bucket = c.env.STORAGE_BUCKET;

  const [currentArtifactByProject] = await dbInstance
    .select()
    .from(db.schema.artifact)
    .where(eq(db.schema.artifact.projectId, currentValues.projectId))
    .limit(1);

  if (!currentArtifactByProject) {
    throw new Error('Artifact not found for the project');
  }

  const [resource] = await dbInstance
    .select()
    .from(db.schema.artifactResource)
    .where(
      and(
        eq(db.schema.artifactResource.id, currentValues.resourceId),
        eq(db.schema.artifactResource.artifactId, currentArtifactByProject.id)
      )
    )
    .limit(1);

  if (!resource) {
    throw new Error('Resource not found');
  }

  if (!resource.fileKey) {
    throw new Error('Resource has no file');
  }

  if (!bucket) {
    throw new Error('Storage not available');
  }

  const object = await bucket.get(resource.fileKey);

  if (!object) {
    throw new Error('File not found in storage');
  }

  const fileName = resource.fileKey.split('/').pop() || resource.title;

  return new Response(object.body as unknown as ReadableStream, {
    headers: {
      'Content-Type': resource.mimeType,
      'Content-Disposition': `inline; filename="${fileName}"`,
      'Cache-Control': 'private, max-age=3600'
    }
  });
};

const updateResourceShowSource = async (c: Context<AppEnv>) => {
  const body = await c.req.json();
  const currentValues =
    await utils.Schema.ARTIFACT_UPDATE_RESOURCE_SHOW_SOURCE.parseAsync({
      ...body,
      resourceId: c.req.param('resourceId'),
      projectId: c.req.param('projectId'),
      userId: c.get('user').id,
      organizationId: c.req.param('organizationId')
    });

  const dbInstance = db.create(c);

  const [currentArtifactByProject] = await dbInstance
    .select()
    .from(db.schema.artifact)
    .where(eq(db.schema.artifact.projectId, currentValues.projectId))
    .limit(1);

  if (!currentArtifactByProject) {
    throw new Error('Artifact not found for the project');
  }

  const [updated] = await dbInstance
    .update(db.schema.artifactResource)
    .set({ showSource: currentValues.showSource })
    .where(
      and(
        eq(db.schema.artifactResource.id, currentValues.resourceId),
        eq(db.schema.artifactResource.artifactId, currentArtifactByProject.id)
      )
    )
    .returning();

  if (!updated) {
    throw new Error('Resource not found');
  }

  return c.json(updated);
};


export const ArtifactController = {
  createPrompt,
  updatePrompt,
  removePrompt,
  listPrompts,
  createResource,
  updateResource,
  removeResource,
  listResources,
  uploadResourceFile,
  downloadResourceFile,
  updateResourceShowSource,
  createTool,
  updateTool,
  removeTool,
  listTools,
  removeCredential,
  listCredentials
};
