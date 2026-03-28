CREATE TABLE "artifact_credential" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"expires_at" timestamp,
	"scopes" text,
	"metadata" json,
	"artifact_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artifact" ADD COLUMN "artifact_credential_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "artifact_credential" ADD CONSTRAINT "artifact_credential_artifact_id_artifact_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifact"("id") ON DELETE cascade ON UPDATE no action;