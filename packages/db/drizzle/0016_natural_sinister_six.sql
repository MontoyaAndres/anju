CREATE TABLE "artifact_tool" (
	"id" text PRIMARY KEY NOT NULL,
	"tool_key" text NOT NULL,
	"config" json,
	"metadata" json,
	"artifact_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artifact" ADD COLUMN "artifact_tool_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "artifact_tool" ADD CONSTRAINT "artifact_tool_artifact_id_artifact_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifact"("id") ON DELETE cascade ON UPDATE no action;