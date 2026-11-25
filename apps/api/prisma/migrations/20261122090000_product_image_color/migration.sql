-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN "colorId" TEXT;

-- CreateIndex
CREATE INDEX "ProductImage_productId_colorId_sortOrder_idx" ON "ProductImage"("productId", "colorId", "sortOrder");

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Color"("id") ON DELETE SET NULL ON UPDATE CASCADE;
