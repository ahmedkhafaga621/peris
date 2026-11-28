ALTER TABLE "Fabric" ADD COLUMN "imageUrl" TEXT;

UPDATE "Fabric"
SET
  "description" = COALESCE(NULLIF("description", ''), 'Light and fluid, with a soft fall.'),
  "imageUrl" = COALESCE("imageUrl", '/media/fabric-crepe.jpg')
WHERE "name" = 'Crepe';

UPDATE "Fabric"
SET
  "description" = COALESCE(NULLIF("description", ''), 'Firm and smooth, holding a clean line.'),
  "imageUrl" = COALESCE("imageUrl", '/media/fabric-nida.jpg')
WHERE "name" = 'Nida';

UPDATE "Fabric"
SET
  "description" = COALESCE(NULLIF("description", ''), 'A quiet sheen for evening.'),
  "imageUrl" = COALESCE("imageUrl", '/media/fabric-silk.jpg')
WHERE "name" = 'Silk blend';

UPDATE "Fabric"
SET
  "description" = COALESCE(NULLIF("description", ''), 'Dry and breathable for the day.'),
  "imageUrl" = COALESCE("imageUrl", '/media/fabric-linen.jpg')
WHERE "name" = 'Linen blend';
