import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, check, primaryKey } from 'drizzle-orm/sqlite-core';
export const fragrancePreferences = sqliteTable('fragrance_preferences', {
  productFamily: text('product_family').notNull(),
  anonymousId: text('anonymous_id').notNull(),
  fragrance: text('fragrance').notNull(),
  revision: integer('revision').notNull(),
}, table => [primaryKey({ columns: [table.productFamily, table.anonymousId] }), check('valid_revision', sql`${table.revision} >= 1 AND ${table.revision} <= 9007199254740991`), check('valid_family', sql`${table.productFamily} = 'towels'`), check('valid_fragrance', sql`${table.fragrance} IN ('flambau', 'green_tea', 'bodrum_mandarin', 'lemon')`)]);
