import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const projects = pgTable(
  "projects",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => `prj_${createId()}`),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),

    translationMemory: boolean("translation_memory").notNull().default(true),
    qualityChecks: boolean("quality_checks").notNull().default(true),
    contextDetection: boolean("context_detection").notNull().default(true),
    lengthControl: text("length_control", {
      enum: ["flexible", "strict", "exact", "loose"],
    })
      .notNull()
      .default("flexible"),
    inclusiveLanguage: boolean("inclusive_language").notNull().default(true),
    formality: text("formality", { enum: ["casual", "formal", "neutral"] })
      .notNull()
      .default("casual"),
    toneOfVoice: text("tone_of_voice", {
      enum: [
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
      ],
    })
      .notNull()
      .default("casual"),
    brandName: text("brand_name"),
    brandVoice: text("brand_voice"),
    emotiveIntent: text("emotive_intent", {
      enum: [
        "neutral",
        "positive",
        "empathetic",
        "professional",
        "friendly",
        "enthusiastic",
      ],
    })
      .notNull()
      .default("neutral"),
    idioms: boolean("idioms").notNull().default(true),
    terminology: text("terminology"),
    domainExpertise: text("domain_expertise", {
      enum: [
        "general",
        "technical",
        "medical",
        "legal",
        "financial",
        "marketing",
        "academic",
      ],
    })
      .notNull()
      .default("general"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("project_slug_idx").on(table.slug)],
);

export const translations = pgTable(
  "translations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    sourceFormat: text("source_format").notNull(),
    sourceFile: text("source_file").notNull(),
    sourceType: text("source_type").default("key").notNull(),
    sourceLanguage: text("source_language").notNull(),
    targetLanguage: text("target_language").notNull(),
    translationKey: text("translation_key").notNull(),
    sourceText: text("source_text").notNull(),
    translatedText: text("translated_text").notNull(),
    context: text("context"),
    branch: text("branch"),
    commit: text("commit"),
    commitLink: text("commit_link"),
    sourceProvider: text("source_provider"),
    commitMessage: text("commit_message"),
    overridden: boolean("overridden").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("project_translations_idx").on(table.projectId),
    index("translations_created_at_idx").on(table.createdAt),
    uniqueIndex("unique_translation_idx").on(
      table.projectId,
      table.translationKey,
      table.targetLanguage,
    ),
    index("source_language_idx").on(table.sourceLanguage),
    index("target_language_idx").on(table.targetLanguage),
  ],
);

export const projectsRelations = relations(projects, ({ many }) => ({
  translations: many(translations),
}));

export const translationsRelations = relations(translations, ({ one }) => ({
  project: one(projects, {
    fields: [translations.projectId],
    references: [projects.id],
  }),
}));
