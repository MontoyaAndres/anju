CREATE TABLE "artifact_llm" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"base_url" text,
	"api_key" text NOT NULL,
	"system_prompt" text,
	"config" json,
	"artifact_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "artifact_llm_artifact_id_unique" UNIQUE("artifact_id")
);
--> statement-breakpoint
CREATE TABLE "channel" (
	"id" text PRIMARY KEY NOT NULL,
	"platform" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"config" json,
	"credentials" text NOT NULL,
	"webhook_secret" text NOT NULL,
	"conversation_count" integer DEFAULT 0 NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"artifact_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_conversation" (
	"id" text PRIMARY KEY NOT NULL,
	"external_conversation_id" text NOT NULL,
	"title" text,
	"metadata" json,
	"message_count" integer DEFAULT 0 NOT NULL,
	"last_message_at" timestamp,
	"channel_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_message" (
	"id" text PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"content" text,
	"external_message_id" text,
	"tokens_in" integer,
	"tokens_out" integer,
	"latency_ms" integer,
	"metadata" json,
	"conversation_id" text NOT NULL,
	"participant_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_message_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"input" json,
	"output" json,
	"latency_ms" integer,
	"error_message" text,
	"message_id" text NOT NULL,
	"artifact_prompt_id" text,
	"artifact_resource_id" text,
	"artifact_tool_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_participant" (
	"id" text PRIMARY KEY NOT NULL,
	"external_user_id" text NOT NULL,
	"display_name" text,
	"metadata" json,
	"linked_user_id" text,
	"channel_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artifact" ADD COLUMN "channel_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "artifact_llm" ADD CONSTRAINT "artifact_llm_artifact_id_artifact_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel" ADD CONSTRAINT "channel_artifact_id_artifact_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_conversation" ADD CONSTRAINT "channel_conversation_channel_id_channel_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_message" ADD CONSTRAINT "channel_message_conversation_id_channel_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."channel_conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_message" ADD CONSTRAINT "channel_message_participant_id_channel_participant_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."channel_participant"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_message_usage" ADD CONSTRAINT "channel_message_usage_message_id_channel_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."channel_message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_message_usage" ADD CONSTRAINT "channel_message_usage_artifact_prompt_id_artifact_prompt_id_fk" FOREIGN KEY ("artifact_prompt_id") REFERENCES "public"."artifact_prompt"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_message_usage" ADD CONSTRAINT "channel_message_usage_artifact_resource_id_artifact_resource_id_fk" FOREIGN KEY ("artifact_resource_id") REFERENCES "public"."artifact_resource"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_message_usage" ADD CONSTRAINT "channel_message_usage_artifact_tool_id_artifact_tool_id_fk" FOREIGN KEY ("artifact_tool_id") REFERENCES "public"."artifact_tool"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_participant" ADD CONSTRAINT "channel_participant_linked_user_id_user_id_fk" FOREIGN KEY ("linked_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_participant" ADD CONSTRAINT "channel_participant_channel_id_channel_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "channel_artifactId_idx" ON "channel" USING btree ("artifact_id");--> statement-breakpoint
CREATE INDEX "channel_conversation_channelId_idx" ON "channel_conversation" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "channel_conversation_external_idx" ON "channel_conversation" USING btree ("channel_id","external_conversation_id");--> statement-breakpoint
CREATE INDEX "channel_message_conversationId_idx" ON "channel_message" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "channel_message_createdAt_idx" ON "channel_message" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "channel_message_usage_messageId_idx" ON "channel_message_usage" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "channel_participant_channelId_idx" ON "channel_participant" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "channel_participant_external_idx" ON "channel_participant" USING btree ("channel_id","external_user_id");