CREATE TABLE "tool_definition" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"required_scopes" text,
	"group_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tool_definition_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "tool_group" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"icon" text,
	"provider" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tool_group_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "artifact_tool" RENAME COLUMN "tool_key" TO "tool_definition_id";--> statement-breakpoint
ALTER TABLE "tool_definition" ADD CONSTRAINT "tool_definition_group_id_tool_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."tool_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact_tool" ADD CONSTRAINT "artifact_tool_tool_definition_id_tool_definition_id_fk" FOREIGN KEY ("tool_definition_id") REFERENCES "public"."tool_definition"("id") ON DELETE cascade ON UPDATE no action;