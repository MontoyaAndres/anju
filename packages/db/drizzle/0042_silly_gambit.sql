CREATE TABLE "mcp_request" (
	"id" text PRIMARY KEY NOT NULL,
	"method" text NOT NULL,
	"tool_name" text,
	"resource_uri" text,
	"prompt_id" text,
	"input" json,
	"output" json,
	"latency_ms" integer,
	"error_message" text,
	"session_id" text NOT NULL,
	"artifact_tool_id" text,
	"artifact_resource_id" text,
	"artifact_prompt_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_session" (
	"id" text PRIMARY KEY NOT NULL,
	"external_session_id" text NOT NULL,
	"auth_kind" text NOT NULL,
	"client_name" text,
	"client_version" text,
	"user_agent" text,
	"ip_address" text,
	"request_count" integer DEFAULT 0 NOT NULL,
	"last_request_at" timestamp,
	"metadata" json,
	"artifact_id" text NOT NULL,
	"user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mcp_request" ADD CONSTRAINT "mcp_request_session_id_mcp_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."mcp_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_request" ADD CONSTRAINT "mcp_request_artifact_tool_id_artifact_tool_id_fk" FOREIGN KEY ("artifact_tool_id") REFERENCES "public"."artifact_tool"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_request" ADD CONSTRAINT "mcp_request_artifact_resource_id_artifact_resource_id_fk" FOREIGN KEY ("artifact_resource_id") REFERENCES "public"."artifact_resource"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_request" ADD CONSTRAINT "mcp_request_artifact_prompt_id_artifact_prompt_id_fk" FOREIGN KEY ("artifact_prompt_id") REFERENCES "public"."artifact_prompt"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_session" ADD CONSTRAINT "mcp_session_artifact_id_artifact_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_session" ADD CONSTRAINT "mcp_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mcp_request_sessionId_idx" ON "mcp_request" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "mcp_request_method_idx" ON "mcp_request" USING btree ("method");--> statement-breakpoint
CREATE INDEX "mcp_request_createdAt_idx" ON "mcp_request" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "mcp_session_artifactId_idx" ON "mcp_session" USING btree ("artifact_id");--> statement-breakpoint
CREATE INDEX "mcp_session_userId_idx" ON "mcp_session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mcp_session_external_idx" ON "mcp_session" USING btree ("artifact_id","external_session_id");