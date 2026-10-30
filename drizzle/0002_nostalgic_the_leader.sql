CREATE INDEX `analytics_time_idx` ON `lead_analytics_events` (`occurred_at`);--> statement-breakpoint
CREATE INDEX `analytics_session_time_idx` ON `lead_analytics_events` (`session_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `analytics_expiry_idx` ON `lead_analytics_events` (`expires_at`);--> statement-breakpoint
CREATE INDEX `leads_created_idx` ON `leads` (`created_at`);--> statement-breakpoint
CREATE INDEX `leads_phone_created_idx` ON `leads` (`phone_key`,`created_at`);--> statement-breakpoint
CREATE INDEX `leads_expiry_idx` ON `leads` (`expires_at`);