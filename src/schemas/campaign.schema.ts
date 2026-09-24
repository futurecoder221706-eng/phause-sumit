import { z } from 'zod';

export const createCampaignSchema = z.object({
  name: z.string().trim().min(2, 'Enter a campaign name.'),
  templateId: z.string().min(1, 'Select a phishing template.'),
  targetMode: z.enum(['all', 'segment', 'percentage']),
  targetSegment: z.string().trim().min(1, 'Enter a target segment or audience.'),
  targetSamplePercent: z.number().min(1, 'Use at least 1%.').max(100, 'Use no more than 100%.').nullable(),
  staggerWindowMinutes: z.number().int('Use a whole number of minutes.').min(0, 'Stagger window cannot be negative.'),
  scheduledAt: z.string().nullable(),
}).superRefine((value, context) => {
  if (value.targetMode === 'percentage' && value.targetSamplePercent === null) {
    context.addIssue({ code: 'custom', path: ['targetSamplePercent'], message: 'Enter a sample percentage for percentage targeting.' });
  }
  if (value.scheduledAt !== null && Number.isNaN(Date.parse(value.scheduledAt))) {
    context.addIssue({ code: 'custom', path: ['scheduledAt'], message: 'Enter a valid schedule date and time.' });
  }
});

export type CreateCampaignFormValues = z.infer<typeof createCampaignSchema>;
