import { createRequire } from "node:module";
import bcrypt from "bcryptjs";
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

const permissions = [
  "dashboard.read",
  "products.write",
  "inventory.write",
  "orders.write",
  "orders.refund",
  "customers.write",
  "customers.read",
  "bespoke.write",
  "bespoke.read",
  "reviews.moderate",
  "content.write",
  "marketing.write",
  "shipping.write",
  "reports.read",
  "settings.write",
  "staff.write",
  "audit.read",
];

const roles: Record<string, string[]> = {
  super_admin: permissions,
  store_manager: permissions.filter((key) => key !== "staff.write"),
  order_manager: ["dashboard.read", "orders.write", "orders.refund", "customers.read", "bespoke.write", "reports.read"],
  product_manager: ["dashboard.read", "products.write", "inventory.write", "reviews.moderate", "reports.read"],
  customer_support: ["dashboard.read", "orders.write", "customers.write", "bespoke.read", "reviews.moderate"],
};

const roleNames: Record<string, string> = {
  super_admin: "Super Admin",
  store_manager: "Store Manager",
  order_manager: "Order Manager",
  product_manager: "Product Manager",
  customer_support: "Customer Support",
};

export const policies = [
  [
    "payment",
    "Payment information",
    "PERIS (Lamasat Jawhareya L.L.C) currently accepts secure electronic payments via Visa, Mastercard, Apple Pay, and Google Pay through our authorized payment gateway, as well as Cash on Delivery (COD) within the UAE. Tabby installment services will be integrated upon final merchant approval. For your security, all card transactions are encrypted and processed directly by our payment provider; PERIS does not collect or store your credit card details.",
  ],
  [
    "terms",
    "Terms and conditions",
    "Welcome to ljperis.com. This website is operated by Lamasat Jawhareya Ladies Tailoring L.L.C (PERIS), officially registered and located at Shop M01, Abu Hail Center, Dubai. By visiting our site and purchasing something from us, you engage in our \"Service\" and agree to be bound by the following terms and conditions:\n\n1. General Conditions: We reserve the right to refuse service to anyone for any reason at any time. Prices for our products are subject to change without prior notice.\n\n2. Products & Services: We have made every effort to display as accurately as possible the colors and images of our abayas and garments. Custom-tailored pieces (Custom-made) are crafted specifically to customer measurements and are subject to our in-store alteration policies.\n\n3. Accuracy of Billing Information: We reserve the right to refuse any order you place with us. You agree to provide current, complete, and accurate purchase and account information for all purchases made at our store.\n\n4. Governing Law: These Terms of Service and any separate agreements whereby we provide you services shall be governed by and construed in accordance with the laws of the United Arab Emirates.",
  ],
  [
    "privacy",
    "Privacy policy",
    "At PERIS (Lamasat Jawhareya L.L.C), we respect your privacy and are committed to protecting your personal data. We collect essential customer information solely for the purposes of order fulfillment, payment processing, delivery, and direct communication. Your data is kept strictly confidential, processed securely, and is never sold or shared with unauthorized third parties. We adhere to standard industry practices and UAE data protection guidelines to ensure your shopping experience is safe and secure.",
  ],
  [
    "returns",
    "Returns and exchange policy",
    "At PERIS (Lamasat Jawhareya L.L.C), we are committed to your satisfaction while maintaining fair business practices. Please read our Return and Exchange Policy carefully:\n\n- Returns (Refunds): You may return standard eligible items within 24 hours of receiving your order. After 24 hours from the delivery time, we strictly do not accept any returns or issue refunds.\n- Exchanges: You may exchange standard eligible items within 5 days of receiving your order, subject to stock availability.\n- Conditions for Return/Exchange:\n  - Items must be in their original, unused, unwashed, and undamaged condition.\n  - All original tags, labels, and packaging must be fully intact and attached.\n  - A valid proof of purchase (receipt or order number) must be presented.\n- Non-Returnable & Non-Exchangeable Items: Custom-made, altered, or specially tailored pieces cannot be returned or exchanged unless there is a proven manufacturing defect.\n- Shipping Fees: Original shipping costs are non-refundable. The customer is responsible for any return or exchange shipping fees unless the item received was defective or incorrect.",
  ],
  [
    "shipping",
    "Shipping policy",
    "PERIS (Lamasat Jawhareya L.L.C) offers reliable delivery services across the United Arab Emirates. All orders are carefully prepared and safely dispatched directly from our boutique at Abu Hail Center, Dubai. To ensure the most accurate service for your specific location, our team will contact you directly via WhatsApp or email to confirm the exact shipping fees and estimated delivery time after your order is placed.",
  ],
] as const;

