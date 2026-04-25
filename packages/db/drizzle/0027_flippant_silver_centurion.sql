CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TABLE "artifact_resource_chunk" (
	"id" text PRIMARY KEY NOT NULL,
	"resource_id" text NOT NULL,
	"artifact_id" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" halfvec(3072) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "channel" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';--> statement-breakpoint
ALTER TABLE "artifact_resource_chunk" ADD CONSTRAINT "artifact_resource_chunk_resource_id_artifact_resource_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."artifact_resource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact_resource_chunk" ADD CONSTRAINT "artifact_resource_chunk_artifact_id_artifact_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artifact_resource_chunk_resource_idx" ON "artifact_resource_chunk" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "artifact_resource_chunk_artifact_idx" ON "artifact_resource_chunk" USING btree ("artifact_id");--> statement-breakpoint
CREATE INDEX "artifact_resource_chunk_embedding_idx" ON "artifact_resource_chunk" USING hnsw ("embedding" halfvec_cosine_ops);