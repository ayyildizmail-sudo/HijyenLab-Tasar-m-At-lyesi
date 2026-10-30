CREATE TABLE `lead_analytics_events` (
	`event_id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`event_name` text NOT NULL,
	`product_id` text,
	`day` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`dedup_key` text NOT NULL,
	`consent_version` text NOT NULL,
	CONSTRAINT "analytics_event" CHECK("lead_analytics_events"."event_name" IN ('visit','design_started','design_ready','fragrance_selected','quote_viewed','whatsapp_clicked','phone_clicked')),
	CONSTRAINT "analytics_expiry" CHECK("lead_analytics_events"."expires_at" > "lead_analytics_events"."occurred_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lead_analytics_events_dedup_key_unique` ON `lead_analytics_events` (`dedup_key`);--> statement-breakpoint
CREATE TABLE `lead_status_audit` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lead_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`changed_at` integer NOT NULL,
	`from_status` text NOT NULL,
	`to_status` text NOT NULL,
	`from_revision` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`product_id` text,
	`quantity` integer,
	`fragrance` text,
	`contact_json` text NOT NULL,
	`design_json` text,
	`phone_key` text NOT NULL,
	`consent_version` text NOT NULL,
	`payload_hash` text NOT NULL,
	CONSTRAINT "lead_kind" CHECK("leads"."kind" IN ('complete','contact_request')),
	CONSTRAINT "lead_status" CHECK("leads"."status" IN ('new','contacted','quote_sent','closed')),
	CONSTRAINT "lead_revision" CHECK("leads"."revision" >= 0 AND "leads"."revision" <= 9007199254740991),
	CONSTRAINT "lead_expiry" CHECK("leads"."expires_at" > "leads"."created_at"),
	CONSTRAINT "lead_quantity" CHECK("leads"."quantity" IS NULL OR ("leads"."quantity" >= 1 AND "leads"."quantity" <= 1000000)),
	CONSTRAINT "lead_product" CHECK("leads"."product_id" IS NULL OR "leads"."product_id" IN ('BM12','BM15','BM545')),
	CONSTRAINT "lead_fragrance" CHECK("leads"."fragrance" IS NULL OR "leads"."fragrance" IN ('flambau','green_tea','bodrum_mandarin','lemon')),
	CONSTRAINT "lead_complete" CHECK("leads"."kind" != 'complete' OR ("leads"."product_id" IS NOT NULL AND "leads"."quantity" IS NOT NULL AND "leads"."fragrance" IS NOT NULL AND "leads"."design_json" IS NOT NULL))
);
