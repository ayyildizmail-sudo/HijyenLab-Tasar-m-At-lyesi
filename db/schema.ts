import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, check, primaryKey, index } from 'drizzle-orm/sqlite-core';
export const fragrancePreferences = sqliteTable('fragrance_preferences', {
  productFamily: text('product_family').notNull(),
  anonymousId: text('anonymous_id').notNull(),
  fragrance: text('fragrance').notNull(),
  revision: integer('revision').notNull(),
}, table => [primaryKey({ columns: [table.productFamily, table.anonymousId] }), check('valid_revision', sql`${table.revision} >= 1 AND ${table.revision} <= 9007199254740991`), check('valid_family', sql`${table.productFamily} = 'towels'`), check('valid_fragrance', sql`${table.fragrance} IN ('flambau', 'green_tea', 'bodrum_mandarin', 'lemon')`)]);

// Separate Tasarım Atölyesi explicit-consent requests; no image storage.
export const leads = sqliteTable('leads', {
 id:text('id').primaryKey(), kind:text('kind').notNull(), printMode:text('print_mode').notNull().default('printed'), createdAt:integer('created_at').notNull(), expiresAt:integer('expires_at').notNull(),
 status:text('status').notNull().default('new'), revision:integer('revision').notNull().default(0), productId:text('product_id'), quantity:integer('quantity'), fragrance:text('fragrance'),
 contactJson:text('contact_json').notNull(), designJson:text('design_json'), phoneKey:text('phone_key').notNull(), consentVersion:text('consent_version').notNull(), payloadHash:text('payload_hash').notNull(),
 // Optional towel warmer (RTD-23A) request: never part of the quote total; not offered with BM21 wet wipes.
 heaterQuantity:integer('heater_quantity'),
}, t => [check('lead_heater',sql`${t.heaterQuantity} IS NULL OR (${t.heaterQuantity} >= 1 AND ${t.heaterQuantity} <= 20 AND ${t.productId} IS NOT NULL AND ${t.productId} != 'BM21')`),index('leads_created_idx').on(t.createdAt),index('leads_phone_created_idx').on(t.phoneKey,t.createdAt),index('leads_expiry_idx').on(t.expiresAt),check('lead_print_mode',sql`${t.printMode} IN ('printed','unprinted')`),check('lead_unprinted_design',sql`${t.printMode} != 'unprinted' OR ${t.designJson} IS NULL`),check('lead_kind',sql`${t.kind} IN ('complete','contact_request')`),check('lead_status',sql`${t.status} IN ('new','contacted','quote_sent','closed')`),check('lead_revision',sql`${t.revision} >= 0 AND ${t.revision} <= 9007199254740991`),check('lead_expiry',sql`${t.expiresAt} > ${t.createdAt}`),check('lead_quantity',sql`${t.quantity} IS NULL OR (${t.quantity} >= 1 AND ${t.quantity} <= 1000000)`),check('lead_product',sql`${t.productId} IS NULL OR ${t.productId} IN ('BM12','BM11','BM13','BM15','BM545','BM21','OSHIBORI')`),check('lead_fragrance',sql`${t.fragrance} IS NULL OR ${t.fragrance} IN ('flambau','green_tea','bodrum_mandarin','lemon')`),check('lead_complete',sql`${t.kind} != 'complete' OR (${t.productId} IS NOT NULL AND ${t.quantity} IS NOT NULL AND ${t.fragrance} IS NOT NULL AND (${t.printMode} = 'unprinted' OR ${t.designJson} IS NOT NULL))`)]);
export const leadStatusAudit = sqliteTable('lead_status_audit', {
 id:integer('id').primaryKey({autoIncrement:true}), leadId:text('lead_id').notNull().references(()=>leads.id,{onDelete:'cascade'}),actorId:text('actor_id').notNull(),changedAt:integer('changed_at').notNull(),fromStatus:text('from_status').notNull(),toStatus:text('to_status').notNull(),fromRevision:integer('from_revision').notNull(),
});
export const leadAnalyticsEvents = sqliteTable('lead_analytics_events', {
 eventId:text('event_id').primaryKey(),sessionId:text('session_id').notNull(),eventName:text('event_name').notNull(),productId:text('product_id'),day:text('day').notNull(),occurredAt:integer('occurred_at').notNull(),expiresAt:integer('expires_at').notNull(),dedupKey:text('dedup_key').notNull().unique(),consentVersion:text('consent_version').notNull(),
},t=>[index('analytics_time_idx').on(t.occurredAt),index('analytics_session_time_idx').on(t.sessionId,t.occurredAt),index('analytics_expiry_idx').on(t.expiresAt),check('analytics_event',sql`${t.eventName} IN ('visit','design_started','design_ready','fragrance_selected','quote_viewed','whatsapp_clicked','phone_clicked')`),check('analytics_expiry',sql`${t.expiresAt} > ${t.occurredAt}`)]);
