const { z } = require('zod');

const communityTypes = [
  'Apartment',
  'Village',
  'Campus',
  'Gated Community',
];

const createCommunitySchema = z.object({
  name: z
    .string({ required_error: 'Community name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(200, 'Name must be at most 200 characters')
    .trim(),
  type: z.enum(communityTypes, {
    errorMap: () => ({
      message: `Type must be one of: ${communityTypes.join(', ')}`,
    }),
  }),
  description: z
    .string()
    .max(2000, 'Description must be at most 2000 characters')
    .optional()
    .nullable(),
  address: z
    .string()
    .max(500, 'Address must be at most 500 characters')
    .optional()
    .nullable(),
});

const updateCommunitySchema = createCommunitySchema.partial();

const searchCommunitySchema = z.object({
  q: z.string().optional(),
  type: z.enum(communityTypes).optional(),
});

module.exports = {
  createCommunitySchema,
  updateCommunitySchema,
  searchCommunitySchema,
};
