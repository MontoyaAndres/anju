import * as z from 'zod';

export type JsonSchemaProperty = {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: string[];
};

export type JsonSchema = {
  type: 'object';
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
};

export const jsonSchemaToZodShape = (
  schema: JsonSchema
): Record<string, z.ZodTypeAny> => {
  const properties = schema.properties ?? {};
  const required = schema.required ?? [];

  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [key, prop] of Object.entries(properties)) {
    let field: z.ZodTypeAny;

    switch (prop.type) {
      case 'string': {
        if (prop.enum) {
          field = z.enum(prop.enum as [string, ...string[]]);
        } else {
          let str = z.string();
          if (prop.minLength !== undefined) str = str.min(prop.minLength);
          if (prop.maxLength !== undefined) str = str.max(prop.maxLength);
          if (prop.pattern !== undefined)
            str = str.regex(new RegExp(prop.pattern));
          field = str;
        }
        break;
      }
      case 'number': {
        let num = z.number();
        if (prop.minimum !== undefined) num = num.min(prop.minimum);
        if (prop.maximum !== undefined) num = num.max(prop.maximum);
        field = num;
        break;
      }
      case 'boolean':
        field = z.boolean();
        break;
      case 'array':
        field = z.array(z.any());
        break;
      case 'object':
        field = z.record(z.string(), z.any());
        break;
      default:
        field = z.any();
    }

    if (prop.description) {
      field = field.describe(prop.description);
    }

    if (!required.includes(key)) {
      field = field.optional();
    }

    shape[key] = field;
  }

  return shape;
};
