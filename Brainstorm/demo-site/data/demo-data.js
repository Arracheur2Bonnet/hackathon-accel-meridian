/*
 * DEMO DATASET — SYNTHETIC
 * ------------------------------------------------------------------
 * Illustrative records for the hackathon demo. These are NOT real Kumo
 * records and no incident described here happened. Monoprix appears as a
 * fictional scenario, as in the brainstorming notes; other customers and
 * suppliers are invented.
 *
 * Two supervision scenarios share this one dataset:
 *   SPV-0193 (primary)  New sesame allergen in supplier spec SP-TER-05 v3
 *   SPV-0192 (second)   Salmon receipt GRN-5512: 80 kg against PO-7731 for 120 kg
 *
 * Nothing in the UI is hardcoded: js/supervision.js traverses these
 * records through `schema` to produce traces, impacts and plans.
 */
window.DEMO_DATA = {
  meta: {
    synthetic: true,
    company: 'Kumo (illustrative)',
    site: 'Paris kitchen',
    now: '2026-10-22T08:30:00',
    agentVersion: 'supervision-agent demo-0.4',
    rulesetVersion: 'rules 2026-10-15',
  },

  /* ---------------- Supervised streams ---------------- */
  streams: [
    { id: 'STR-SPEC', name: 'Supplier specifications', source: 'Spec inbox, PDF fields extracted', watches: 'Ingredients, allergens, effective lot', rules: ['SPEC-01', 'ALG-01', 'ALG-02', 'ALG-03'], recordsOnFile: 38, state: 'watched' },
    { id: 'STR-GRN', name: 'Goods receipts', source: 'ERP receipts export', watches: 'Received quantity against PO line', rules: ['RCV-01'], recordsOnFile: 412, state: 'watched' },
    { id: 'STR-PLAN', name: 'Production plan', source: 'kitchen_plan_w43.csv', watches: 'Raw material coverage of planned runs', rules: ['PLN-01'], recordsOnFile: 96, state: 'watched' },
    { id: 'STR-PIM', name: 'Product sheets', source: 'product_sheets_export.csv', watches: 'Sheet allergens against product declaration', rules: ['ALG-02'], recordsOnFile: 214, state: 'watched' },
    { id: 'STR-TEMP', name: 'Cold-room temperatures', source: 'Not connected', watches: 'Proposed in the notes (cold-chain agent)', rules: [], recordsOnFile: 0, state: 'proposed' },
  ],

  /* Events seen by the supervision scan today. `case` links an escalated event. */
  events: [
    { id: 'EVT-2201', at: '2026-10-22T06:02:00', stream: 'STR-GRN', text: 'GRN-5509: sushi rice 200 kg against PO-7728 for 200 kg', result: 'match' },
    { id: 'EVT-2202', at: '2026-10-22T06:09:00', stream: 'STR-GRN', text: 'GRN-5512: salmon fillet 80 kg against PO-7731 for 120 kg', result: 'escalated', case: 'SPV-0192' },
    { id: 'EVT-2203', at: '2026-10-22T07:15:00', stream: 'STR-SPEC', text: 'SP-NOR-01 v5: nori sheets, pack weight changed', result: 'no impact' },
    { id: 'EVT-2204', at: '2026-10-22T07:40:00', stream: 'STR-PLAN', text: 'Night shift plan updated: RUN-0414 added', result: 'linked', case: 'SPV-0192' },
    { id: 'EVT-2205', at: '2026-10-22T08:05:00', stream: 'STR-PIM', text: '3 product sheets exported', result: 'match' },
    { id: 'EVT-2206', at: '2026-10-22T08:31:00', stream: 'STR-SPEC', text: 'SP-TER-05 v3: teriyaki glaze, new specification', result: 'escalated', case: 'SPV-0193', injected: true },
  ],

  /* Business rules the agent applies. `origin` says where each rule comes from. */
  rules: {
    'SPEC-01': { text: 'Every new supplier specification is compared field by field with the stored version.', origin: 'Operator question Q-15' },
    'ALG-01': { text: 'Sesame seeds and products thereof must be declared (EU Regulation 1169/2011, Annex II, item 11).', origin: 'Regulation' },
    'ALG-02': { text: 'A product, its sub-recipes and its sheets must declare every Annex II allergen present in their ingredients.', origin: 'Operator question Q-12' },
    'ALG-03': { text: 'A finished lot made with an ingredient lot from a new formulation must be held until its label matches.', origin: 'Operator question Q-17' },
    'RCV-01': { text: 'A goods receipt that differs from its PO line by more than 5 % is a discrepancy.', origin: 'Operator question Q-21' },
    'PLN-01': { text: 'Raw material goes to confirmed orders by delivery time; store restock runs come last.', origin: 'Operator question Q-23' },
    'SUP-01': { text: 'Same-day supplier delivery needs an order before the supplier cut-off.', origin: 'Operator question Q-6' },
  },

  /* EU Regulation 1169/2011 Annex II, in annex order */
  allergens: [
    { code: 'GLU', name: 'Gluten', item: 1 }, { code: 'CRU', name: 'Crustaceans', item: 2 }, { code: 'EGG', name: 'Eggs', item: 3 },
    { code: 'FSH', name: 'Fish', item: 4 }, { code: 'PEA', name: 'Peanuts', item: 5 }, { code: 'SOY', name: 'Soybeans', item: 6 },
    { code: 'MLK', name: 'Milk', item: 7 }, { code: 'NUT', name: 'Nuts', item: 8 }, { code: 'CEL', name: 'Celery', item: 9 },
    { code: 'MUS', name: 'Mustard', item: 10 }, { code: 'SES', name: 'Sesame', item: 11 }, { code: 'SUL', name: 'Sulphites', item: 12 },
    { code: 'LUP', name: 'Lupin', item: 13 }, { code: 'MOL', name: 'Molluscs', item: 14 },
  ],

  sources: [
    { id: 'SRC-SPEC', name: 'Supplier spec inbox', file: 'specs/', kind: 'PDF, fields extracted' },
    { id: 'SRC-ERP', name: 'ERP export', file: 'erp_2026-10-22.csv', kind: 'CSV export' },
    { id: 'SRC-MDM', name: 'Recipe and ingredient master', file: 'recipes_master.xlsx', kind: 'Spreadsheet' },
    { id: 'SRC-PIM', name: 'Product sheets', file: 'product_sheets_export.csv', kind: 'CSV export' },
    { id: 'SRC-PLAN', name: 'Production plan', file: 'kitchen_plan_w43.csv', kind: 'Planning export' },
    { id: 'SRC-STK', name: 'Stock and lots', file: 'stock_lots_v14.xlsx', kind: 'Spreadsheet' },
  ],

  customers: [
    { id: 'CUS-KUMO', name: 'Kumo stores', kind: 'Own retail' },
    { id: 'CUS-MONO', name: 'Monoprix', kind: 'Retail chain', note: 'fictional scenario' },
    { id: 'CUS-MVRT', name: 'Le Marché Vert', kind: 'Organic grocery' },
    { id: 'CUS-CAFL', name: 'Café Lumière', kind: 'Corporate catering' },
    { id: 'CUS-HANA', name: 'Maison Hana', kind: 'Restaurant group' },
  ],

  suppliers: [
    { id: 'SUP-UMA', name: 'Maison Umami', category: 'Sauces and condiments' },
    { id: 'SUP-NORD', name: 'Nordfjord Seafood', category: 'Fish', orderCutoff: '11:00', sameDayDelivery: '17:00', caseKg: 5, pricePerKg: 14.8 },
    { id: 'SUP-ATLM', name: 'Atlantic Marée', category: 'Fish', orderCutoff: '16:00', nextDayDelivery: '07:00', caseKg: 10, pricePerKg: 13.9 },
    { id: 'SUP-RIZ', name: 'Rizerie du Sud', category: 'Dry goods' },
  ],

  supplierProducts: [
    { id: 'SP-TER-05', supplierId: 'SUP-UMA', name: 'Teriyaki glaze, 5 L', ingredientId: 'ING-TER', sourceId: 'SRC-SPEC' },
    { id: 'SP-NORD-SAL', supplierId: 'SUP-NORD', name: 'Salmon fillet, skin-on', ingredientId: 'ING-SAL', sourceId: 'SRC-ERP' },
    { id: 'SP-ATLM-SAL', supplierId: 'SUP-ATLM', name: 'Salmon fillet', ingredientId: 'ING-SAL', sourceId: 'SRC-ERP' },
    { id: 'SP-RIZ-SUS', supplierId: 'SUP-RIZ', name: 'Sushi rice', ingredientId: 'ING-RICE', sourceId: 'SRC-ERP' },
  ],

  specVersions: [
    {
      id: 'SPEC-TER-05-v2', spId: 'SP-TER-05', version: 2, issuedAt: '2025-03-14', status: 'stored', file: 'SP-TER-05_v2.pdf',
      ingredients: ['Soy sauce (water, soybeans, wheat, salt)', 'Sugar', 'Mirin (rice, alcohol)', 'Ginger purée', 'Garlic', 'Corn starch'],
      allergens: ['SOY', 'GLU'], mayContain: [], effectiveFromLot: 'UMA-1907',
    },
    {
      id: 'SPEC-TER-05-v3', spId: 'SP-TER-05', version: 3, issuedAt: '2026-10-21', receivedAt: '2026-10-22T08:31:00', status: 'received', file: 'SP-TER-05_v3.pdf',
      ingredients: ['Soy sauce (water, soybeans, wheat, salt)', 'Sugar', 'Mirin (rice, alcohol)', 'Ginger purée', 'Garlic', 'Corn starch', 'Toasted sesame oil (2 %)'],
      allergens: ['SOY', 'GLU', 'SES'], mayContain: [], effectiveFromLot: 'UMA-2291', changeNote: 'Flavour update: toasted sesame oil added',
    },
  ],

  ingredients: [
    { id: 'ING-TER', name: 'Teriyaki glaze', allergens: ['SOY', 'GLU'], sourceId: 'SRC-MDM' },
    { id: 'ING-SAL', name: 'Salmon fillet (Norway)', allergens: ['FSH'], sourceId: 'SRC-MDM' },
    { id: 'ING-CHK', name: 'Chicken thigh', allergens: [], sourceId: 'SRC-MDM' },
    { id: 'ING-RICE', name: 'Sushi rice', allergens: [], sourceId: 'SRC-MDM' },
    { id: 'ING-NORI', name: 'Nori sheets', allergens: [], sourceId: 'SRC-MDM' },
    { id: 'ING-EGG', name: 'Tamago omelette', allergens: ['EGG'], sourceId: 'SRC-MDM' },
    { id: 'ING-SES', name: 'Sesame seeds', allergens: ['SES'], sourceId: 'SRC-MDM' },
    { id: 'ING-TOFU', name: 'Firm tofu', allergens: ['SOY'], sourceId: 'SRC-MDM' },
    { id: 'ING-MISO', name: 'Miso dressing', allergens: ['SOY'], sourceId: 'SRC-MDM' },
  ],

  /* Sub-recipes: lines are kg of component per kg of sub-recipe */
  subRecipes: [
    { id: 'SR-MAR-01', name: 'Teriyaki salmon marinade', lines: [{ ref: 'ING-SAL', qty: 0.8 }, { ref: 'ING-TER', qty: 0.2 }], declaredAllergens: ['FSH', 'SOY', 'GLU'], sourceId: 'SRC-MDM' },
  ],

  /* Recipes: lines are kg per finished unit */
  recipes: [
    { id: 'REC-SAL-120', sku: 'SKU-SAL-120', lines: [{ ref: 'ING-SAL', qty: 0.15 }], sourceId: 'SRC-MDM' },
    { id: 'REC-POK-SAL', sku: 'SKU-POK-SAL', lines: [{ ref: 'ING-SAL', qty: 0.10 }, { ref: 'ING-TER', qty: 0.015 }, { ref: 'ING-RICE', qty: 0.18 }, { ref: 'ING-SES', qty: 0.005 }], sourceId: 'SRC-MDM' },
    { id: 'REC-POK-CHK', sku: 'SKU-POK-CHK', lines: [{ ref: 'ING-CHK', qty: 0.12 }, { ref: 'ING-TER', qty: 0.02 }, { ref: 'ING-RICE', qty: 0.18 }], sourceId: 'SRC-MDM' },
    { id: 'REC-SUS-BOX', sku: 'SKU-SUS-BOX', lines: [{ ref: 'ING-SAL', qty: 0.04 }, { ref: 'SR-MAR-01', qty: 0.05 }, { ref: 'ING-RICE', qty: 0.15 }, { ref: 'ING-NORI', qty: 0.004 }, { ref: 'ING-EGG', qty: 0.02 }], sourceId: 'SRC-MDM' },
    { id: 'REC-ONI-SAL', sku: 'SKU-ONI-SAL', lines: [{ ref: 'SR-MAR-01', qty: 0.05 }, { ref: 'ING-RICE', qty: 0.11 }, { ref: 'ING-NORI', qty: 0.003 }], sourceId: 'SRC-MDM' },
    { id: 'REC-BEN-TER', sku: 'SKU-BEN-TER', lines: [{ ref: 'ING-CHK', qty: 0.13 }, { ref: 'ING-TER', qty: 0.025 }, { ref: 'ING-RICE', qty: 0.2 }, { ref: 'ING-EGG', qty: 0.03 }], sourceId: 'SRC-MDM' },
    { id: 'REC-POK-TOF', sku: 'SKU-POK-TOF', lines: [{ ref: 'ING-TOFU', qty: 0.12 }, { ref: 'ING-MISO', qty: 0.02 }, { ref: 'ING-RICE', qty: 0.18 }, { ref: 'ING-SES', qty: 0.005 }], sourceId: 'SRC-MDM' },
  ],

  products: [
    { id: 'SKU-SAL-120', name: 'Salmon portion 120 g', declaredAllergens: ['FSH'], sourceId: 'SRC-MDM' },
    { id: 'SKU-POK-SAL', name: 'Salmon teriyaki poke bowl', declaredAllergens: ['FSH', 'SOY', 'GLU', 'SES'], sourceId: 'SRC-MDM' },
    { id: 'SKU-POK-CHK', name: 'Chicken teriyaki poke bowl', declaredAllergens: ['SOY', 'GLU'], sourceId: 'SRC-MDM' },
    { id: 'SKU-SUS-BOX', name: 'Sushi box, 12 pieces', declaredAllergens: ['FSH', 'SOY', 'GLU', 'EGG'], sourceId: 'SRC-MDM' },
    { id: 'SKU-ONI-SAL', name: 'Salmon teriyaki onigiri', declaredAllergens: ['FSH', 'SOY', 'GLU'], sourceId: 'SRC-MDM' },
    { id: 'SKU-BEN-TER', name: 'Teriyaki chicken bento', declaredAllergens: ['SOY', 'GLU', 'EGG'], sourceId: 'SRC-MDM' },
    { id: 'SKU-POK-TOF', name: 'Tofu miso bowl', declaredAllergens: ['SOY', 'SES'], sourceId: 'SRC-MDM' },
  ],

  productSheets: [
    { id: 'PS-1011', sku: 'SKU-SAL-120', customerId: 'CUS-MONO', version: 5, allergens: ['FSH'] },
    { id: 'PS-1041', sku: 'SKU-POK-SAL', customerId: 'CUS-KUMO', version: 4, allergens: ['FSH', 'SOY', 'GLU', 'SES'] },
    { id: 'PS-1042', sku: 'SKU-POK-SAL', customerId: 'CUS-MONO', version: 2, allergens: ['FSH', 'SOY', 'GLU', 'SES'] },
    { id: 'PS-1051', sku: 'SKU-POK-CHK', customerId: 'CUS-KUMO', version: 3, allergens: ['SOY', 'GLU'] },
    { id: 'PS-1052', sku: 'SKU-POK-CHK', customerId: 'CUS-MONO', version: 2, allergens: ['SOY', 'GLU'] },
    { id: 'PS-1053', sku: 'SKU-POK-CHK', customerId: 'CUS-MVRT', version: 1, allergens: ['SOY', 'GLU'] },
    { id: 'PS-1061', sku: 'SKU-SUS-BOX', customerId: 'CUS-KUMO', version: 6, allergens: ['FSH', 'SOY', 'GLU', 'EGG'] },
    { id: 'PS-1062', sku: 'SKU-SUS-BOX', customerId: 'CUS-MONO', version: 3, allergens: ['FSH', 'SOY', 'GLU', 'EGG'] },
    { id: 'PS-1063', sku: 'SKU-SUS-BOX', customerId: 'CUS-CAFL', version: 2, allergens: ['FSH', 'SOY', 'GLU', 'EGG'] },
    { id: 'PS-1071', sku: 'SKU-ONI-SAL', customerId: 'CUS-KUMO', version: 2, allergens: ['FSH', 'SOY', 'GLU'] },
    { id: 'PS-1072', sku: 'SKU-ONI-SAL', customerId: 'CUS-MVRT', version: 1, allergens: ['FSH', 'SOY', 'GLU'] },
    { id: 'PS-1081', sku: 'SKU-BEN-TER', customerId: 'CUS-KUMO', version: 3, allergens: ['SOY', 'GLU', 'EGG'] },
    { id: 'PS-1082', sku: 'SKU-BEN-TER', customerId: 'CUS-CAFL', version: 2, allergens: ['SOY', 'GLU', 'EGG'] },
    { id: 'PS-1091', sku: 'SKU-POK-TOF', customerId: 'CUS-KUMO', version: 2, allergens: ['SOY', 'SES'] },
  ],

  ingredientLots: [
    { id: 'ILOT-2288', ingredientId: 'ING-TER', supplierLot: 'UMA-2288', grn: 'GRN-5402', receivedAt: '2026-10-13', qty: '3 × 5 L', status: 'consumed' },
    { id: 'ILOT-2291', ingredientId: 'ING-TER', supplierLot: 'UMA-2291', grn: 'GRN-5490', receivedAt: '2026-10-20', qty: '4 × 5 L', status: 'in use' },
  ],

  productionLots: [
    { id: 'FLOT-3372', sku: 'SKU-BEN-TER', units: 120, producedAt: '2026-10-19', ingredientLots: ['ILOT-2288'], status: 'shipped' },
    { id: 'FLOT-3381', sku: 'SKU-POK-CHK', units: 140, producedAt: '2026-10-21', ingredientLots: ['ILOT-2291'], status: 'in stock', dispatchAt: '2026-10-22T11:00:00' },
    { id: 'FLOT-3384', sku: 'SKU-SUS-BOX', units: 96, producedAt: '2026-10-21', ingredientLots: ['ILOT-2291'], status: 'in stock', dispatchAt: '2026-10-22T11:00:00' },
    { id: 'FLOT-3386', sku: 'SKU-POK-SAL', units: 180, producedAt: '2026-10-21', ingredientLots: ['ILOT-2291'], status: 'in stock', dispatchAt: '2026-10-22T11:00:00' },
    { id: 'FLOT-3390', sku: 'SKU-ONI-SAL', units: 210, producedAt: '2026-10-22', ingredientLots: ['ILOT-2291'], status: 'in stock', dispatchAt: '2026-10-22T11:00:00' },
  ],

  /* ---- Scenario A records (salmon receipt) ---- */
  purchaseOrders: [
    { id: 'PO-7731', supplierId: 'SUP-NORD', spId: 'SP-NORD-SAL', ingredientId: 'ING-SAL', qtyKg: 120, dueAt: '2026-10-22T06:00:00', createdAt: '2026-10-20T10:12:00' },
    { id: 'PO-7728', supplierId: 'SUP-RIZ', spId: 'SP-RIZ-SUS', ingredientId: 'ING-RICE', qtyKg: 200, dueAt: '2026-10-22T06:00:00', createdAt: '2026-10-19T09:40:00' },
  ],
  goodsReceipts: [
    { id: 'GRN-5509', poId: 'PO-7728', qtyKg: 200, receivedAt: '2026-10-22T06:02:00', supplierLot: 'RS-1182', dock: 'Dock 1' },
    { id: 'GRN-5512', poId: 'PO-7731', qtyKg: 80, receivedAt: '2026-10-22T06:09:00', supplierLot: 'NF-44871', dock: 'Dock 2' },
  ],
  inventory: [
    { id: 'INV-SAL', ingredientId: 'ING-SAL', freeKg: 14, location: 'Cold room CR-1', note: 'before GRN-5512' },
  ],
  shifts: [
    { id: 'CAP-N-1022', name: 'Night shift, 22 Oct', start: '2026-10-22T20:00:00', end: '2026-10-23T04:00:00', capacity: 600 },
    { id: 'CAP-D-1023', name: 'Day shift, 23 Oct', start: '2026-10-23T06:00:00', end: '2026-10-23T14:00:00', capacity: 450 },
  ],
  orders: [
    { id: 'ORD-2482', customerId: 'CUS-MONO', sku: 'SKU-SAL-120', quantity: 500, deliveryAt: '2026-10-23T06:00:00' },
    { id: 'ORD-2471', customerId: 'CUS-HANA', sku: 'SKU-POK-SAL', quantity: 180, deliveryAt: '2026-10-23T08:00:00' },
    { id: 'ORD-2481', customerId: 'CUS-CAFL', sku: 'SKU-SUS-BOX', quantity: 150, deliveryAt: '2026-10-23T11:30:00' },
  ],
  productionRuns: [
    { id: 'RUN-0414', shiftId: 'CAP-N-1022', sku: 'SKU-SAL-120', quantity: 500, orderId: 'ORD-2482' },
    { id: 'RUN-0411', shiftId: 'CAP-N-1022', sku: 'SKU-POK-SAL', quantity: 180, orderId: 'ORD-2471' },
    { id: 'RUN-0412', shiftId: 'CAP-N-1022', sku: 'SKU-SUS-BOX', quantity: 150, orderId: 'ORD-2481' },
    { id: 'RUN-0413', shiftId: 'CAP-N-1022', sku: 'SKU-POK-SAL', quantity: 80, orderId: null, label: 'Store restock' },
  ],

  /* ---------------- Business schema (ER) ----------------
     The agent can only reach records through these relationships. */
  schema: {
    entities: [
      { id: 'Supplier', table: 'suppliers', fields: [['supplier_id', 'PK'], ['name'], ['order_cutoff']], x: 20, y: 20 },
      { id: 'SupplierProduct', label: 'Supplier product', table: 'supplier_products', fields: [['sp_id', 'PK'], ['supplier_id', 'FK'], ['ingredient_id', 'FK']], x: 260, y: 20 },
      { id: 'SpecVersion', label: 'Spec version', table: 'spec_versions', fields: [['spec_id', 'PK'], ['sp_id', 'FK'], ['allergens'], ['effective_from_lot']], x: 500, y: 20 },
      { id: 'Allergen', table: 'allergens', fields: [['code', 'PK'], ['annex_ii_item']], x: 980, y: 20 },
      { id: 'Customer', table: 'customers', fields: [['customer_id', 'PK'], ['name']], x: 1220, y: 20 },
      { id: 'PurchaseOrder', label: 'Purchase order', table: 'purchase_orders', fields: [['po_id', 'PK'], ['supplier_id', 'FK'], ['ingredient_id', 'FK'], ['qty_kg']], x: 20, y: 200 },
      { id: 'Ingredient', table: 'ingredients', fields: [['ingredient_id', 'PK'], ['allergens']], x: 260, y: 200 },
      { id: 'SubRecipe', label: 'Sub-recipe', table: 'sub_recipes', fields: [['sr_id', 'PK'], ['ingredient_ids', 'FK'], ['allergens']], x: 500, y: 200 },
      { id: 'Recipe', table: 'recipes', fields: [['recipe_id', 'PK'], ['sku', 'FK'], ['component_ids', 'FK']], x: 740, y: 200 },
      { id: 'Product', table: 'products', fields: [['sku', 'PK'], ['declared_allergens']], x: 980, y: 200 },
      { id: 'ProductSheet', label: 'Product sheet', table: 'product_sheets', fields: [['sheet_id', 'PK'], ['sku', 'FK'], ['customer_id', 'FK'], ['allergens']], x: 1220, y: 200 },
      { id: 'GoodsReceipt', label: 'Goods receipt', table: 'goods_receipts', fields: [['grn_id', 'PK'], ['po_id', 'FK'], ['qty_kg']], x: 20, y: 390 },
      { id: 'Inventory', table: 'inventory', fields: [['ingredient_id', 'FK'], ['free_kg']], x: 260, y: 390 },
      { id: 'IngredientLot', label: 'Ingredient lot', table: 'ingredient_lots', fields: [['ilot_id', 'PK'], ['ingredient_id', 'FK'], ['supplier_lot']], x: 500, y: 390 },
      { id: 'ProductionLot', label: 'Production lot', table: 'production_lots', fields: [['lot_id', 'PK'], ['sku', 'FK'], ['ilot_ids', 'FK'], ['status']], x: 740, y: 390 },
      { id: 'ProductionRun', label: 'Production run', table: 'production_runs', fields: [['run_id', 'PK'], ['sku', 'FK'], ['order_id', 'FK'], ['qty']], x: 980, y: 390 },
      { id: 'CustomerOrder', label: 'Customer order', table: 'orders', fields: [['order_id', 'PK'], ['customer_id', 'FK'], ['delivery_at']], x: 1220, y: 390 },
    ],
    relations: [
      { id: 'r1', from: 'Supplier', to: 'SupplierProduct', label: 'supplies', card: '1:n' },
      { id: 'r2', from: 'SupplierProduct', to: 'SpecVersion', label: 'has version', card: '1:n' },
      { id: 'r3', from: 'SupplierProduct', to: 'Ingredient', label: 'maps to', card: 'n:1' },
      { id: 'r4', from: 'SpecVersion', to: 'Allergen', label: 'declares', card: 'n:m' },
      { id: 'r5', from: 'Ingredient', to: 'SubRecipe', label: 'used in', card: 'n:m' },
      { id: 'r6', from: 'SubRecipe', to: 'Recipe', label: 'used in', card: 'n:m' },
      { id: 'r7', from: 'Ingredient', to: 'Recipe', label: 'used in', card: 'n:m', via: 170 },
      { id: 'r8', from: 'Recipe', to: 'Product', label: 'produces', card: '1:1' },
      { id: 'r9', from: 'Product', to: 'ProductSheet', label: 'described by', card: '1:n' },
      { id: 'r10', from: 'ProductSheet', to: 'Customer', label: 'issued to', card: 'n:1' },
      { id: 'r11', from: 'Product', to: 'Allergen', label: 'declares', card: 'n:m' },
      { id: 'r12', from: 'Ingredient', to: 'IngredientLot', label: 'received as', card: '1:n' },
      { id: 'r13', from: 'IngredientLot', to: 'ProductionLot', label: 'consumed by', card: 'n:m' },
      { id: 'r14', from: 'ProductionLot', to: 'Product', label: 'lot of', card: 'n:1', labelAt: 0.28 },
      { id: 'r15', from: 'Supplier', to: 'PurchaseOrder', label: 'receives', card: '1:n' },
      { id: 'r16', from: 'PurchaseOrder', to: 'Ingredient', label: 'orders', card: 'n:1' },
      { id: 'r17', from: 'PurchaseOrder', to: 'GoodsReceipt', label: 'received as', card: '1:n' },
      { id: 'r18', from: 'GoodsReceipt', to: 'Inventory', label: 'adds to', card: 'n:1' },
      { id: 'r19', from: 'Ingredient', to: 'Inventory', label: 'stocked as', card: '1:1' },
      { id: 'r20', from: 'ProductionRun', to: 'Recipe', label: 'follows', card: 'n:1', labelAt: 0.28 },
      { id: 'r21', from: 'ProductionRun', to: 'CustomerOrder', label: 'fulfils', card: 'n:1' },
      { id: 'r22', from: 'CustomerOrder', to: 'Customer', label: 'placed by', card: 'n:1', via: 1440 },
    ],
  },

  /* Operator questions captured to build the semantic context (illustrative, 24 of the 20–50 target) */
  operatorQuestions: [
    { id: 'Q-01', q: 'What does "available stock" mean for you?', a: 'Physical stock minus quantities reserved for confirmed orders.', creates: 'Inventory.free_kg' },
    { id: 'Q-02', q: 'Which lot do you ship first?', a: 'First-expired, first-out.', creates: 'Rule on ProductionLot' },
    { id: 'Q-03', q: 'How much raw fillet goes into one salmon portion?', a: '0.15 kg including trim.', creates: 'Recipe lines (kg per unit)' },
    { id: 'Q-04', q: 'When is production for next-morning deliveries made?', a: 'On the night shift, 20:00 to 04:00.', creates: 'ProductionRun → shift' },
    { id: 'Q-05', q: 'Which supplier code matches our internal ingredient?', a: 'The ingredient master holds one mapping per supplier product.', creates: 'SupplierProduct → Ingredient' },
    { id: 'Q-06', q: 'When must a supplier order go out for same-day delivery?', a: 'Before the supplier cut-off, 11:00 for Nordfjord.', creates: 'Rule SUP-01' },
    { id: 'Q-07', q: 'Where do supplier specifications arrive?', a: 'As PDFs in the spec inbox, one per version.', creates: 'Source → SpecVersion' },
    { id: 'Q-08', q: 'Which recipes use a sub-recipe?', a: 'Recipe lines can point to an ingredient or a sub-recipe.', creates: 'SubRecipe → Recipe' },
    { id: 'Q-09', q: 'Is one product sheet issued per customer?', a: 'Yes, each retailer gets its own sheet version.', creates: 'ProductSheet → Customer' },
    { id: 'Q-10', q: 'Which allergens must appear on a label?', a: 'The 14 of EU Regulation 1169/2011 Annex II.', creates: 'Allergen (Annex II)' },
    { id: 'Q-11', q: 'Who validates a change to a product sheet?', a: 'The quality lead.', creates: 'Approval role' },
    { id: 'Q-12', q: 'If an ingredient gains an allergen, what must change?', a: 'Every sub-recipe, product and sheet that uses it.', creates: 'Rule ALG-02' },
    { id: 'Q-13', q: 'How do you know which ingredient lot went into a finished lot?', a: 'Production lots record the ingredient lots consumed.', creates: 'IngredientLot → ProductionLot' },
    { id: 'Q-14', q: 'When does a new supplier formulation apply?', a: 'From the supplier lot named in the spec.', creates: 'SpecVersion.effective_from_lot' },
    { id: 'Q-15', q: 'What do you check when a new spec arrives?', a: 'Ingredients, allergens, may-contain and the effective lot.', creates: 'Rule SPEC-01' },
    { id: 'Q-16', q: 'When are finished lots dispatched?', a: 'At 11:00 for same-day retail deliveries.', creates: 'ProductionLot.dispatch_at' },
    { id: 'Q-17', q: 'What happens to a lot whose label may be wrong?', a: 'It is held until relabelled.', creates: 'Rule ALG-03' },
    { id: 'Q-18', q: 'Which customers need to receive updated sheets?', a: 'Every customer with a sheet for the product.', creates: 'ProductSheet → Customer' },
    { id: 'Q-19', q: 'Which file is the source of truth for recipes?', a: 'The recipe and ingredient master.', creates: 'Source → Recipe' },
    { id: 'Q-20', q: 'How is a delivery recorded on arrival?', a: 'Scanned at the dock and posted as a goods receipt.', creates: 'GoodsReceipt' },
    { id: 'Q-21', q: 'When is a delivery considered short?', a: 'More than 5 % below the PO line.', creates: 'Rule RCV-01' },
    { id: 'Q-22', q: 'Which orders does a production run serve?', a: 'One customer order per run, or store restock.', creates: 'ProductionRun → CustomerOrder' },
    { id: 'Q-23', q: 'Which orders come first when raw material is short?', a: 'By delivery time; store restock last.', creates: 'Rule PLN-01' },
    { id: 'Q-24', q: 'What can replace a missing salmon delivery?', a: 'A second supplier, if it arrives before the run.', creates: 'Supplier alternatives' },
  ],

  /* Decisions recorded before today — seeded demo history, not real decisions */
  seededAudit: [
    {
      caseId: 'SPV-0187', at: '2026-10-21T14:05:00', scenario: 'spec', title: 'Mustard trace removed from spec SP-MIS-02 v6',
      trigger: 'Spec SP-MIS-02 v6 received', records: ['SP-MIS-02', 'SPEC-MIS-02-v5', 'SPEC-MIS-02-v6', 'PS-0931', 'PS-0932'],
      discrepancy: 'Two sheets still declare "may contain mustard"', impacted: '2 product sheets', actions: ['Remove precautionary mustard from 2 sheets'],
      decision: 'rejected', proposed: 2, accepted: 0, reasonCode: 'needs-evidence', reasonText: 'Signed certificate not attached yet. Keep the precautionary label until it arrives.',
    },
    {
      caseId: 'SPV-0185', at: '2026-10-20T06:20:00', scenario: 'receipt', title: 'Rice receipt 180 kg against PO for 200 kg',
      trigger: 'GRN-5466 posted', records: ['PO-7702', 'GRN-5466', 'INV-RICE'],
      discrepancy: '−20 kg (−10 %)', impacted: 'No run short: 410 kg free', actions: ['Accept partial receipt', 'Close PO line'],
      decision: 'approved', proposed: 2, accepted: 2, reasonCode: null, reasonText: '',
    },
    {
      caseId: 'SPV-0181', at: '2026-10-19T22:10:00', scenario: 'sheet', title: 'Sheet allergens out of sync with product SKU-POK-TOF',
      trigger: 'Product sheet export', records: ['SKU-POK-TOF', 'PS-0977', 'PS-0978'],
      discrepancy: 'Two sheets list Fish; the recipe no longer contains fish', impacted: '2 product sheets', actions: ['Remove Fish from PS-0977', 'Remove Fish from PS-0978'],
      decision: 'partial', proposed: 2, accepted: 1, reasonCode: 'wrong-record', reasonText: 'PS-0978 is archived, no change needed.',
    },
  ],
};
