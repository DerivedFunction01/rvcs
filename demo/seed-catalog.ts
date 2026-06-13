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
  // ─── Combos & Slots ────────────────────────────────────────────────────────
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
];

async function main() {
  console.log("🌱 Seeding catalog...");

  // Clean relations first to avoid duplicate seeds issues
  await prisma.itemModifier.deleteMany({});
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
        comboChoices: (item as any).comboChoices
          ? JSON.stringify((item as any).comboChoices)
          : "[]",
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
        comboChoices: (item as any).comboChoices
          ? JSON.stringify((item as any).comboChoices)
          : "[]",
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
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
