const { ZodError } = require('zod');

/**
 * Creates an Express middleware that validates the specified request source
 * against a Zod schema.
 *
 * @param {import('zod').ZodSchema} schema - The Zod schema to validate against
 * @param {'body'|'query'|'params'} source - Which part of the request to validate
 * @returns {Function} Express middleware
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const data = schema.parse(req[source]);
      // Replace the source with the parsed (and potentially transformed) data
      req[source] = data;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));

        return res.status(400).json({
          success: false,
          message: 'Validation failed.',
          errors,
        });
      }
      next(err);
    }
  };
};

module.exports = { validate };
