import { errorResponse } from '../utils/response.js';

/**
 * Express middleware factory: Validate request body against a Zod schema.
 * @param {import('zod').ZodSchema} schema 
 * @param {'body' | 'query' | 'params'} source - Where to read data from
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'Request validation failed', details);
    }
    // Replace with parsed (and coerced) values
    req[source === 'body' ? 'validatedBody' : source === 'query' ? 'validatedQuery' : 'validatedParams'] = result.data;
    next();
  };
}
