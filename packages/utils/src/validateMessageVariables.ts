export const validateMessageVariables = (
  messages: Array<{ role: string; content: string }>,
  schema: { properties?: Record<string, unknown> }
) => {
  const schemaKeys = Object.keys(schema.properties ?? {});
  const variablePattern = /\{\{(\w+)\}\}/g;

  for (const msg of messages) {
    let match;
    while ((match = variablePattern.exec(msg.content)) !== null) {
      if (!schemaKeys.includes(match[1])) {
        throw new Error(
          `Variable "{{${match[1]}}}" in message is not defined in schema properties`
        );
      }
    }
  }
};
