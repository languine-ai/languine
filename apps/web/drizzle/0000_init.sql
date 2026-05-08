CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"translation_memory" boolean DEFAULT true NOT NULL,
	"quality_checks" boolean DEFAULT true NOT NULL,
	"context_detection" boolean DEFAULT true NOT NULL,
	"length_control" text DEFAULT 'flexible' NOT NULL,
	"inclusive_language" boolean DEFAULT true NOT NULL,
	"formality" text DEFAULT 'casual' NOT NULL,
	"tone_of_voice" text DEFAULT 'casual' NOT NULL,
	"brand_name" text,
	"brand_voice" text,
	"emotive_intent" text DEFAULT 'neutral' NOT NULL,
	"idioms" boolean DEFAULT true NOT NULL,
	"terminology" text,
	"domain_expertise" text DEFAULT 'general' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "translations" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"source_format" text NOT NULL,
	"source_file" text NOT NULL,
	"source_type" text DEFAULT 'key' NOT NULL,
	"source_language" text NOT NULL,
	"target_language" text NOT NULL,
	"translation_key" text NOT NULL,
	"source_text" text NOT NULL,
	"translated_text" text NOT NULL,
	"context" text,
	"branch" text,
	"commit" text,
	"commit_link" text,
	"source_provider" text,
	"commit_message" text,
	"overridden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "translations" ADD CONSTRAINT "translations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_slug_idx" ON "projects" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "project_translations_idx" ON "translations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "translations_created_at_idx" ON "translations" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_translation_idx" ON "translations" USING btree ("project_id","translation_key","target_language");--> statement-breakpoint
CREATE INDEX "source_language_idx" ON "translations" USING btree ("source_language");--> statement-breakpoint
CREATE INDEX "target_language_idx" ON "translations" USING btree ("target_language");