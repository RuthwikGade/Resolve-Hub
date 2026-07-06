const { z } = require('zod');

const createCategorySchema = z.object({
  community_id: z
    .string({ required_error: 'Community ID is required' })
    .uuid('Invalid community ID format'),
  category: z
    .string({ required_error: 'Category name is required' })
    .min(1, 'Category name is required')
    .max(100, 'Category must be at most 100 characters')
    .trim(),
  role_name: z
    .string({ required_error: 'Role name is required' })
    .min(1, 'Role name is required')
    .max(100, 'Role name must be at most 100 characters')
    .trim(),
  assigned_user_id: z
    .string()
    .uuid('Invalid user ID format')
    .optional()
    .nullable(),
});

const updateRoutingSchema = z.object({
  community_id: z
    .string({ required_error: 'Community ID is required' })
    .uuid('Invalid community ID format'),
  category: z
    .string({ required_error: 'Category name is required' })
    .min(1, 'Category name is required')
    .max(100, 'Category must be at most 100 characters')
    .trim(),
  role_name: z
    .string({ required_error: 'Role name is required' })
    .min(1, 'Role name is required')
    .max(100, 'Role name must be at most 100 characters')
    .trim(),
  assigned_user_id: z
    .string()
    .uuid('Invalid user ID format')
    .optional()
    .nullable(),
});

module.exports = { createCategorySchema, updateRoutingSchema };
