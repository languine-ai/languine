import { z } from "zod";

export const projectSettingsSchema = z.object({
  translationMemory: z.boolean().optional(),
  qualityChecks: z.boolean().optional(),
  contextDetection: z.boolean().optional(),
  lengthControl: z.enum(["flexible", "strict", "exact", "loose"]).optional(),
  inclusiveLanguage: z.boolean().optional(),
  formality: z.enum(["casual", "formal", "neutral"]).optional(),
  toneOfVoice: z
    .enum([
      "casual",
      "formal",
      "friendly",
      "professional",
      "playful",
      "serious",
      "confident",
      "humble",
      "direct",
      "diplomatic",
    ])
    .optional(),
  brandName: z.string().optional(),
  brandVoice: z.string().optional(),
  emotiveIntent: z
    .enum([
      "neutral",
      "positive",
      "empathetic",
      "professional",
      "friendly",
      "enthusiastic",
    ])
    .optional(),
  idioms: z.boolean().optional(),
  terminology: z.string().optional(),
  domainExpertise: z
    .enum([
      "general",
      "technical",
      "medical",
      "legal",
      "financial",
      "marketing",
      "academic",
    ])
    .optional(),
});

export type ProjectSettings = z.infer<typeof projectSettingsSchema>;

export const analyticsSchema = z.object({
  projectSlug: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  organizationId: z.string(),
  period: z.enum(["monthly", "weekly", "daily"]).optional().default("daily"),
});

export type AnalyticsSchema = z.infer<typeof analyticsSchema>;

export const jobsSchema = z.object({
  apiKey: z.string(),
  projectId: z.string(),
  sourceFormat: z.string(),
  sourceLanguage: z.string(),
  targetLanguages: z.array(z.string()),
  branch: z.string().optional().nullable(),
  commit: z.string().optional().nullable(),
  commitLink: z.string().optional().nullable(),
  sourceProvider: z.string().nullable().optional(),
  commitMessage: z.string().optional().nullable(),
  content: z.array(
    z.object({
      key: z.string(),
      sourceText: z.string(),
      sourceFile: z.string(),
    }),
  ),
});

export type JobsSchema = z.infer<typeof jobsSchema>;

export const organizationSchema = z.object({ organizationId: z.string() });
export type OrganizationSchema = z.infer<typeof organizationSchema>;

export const createOrganizationSchema = z.object({
  name: z.string().min(1),
});

export type CreateOrganizationSchema = z.infer<typeof createOrganizationSchema>;

export const updateOrganizationSchema = z.object({
  organizationId: z.string(),
  name: z.string().min(1).optional(),
  logo: z.string().optional(),
  email: z.string().email().optional(),
});

export type UpdateOrganizationSchema = z.infer<typeof updateOrganizationSchema>;

export const deleteOrganizationInviteSchema = z.object({
  organizationId: z.string(),
  inviteId: z.string(),
});

export type DeleteOrganizationInviteSchema = z.infer<
  typeof deleteOrganizationInviteSchema
>;

export const deleteOrganizationMemberSchema = z.object({
  organizationId: z.string(),
  memberId: z.string(),
});

export type DeleteOrganizationMemberSchema = z.infer<
  typeof deleteOrganizationMemberSchema
>;

export const translateSchema = z.object({
  organizationId: z.string(),
  cursor: z.string().nullish(),
  slug: z.string(),
  limit: z.number().optional(),
  search: z.string().nullish().optional(),
  locales: z.array(z.string()).nullish().optional(),
});

export type TranslateSchema = z.infer<typeof translateSchema>;

export const deleteKeysSchema = z.object({
  projectId: z.string(),
  keys: z.array(z.string()),
});

export type DeleteKeysSchema = z.infer<typeof deleteKeysSchema>;

export const inviteMemberSchema = z.object({
  organizationId: z.string(),
  email: z.string().email(),
  role: z.string(),
});

export type InviteMemberSchema = z.infer<typeof inviteMemberSchema>;

export const acceptInvitationSchema = z.object({
  invitationId: z.string(),
});

export type AcceptInvitationSchema = z.infer<typeof acceptInvitationSchema>;

export const projectLocalesSchema = z.object({
  slug: z.string(),
  organizationId: z.string(),
});

export type ProjectLocalesSchema = z.infer<typeof projectLocalesSchema>;

export const translationsByKeySchema = z.object({
  projectId: z.string(),
  translationKey: z.string(),
});

export type TranslationsByKeySchema = z.infer<typeof translationsByKeySchema>;

export const updateTranslationsSchema = z.object({
  translations: z.array(
    z.object({
      id: z.string(),
      translatedText: z.string(),
      overridden: z.boolean(),
    }),
  ),
});

export type UpdateTranslationsSchema = z.infer<typeof updateTranslationsSchema>;

export const organizationStatsSchema = z.object({
  organizationId: z.string(),
});

export type OrganizationStatsSchema = z.infer<typeof organizationStatsSchema>;

export const getOverriddenTranslationsSchema = z.object({
  projectId: z.string(),
});

export type GetOverriddenTranslationsSchema = z.infer<
  typeof getOverriddenTranslationsSchema
>;

export const deleteTranslationsSchema = z.object({
  projectId: z.string(),
});

export type DeleteTranslationsSchema = z.infer<typeof deleteTranslationsSchema>;

export const transformSchema = z.object({
  projectId: z.string(),
  translations: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
    }),
  ),
});
