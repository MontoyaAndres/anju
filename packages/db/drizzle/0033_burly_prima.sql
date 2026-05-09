ALTER TABLE "artifact_llm" DROP CONSTRAINT "artifact_llm_artifact_id_unique";--> statement-breakpoint
ALTER TABLE "artifact_llm" ADD COLUMN "name" text;--> statement-breakpoint
UPDATE "artifact_llm" SET "name" = "provider" || ' ' || "model" WHERE "name" IS NULL;--> statement-breakpoint
ALTER TABLE "artifact_llm" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "channel" ADD COLUMN "llm_id" text;--> statement-breakpoint
ALTER TABLE "channel" ADD CONSTRAINT "channel_llm_id_artifact_llm_id_fk" FOREIGN KEY ("llm_id") REFERENCES "public"."artifact_llm"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
UPDATE "channel" SET "llm_id" = (
  SELECT "artifact_llm"."id"
  FROM "artifact_llm"
  WHERE "artifact_llm"."artifact_id" = "channel"."artifact_id"
  LIMIT 1
) WHERE "llm_id" IS NULL;--> statement-breakpoint
CREATE INDEX "artifact_llm_artifactId_idx" ON "artifact_llm" USING btree ("artifact_id");--> statement-breakpoint
CREATE INDEX "channel_llmId_idx" ON "channel" USING btree ("llm_id");
