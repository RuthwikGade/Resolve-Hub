const { z } = require('zod');

const createSlaSchema = z.object({
  community_id: z
    .string({ required_error: 'Community ID is required' })
    .uuid('Invalid community ID format'),
  category: z
    .string({ required_error: 'Category is required' })
    .min(1, 'Category is required')
    .max(100, 'Category must be at most 100 characters')
    .trim(),
  max_resolution_minutes: z
    .number({ required_error: 'Max resolution minutes is required' })
    .int('Must be a whole number')
    .min(1, 'Must be at least 1 minute'),
});

const updateSlaSchema = z.object({
  max_resolution_minutes: z
    .number({ required_error: 'Max resolution minutes is required' })
    .int('Must be a whole number')
    .min(1, 'Must be at least 1 minute'),
});

module.exports = { createSlaSchema, updateSlaSchema };
