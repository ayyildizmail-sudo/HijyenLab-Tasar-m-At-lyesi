CREATE TABLE `fragrance_preferences` (
	`product_family` text NOT NULL,
	`anonymous_id` text NOT NULL,
	`fragrance` text NOT NULL,
	`revision` integer NOT NULL,
	PRIMARY KEY(`product_family`, `anonymous_id`),
	CONSTRAINT "valid_revision" CHECK("fragrance_preferences"."revision" >= 1 AND "fragrance_preferences"."revision" <= 9007199254740991),
	CONSTRAINT "valid_family" CHECK("fragrance_preferences"."product_family" = 'towels'),
	CONSTRAINT "valid_fragrance" CHECK("fragrance_preferences"."fragrance" IN ('flambau', 'green_tea', 'bodrum_mandarin', 'lemon'))
);
