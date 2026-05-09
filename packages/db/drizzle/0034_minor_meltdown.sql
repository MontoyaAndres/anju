ALTER TABLE "artifact_llm" RENAME TO "organization_llm";--> statement-breakpoint
ALTER TABLE "organization_llm" DROP CONSTRAINT "artifact_llm_artifact_id_artifact_id_fk";--> statement-breakpoint
ALTER TABLE "channel" DROP CONSTRAINT "channel_llm_id_artifact_llm_id_fk";--> statement-breakpoint
DROP INDEX "artifact_llm_artifactId_idx";--> statement-breakpoint
ALTER TABLE "organization_llm" ADD COLUMN "organization_id" text;--> statement-breakpoint
UPDATE "organization_llm" SET "organization_id" = (
  SELECT "project"."organization_id"
  FROM "artifact"
  INNER JOIN "project" ON "project"."id" = "artifact"."project_id"
  WHERE "artifact"."id" = "organization_llm"."artifact_id"
) WHERE "organization_id" IS NULL;--> statement-breakpoint
ALTER TABLE "organization_llm" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_llm" ADD CONSTRAINT "organization_llm_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel" ADD CONSTRAINT "channel_llm_id_organization_llm_id_fk" FOREIGN KEY ("llm_id") REFERENCES "public"."organization_llm"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organization_llm_organizationId_idx" ON "organization_llm" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "organization_llm" DROP COLUMN "artifact_id";
