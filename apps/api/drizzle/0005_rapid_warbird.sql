ALTER TABLE "artifact" ADD COLUMN "artifact_resource_count" text DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "artifact" ADD COLUMN "artifact_user_count" text DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "organization_user_count" text DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "artifact_count" text DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "project_user_count" text DEFAULT '0' NOT NULL;