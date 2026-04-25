import { Context } from 'hono';
import { and, eq, sql } from 'drizzle-orm';
import { utils } from '@anju/utils';
import { db } from '@anju/db';

import { extractTextFromFile, reindexResourceChunks } from '../../utils';

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
  const currentValues = await utils.Schema.ARTIFACT_CREATE_RESOURCE.parseAsync({
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

    const [existingResource] = await tx
      .select()
      .from(db.schema.artifactResource)
      .where(
        and(
          eq(
            db.schema.artifactResource.artifactId,
            currentArtifactByProject.id
          ),
          eq(db.schema.artifactResource.uri, currentValues.uri)
        )
      )
      .limit(1);

    if (existingResource) {
      throw new Error('Resource URI must be unique');
    }

    const artifactResource = await tx
      .insert(db.schema.artifactResource)
      .values({
        title: currentValues.title,
        uri: currentValues.uri,
        type: currentValues.type,
        description: currentValues.description ?? null,
        mimeType: currentValues.mimeType,
        content: currentValues.content ?? null,
        size: currentValues.size ?? null,
        encoding: currentValues.encoding ?? null,
        fileKey: currentValues.fileKey ?? null,
        fileName: currentValues.fileName ?? null,
        annotations: currentValues.annotations ?? null,
        icons: currentValues.icons ?? null,
        metadata: currentValues.metadata ?? null,
        artifactId: currentArtifactByProject.id
      })
      .returning();

    await tx
      .update(db.schema.artifact)
      .set({
        artifactResourceCount: sql`(${db.schema.artifact.artifactResourceCount}::int + 1)::int`
      })
      .where(eq(db.schema.artifact.id, currentArtifactByProject.id));

    return artifactResource[0];
  });

  await reindexResourceChunks(c, {
    id: result.id,
    artifactId: result.artifactId,
    title: result.title,
    description: result.description,
    uri: result.uri,
    mimeType: result.mimeType,
    fileName: result?.fileName,
    content: result.content
  });

  return c.json(result);
};

const updateResource = async (c: Context<AppEnv>) => {
  const body = await c.req.json();
  const currentValues = await utils.Schema.ARTIFACT_UPDATE_RESOURCE.parseAsync({
    ...body,
    resourceId: c.req.param('resourceId'),
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

    const [existingResource] = await tx
      .select()
      .from(db.schema.artifactResource)
      .where(
        and(
          eq(
            db.schema.artifactResource.artifactId,
            currentArtifactByProject.id
          ),
          eq(db.schema.artifactResource.uri, currentValues.uri),
          sql`${db.schema.artifactResource.id} <> ${currentValues.resourceId}`
        )
      )
      .limit(1);

    if (existingResource) {
      throw new Error('Resource URI must be unique');
    }

    const artifactResource = await tx
      .update(db.schema.artifactResource)
      .set({
        title: currentValues.title,
        uri: currentValues.uri,
        type: currentValues.type,
        description: currentValues.description || null,
        mimeType: currentValues.mimeType,
        content: currentValues.content || null,
        size: currentValues.size,
        encoding: currentValues.encoding || null,
        fileKey: currentValues.fileKey || null,
        fileName: currentValues.fileName || null,
        annotations: currentValues.annotations || null,
        icons: currentValues.icons || null,
        metadata: currentValues.metadata || null
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

  await reindexResourceChunks(c, {
    id: result.id,
    artifactId: result.artifactId,
    title: result.title,
    description: result.description,
    uri: result.uri,
    mimeType: result.mimeType,
    fileName: result?.fileName,
    content: result.content
  });

  return c.json(result);
};

const listResources = async (c: Context<AppEnv>) => {
  const currentValues = await utils.Schema.ARTIFACT_GET_RESOURCE.parseAsync({
    projectId: c.req.param('projectId'),
    userId: c.get('user').id,
    organizationId: c.req.param('organizationId')
  });

  const dbInstance = db.create(c);

  const artifact = await dbInstance.query.artifact.findFirst({
    where: eq(db.schema.artifact.projectId, currentValues.projectId),
    with: {
      artifactResources: true
    }
  });

  if (!artifact) {
    throw new Error('Artifact not found for the project');
  }

  return c.json(artifact.artifactResources);
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

    await tx
      .update(db.schema.artifact)
      .set({
        artifactResourceCount: sql`(${db.schema.artifact.artifactResourceCount}::int - 1)::int`
      })
      .where(eq(db.schema.artifact.id, currentArtifactByProject.id));
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
    throw new Error('File size exceeds the 10MB limit');
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
        size: file.size
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

  const extractedText = await extractTextFromFile(c, file);

  await reindexResourceChunks(c, {
    id: result.id,
    artifactId: result.artifactId,
    title: result.title,
    description: result.description,
    uri: result.uri,
    mimeType: result.mimeType,
    fileName: result?.fileName,
    content: extractedText ?? result.content
  });

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

const upsertLlm = async (c: Context<AppEnv>) => {
  const body = await c.req.json();
  const currentValues = await utils.Schema.ARTIFACT_UPSERT_LLM.parseAsync({
    ...body,
    projectId: c.req.param('projectId'),
    userId: c.get('user').id,
    organizationId: c.req.param('organizationId')
  });

  const dbInstance = db.create(c);
  const encryptionKey = utils.getCredentialEncryptionKey(c);
  const encryptedApiKey = utils.encryptString(
    currentValues.apiKey,
    encryptionKey
  );

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

    if (!project) throw new Error('Project not found');

    const [artifactRow] = await tx
      .select()
      .from(db.schema.artifact)
      .where(eq(db.schema.artifact.projectId, currentValues.projectId))
      .limit(1);

    if (!artifactRow) throw new Error('Artifact not found for the project');

    const [existing] = await tx
      .select()
      .from(db.schema.artifactLlm)
      .where(eq(db.schema.artifactLlm.artifactId, artifactRow.id))
      .limit(1);

    const values = {
      provider: currentValues.provider,
      model: currentValues.model,
      baseUrl: currentValues.baseUrl || null,
      apiKey: encryptedApiKey,
      systemPrompt: currentValues.systemPrompt || null,
      config: currentValues.config || null,
      artifactId: artifactRow.id
    };

    if (existing) {
      const [updated] = await tx
        .update(db.schema.artifactLlm)
        .set(values)
        .where(eq(db.schema.artifactLlm.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await tx
      .insert(db.schema.artifactLlm)
      .values(values)
      .returning();
    return created;
  });

  const { apiKey: _k, ...safe } = result;
  return c.json({ ...safe, hasApiKey: true });
};

const getLlm = async (c: Context<AppEnv>) => {
  const currentValues = await utils.Schema.ARTIFACT_GET_LLM.parseAsync({
    projectId: c.req.param('projectId'),
    userId: c.get('user').id,
    organizationId: c.req.param('organizationId')
  });

  const dbInstance = db.create(c);

  const artifact = await dbInstance.query.artifact.findFirst({
    where: eq(db.schema.artifact.projectId, currentValues.projectId),
    with: { artifactLlm: true }
  });

  if (!artifact) throw new Error('Artifact not found for the project');
  if (!artifact.artifactLlm) return c.json(null);

  const { apiKey: _k, ...safe } = artifact.artifactLlm;
  return c.json({ ...safe, hasApiKey: true });
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
  createTool,
  updateTool,
  removeTool,
  listTools,
  removeCredential,
  listCredentials,
  upsertLlm,
  getLlm
};
