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
    sku: "SKU-FRIES-SML",
    name: "Small Fries",
    basePrice: 3.99,
    category: "side",
    type: "item",
    dietaryFlags: ["vegan"],
    allergens: [],
    brand: "",
  },
  {
    sku: "SKU-FRIES-LRG",
    name: "Large Fries",
    basePrice: 5.99,
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
    sku: "MOD-NO-ONION",
    name: "No Onions",
    basePrice: 0,
    category: "modifier",
    type: "modifier",
    dietaryFlags: [],
    allergens: [],
    brand: "",
  },
  {
    sku: "MOD-XTRA-CHEESE",
    name: "Extra Cheese",
    basePrice: 1.5,
    category: "modifier",
    type: "modifier",
    dietaryFlags: ["vegetarian"],
    allergens: ["dairy"],
    brand: "",
  },
  {
    sku: "MOD-BACON",
    name: "Add Bacon",
    basePrice: 2.0,
    category: "modifier",
    type: "modifier",
    dietaryFlags: [],
    allergens: ["pork"],
    brand: "",
  },
  {
    sku: "MOD-AVOCADO",
    name: "Add Avocado",
    basePrice: 2.5,
    category: "modifier",
    type: "modifier",
    dietaryFlags: ["vegan", "gluten_free"],
    allergens: [],
    brand: "",
  },
  {
    sku: "MOD-SIZE-LARGE",
    name: "Size: Large",
    basePrice: 2.0,
    category: "modifier",
    type: "modifier",
    dietaryFlags: [],
    allergens: [],
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

  const count = await prisma.catalogItem.count();
  console.log(`✅ Done. ${count} catalog items.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());