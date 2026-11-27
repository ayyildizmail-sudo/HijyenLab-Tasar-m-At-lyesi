-- İsteğe bağlı ısıtıcı dolap (RTD-23A) talebi için sütun ekler. Teklif toplamına dahil değildir.
-- Tablo yeniden kurulmaz: D1 yabancı anahtarları her zaman uyguladığı için yalnızca ADD COLUMN kullanılır;
-- mevcut kayıtlar ve lead_status_audit geçmişi olduğu gibi kalır (yeni sütun NULL).
ALTER TABLE `leads` ADD `heater_quantity` integer CONSTRAINT "lead_heater" CHECK("heater_quantity" IS NULL OR ("heater_quantity" >= 1 AND "heater_quantity" <= 20 AND "product_id" IS NOT NULL AND "product_id" != 'BM21'));
