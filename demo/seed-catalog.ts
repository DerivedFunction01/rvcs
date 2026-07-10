// ─── Seed Catalog Data ─────────────────────────────────────────────────────
// Run: bun run seed-catalog.ts
// This populates the product catalog with realistic POS data.

import { db as prisma } from "./src/lib/db";

const CHINESE_SIDES = [
  { optionSku: "SKU-SIDE-CHOWMEIN", price: 0 },
  { optionSku: "SKU-FRIED-RICE", price: 0 },
  { optionSku: "SKU-SIDE-SUPERGREENS", price: 0 },
];

const CHINESE_ENTREES = [
  { optionSku: "SKU-CHINESE-ORANGE-CHK", price: 0 },
  { optionSku: "SKU-CHINESE-KUNGPAO-CHK", price: 0 },
  { optionSku: "SKU-CHINESE-SWEETFIRE-CHK", price: 0 },
  { optionSku: "SKU-CHINESE-MUSHROOM-CHK", price: 0 },
  { optionSku: "SKU-CHINESE-STRINGBEAN-CHK", price: 0 },
  { optionSku: "SKU-CHINESE-BLKPEPPER-CHK", price: 0 },
  { optionSku: "SKU-CHINESE-HNY-SESAME-CHK", price: 0 },
  { optionSku: "SKU-CHINESE-BEIJING-BEEF", price: 0 },
  { optionSku: "SKU-CHINESE-BROCCOLI-BEEF", price: 0 },
  { optionSku: "SKU-CHINESE-BLKPEPPER-STEAK", price: 1.5 },
  { optionSku: "SKU-CHINESE-HNYWALNUT-SHRIMP", price: 1.5 },
  { optionSku: "SKU-CHINESE-PEPPERCORN-SHRIMP", price: 1.5 },
];

