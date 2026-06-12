// ─── Seed Catalog Data ─────────────────────────────────────────────────────
// Run: bun run seed-catalog.ts
// This populates the product catalog with realistic POS data.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_DATA = [
  // ─── Burgers ──────────────────────────────────────────────────────────────
  {
    sku: "SKU-BURGER-REG",
    name: "Classic Cheeseburger",
    basePrice: 12.99,
    category: "burger",
    type: "item",
    dietaryFlags: [],
    allergens: ["dairy", "wheat", "egg"],
    brand: "GourmetCo",
  },
  {
    sku: "SKU-BURGER-DLX",
    name: "Deluxe Bacon Burger",
    basePrice: 15.99,
    category: "burger",
    type: "item",
    dietaryFlags: [],
    allergens: ["dairy", "wheat", "egg", "pork"],
    brand: "GourmetCo",
  },
  {
    sku: "SKU-BURGER-VEG",
    name: "Veggie Burger",
    basePrice: 13.49,
    category: "burger",
    type: "item",
    dietaryFlags: ["vegetarian"],
    allergens: ["wheat", "soy"],
    brand: "GreenBite",
  },
  // ─── Sides ───────────────────────────────────────────────────────────────
  {
    sku: "SKU-FRIES",
    name: "Fries",
    basePrice: 3.99,
    category: "side",
    type: "item",
    dietaryFlags: ["vegan"],
    allergens: [],
    brand: "",
  },
  {
    sku: "SKU-ONION-RINGS",
    name: "Onion Rings",
    basePrice: 5.49,
    category: "side",
    type: "item",
    dietaryFlags: ["vegetarian"],
    allergens: ["wheat", "egg"],
    brand: "",
  },
  {
    sku: "SKU-COLESLAW",
    name: "Coleslaw",
    basePrice: 3.49,
    category: "side",
    type: "item",
    dietaryFlags: ["vegetarian", "gluten_free"],
    allergens: ["egg", "mustard"],
    brand: "",
  },
  // ─── Drinks ──────────────────────────────────────────────────────────────
  {
    sku: "SKU-DRINK-SODA",
    name: "Fountain Soda",
    basePrice: 2.99,
    category: "drink",
    type: "item",
    dietaryFlags: ["vegan", "gluten_free"],
    allergens: [],
    brand: "",
  },
  {
    sku: "SKU-DRINK-ICEDTEA",
    name: "Iced Tea",
    basePrice: 2.99,
    category: "drink",
    type: "item",
    dietaryFlags: ["vegan", "gluten_free"],
    allergens: [],
    brand: "",
  },
  {
    sku: "SKU-DRINK-SHAKE",
    name: "Milkshake",
    basePrice: 6.99,
    category: "drink",
    type: "item",
    dietaryFlags: ["vegetarian"],
    allergens: ["dairy"],
    brand: "",
  },
  // ─── Desserts ────────────────────────────────────────────────────────────
  {
    sku: "SKU-DESSRT-CAKE",
    name: "Chocolate Cake Slice",
    basePrice: 7.99,
    category: "dessert",
    type: "item",
    dietaryFlags: ["vegetarian"],
    allergens: ["dairy", "wheat", "egg", "soy"],
    brand: "GourmetCo",
  },
  {
    sku: "SKU-DESSRT-COOKIE",
    name: "Cookie Skillet",
    basePrice: 8.99,
    category: "dessert",
    type: "item",
    dietaryFlags: ["vegetarian"],
    allergens: ["dairy", "wheat", "egg", "soy", "peanuts"],
    brand: "GourmetCo",
  },
  // ─── Modifiers ───────────────────────────────────────────────────────────
  {
    sku: "sku-onion-mod",
    name: "Onions",
    basePrice: 0.5,
    category: "modifier",
    type: "modifier",
    dietaryFlags: [],
    allergens: [],
    brand: "",
  },
  {
    sku: "sku-cheese-mod",
    name: "Cheese",
    basePrice: 1.0,
    category: "modifier",
    type: "modifier",
    dietaryFlags: ["vegetarian"],
    allergens: ["dairy"],
    brand: "",
  },
  {
    sku: "sku-avocado-mod",
    name: "Avocado",
    basePrice: 2.0,
    category: "modifier",
    type: "modifier",
    dietaryFlags: ["vegan", "gluten_free"],
    allergens: [],
    brand: "",
  },
  {
    sku: "sku-bacon-mod",
    name: "Bacon",
    basePrice: 1.75,
    category: "modifier",
    type: "modifier",
    dietaryFlags: [],
    allergens: ["pork"],
    brand: "",
  },
  {
    sku: "MOD-GLUTEN-FREE",
    name: "Gluten-Free Bun",
    basePrice: 1.0,
    category: "modifier",
    type: "modifier",
    dietaryFlags: ["gluten_free"],
    allergens: [],
    brand: "",
  },
];

