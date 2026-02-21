ALTER TABLE "artifact_prompt" ADD COLUMN "template" text NOT NULL DEFAULT '';
ALTER TABLE "artifact_prompt" ALTER COLUMN "template" DROP DEFAULT;