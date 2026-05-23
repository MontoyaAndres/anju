-- Per-channel link refactor: external_identity is now scoped to a specific
-- channel row, not just (provider, externalId). Existing rows have no
-- channelId, so wipe them first — users will need to re-link in each channel.
DELETE FROM "external_identity";--> statement-breakpoint
DROP INDEX "external_identity_provider_externalId_idx";--> statement-breakpoint
ALTER TABLE "external_identity" ADD COLUMN "channel_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "external_identity" ADD CONSTRAINT "external_identity_channel_id_channel_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "external_identity_channel_provider_external_idx" ON "external_identity" USING btree ("channel_id","provider","external_id");--> statement-breakpoint
CREATE INDEX "external_identity_channelId_idx" ON "external_identity" USING btree ("channel_id");