async function main() {
  console.log("🌱 Seeding catalog...");

  // Clean relations first to avoid duplicate seeds issues
  await prisma.modifierStateOption.deleteMany({});
  await prisma.catalogItem.updateMany({
    data: {
      sizeGroupId: null,
      appliedSizeGroupId: null,
    },
  });
  await prisma.sizeGroup.deleteMany({});
  await prisma.catalogItem.deleteMany({
    where: {
      OR: [{ category: "size" }, { type: "modifier" }],
    },
  });

  for (const item of SEED_DATA) {
    await prisma.catalogItem.upsert({
      where: { sku: item.sku },
      update: {
        name: item.name,
        basePrice: item.basePrice,
        category: item.category,
        type: item.type,
        dietaryFlags: JSON.stringify(item.dietaryFlags),
        allergens: JSON.stringify(item.allergens),
        brand: item.brand,
        active: true,
      },
      create: {
        sku: item.sku,
        name: item.name,
        basePrice: item.basePrice,
        category: item.category,
        type: item.type,
        dietaryFlags: JSON.stringify(item.dietaryFlags),
        allergens: JSON.stringify(item.allergens),
        brand: item.brand,
        active: true,
      },
    });
  }

  // Seed Chinese General Tso
  await prisma.catalogItem.upsert({
    where: { sku: "SKU-CHINESE-GEN-TSO" },
    update: {
      name: "General Tso's Chicken",
      basePrice: 8.99,
      category: "chinese",
      type: "item",
      dietaryFlags: "[]",
      allergens: '["wheat", "soy"]',
      brand: "GreatWall",
      active: true,
    },
    create: {
      sku: "SKU-CHINESE-GEN-TSO",
      name: "General Tso's Chicken",
      basePrice: 8.99,
      category: "chinese",
      type: "item",
      dietaryFlags: "[]",
      allergens: '["wheat", "soy"]',
      brand: "GreatWall",
      active: true,
    },
  });

  // Create Size Groups and options
  // 1. Size Group for Fries
  await prisma.sizeGroup.create({
    data: {
      id: "group-fries-size",
      name: "Size",
      defaultSku: "MOD-FRIES-SML",
      options: {
        create: [
          {
            sku: "MOD-FRIES-SML",
            name: "Small",
            basePrice: 0.0,
            category: "size",
            type: "modifier",
          },
          {
            sku: "MOD-FRIES-MED",
            name: "Medium",
            basePrice: 1.5,
            category: "size",
            type: "modifier",
          },
          {
            sku: "MOD-FRIES-LRG",
            name: "Large",
            basePrice: 2.0,
            category: "size",
            type: "modifier",
          },
        ],
      },
      items: {
        connect: [{ sku: "SKU-FRIES" }],
      },
    },
  });

  // 2. Size Group for Drinks
  await prisma.sizeGroup.create({
    data: {
      id: "group-soda-size",
      name: "Size",
      defaultSku: "MOD-SODA-SML",
      options: {
        create: [
          {
            sku: "MOD-SODA-SML",
            name: "Small",
            basePrice: 0.0,
            category: "size",
            type: "modifier",
          },
          {
            sku: "MOD-SODA-MED",
            name: "Medium",
            basePrice: 0.74,
            category: "size",
            type: "modifier",
          },
          {
            sku: "MOD-SODA-LRG",
            name: "Large",
            basePrice: 1.5,
            category: "size",
            type: "modifier",
          },
        ],
      },
      items: {
        connect: [{ sku: "SKU-DRINK-SODA" }],
      },
    },
  });

  // 3. Size Group for Chinese General Tso
  await prisma.sizeGroup.create({
    data: {
      id: "group-gentso-size",
      name: "Size",
      defaultSku: "MOD-GENTSO-SML",
      options: {
        create: [
          {
            sku: "MOD-GENTSO-SML",
            name: "Small",
            basePrice: 0.0,
            category: "size",
            type: "modifier",
          },
          {
            sku: "MOD-GENTSO-MED",
            name: "Medium",
            basePrice: 3.0,
            category: "size",
            type: "modifier",
          },
          {
            sku: "MOD-GENTSO-LRG",
            name: "Large",
            basePrice: 6.0,
            category: "size",
            type: "modifier",
          },
        ],
      },
      items: {
        connect: [{ sku: "SKU-CHINESE-GEN-TSO" }],
      },
    },
  });

  // Clean up legacy modifiers explicitly
  await prisma.catalogItem.deleteMany({
    where: {
      sku: {
        in: [
          "MOD-ONION",
          "MOD-CHEESE",
          "MOD-AVOCADO",
          "MOD-BACON",
          "MOD-NO-ONION",
          "MOD-XTRA-CHEESE",
          "MOD-SIZE-LARGE",
        ],
      },
    },
  });

  // Seed modifier state options
  // 1. Onion States
  await prisma.modifierStateOption.createMany({
    data: [
      {
        modifierSku: "sku-onion-mod",
        state: "NO",
        label: "No Onions",
        priceOverride: 0.0,
      },
      {
        modifierSku: "sku-onion-mod",
        state: "LESS",
        label: "Less Onions",
        priceOverride: 0.25,
      },
      {
        modifierSku: "sku-onion-mod",
        state: "ADD",
        label: "Add Onions",
        priceOverride: 0.5,
      },
      {
        modifierSku: "sku-onion-mod",
        state: "EXTRA",
        label: "Extra Onions",
        priceOverride: 0.75,
      },
      {
        modifierSku: "sku-onion-mod",
        state: "SIDE",
        label: "Onions on Side",
        priceOverride: 0.5,
      },
    ],
  });

  // 2. Cheese States
  await prisma.modifierStateOption.createMany({
    data: [
      {
        modifierSku: "sku-cheese-mod",
        state: "NO",
        label: "No Cheese",
        priceOverride: 0.0,
      },
      {
        modifierSku: "sku-cheese-mod",
        state: "LESS",
        label: "Less Cheese",
        priceOverride: 0.5,
      },
      {
        modifierSku: "sku-cheese-mod",
        state: "ADD",
        label: "Add Cheese",
        priceOverride: 1.0,
      },
      {
        modifierSku: "sku-cheese-mod",
        state: "EXTRA",
        label: "Extra Cheese",
        priceOverride: 1.5,
      },
      {
        modifierSku: "sku-cheese-mod",
        state: "SIDE",
        label: "Cheese on Side",
        priceOverride: 1.0,
      },
    ],
  });

  // 3. Avocado States
  await prisma.modifierStateOption.createMany({
    data: [
      {
        modifierSku: "sku-avocado-mod",
        state: "NO",
        label: "No Avocado",
        priceOverride: 0.0,
      },
      {
        modifierSku: "sku-avocado-mod",
        state: "LESS",
        label: "Less Avocado",
        priceOverride: 1.0,
      },
      {
        modifierSku: "sku-avocado-mod",
        state: "ADD",
        label: "Add Avocado",
        priceOverride: 2.0,
      },
      {
        modifierSku: "sku-avocado-mod",
        state: "EXTRA",
        label: "Extra Avocado",
        priceOverride: 3.0,
      },
      {
        modifierSku: "sku-avocado-mod",
        state: "SIDE",
        label: "Avocado on Side",
        priceOverride: 2.0,
      },
    ],
  });

  // 4. Bacon States
  await prisma.modifierStateOption.createMany({
    data: [
      {
        modifierSku: "sku-bacon-mod",
        state: "NO",
        label: "No Bacon",
        priceOverride: 0.0,
      },
      {
        modifierSku: "sku-bacon-mod",
        state: "LESS",
        label: "Less Bacon",
        priceOverride: 1.0,
      },
      {
        modifierSku: "sku-bacon-mod",
        state: "ADD",
        label: "Add Bacon",
        priceOverride: 1.75,
      },
      {
        modifierSku: "sku-bacon-mod",
        state: "EXTRA",
        label: "Extra Bacon",
        priceOverride: 2.5,
      },
      {
        modifierSku: "sku-bacon-mod",
        state: "SIDE",
        label: "Bacon on Side",
        priceOverride: 1.75,
      },
    ],
  });

  const count = await prisma.catalogItem.count();
  console.log(
    `✅ Done. ${count} catalog items seeded successfully with variant options and states.`,
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