const buildChoices = (
  slotSku: string,
  options: { optionSku: string; price: number }[],
) =>
  options.map((opt) => ({
    slotSku,
    optionSku: opt.optionSku,
    price: opt.price,
  }));

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
  // ─── Chinese ─────────────────────────────────────────────────────────────
  {
    sku: "SKU-FRIED-RICE",
    name: "Fried Rice",
    basePrice: 8.99,
    category: "chinese",
    type: "item",
    dietaryFlags: ["vegetarian"],
    allergens: ["soy", "wheat"],
    brand: "GreatWall",
  },
  {
    sku: "SKU-FRIED-RICE-PORK",
    name: "Pork Fried Rice",
    basePrice: 10.99,
    category: "chinese",
    type: "item",
    dietaryFlags: [],
    allergens: ["soy", "wheat", "pork"],
    brand: "GreatWall",
  },
  {
    sku: "SKU-FRIED-RICE-CHICKEN",
    name: "Chicken Fried Rice",
    basePrice: 10.99,
    category: "chinese",
    type: "item",
    dietaryFlags: [],
    allergens: ["soy", "wheat"],
    brand: "GreatWall",
  },
  {
    sku: "SKU-FRIED-RICE-SHRIMP",
    name: "Shrimp Fried Rice",
    basePrice: 12.99,
    category: "chinese",
    type: "item",
    dietaryFlags: [],
    allergens: ["soy", "wheat", "shellfish"],
    brand: "GreatWall",
  },
  {
    sku: "SKU-CHINESE-GEN-TSO",
    name: "General Tso's Chicken",
    basePrice: 8.99,
    category: "chinese",
    type: "item",
    dietaryFlags: ["spicy"],
    allergens: ["wheat", "soy"],
    brand: "GreatWall",
  },
  {
    sku: "SKU-CHINESE-ORANGE-CHK",
    name: "Orange Chicken",
    basePrice: 8.99,
    category: "chinese",
    type: "item",
    dietaryFlags: ["spicy"],
    allergens: ["wheat", "soy"],
    brand: "GreatWall",
  },
  {
    sku: "SKU-CHINESE-KUNGPAO-CHK",
    name: "Kung Pao Chicken",
    basePrice: 8.99,
    category: "chinese",
    type: "item",
    dietaryFlags: ["spicy"],
    allergens: ["wheat", "soy", "peanuts"],
    brand: "GreatWall",
  },
  {
    sku: "SKU-CHINESE-SWEETFIRE-CHK",
    name: "SweetFire Chicken Breast",
    basePrice: 8.99,
    category: "chinese",
    type: "item",
    dietaryFlags: ["spicy"],
    allergens: ["wheat", "soy"],
    brand: "GreatWall",
  },
  {
    sku: "SKU-CHINESE-MUSHROOM-CHK",
    name: "Mushroom Chicken",
    basePrice: 8.99,
    category: "chinese",
    type: "item",
    dietaryFlags: [],
    allergens: ["wheat", "soy"],
    brand: "GreatWall",
  },
  {
    sku: "SKU-CHINESE-STRINGBEAN-CHK",
    name: "String Bean Chicken Breast",
    basePrice: 8.99,
    category: "chinese",
    type: "item",
    dietaryFlags: [],
    allergens: ["wheat", "soy"],
    brand: "GreatWall",
  },
  {
    sku: "SKU-CHINESE-BLKPEPPER-CHK",
    name: "Black Pepper Chicken",
    basePrice: 8.99,
    category: "chinese",
    type: "item",
    dietaryFlags: [],
    allergens: ["wheat", "soy"],
    brand: "GreatWall",
  },
  {
    sku: "SKU-CHINESE-HNY-SESAME-CHK",
    name: "Honey Sesame Chicken Breast",
    basePrice: 8.99,
    category: "chinese",
    type: "item",
    dietaryFlags: [],
    allergens: ["wheat", "soy", "sesame"],
    brand: "GreatWall",
  },
  {
    sku: "SKU-CHINESE-BEIJING-BEEF",
    name: "Beijing Beef",
    basePrice: 9.99,
    category: "chinese",
    type: "item",
    dietaryFlags: ["spicy"],
    allergens: ["wheat", "soy"],
    brand: "GreatWall",
  },
  {
    sku: "SKU-CHINESE-BROCCOLI-BEEF",
    name: "Broccoli Beef",
    basePrice: 9.99,
    category: "chinese",
    type: "item",
    dietaryFlags: [],
    allergens: ["wheat", "soy"],
    brand: "GreatWall",
  },
  {
    sku: "SKU-CHINESE-BLKPEPPER-STEAK",
    name: "Black Pepper Angus Steak",
    basePrice: 11.99,
    category: "chinese",
    type: "item",
    dietaryFlags: [],
    allergens: ["wheat", "soy"],
    brand: "GreatWall",
  },
  {
    sku: "SKU-CHINESE-HNYWALNUT-SHRIMP",
    name: "Honey Walnut Shrimp",
    basePrice: 10.99,
    category: "chinese",
    type: "item",
    dietaryFlags: [],
    allergens: ["wheat", "soy", "shellfish", "tree_nuts"],
    brand: "GreatWall",
  },
  {
    sku: "SKU-CHINESE-PEPPERCORN-SHRIMP",
    name: "Peppercorn Shrimp",
    basePrice: 10.99,
    category: "chinese",
    type: "item",
    dietaryFlags: [],
    allergens: ["wheat", "soy", "shellfish"],
    brand: "GreatWall",
  },
  // ─── Chinese Appetizers & Sides ──────────────────────────────────────────
  {
    sku: "SKU-APP-EGGROLL-CHK",
    name: "Chicken Egg Roll",
    basePrice: 2.5,
    category: "appetizer",
    type: "item",
    dietaryFlags: [],
    allergens: ["wheat", "soy", "egg"],
    brand: "GreatWall",
  },
  {
    sku: "SKU-APP-SPRINGROLL-VEG",
    name: "Veggie Spring Roll",
    basePrice: 2.0,
    category: "appetizer",
    type: "item",
    dietaryFlags: ["vegetarian"],
    allergens: ["wheat", "soy"],
    brand: "GreatWall",
  },
  {
    sku: "SKU-APP-RANGOON",
    name: "Cream Cheese Rangoon",
    basePrice: 3.0,
    category: "appetizer",
    type: "item",
    dietaryFlags: ["vegetarian"],
    allergens: ["wheat", "soy", "dairy"],
    brand: "GreatWall",
  },
  {
    sku: "SKU-APP-POTSTICKER-CHK",
    name: "Chicken Potstickers",
    basePrice: 4.5,
    category: "appetizer",
    type: "item",
    dietaryFlags: [],
    allergens: ["wheat", "soy"],
    brand: "GreatWall",
  },
  {
    sku: "SKU-APP-HOTSOUR-SOUP",
    name: "Hot & Sour Soup",
    basePrice: 3.5,
    category: "appetizer",
    type: "item",
    dietaryFlags: ["vegetarian", "spicy"],
    allergens: ["wheat", "soy", "egg"],
    brand: "GreatWall",
  },
  {
    sku: "SKU-SIDE-CHOWMEIN",
    name: "Chow Mein",
    basePrice: 4.5,
    category: "side",
    type: "item",
    dietaryFlags: ["vegetarian"],
    allergens: ["wheat", "soy"],
    brand: "GreatWall",
  },
  {
    sku: "SKU-SIDE-SUPERGREENS",
    name: "Super Greens",
    basePrice: 4.5,
    category: "side",
    type: "item",
    dietaryFlags: ["vegan", "gluten_free"],
    allergens: [],
    brand: "GreatWall",
  },
  {
    sku: "SKU-DRINK-WATER",
    name: "Water",
    basePrice: 1.99,
    category: "drink",
    type: "item",
    dietaryFlags: ["vegan", "gluten_free"],
    allergens: [],
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
  // ─── Chinese Modifiers ───────────────────────────────────────────────────
  {
    sku: "sku-rice-onion-mod",
    name: "Onions",
    basePrice: 0.0,
    category: "modifier",
    type: "modifier",
    dietaryFlags: ["vegan", "gluten_free"],
    allergens: [],
    brand: "",
  },
  {
    sku: "sku-peas-mod",
    name: "Peas",
    basePrice: 0.0,
    category: "modifier",
    type: "modifier",
    dietaryFlags: ["vegan", "gluten_free"],
    allergens: [],
    brand: "",
  },
  {
    sku: "sku-egg-mod",
    name: "Egg",
    basePrice: 1.0,
    category: "modifier",
    type: "modifier",
    dietaryFlags: ["vegetarian", "gluten_free"],
    allergens: ["egg"],
    brand: "",
  },
  {
    sku: "sku-spicy-mod",
    name: "Spice Level",
    basePrice: 0.0,
    category: "modifier",
    type: "modifier",
    dietaryFlags: ["vegan", "gluten_free"],
    allergens: [],
    brand: "",
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
    inlineQtyType: "int",
    inlineQtyLabel: "Slices",
    inlineQtyUnit: "pcs",
    inlineQtyPricePerUnit: true,
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
    inlineQtyType: "int",
    inlineQtyLabel: "Slices",
    inlineQtyUnit: "pcs",
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
  // ─── Combos & Slots ────────────────────────────────────────────────────────
  {
    sku: "SKU-CHINESE-PLATE",
    name: "Plate",
    basePrice: 9.6,
    category: "combo",
    type: "item",
    dietaryFlags: [],
    allergens: [],
    brand: "GreatWall",
    comboChoices: [
      ...buildChoices("SKU-BASE-CHINESE-SIDE", CHINESE_SIDES),
      ...buildChoices("SKU-BASE-CHINESE-ENTREE-1", CHINESE_ENTREES),
      ...buildChoices("SKU-BASE-CHINESE-ENTREE-2", CHINESE_ENTREES),
    ],
  },
  {
    sku: "SKU-CHINESE-BIGGER-PLATE",
    name: "Bigger Plate",
    basePrice: 11.1,
    category: "combo",
    type: "item",
    dietaryFlags: [],
    allergens: [],
    brand: "GreatWall",
    comboChoices: [
      ...buildChoices("SKU-BASE-CHINESE-SIDE", CHINESE_SIDES),
      ...buildChoices("SKU-BASE-CHINESE-ENTREE-1", CHINESE_ENTREES),
      ...buildChoices("SKU-BASE-CHINESE-ENTREE-2", CHINESE_ENTREES),
      ...buildChoices("SKU-BASE-CHINESE-ENTREE-3", CHINESE_ENTREES),
    ],
  },
  {
    sku: "SKU-BASE-CHINESE-SIDE",
    name: "Side Selection",
    basePrice: 0.0,
    category: "combo-slot",
    type: "item",
    dietaryFlags: [],
    allergens: [],
    brand: "GreatWall",
  },
  {
    sku: "SKU-BASE-CHINESE-ENTREE-1",
    name: "Entree 1 Selection",
    basePrice: 0.0,
    category: "combo-slot",
    type: "item",
    dietaryFlags: [],
    allergens: [],
    brand: "GreatWall",
  },
  {
    sku: "SKU-BASE-CHINESE-ENTREE-2",
    name: "Entree 2 Selection",
    basePrice: 0.0,
    category: "combo-slot",
    type: "item",
    dietaryFlags: [],
    allergens: [],
    brand: "GreatWall",
  },
  {
    sku: "SKU-BASE-CHINESE-ENTREE-3",
    name: "Entree 3 Selection",
    basePrice: 0.0,
    category: "combo-slot",
    type: "item",
    dietaryFlags: [],
    allergens: [],
    brand: "GreatWall",
  },
  {
    sku: "SKU-BURGER-COMBO",
    name: "Burger Combo",
    basePrice: 10.0,
    category: "combo",
    type: "item",
    dietaryFlags: [],
    allergens: [],
    brand: "",
    comboChoices: [
      { slotSku: "SKU-BASE-BURGER", optionSku: "SKU-BURGER-REG", price: 4.0 },
      { slotSku: "SKU-BASE-BURGER", optionSku: "SKU-BURGER-VEG", price: 4.5 },
      { slotSku: "SKU-BASE-FRIES", optionSku: "SKU-FRIES", price: 1.5 },
      {
        slotSku: "SKU-BASE-FRIES",
        optionSku: "SKU-FRIES",
        modifierSku: "MOD-FRIES-MED",
        price: 0.5,
      },
      {
        slotSku: "SKU-BASE-FRIES",
        optionSku: "SKU-FRIES",
        modifierSku: "MOD-FRIES-LRG",
        price: 1.0,
      },
      { slotSku: "SKU-BASE-FRIES", optionSku: "SKU-ONION-RINGS", price: 2.0 },
      { slotSku: "SKU-BASE-DRINK", optionSku: "SKU-DRINK-SODA", price: 1.0 },
      {
        slotSku: "SKU-BASE-DRINK",
        optionSku: "SKU-DRINK-SODA",
        modifierSku: "MOD-SODA-MED",
        price: 0.25,
      },
      {
        slotSku: "SKU-BASE-DRINK",
        optionSku: "SKU-DRINK-SODA",
        modifierSku: "MOD-SODA-LRG",
        price: 0.5,
      },
      { slotSku: "SKU-BASE-DRINK", optionSku: "SKU-DRINK-SHAKE", price: 3.0 },
    ],
  },
  {
    sku: "SKU-BASE-BURGER",
    name: "Burger Selection",
    basePrice: 0.0,
    category: "combo-slot",
    type: "item",
    dietaryFlags: [],
    allergens: [],
    brand: "",
  },
  {
    sku: "SKU-BASE-FRIES",
    name: "Fries Selection",
    basePrice: 0.0,
    category: "combo-slot",
    type: "item",
    dietaryFlags: [],
    allergens: [],
    brand: "",
  },
  {
    sku: "SKU-BASE-DRINK",
    name: "Drink Selection",
    basePrice: 0.0,
    category: "combo-slot",
    type: "item",
    dietaryFlags: [],
    allergens: [],
    brand: "",
  },
  {
    sku: "SKU-GROCERY-APPLES",
    name: "Bag of Apples",
    basePrice: 4.99,
    category: "grocery",
    type: "item",
    dietaryFlags: ["vegan", "gluten_free"],
    allergens: [],
    brand: "AppleFarms",
    inlineQtyType: "int",
    inlineQtyLabel: "Count",
    inlineQtyUnit: "each",
    inlineQtyIncrement: 1,
    inlineQtyPricePerUnit: true,
    inlineQtyPricePerUnitShowPer: false,
    inlineQtyMainQtyLocked: true,
  },
  {
    sku: "SKU-GROCERY-CABBAGE",
    name: "Cabbage",
    basePrice: 1.99,
    category: "grocery",
    type: "item",
    dietaryFlags: ["vegan", "gluten_free"],
    allergens: [],
    brand: "LocalGrow",
    inlineQtyType: "float",
    inlineQtyLabel: "Weight",
    inlineQtyUnit: "lbs",
    inlineQtyIncrement: 0.05,
    inlineQtyPricePerUnit: true,
  },
  {
    sku: "SKU-GROCERY-COFFEE-BEANS",
    name: "Bulk Coffee Beans (lbs)",
    basePrice: 12.99,
    category: "grocery",
    type: "item",
    dietaryFlags: ["vegan", "gluten_free"],
    allergens: [],
    brand: "MorningRoast",
    mainQtyIncrement: 0.25,
  },
  // ─── Discounts ────────────────────────────────────────────────────────────
  {
    sku: "DISC-CUSTOM-AMT",
    name: "Custom Discount ($)",
    basePrice: -1.0,
    category: "discounts",
    type: "discount",
    dietaryFlags: [],
    allergens: [],
    brand: "",
    inlineQtyType: "decimal",
    inlineQtyLabel: "Amount",
    inlineQtyUnit: "$",
    inlineQtyPricePerUnit: true,
    inlineQtyMainQtyLocked: true,
  },
  {
    sku: "DISC-CUSTOM-PCT",
    name: "Custom Discount (%)",
    basePrice: 0.0,
    category: "discounts",
    type: "discount",
    dietaryFlags: [],
    allergens: [],
    brand: "",
    inlineQtyType: "decimal",
    inlineQtyLabel: "Percentage",
    inlineQtyUnit: "%",
    inlineQtyPricePerUnit: false,
    inlineQtyMainQtyLocked: true,
  },
];

async function main() {
  console.log("🌱 Seeding catalog...");

  await prisma.$transaction(async (prisma) => {
    // Clean all relations first to avoid duplicate seeds / FK issues
    await (prisma as any).skuChargeTag.deleteMany({});
    await prisma.itemModifier.deleteMany({});
    await prisma.modifierStateOption.deleteMany({});
    
    await prisma.catalogItem.updateMany({
      data: {
        sizeGroupId: null,
        appliedSizeGroupId: null,
      },
    });
    await prisma.sizeGroup.deleteMany({});
    await prisma.catalogItem.deleteMany({});
    
    await (prisma as any).chargeRule.deleteMany({});
    await (prisma as any).chargeTag.deleteMany({});
    await (prisma as any).chargeJurisdiction.deleteMany({});
    await (prisma as any).customerProfile.deleteMany({});
    await (prisma as any).iconConfig.deleteMany({});

    for (const item of SEED_DATA) {
      const data: any = {
        name: item.name,
        basePrice: item.basePrice,
        category: item.category,
        type: item.type,
        dietaryFlags: JSON.stringify(item.dietaryFlags),
        allergens: JSON.stringify(item.allergens),
        brand: item.brand,
        comboChoices: (item as any).comboChoices
          ? JSON.stringify((item as any).comboChoices)
          : "[]",
        inlineQtyType: (item as any).inlineQtyType || null,
        inlineQtyLabel: (item as any).inlineQtyLabel || null,
        inlineQtyUnit: (item as any).inlineQtyUnit || null,
        inlineQtyIncrement: (item as any).inlineQtyIncrement ?? 1,
        inlineQtyPricePerUnit: (item as any).inlineQtyPricePerUnit ?? false,
        inlineQtyPricePerUnitShowPer:
          (item as any).inlineQtyPricePerUnitShowPer ?? true,
        inlineQtyMainQtyLocked: (item as any).inlineQtyMainQtyLocked ?? false,
        mainQtyIncrement: (item as any).mainQtyIncrement ?? 1,
        active: true,
      };

      await prisma.catalogItem.create({
        data: {
          sku: item.sku,
          ...data,
        },
      });
    }

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

  // 4. Size Group for Fried Rice
  await prisma.sizeGroup.create({
    data: {
      id: "group-friedrice-size",
      name: "Size",
      defaultSku: "MOD-FRIEDRICE-SML",
      options: {
        create: [
          {
            sku: "MOD-FRIEDRICE-SML",
            name: "Small",
            basePrice: 0.0,
            category: "size",
            type: "modifier",
          },
          {
            sku: "MOD-FRIEDRICE-MED",
            name: "Medium",
            basePrice: 2.0,
            category: "size",
            type: "modifier",
          },
          {
            sku: "MOD-FRIEDRICE-LRG",
            name: "Large",
            basePrice: 4.0,
            category: "size",
            type: "modifier",
          },
        ],
      },
      items: {
        connect: [
          { sku: "SKU-FRIED-RICE" },
          { sku: "SKU-FRIED-RICE-PORK" },
          { sku: "SKU-FRIED-RICE-CHICKEN" },
          { sku: "SKU-FRIED-RICE-SHRIMP" },
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

  // 5. Rice Onion States
  await prisma.modifierStateOption.createMany({
    data: [
      {
        modifierSku: "sku-rice-onion-mod",
        state: "NO",
        label: "No Onions",
        priceOverride: 0.0,
      },
      {
        modifierSku: "sku-rice-onion-mod",
        state: "LESS",
        label: "Less Onions",
        priceOverride: 0.0,
      },
      {
        modifierSku: "sku-rice-onion-mod",
        state: "ADD",
        label: "Add Onions",
        priceOverride: 0.0,
      },
      {
        modifierSku: "sku-rice-onion-mod",
        state: "EXTRA",
        label: "Extra Onions",
        priceOverride: 0.0,
      },
    ],
  });

  // 6. Peas States
  await prisma.modifierStateOption.createMany({
    data: [
      {
        modifierSku: "sku-peas-mod",
        state: "NO",
        label: "No Peas",
        priceOverride: 0.0,
      },
      {
        modifierSku: "sku-peas-mod",
        state: "LESS",
        label: "Less Peas",
        priceOverride: 0.0,
      },
      {
        modifierSku: "sku-peas-mod",
        state: "ADD",
        label: "Add Peas",
        priceOverride: 0.0,
      },
      {
        modifierSku: "sku-peas-mod",
        state: "EXTRA",
        label: "Extra Peas",
        priceOverride: 0.0,
      },
    ],
  });

  // 7. Egg States
  await prisma.modifierStateOption.createMany({
    data: [
      {
        modifierSku: "sku-egg-mod",
        state: "NO",
        label: "No Egg",
        priceOverride: 0.0,
      },
      {
        modifierSku: "sku-egg-mod",
        state: "ADD",
        label: "Add Egg",
        priceOverride: 1.0,
      },
    ],
  });

  // 8. Spice States
  await prisma.modifierStateOption.createMany({
    data: [
      {
        modifierSku: "sku-spicy-mod",
        state: "NO",
        label: "Not Spicy",
        priceOverride: 0.0,
      },
      {
        modifierSku: "sku-spicy-mod",
        state: "MILD",
        label: "Mild",
        priceOverride: 0.0,
      },
      {
        modifierSku: "sku-spicy-mod",
        state: "MEDIUM",
        label: "Medium Spicy",
        priceOverride: 0.0,
      },
      {
        modifierSku: "sku-spicy-mod",
        state: "EXTRA",
        label: "Extra Spicy",
        priceOverride: 0.0,
      },
    ],
  });

  // Link modifiers to burgers
  const burgerSkus = ["SKU-BURGER-REG", "SKU-BURGER-DLX", "SKU-BURGER-VEG"];
  const burgerModifiers = [
    "sku-onion-mod",
    "sku-cheese-mod",
    "sku-avocado-mod",
    "sku-bacon-mod",
    "MOD-GLUTEN-FREE",
  ];

  for (const burgerSku of burgerSkus) {
    for (const modSku of burgerModifiers) {
      if (burgerSku === "SKU-BURGER-VEG" && modSku === "sku-bacon-mod") {
        continue;
      }
      await prisma.itemModifier.create({
        data: {
          itemSku: burgerSku,
          modifierSku: modSku,
        },
      });
    }
  }

  // Link modifiers to Fried Rice items
  const riceSkus = [
    "SKU-FRIED-RICE",
    "SKU-FRIED-RICE-PORK",
    "SKU-FRIED-RICE-CHICKEN",
    "SKU-FRIED-RICE-SHRIMP",
  ];
  const riceModifiers = ["sku-rice-onion-mod", "sku-peas-mod", "sku-egg-mod"];

  for (const riceSku of riceSkus) {
    for (const modSku of riceModifiers) {
      await prisma.itemModifier.create({
        data: {
          itemSku: riceSku,
          modifierSku: modSku,
        },
      });
    }
  }

  // Link Spice level modifier to Chinese dishes
  const spicySkus = [
    "SKU-CHINESE-GEN-TSO",
    "SKU-CHINESE-ORANGE-CHK",
    "SKU-CHINESE-KUNGPAO-CHK",
    "SKU-CHINESE-SWEETFIRE-CHK",
    "SKU-CHINESE-BEIJING-BEEF",
    "SKU-CHINESE-BLKPEPPER-CHK",
    "SKU-CHINESE-BLKPEPPER-STEAK",
    "SKU-FRIED-RICE",
    "SKU-FRIED-RICE-PORK",
    "SKU-FRIED-RICE-CHICKEN",
    "SKU-FRIED-RICE-SHRIMP",
    "SKU-SIDE-CHOWMEIN",
  ];

  for (const sku of spicySkus) {
    await prisma.itemModifier.create({
      data: { itemSku: sku, modifierSku: "sku-spicy-mod" },
    });
  }

  // Link custom discounts as modifiers to all normal items
  const allNormalItems = await prisma.catalogItem.findMany({
    where: { type: "item" },
  });
  for (const item of allNormalItems) {
    if (item.sku === "DISC-CUSTOM-AMT" || item.sku === "DISC-CUSTOM-PCT") continue;
    await prisma.itemModifier.create({
      data: { itemSku: item.sku, modifierSku: "DISC-CUSTOM-AMT" },
    });
    await prisma.itemModifier.create({
      data: { itemSku: item.sku, modifierSku: "DISC-CUSTOM-PCT" },
    });
  }

  const count = await prisma.catalogItem.count();
  console.log(
    `✅ Done. ${count} catalog items seeded successfully with variant options and states.`,
  );

  // ─── Charge System Seed ────────────────────────────────────────────────────
  // Seed jurisdictions, tags, rules, and SKU tag assignments.
  // Delete in dependency order to avoid FK violations.
  await (prisma as any).skuChargeTag.deleteMany({});
  await (prisma as any).chargeRule.deleteMany({});
  await (prisma as any).chargeTag.deleteMany({});
  await (prisma as any).chargeJurisdiction.deleteMany({});

  // 1. Jurisdictions (geographic chain + trade layer)
  const jurisdictions = [
    {
      code: "US",
      name: "United States (Federal)",
      type: "federal",
      parentCode: null,
    },
    {
      code: "US-TRADE",
      name: "US Federal Trade Policy",
      type: "trade",
      parentCode: null,
    },
    { code: "US-PA", name: "Pennsylvania", type: "state", parentCode: "US" },
    {
      code: "US-PA-LEHIGH",
      name: "Lehigh County, PA",
      type: "county",
      parentCode: "US-PA",
    },
    {
      code: "18106",
      name: "ZIP 18106 (Allentown, PA)",
      type: "zip",
      parentCode: "US-PA-LEHIGH",
    },
  ];
  for (const j of jurisdictions) {
    await (prisma as any).chargeJurisdiction.upsert({
      where: { code: j.code },
      update: j,
      create: j,
    });
  }

  // 2. Tags
  const tags = [
    {
      code: "GENERAL",
      label: "General Goods",
      categoryHint: "sales_tax",
      description: "Default fallback for untagged items",
    },
    {
      code: "PREPARED_FOOD",
      label: "Prepared / Hot Food",
      categoryHint: "sales_tax",
      description: "Hot food sold ready-to-eat",
    },
    {
      code: "GROCERY",
      label: "Grocery / Unprepared Food",
      categoryHint: "sales_tax",
      description: "Cold/packaged food, typically exempt",
    },
    {
      code: "ALCOHOL",
      label: "Alcoholic Beverages",
      categoryHint: "excise",
      description: "Beer, wine, spirits",
    },
    {
      code: "FUEL",
      label: "Fuel",
      categoryHint: "excise",
      description: "Gasoline, diesel",
    },
    {
      code: "EXEMPT",
      label: "Tax Exempt",
      categoryHint: "sales_tax",
      description: "Gift cards, non-taxable services",
    },
    {
      code: "CN_TARIFF_301",
      label: "Section 301 (China)",
      categoryHint: "import_duty",
      description: "US Section 301 tariff on Chinese-origin goods",
    },
    {
      code: "SURCHARGE_CC",
      label: "Credit Card Surcharge",
      categoryHint: "surcharge",
      description: "Operator credit card fee passthrough",
    },
    {
      code: "WATER",
      label: "Water",
      categoryHint: "sales_tax",
      description: "Water, typically tax exempt",
    },
  ];
  for (const t of tags) {
    await (prisma as any).chargeTag.upsert({
      where: { code: t.code },
      update: t,
      create: t,
    });
  }

  // Helper: get IDs
  const jMap: Record<string, string> = {};
  for (const j of await (prisma as any).chargeJurisdiction.findMany()) {
    jMap[j.code] = j.id;
  }
  const tMap: Record<string, string> = {};
  for (const t of await (prisma as any).chargeTag.findMany()) {
    tMap[t.code] = t.id;
  }

  // 3. Charge Rules
  // Semantics: items with NO tags use GENERAL rules.
  //            Tagged items use their tag's rules (overrides the default assumption).
  const rules = [
    // PA: GENERAL — 6% sales tax (the default rate for untagged items in jurisdiction)
    {
      jCode: "US-PA",
      tCode: "GENERAL",
      chargeCategory: "sales_tax",
      rateType: "percentage",
      rate: 0.06,
      calculationBasis: "retail_price",
      originCode: null,
      priority: 0,
    },
    // PA: PREPARED_FOOD — 6% sales tax (same rate; explicit override for tagged food)
    {
      jCode: "US-PA",
      tCode: "PREPARED_FOOD",
      chargeCategory: "sales_tax",
      rateType: "percentage",
      rate: 0.06,
      calculationBasis: "retail_price",
      originCode: null,
      priority: 0,
    },
    // PA: GROCERY — 0% (PA exempts unprepared food)
    {
      jCode: "US-PA",
      tCode: "GROCERY",
      chargeCategory: "sales_tax",
      rateType: "percentage",
      rate: 0.0,
      calculationBasis: "retail_price",
      originCode: null,
      priority: 0,
    },
    // PA: ALCOHOL — 6% sales tax + $0.08/unit malt beverage excise (stacked rules)
    {
      jCode: "US-PA",
      tCode: "ALCOHOL",
      chargeCategory: "sales_tax",
      rateType: "percentage",
      rate: 0.06,
      calculationBasis: "retail_price",
      originCode: null,
      priority: 0,
    },
    {
      jCode: "US-PA",
      tCode: "ALCOHOL",
      chargeCategory: "excise",
      rateType: "per_unit",
      rate: 0.08,
      calculationBasis: "retail_price",
      originCode: null,
      priority: 1,
    },
    // PA: EXEMPT — 0%
    {
      jCode: "US-PA",
      tCode: "EXEMPT",
      chargeCategory: "sales_tax",
      rateType: "percentage",
      rate: 0.0,
      calculationBasis: "retail_price",
      originCode: null,
      priority: 0,
    },
    // US-TRADE: Section 301 tariff — 25% import duty on CN-origin goods
    {
      jCode: "US-TRADE",
      tCode: "CN_TARIFF_301",
      chargeCategory: "import_duty",
      rateType: "percentage",
      rate: 0.25,
      calculationBasis: "retail_price",
      originCode: "CN",
      priority: 0,
    },
    // US: Credit card surcharge — 3% on subtotal+tax (forward compat demo)
    {
      jCode: "US",
      tCode: "SURCHARGE_CC",
      chargeCategory: "surcharge",
      rateType: "percentage",
      rate: 0.03,
      calculationBasis: "subtotal_plus_tax",
      originCode: null,
      priority: 0,
    },
    // PA: WATER — 0%
    {
      jCode: "US-PA",
      tCode: "WATER",
      chargeCategory: "sales_tax",
      rateType: "percentage",
      rate: 0.0,
      calculationBasis: "retail_price",
      originCode: null,
      priority: 0,
    },
  ];

  for (const r of rules) {
    await (prisma as any).chargeRule.create({
      data: {
        jurisdictionId: jMap[r.jCode],
        tagId: tMap[r.tCode],
        chargeCategory: r.chargeCategory,
        rateType: r.rateType,
        rate: r.rate,
        calculationBasis: r.calculationBasis,
        originCode: r.originCode,
        priority: r.priority,
      },
    });
  }

  // 4. SKU Tag Assignments
  // Items with no SkuChargeTag rows → engine uses GENERAL rules for the jurisdiction.
  // Tagged items' rules fully replace the GENERAL default.
  const skuTags: Array<{ skuId: string; tCode: string; originCode?: string }> =
    [
      // Food items → PREPARED_FOOD (6% PA)
      { skuId: "SKU-BURGER-REG", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-BURGER-DLX", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-BURGER-VEG", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-FRIES", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-ONION-RINGS", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-COLESLAW", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-DRINK-SODA", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-DRINK-ICEDTEA", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-DRINK-SHAKE", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-DESSRT-CAKE", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-DESSRT-COOKIE", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-BURGER-COMBO", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-CHINESE-GEN-TSO", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-FRIED-RICE", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-FRIED-RICE-PORK", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-FRIED-RICE-CHICKEN", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-FRIED-RICE-SHRIMP", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-CHINESE-ORANGE-CHK", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-CHINESE-KUNGPAO-CHK", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-CHINESE-SWEETFIRE-CHK", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-CHINESE-MUSHROOM-CHK", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-CHINESE-STRINGBEAN-CHK", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-CHINESE-BLKPEPPER-CHK", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-CHINESE-HNY-SESAME-CHK", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-CHINESE-BEIJING-BEEF", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-CHINESE-BROCCOLI-BEEF", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-CHINESE-BLKPEPPER-STEAK", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-CHINESE-HNYWALNUT-SHRIMP", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-CHINESE-PEPPERCORN-SHRIMP", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-APP-EGGROLL-CHK", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-APP-SPRINGROLL-VEG", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-APP-RANGOON", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-APP-POTSTICKER-CHK", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-APP-HOTSOUR-SOUP", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-SIDE-CHOWMEIN", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-SIDE-SUPERGREENS", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-CHINESE-PLATE", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-CHINESE-BIGGER-PLATE", tCode: "PREPARED_FOOD" },
      { skuId: "SKU-DRINK-WATER", tCode: "WATER" },
      // Modifiers are not tagged — they fall back to GENERAL (6%) unless overridden
      // Combo slots are $0 base price; tagging PREPARED_FOOD so they align if priced
    ];

  for (const st of skuTags) {
    const tagId = tMap[st.tCode];
    if (!tagId) continue;
    await (prisma as any).skuChargeTag.upsert({
      where: { skuId_tagId: { skuId: st.skuId, tagId } },
      update: {},
      create: { skuId: st.skuId, tagId, originCode: st.originCode ?? null },
    });
  }

  console.log(
    "✅ Charge system seeded: jurisdictions, tags, rules, and SKU tag assignments.",
  );

  // 5. Icon Configs (Dietary Flags & Allergens)
  const iconConfigs = [
    {
      id: "spicy",
      type: "dietary_flag",
      label: "Spicy",
      icon: "Flame",
      color: "text-rose-500",
    },
    {
      id: "vegetarian",
      type: "dietary_flag",
      label: "Vegetarian",
      icon: "Leaf",
      color: "text-emerald-500",
    },
    {
      id: "vegan",
      type: "dietary_flag",
      label: "Vegan",
      icon: "Leaf",
      color: "text-emerald-600",
    },
    {
      id: "gluten_free",
      type: "dietary_flag",
      label: "Gluten Free",
      icon: "WheatOff",
      color: "text-amber-500",
    },
    {
      id: "dairy",
      type: "allergen",
      label: "Dairy",
      icon: "Milk",
      color: "text-sky-500",
    },
    {
      id: "wheat",
      type: "allergen",
      label: "Wheat",
      icon: "Wheat",
      color: "text-amber-600",
    },
    {
      id: "egg",
      type: "allergen",
      label: "Egg",
      icon: "Egg",
      color: "text-yellow-600",
    },
    {
      id: "shellfish",
      type: "allergen",
      label: "Shellfish",
      icon: "Shrimp",
      color: "text-blue-500",
    },
    {
      id: "fish",
      type: "allergen",
      label: "Shellfish",
      icon: "Fish",
      color: "text-blue-500",
    },
    {
      id: "peanuts",
      type: "allergen",
      label: "Peanuts",
      icon: "Nut",
      color: "text-amber-700",
    },
    {
      id: "tree_nuts",
      type: "allergen",
      label: "Tree Nuts",
      icon: "Nut",
      color: "text-amber-700",
    },
    {
      id: "soy",
      type: "allergen",
      label: "Soy",
      icon: "Bean",
      color: "text-lime-600",
    },
    {
      id: "pork",
      type: "allergen",
      label: "Pork",
      icon: "Ham",
      color: "text-rose-400",
    },
    {
      id: "mustard",
      type: "allergen",
      label: "Mustard",
      icon: "FlaskConical",
      color: "text-yellow-500",
    },
    {
      id: "alcohol",
      type: "dietary_flag",
      label: "Alcohol",
      icon: "Wine",
      color: "text-purple-600",
    },
  ];

  await (prisma as any).iconConfig.deleteMany({});
  for (const ic of iconConfigs) {
    await (prisma as any).iconConfig.upsert({
      where: { id: ic.id },
      update: ic,
      create: ic,
    });
  }

  console.log("✅ Icon configs seeded.");

  // 6. Customer Profiles
  console.log("🌱 Seeding Customer Profiles...");
  await (prisma as any).customerProfile.deleteMany({});

  const customers = [
    {
      loyaltyTier: "gold",
      name: { firstName: "John", lastName: "Doe", displayName: "John Doe" },
      contacts: [
        { channel: "phone", value: "555-0199", isPrimary: true },
        { channel: "email", value: "john.doe@example.com", isPrimary: false },
      ],
      locations: [
        {
          formattedAddress: "123 Gold Medallion Way, New York, NY 10001",
          isDefault: true,
        },
      ],
    },
    {
      loyaltyTier: "silver",
      name: { firstName: "Jane", lastName: "Smith", displayName: "Jane Smith" },
      contacts: [
        { channel: "phone", value: "555-0244", isPrimary: true },
        { channel: "email", value: "jane.smith@example.com", isPrimary: false },
      ],
      locations: [
        {
          formattedAddress: "456 Silver Lining St, San Francisco, CA 94102",
          isDefault: true,
        },
      ],
    },
    {
      loyaltyTier: "bronze",
      name: {
        firstName: "Bob",
        lastName: "Johnson",
        displayName: "Bob Johnson",
      },
      contacts: [
        { channel: "phone", value: "555-0322", isPrimary: true },
        { channel: "email", value: "bob.j@example.com", isPrimary: false },
      ],
      locations: [
        {
          formattedAddress: "789 Bronze Gate Rd, Seattle, WA 98101",
          isDefault: true,
        },
      ],
    },
  ];

  for (const c of customers) {
    const profile = await (prisma as any).customerProfile.create({
      data: {
        loyaltyTier: c.loyaltyTier,
        names: {
          create: {
            firstName: c.name.firstName,
            lastName: c.name.lastName,
            displayName: c.name.displayName,
          },
        },
        contacts: {
          create: c.contacts,
        },
        deliveryLocations: {
          create: c.locations,
        },
      },
    });
  }

    console.log("✅ Customer profiles seeded.");
  }, {
    timeout: 60000
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
