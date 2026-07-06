const { z } = require('zod');

const priorities = ['low', 'medium', 'high', 'critical'];
const statuses = ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED'];

const createComplaintSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .min(3, 'Title must be at least 3 characters')
    .max(300, 'Title must be at most 300 characters')
    .trim(),
  description: z
    .string({ required_error: 'Description is required' })
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must be at most 5000 characters')
    .trim(),
  category: z
    .string({ required_error: 'Category is required' })
    .min(1, 'Category is required')
    .max(100, 'Category must be at most 100 characters')
    .trim(),
  priority: z
    .enum(priorities, {
      errorMap: () => ({
        message: `Priority must be one of: ${priorities.join(', ')}`,
      }),
    })
    .optional()
    .default('medium'),
  community_id: z
    .string({ required_error: 'Community ID is required' })
    .uuid('Invalid community ID format'),
});

const updateStatusSchema = z.object({
  status: z.enum(statuses, {
    errorMap: () => ({
      message: `Status must be one of: ${statuses.join(', ')}`,
    }),
  }),
  note: z
    .string()
    .max(2000, 'Note must be at most 2000 characters')
    .optional()
    .nullable(),
});

const reassignSchema = z.object({
  assigned_to: z
    .string({ required_error: 'Assigned user ID is required' })
    .uuid('Invalid user ID format'),
});

module.exports = {
  createComplaintSchema,
  updateStatusSchema,
  reassignSchema,
};
