ALTER TABLE "artifact_resource" ADD COLUMN "source_type" text DEFAULT 'FILE' NOT NULL;--> statement-breakpoint
ALTER TABLE "artifact_resource" ADD COLUMN "crawl_config" json;--> statement-breakpoint
ALTER TABLE "artifact_resource" ADD COLUMN "parent_resource_id" text;--> statement-breakpoint
ALTER TABLE "artifact_resource" ADD COLUMN "child_resource_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "artifact_resource" ADD CONSTRAINT "artifact_resource_parent_resource_id_artifact_resource_id_fk" FOREIGN KEY ("parent_resource_id") REFERENCES "public"."artifact_resource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artifact_resource_parent_idx" ON "artifact_resource" USING btree ("parent_resource_id");--> statement-breakpoint
CREATE INDEX "artifact_resource_artifact_idx" ON "artifact_resource" USING btree ("artifact_id");