CREATE TABLE "artifact_prompt" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"schema" json,
	"metadata" json,
	"artifact_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artifact_user" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "artifact_user" CASCADE;--> statement-breakpoint
ALTER TABLE "artifact" ALTER COLUMN "artifact_resource_count" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "artifact" ALTER COLUMN "artifact_resource_count" SET DATA TYPE integer USING artifact_resource_count::integer;--> statement-breakpoint
ALTER TABLE "artifact" ALTER COLUMN "artifact_resource_count" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "organization" ALTER COLUMN "project_count" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "organization" ALTER COLUMN "project_count" SET DATA TYPE integer USING project_count::integer;--> statement-breakpoint
ALTER TABLE "organization" ALTER COLUMN "project_count" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "organization" ALTER COLUMN "organization_user_count" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "organization" ALTER COLUMN "organization_user_count" SET DATA TYPE integer USING organization_user_count::integer;--> statement-breakpoint
ALTER TABLE "organization" ALTER COLUMN "organization_user_count" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "project" ALTER COLUMN "artifact_count" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "project" ALTER COLUMN "artifact_count" SET DATA TYPE integer USING artifact_count::integer;--> statement-breakpoint
ALTER TABLE "project" ALTER COLUMN "artifact_count" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "project" ALTER COLUMN "project_user_count" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "project" ALTER COLUMN "project_user_count" SET DATA TYPE integer USING project_user_count::integer;--> statement-breakpoint
ALTER TABLE "project" ALTER COLUMN "project_user_count" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "artifact" ADD COLUMN "hash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "artifact" ADD COLUMN "artifact_prompt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "artifact_resource" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "artifact_resource" ADD COLUMN "uri" text NOT NULL;--> statement-breakpoint
ALTER TABLE "artifact_resource" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "artifact_resource" ADD COLUMN "mime_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "artifact_resource" ADD COLUMN "annotations" json;--> statement-breakpoint
ALTER TABLE "artifact_resource" ADD COLUMN "icons" json;--> statement-breakpoint
ALTER TABLE "artifact_prompt" ADD CONSTRAINT "artifact_prompt_artifact_id_artifact_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "artifact" DROP COLUMN "artifact_user_count";--> statement-breakpoint
ALTER TABLE "artifact_resource" DROP COLUMN "type";--> statement-breakpoint
ALTER TABLE "artifact" ADD CONSTRAINT "artifact_hash_unique" UNIQUE("hash");