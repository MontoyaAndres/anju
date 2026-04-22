CREATE TABLE "error_log" (
	"id" text PRIMARY KEY NOT NULL,
	"service" text NOT NULL,
	"reference_id" text,
	"name" text,
	"message" text,
	"stack" text,
	"status" integer,
	"method" text,
	"path" text,
	"query" text,
	"user_agent" text,
	"ip_address" text,
	"user_id" text,
	"organization_id" text,
	"project_id" text,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "error_log_service_idx" ON "error_log" USING btree ("service");--> statement-breakpoint
CREATE INDEX "error_log_createdAt_idx" ON "error_log" USING btree ("created_at");