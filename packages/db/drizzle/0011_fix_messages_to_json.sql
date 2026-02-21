ALTER TABLE "artifact_prompt" DROP COLUMN "messages";
ALTER TABLE "artifact_prompt" ADD COLUMN "messages" json NOT NULL DEFAULT '[]'::json;