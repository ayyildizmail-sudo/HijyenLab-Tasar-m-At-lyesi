CREATE TABLE `__new_leads` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`print_mode` text DEFAULT 'printed' NOT NULL,
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
	CONSTRAINT "lead_print_mode" CHECK("__new_leads"."print_mode" IN ('printed','unprinted')),
	CONSTRAINT "lead_unprinted_design" CHECK("__new_leads"."print_mode" != 'unprinted' OR "__new_leads"."design_json" IS NULL),
	CONSTRAINT "lead_kind" CHECK("__new_leads"."kind" IN ('complete','contact_request')),
	CONSTRAINT "lead_status" CHECK("__new_leads"."status" IN ('new','contacted','quote_sent','closed')),
	CONSTRAINT "lead_revision" CHECK("__new_leads"."revision" >= 0 AND "__new_leads"."revision" <= 9007199254740991),
	CONSTRAINT "lead_expiry" CHECK("__new_leads"."expires_at" > "__new_leads"."created_at"),
	CONSTRAINT "lead_quantity" CHECK("__new_leads"."quantity" IS NULL OR ("__new_leads"."quantity" >= 1 AND "__new_leads"."quantity" <= 1000000)),
	CONSTRAINT "lead_product" CHECK("__new_leads"."product_id" IS NULL OR "__new_leads"."product_id" IN ('BM12','BM15','BM545')),
	CONSTRAINT "lead_fragrance" CHECK("__new_leads"."fragrance" IS NULL OR "__new_leads"."fragrance" IN ('flambau','green_tea','bodrum_mandarin','lemon')),
	CONSTRAINT "lead_complete" CHECK("__new_leads"."kind" != 'complete' OR ("__new_leads"."product_id" IS NOT NULL AND "__new_leads"."quantity" IS NOT NULL AND "__new_leads"."fragrance" IS NOT NULL AND ("__new_leads"."print_mode" = 'unprinted' OR "__new_leads"."design_json" IS NOT NULL)))
);
--> statement-breakpoint
INSERT INTO `__new_leads`("id", "kind", "print_mode", "created_at", "expires_at", "status", "revision", "product_id", "quantity", "fragrance", "contact_json", "design_json", "phone_key", "consent_version", "payload_hash") SELECT "id", "kind", 'printed', "created_at", "expires_at", "status", "revision", "product_id", "quantity", "fragrance", "contact_json", "design_json", "phone_key", "consent_version", "payload_hash" FROM `leads`;--> statement-breakpoint
CREATE TABLE `__lead_audit_backup` AS SELECT * FROM `lead_status_audit`;--> statement-breakpoint
DROP TABLE `lead_status_audit`;--> statement-breakpoint
DROP TABLE `leads`;--> statement-breakpoint
ALTER TABLE `__new_leads` RENAME TO `leads`;--> statement-breakpoint
CREATE INDEX `leads_created_idx` ON `leads` (`created_at`);--> statement-breakpoint
CREATE INDEX `leads_phone_created_idx` ON `leads` (`phone_key`,`created_at`);--> statement-breakpoint
CREATE INDEX `leads_expiry_idx` ON `leads` (`expires_at`);
--> statement-breakpoint
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
INSERT INTO `lead_status_audit` SELECT * FROM `__lead_audit_backup`;--> statement-breakpoint
DROP TABLE `__lead_audit_backup`;
