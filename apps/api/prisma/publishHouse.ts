import { createRequire } from "node:module";
import { PrismaClient } from "@prisma/client";

const require = createRequire(import.meta.url);

function createPrisma(): PrismaClient {
  if (process.env.DB_HOST) {
    const generated = require("../src/generated/mysql") as {
      PrismaClient: new () => PrismaClient;
    };
    return new generated.PrismaClient();
  }
  return new PrismaClient();
}

const prisma = createPrisma();

const housePieces = [
  {
    slug: "zahra-button-abaya",
    styleCode: "PR-ZAHRA",
    name: "Zahra Button Abaya",
    description:
      "A black floral jacquard abaya with two rows of gold buttons and a matching cuff. Cut for evening, with a sheila in the same cloth.",
    fabric: "Nida",
    price: 168000,
    category: "evening-occasions",
    color: { name: "Black", hex: "#161616" },
    images: ["zahra-1.jpg", "zahra-2.jpg", "zahra-3.jpg", "zahra-4.jpg", "zahra-5.jpg"],
  },
  {
    slug: "lina-piped-abaya",
    styleCode: "PR-LINA",
    name: "Lina Piped Abaya",
    description:
      "A black textured abaya traced in white piping along the neck, front, and cuff, closed with a single ornamental button.",
    fabric: "Nida",
    price: 149000,
    category: "evening-occasions",
    color: { name: "Black", hex: "#161616" },
    images: ["lina-1.jpg", "lina-2.jpg", "lina-3.jpg"],
  },
  {
    slug: "hala-bead-abaya",
    styleCode: "PR-HALA",
    name: "Hala Bead Abaya",
    description: "A black floral abaya finished with a beaded front edge and beaded cuffs, worn with a sheer sheila.",
    fabric: "Nida",
    price: 158000,
    category: "evening-occasions",
    color: { name: "Black", hex: "#161616" },
    images: ["hala-1.jpg", "hala-2.jpg", "hala-3.jpg"],
  },
  {
    slug: "yasmin-column-abaya",
    styleCode: "PR-YASMIN",
    name: "Yasmin Column Abaya",
    description:
      "An olive satin column with a quiet front opening and a small jewel at each cuff. A day piece with an evening hand.",
    fabric: "Silk blend",
    price: 129000,
    category: "casual-elegance",
    color: { name: "Olive", hex: "#5e6554" },
    images: ["yasmin-1.jpg", "yasmin-2.jpg", "yasmin-3.jpg", "yasmin-4.jpg"],
  },
] as const;

const sizes = await prisma.size.findMany({ where: { isActive: true } });
const lengths = await prisma.lengthOption.findMany();

for (const item of housePieces) {
  const category = await prisma.category.findUnique({ where: { slug: item.category } });
  const fabric = await prisma.fabric.findUnique({ where: { name: item.fabric } });
  if (!category || !fabric || sizes.length === 0) {
    console.error(`Skipping ${item.name}. The catalog tables are not ready.`);
    continue;
  }
  const color = await prisma.color.upsert({
    where: { name: item.color.name },
    update: { hex: item.color.hex, isActive: true },
    create: { name: item.color.name, hex: item.color.hex, isActive: true },
  });
  const product = await prisma.product.upsert({
    where: { slug: item.slug },
    update: {
      isPublished: true,
      isPlaceholder: false,
      isNew: true,
    },
    create: {
      slug: item.slug,
      styleCode: item.styleCode,
      name: item.name,
      description: item.description,
      fabricDetails: item.fabric,
      basePriceFils: item.price,
      isPublished: true,
      isNew: true,
      isPlaceholder: false,
    },
  });
  await prisma.productCategory.upsert({
    where: { productId_categoryId: { productId: product.id, categoryId: category.id } },
    update: {},
    create: { productId: product.id, categoryId: category.id },
  });
  const imageCount = await prisma.productImage.count({ where: { productId: product.id } });
  if (imageCount === 0) {
    for (const [index, file] of item.images.entries()) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          colorId: color.id,
          url: `/media/${file}`,
          alt: item.name,
          position: "center",
          sortOrder: index,
        },
      });
    }
  }
  for (const length of lengths) {
    await prisma.productLength.upsert({
      where: { productId_lengthOptionId: { productId: product.id, lengthOptionId: length.id } },
      update: {},
      create: { productId: product.id, lengthOptionId: length.id },
    });
  }
  for (const size of sizes) {
    const sku = `${item.styleCode}-${color.name}-${size.code}`.toUpperCase().replace(/\s+/g, "");
    await prisma.productVariant.upsert({
      where: { sku },
      update: { isActive: true },
      create: {
        productId: product.id,
        sku,
        colorId: color.id,
        sizeId: size.id,
        fabricId: fabric.id,
        stockOnHand: 8,
      },
    });
  }
  console.log(`Published ${item.name}.`);
}

const hidden = await prisma.product.updateMany({
  where: { isPlaceholder: true, isPublished: true },
  data: { isPublished: false },
});
if (hidden.count > 0) {
  console.log(`Hid ${hidden.count} sample pieces.`);
}

await prisma.$disconnect();
