const { error } = require('../utils/response');

/**
 * Middleware factory for validating request using a Zod schema
 * @param {import('zod').ZodSchema} schema 
 * @param {'body' | 'query' | 'params'} [source='body']
 */
function validate(schema, source = 'body') {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync(req[source]);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err.name === 'ZodError') {
        const details = err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }));
        return error(res, 'Request validation failed', 400, details);
      }
      next(err);
    }
  };
}

module.exports = validate;