async function main() {
  for (const key of permissions) {
    await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
  }

  for (const [key, grants] of Object.entries(roles)) {
    const role = await prisma.role.upsert({
      where: { key },
      update: { name: roleNames[key] },
      create: { key, name: roleNames[key] },
    });
    for (const permissionKey of grants) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { key: permissionKey } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@peris.ae";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "change-this-password";
  const superAdmin = await prisma.role.findUniqueOrThrow({ where: { key: "super_admin" } });
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      accountType: "STAFF",
      firstName: "PERIS",
      lastName: "Admin",
      roleId: superAdmin.id,
      emailVerifiedAt: new Date(),
    },
  });

  const categories = [
    ["casual-elegance", "Casual Elegance", "Practical, comfortable, and effortlessly chic for your everyday wear.", 1],
    ["evening-occasions", "Evening & Occasions", "Luxurious designs and exquisite embroidery to make you shine on your special nights.", 2],
    ["bespoke-designs", "Bespoke Designs", "Design your own Abaya, and let our master tailors turn your vision into reality.", 3],
  ] as const;
  for (const [slug, name, description, sortOrder] of categories) {
    await prisma.category.upsert({
      where: { slug },
      update: { sortOrder },
      create: { slug, name, description, sortOrder },
    });
  }

  const colors = [
    ["Black", "#161616", 1],
    ["Sand", "#cbbfa8", 2],
    ["Burgundy", "#751629", 3],
    ["Stone", "#9aa3a8", 4],
    ["Ivory", "#f3efe4", 5],
  ] as const;
  for (const [name, hex, sortOrder] of colors) {
    await prisma.color.upsert({ where: { name }, update: { hex, sortOrder }, create: { name, hex, sortOrder } });
  }

  const sizes = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
  for (const [index, code] of sizes.entries()) {
    await prisma.size.upsert({
      where: { code },
      update: {},
      create: { name: code, code, sortOrder: index },
    });
  }

  await prisma.fabric.upsert({
    where: { name: "Sample crepe" },
    update: {},
    create: { name: "Sample crepe", description: "Placeholder fabric until the house mill list is confirmed." },
  });

  const commissionFabrics = [
    ["Crepe", 1, "Light and fluid, with a soft fall.", "/media/fabric-crepe.jpg"],
    ["Nida", 2, "Firm and smooth, holding a clean line.", "/media/fabric-nida.jpg"],
    ["Silk blend", 3, "A quiet sheen for evening.", "/media/fabric-silk.jpg"],
    ["Linen blend", 4, "Dry and breathable for the day.", "/media/fabric-linen.jpg"],
  ] as const;
  for (const [name, sortOrder, description, imageUrl] of commissionFabrics) {
    await prisma.fabric.upsert({
      where: { name },
      update: {},
      create: { name, sortOrder, description, imageUrl, isCommission: true },
    });
  }

  for (const inches of [50, 52, 54, 56, 58, 60]) {
    await prisma.lengthOption.upsert({
      where: { inches },
      update: {},
      create: { inches, label: `${inches} in` },
    });
  }

  const catalog = [
    {
      slug: "noor-column-abaya",
      styleCode: "SAMPLE-NOOR",
      name: "Noor Column Abaya",
      price: 89000,
      category: "casual-elegance",
      fabric: "Sample crepe",
      description: "A quiet column with a deep opening and a long, unbroken line. This sample stands in for a PERIS day piece until the house photographs its own cloth.",
      bestseller: true,
      isNew: false,
      image: "/media/flowing.jpg",
      alt: "Placeholder study of a black column abaya against a burgundy curtain",
      position: "center top",
      hoverImage: "/media/floral.jpg",
      hoverAlt: "Closer embroidery detail for the Noor column study",
      hoverPosition: "center",
      colorNames: ["Black", "Sand"],
    },
    {
      slug: "layl-embroidery-abaya",
      styleCode: "SAMPLE-LAYL",
      name: "Layl Embroidery Abaya",
      price: 168000,
      compare: 189000,
      category: "evening-occasions",
      fabric: "Sample crepe",
      description: "An evening neckline with floral embroidery and a lace cuff. The photograph is a placeholder detail, not a PERIS production garment.",
      bestseller: true,
      isNew: false,
      image: "/media/floral.jpg",
      alt: "Placeholder study of black abaya embroidery and a lace cuff",
      position: "center",
      hoverImage: "/media/flowing.jpg",
      hoverAlt: "Closer view of the Layl evening silhouette",
      hoverPosition: "center top",
      colorNames: ["Black", "Burgundy"],
    },
    {
      slug: "sahar-day-abaya",
      styleCode: "SAMPLE-SAHAR",
      name: "Sahar Day Abaya",
      price: 76000,
      category: "casual-elegance",
      fabric: "Sample crepe",
      description: "A lighter day silhouette with stitched cuffs. Shown here as a sample study while the PERIS day collection is being photographed.",
      bestseller: false,
      isNew: true,
      image: "/media/gray.jpg",
      alt: "Placeholder study of a gray day abaya",
      position: "center top",
      hoverImage: "/media/flowing.jpg",
      hoverAlt: "Closer day silhouette study for Sahar",
      hoverPosition: "center",
      colorNames: ["Stone", "Ivory"],
    },
  ];

  const fabric = await prisma.fabric.findUniqueOrThrow({ where: { name: "Sample crepe" } });
  const allSizes = await prisma.size.findMany();
  const lengths = await prisma.lengthOption.findMany();

  for (const item of catalog) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: item.category } });
    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        isPlaceholder: true,
      },
      create: {
        slug: item.slug,
        styleCode: item.styleCode,
        name: item.name,
        description: item.description,
        fabricDetails: item.fabric,
        basePriceFils: item.price,
        compareAtFils: item.compare ?? null,
        isPublished: true,
        isBestseller: item.bestseller,
        isNew: item.isNew,
        isPlaceholder: true,
      },
    });
    await prisma.productCategory.upsert({
      where: { productId_categoryId: { productId: product.id, categoryId: category.id } },
      update: {},
      create: { productId: product.id, categoryId: category.id },
    });
    const existingImage = await prisma.productImage.findFirst({ where: { productId: product.id, url: item.image } });
    if (!existingImage) {
      await prisma.productImage.create({
        data: { productId: product.id, url: item.image, alt: item.alt, position: item.position, sortOrder: 0 },
      });
    }
    if (item.hoverImage) {
      const existingHover = await prisma.productImage.findFirst({
        where: { productId: product.id, url: item.hoverImage },
      });
      if (!existingHover) {
        await prisma.productImage.create({
          data: {
            productId: product.id,
            url: item.hoverImage,
            alt: item.hoverAlt,
            position: item.hoverPosition,
            sortOrder: 1,
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
    for (const colorName of item.colorNames) {
      const color = await prisma.color.findUniqueOrThrow({ where: { name: colorName } });
      for (const size of allSizes) {
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
    }
  }

  for (const [slug, title, body] of policies) {
    await prisma.cmsPage.upsert({
      where: { slug },
      update: { title, body, status: "PUBLISHED" },
      create: { slug, title, body, status: "PUBLISHED" },
    });
  }

  await prisma.announcement.upsert({
    where: { id: "boutique-hours" },
    update: {},
    create: { id: "boutique-hours", message: "The boutique is open daily, 10:00 AM – 10:00 PM", isActive: true },
  });

  await prisma.storeSetting.upsert({
    where: { key: "vat" },
    update: { value: { rate: 0.05, pricesIncludeVat: true } },
    create: { key: "vat", value: { rate: 0.05, pricesIncludeVat: true } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "maintenance" },
    update: {},
    create: { key: "maintenance", value: { closed: false } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "hours" },
    update: {},
    create: { key: "hours", value: { line: "Daily from 10:00 AM to 10:00 PM." } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "address" },
    update: {},
    create: { key: "address", value: { line: "Boutique M01, 3 Floor, Abu Hail Center, Dubai, United Arab Emirates." } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "phone" },
    update: {},
    create: { key: "phone", value: { line: "+971 50 540 6077" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "instagram" },
    update: {},
    create: { key: "instagram", value: { line: "https://www.instagram.com/peris_uae/" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "facebook" },
    update: {},
    create: { key: "facebook", value: { line: "https://www.facebook.com/perisdubai" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "maps" },
    update: { value: { line: "https://maps.app.goo.gl/YdjuY6Nqnad2rpD36" } },
    create: { key: "maps", value: { line: "https://maps.app.goo.gl/YdjuY6Nqnad2rpD36" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "parent" },
    update: {},
    create: { key: "parent", value: { line: "Lamasat Jawhareya" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "story" },
    update: {},
    create: {
      key: "story",
      value: {
        line: "Born in the heart of Dubai under the umbrella of 'Lamasat Jawhareya', PERIS is the ultimate destination for the modern woman seeking refinement and exclusivity. We don’t just tailor Abayas; we craft wearable art that reflects your personality. Guided by our Master Tailors and a steadfast commitment to precision in every cut and stitch, we guarantee a flawless finish that rivals the world’s leading luxury brands. At PERIS, we believe that true essence lies in the details.",
      },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "welcome" },
    update: {},
    create: {
      key: "welcome",
      value: {
        line: "We are always delighted to welcome you at our boutique or answer your inquiries online. Book your appointment today for a fitting or a design consultation.",
      },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "hero" },
    update: {},
    create: { key: "hero", value: { line: "Elegance, Meticulously Tailored." } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "intro" },
    update: {},
    create: {
      key: "intro",
      value: {
        line: "Welcome to PERIS, where the rich heritage of the Khaleeji Abaya meets contemporary sophistication. Discover exclusive designs and premium fabrics, carefully selected to reflect your unique beauty and individuality.",
      },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "heading" },
    update: {},
    create: { key: "heading", value: { line: "Wearable art, cut in Dubai" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "fitting" },
    update: {},
    create: { key: "fitting", value: { line: "What the fitting room is built on" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "tailoring" },
    update: {},
    create: { key: "tailoring", value: { line: "Bespoke Tailoring" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "precision" },
    update: {},
    create: {
      key: "precision",
      value: {
        line: "Abayas custom-tailored to your exact measurements and unique taste with unparalleled precision.",
      },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "premium" },
    update: {},
    create: { key: "premium", value: { line: "Premium Fabrics" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "handpick" },
    update: {},
    create: {
      key: "handpick",
      value: {
        line: "We handpick the finest fabrics and threads from top-tier suppliers to ensure lasting comfort and an unforgettable look.",
      },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "craftsmanship" },
    update: {},
    create: { key: "craftsmanship", value: { line: "Master Craftsmanship" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "detail" },
    update: {},
    create: {
      key: "detail",
      value: {
        line: "Exceptional attention to detail, from the very first pattern cut to the final placement of our signature tag.",
      },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "sample" },
    update: {},
    create: { key: "sample", value: { line: "Sample notes" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "hem" },
    update: {},
    create: {
      key: "hem",
      value: {
        line: "The hem sat exactly where I asked, and the cloth stayed quiet through a long evening.",
      },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "sketch" },
    update: {},
    create: {
      key: "sketch",
      value: {
        line: "I sent a sketch on a Tuesday. The fitting in Abu Hail felt like the drawing had learned how to move.",
      },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "day" },
    update: {},
    create: {
      key: "day",
      value: {
        line: "A day abaya I can wear to the office and still want to wear to dinner.",
      },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "notes" },
    update: {},
    create: { key: "notes", value: { line: "Notes from the house" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "list" },
    update: {},
    create: {
      key: "list",
      value: {
        line: "New cloth, private appointments, and the occasional evening piece. The list is kept at the desk until email delivery is connected.",
      },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "footer" },
    update: {},
    create: {
      key: "footer",
      value: {
        line: "Luxury abayas and bespoke tailoring from Dubai, a house of Lamasat Jawhareya.",
      },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "ways" },
    update: {},
    create: { key: "ways", value: { line: "Three ways to wear the house" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "pieces" },
    update: {},
    create: {
      key: "pieces",
      value: { line: "Pieces the boutique keeps close" },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "follow" },
    update: {},
    create: { key: "follow", value: { line: "Follow @peris_uae" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "city" },
    update: {},
    create: { key: "city", value: { line: "Dubai" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "collect" },
    update: {},
    create: { key: "collect", value: { line: "Collections" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "commission" },
    update: {},
    create: { key: "commission", value: { line: "Commission" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "contacteyebrow" },
    update: {},
    create: { key: "contacteyebrow", value: { line: "The boutique" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "shopeyebrow" },
    update: {},
    create: { key: "shopeyebrow", value: { line: "The edit" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "appointmenteyebrow" },
    update: {},
    create: { key: "appointmenteyebrow", value: { line: "Appointment" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "bespokeeyebrow" },
    update: {},
    create: { key: "bespokeeyebrow", value: { line: "Atelier" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "policyeyebrow" },
    update: { value: { line: "The house" } },
    create: { key: "policyeyebrow", value: { line: "The house" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "faqeyebrow" },
    update: {},
    create: { key: "faqeyebrow", value: { line: "Questions" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "sizeguideeyebrow" },
    update: {},
    create: { key: "sizeguideeyebrow", value: { line: "Fit" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "trackeyebrow" },
    update: {},
    create: { key: "trackeyebrow", value: { line: "Orders" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "notfoundeyebrow" },
    update: {},
    create: { key: "notfoundeyebrow", value: { line: "404" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "maintenanceeyebrow" },
    update: {},
    create: { key: "maintenanceeyebrow", value: { line: "PERIS" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "skulabel" },
    update: {},
    create: { key: "skulabel", value: { line: "SKU" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "checkouteyebrow" },
    update: {},
    create: { key: "checkouteyebrow", value: { line: "Checkout" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "confirmationeyebrow" },
    update: {},
    create: { key: "confirmationeyebrow", value: { line: "Order" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "bageyebrow" },
    update: {},
    create: { key: "bageyebrow", value: { line: "Bag" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "summaryeyebrow" },
    update: {},
    create: { key: "summaryeyebrow", value: { line: "Summary" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "accounteyebrow" },
    update: {},
    create: { key: "accounteyebrow", value: { line: "Account" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "wishlisteyebrow" },
    update: {},
    create: { key: "wishlisteyebrow", value: { line: "Wishlist" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "searcheyebrow" },
    update: {},
    create: { key: "searcheyebrow", value: { line: "Search" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "searchicon" },
    update: {},
    create: { key: "searchicon", value: { line: "Search" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "searchhouse" },
    update: {},
    create: { key: "searchhouse", value: { line: "Search the house" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "searchpieces" },
    update: {},
    create: { key: "searchpieces", value: { line: "Search pieces" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "searchsubmit" },
    update: {},
    create: { key: "searchsubmit", value: { line: "Search" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "ordernow" },
    update: {},
    create: { key: "ordernow", value: { line: "Order Now" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "orderprefill" },
    update: {},
    create: {
      key: "orderprefill",
      value: {
        line: "Hello PERIS, I would like to place an order.",
      },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "bespokeprefill" },
    update: {},
    create: {
      key: "bespokeprefill",
      value: {
        line: "Hello PERIS, I would like to enquire about bespoke tailoring.",
      },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "orderhelpprefill" },
    update: {},
    create: {
      key: "orderhelpprefill",
      value: {
        line: "Hello PERIS, I need help with an order.",
      },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "productprefill" },
    update: {},
    create: {
      key: "productprefill",
      value: {
        line: "Hello PERIS, I would like to ask about",
      },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "checkoutprefill" },
    update: {},
    create: {
      key: "checkoutprefill",
      value: {
        line: "Hello PERIS, my order is",
      },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "bespokesendprefill" },
    update: {},
    create: {
      key: "bespokesendprefill",
      value: {
        line: "Bespoke request",
      },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "sendwhatsapp" },
    update: {},
    create: { key: "sendwhatsapp", value: { line: "Send on WhatsApp" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "askpiece" },
    update: {},
    create: {
      key: "askpiece",
      value: { line: "Ask about this piece on WhatsApp" },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "tellboutique" },
    update: {},
    create: {
      key: "tellboutique",
      value: { line: "Tell the boutique on WhatsApp" },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "waboutique" },
    update: {},
    create: {
      key: "waboutique",
      value: { line: "WhatsApp the boutique" },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "whatsappprefill" },
    update: {},
    create: {
      key: "whatsappprefill",
      value: {
        line: "Hello PERIS, I would like to talk about an abaya.",
      },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "appointmentprefill" },
    update: {},
    create: {
      key: "appointmentprefill",
      value: {
        line: "Hello PERIS, I would like to book an appointment.",
      },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "policybanner" },
    update: {},
    create: {
      key: "policybanner",
      value: {
        line: "Pending approval from the business owner. This is not a final policy.",
      },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "sizeguidebanner" },
    update: {},
    create: {
      key: "sizeguidebanner",
      value: {
        line: "Pending the master tailor's measurements. The ranges below are not a PERIS size chart yet.",
      },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "heroalt" },
    update: {},
    create: {
      key: "heroalt",
      value: {
        line: "Placeholder study of a black column abaya in front of a burgundy curtain",
      },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "storyalt" },
    update: {},
    create: {
      key: "storyalt",
      value: {
        line: "Placeholder study of embroidery at the neckline of a black abaya",
      },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "aboutalt" },
    update: {},
    create: {
      key: "aboutalt",
      value: {
        line: "Placeholder study of a black column abaya",
      },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "sellers" },
    update: {},
    create: { key: "sellers", value: { line: "Best sellers" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "debut" },
    update: {},
    create: { key: "debut", value: { line: "New arrival" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "abode" },
    update: {},
    create: { key: "abode", value: { line: "The house" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "why" },
    update: {},
    create: { key: "why", value: { line: "Why PERIS" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "social" },
    update: {},
    create: { key: "social", value: { line: "Instagram" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "testimonials" },
    update: {},
    create: { key: "testimonials", value: { line: "Testimonials" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "correspondence" },
    update: {},
    create: { key: "correspondence", value: { line: "Correspondence" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "reviewnote" },
    update: {},
    create: {
      key: "reviewnote",
      value: { line: "Sample, until verified reviews are published" },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "instagramlink" },
    update: {},
    create: { key: "instagramlink", value: { line: "Open Instagram" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "fittingroom" },
    update: {},
    create: { key: "fittingroom", value: { line: "From the fitting room" } },
  });

  await prisma.storeSetting.upsert({
    where: { key: "explorecta" },
    update: {},
    create: {
      key: "explorecta",
      value: { line: "Explore Our Collections" },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "chatcta" },
    update: {},
    create: {
      key: "chatcta",
      value: { line: "Chat with Us on WhatsApp" },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "begincta" },
    update: {},
    create: {
      key: "begincta",
      value: { line: "Begin a commission" },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "viewedit" },
    update: {},
    create: {
      key: "viewedit",
      value: { line: "View the edit" },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "viewpiece" },
    update: {},
    create: {
      key: "viewpiece",
      value: { line: "View the piece" },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "readstory" },
    update: {},
    create: {
      key: "readstory",
      value: { line: "Read the story" },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "emaillabel" },
    update: {},
    create: {
      key: "emaillabel",
      value: { line: "Email address" },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "subscribebtn" },
    update: {},
    create: {
      key: "subscribebtn",
      value: { line: "Subscribe" },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "listmsg" },
    update: {},
    create: {
      key: "listmsg",
      value: { line: "You are on the list. Email delivery is not connected." },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "emailerr" },
    update: {},
    create: {
      key: "emailerr",
      value: { line: "Enter a valid email address." },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "footnews" },
    update: {},
    create: {
      key: "footnews",
      value: { line: "Newsletter" },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "footemail" },
    update: {},
    create: {
      key: "footemail",
      value: { line: "Email address" },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "footsub" },
    update: {},
    create: {
      key: "footsub",
      value: { line: "Subscribe" },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "footlist" },
    update: {},
    create: {
      key: "footlist",
      value: { line: "You are on the list. Email delivery is not connected." },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "footerr" },
    update: {},
    create: {
      key: "footerr",
      value: { line: "Enter a valid email address." },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "footquick" },
    update: {},
    create: {
      key: "footquick",
      value: { line: "Quick links" },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "footsupport" },
    update: {},
    create: {
      key: "footsupport",
      value: { line: "Customer support" },
    },
  });

  await prisma.storeSetting.upsert({
    where: { key: "footboutique" },
    update: {},
    create: {
      key: "footboutique",
      value: { line: "The boutique" },
    },
  });

  for (const [key, line] of [
    ["reasonidx1", "01"],
    ["reasonidx2", "02"],
    ["reasonidx3", "03"],
  ] as const) {
    await prisma.storeSetting.upsert({
      where: { key },
      update: {},
      create: { key, value: { line } },
    });
  }

  const zone = await prisma.shippingZone.upsert({
    where: { id: "uae-dubai" },
    update: {},
    create: { id: "uae-dubai", name: "Dubai", country: "AE", emirate: "Dubai" },
  });
  const method = await prisma.shippingMethod.upsert({
    where: { code: "uae-standard" },
    update: {},
    create: { code: "uae-standard", name: "UAE delivery", estimatedMinDays: 2, estimatedMaxDays: 5, codAllowed: true },
  });
  await prisma.shippingRate.upsert({
    where: { methodId_zoneId: { methodId: method.id, zoneId: zone.id } },
    update: {},
    create: { methodId: method.id, zoneId: zone.id, priceFils: 2500, freeOverFils: null },
  });

  await prisma.coupon.upsert({
    where: { code: "PERIS10" },
    update: {
      type: "PERCENT",
      amount: 10,
      minSubtotalFils: 0,
      isActive: true,
    },
    create: {
      code: "PERIS10",
      type: "PERCENT",
      amount: 10,
      minSubtotalFils: 0,
      isActive: true,
    },
  });

  console.log(`Seeded catalog and staff account ${adminEmail}`);
}

const invokedDirectly = /seed\.[cm]?[jt]s$/.test(process.argv[1] ?? "");
if (invokedDirectly) {
  main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
