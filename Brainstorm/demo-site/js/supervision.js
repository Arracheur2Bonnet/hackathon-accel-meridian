/*
 * Supervision engine (deterministic, local).
 * Turns a detected event into a case: trace steps, comparison, impacted
 * records, proposed changes, action plan and an instance graph. Every
 * result is derived by walking the demo dataset along `schema.relations`;
 * nothing is hardcoded per screen. A real backend can return the same
 * case shape (see README, "Case contract").
 */
(function (App) {
  const byId = (arr, id) => arr.find((r) => r.id === id);
  const uniq = (a) => [...new Set(a)];
  const hhmm = (iso) => iso.slice(11, 16);
  const dayShort = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const algName = (d, c) => (byId(d.allergens.map((x) => ({ ...x, id: x.code })), c) || {}).name || c;

  /* ================= SPV-0193, new allergen in a supplier specification ================= */
  function allergenCase(d) {
    const specNew = byId(d.specVersions, 'SPEC-TER-05-v3');
    const sp = byId(d.supplierProducts, specNew.spId);
    const specOld = d.specVersions.filter((s) => s.spId === sp.id && s.version < specNew.version).sort((a, b) => b.version - a.version)[0];
    const supplier = byId(d.suppliers, sp.supplierId);

    // Compare
    const addedAllergens = specNew.allergens.filter((a) => !specOld.allergens.includes(a));
    const addedIngredients = specNew.ingredients.filter((i) => !specOld.ingredients.includes(i));
    const alg = addedAllergens[0];
    const diff = [
      { field: 'Version', before: `v${specOld.version}`, after: `v${specNew.version}` },
      { field: 'Issued', before: specOld.issuedAt, after: specNew.issuedAt },
      { field: 'Ingredients', before: specOld.ingredients, after: specNew.ingredients, added: addedIngredients },
      { field: 'Allergens', before: specOld.allergens.map((c) => algName(d, c)), after: specNew.allergens.map((c) => algName(d, c)), added: addedAllergens.map((c) => algName(d, c)), critical: true },
      { field: 'May contain', before: specOld.mayContain, after: specNew.mayContain },
      { field: 'Effective from supplier lot', before: specOld.effectiveFromLot, after: specNew.effectiveFromLot, changedValue: true },
    ];

    // Traverse the schema
    const ingredient = byId(d.ingredients, sp.ingredientId);
    const subRecipes = d.subRecipes.filter((sr) => sr.lines.some((l) => l.ref === ingredient.id));
    const viaOf = (r) => { const line = r.lines.find((l) => l.ref === ingredient.id || subRecipes.some((s) => s.id === l.ref)); return line.ref === ingredient.id ? 'direct' : line.ref; };
    const recipes = d.recipes.filter((r) => r.lines.some((l) => l.ref === ingredient.id || subRecipes.some((s) => s.id === l.ref)));
    const products = recipes.map((r) => byId(d.products, r.sku));
    const sheets = d.productSheets.filter((s) => products.some((p) => p.id === s.sku));
    const ingLots = d.ingredientLots.filter((l) => l.ingredientId === ingredient.id);
    const newLots = ingLots.filter((l) => l.supplierLot >= specNew.effectiveFromLot);
    const prodLots = d.productionLots.filter((l) => products.some((p) => p.id === l.sku) && l.ingredientLots.some((id) => ingLots.some((x) => x.id === id)));
    const notLinked = d.products.filter((p) => !products.includes(p));

    // Establish discrepancies
    const ingMissing = !ingredient.allergens.includes(alg);
    const srRows = subRecipes.map((sr) => ({ sr, missing: !sr.declaredAllergens.includes(alg) }));
    const prodRows = products.map((p) => {
      const r = recipes.find((x) => x.sku === p.id);
      return { p, recipe: r, via: viaOf(r), missing: !p.declaredAllergens.includes(alg), derived: uniq([...p.declaredAllergens, alg]) };
    });
    const missingProducts = prodRows.filter((x) => x.missing);
    const sheetRows = sheets.map((s) => ({ s, customer: byId(d.customers, s.customerId), missing: !s.allergens.includes(alg) }));
    const missingSheets = sheetRows.filter((x) => x.missing);
    const lotRows = prodLots.map((l) => {
      const newFormula = l.ingredientLots.some((id) => newLots.some((n) => n.id === id));
      const labelMissing = missingProducts.some((x) => x.p.id === l.sku);
      const usedLot = ingLots.find((x) => l.ingredientLots.includes(x.id));
      let verdict = 'Not affected', reason = '';
      if (!newFormula) reason = `Made with ${usedLot.supplierLot}, before ${specNew.effectiveFromLot}`;
      else if (!labelMissing) reason = 'Label already declares sesame';
      else if (l.status === 'shipped') { verdict = 'Shipped with wrong label'; reason = 'Escalate: recall review'; }
      else { verdict = 'Hold'; reason = `Made with ${usedLot.supplierLot}; label lacks sesame`; }
      return { l, usedLot, newFormula, labelMissing, verdict, reason };
    });
    const heldLots = lotRows.filter((x) => x.verdict === 'Hold');
    const heldUnits = heldLots.reduce((t, x) => t + x.l.units, 0);
    const shippedAffected = lotRows.filter((x) => x.verdict === 'Shipped with wrong label');
    const customers = uniq(missingSheets.map((x) => x.customer.id)).map((id) => byId(d.customers, id));
    const dispatch = heldLots[0] ? heldLots[0].l.dispatchAt : null;

    // Proposed record changes
    const add = (arr) => uniq([...arr, alg]);
    const changes = [];
    let n = 0;
    const ch = (entity, recordId, field, before, after, actionId, extra = {}) => changes.push({ id: `CH-${String(++n).padStart(2, '0')}`, entity, recordId, field, before, after, actionId, source: specNew.id, ...extra });
    if (ingMissing) ch('Ingredient', ingredient.id, 'Allergens', ingredient.allergens, add(ingredient.allergens), 'A2', { name: ingredient.name });
    srRows.filter((x) => x.missing).forEach((x) => ch('Sub-recipe', x.sr.id, 'Declared allergens', x.sr.declaredAllergens, add(x.sr.declaredAllergens), 'A2', { name: x.sr.name }));
    missingProducts.forEach((x) => ch('Product', x.p.id, 'Declared allergens', x.p.declaredAllergens, add(x.p.declaredAllergens), 'A2', { name: x.p.name }));
    missingSheets.forEach((x) => ch('Product sheet', x.s.id, 'Allergens', x.s.allergens, add(x.s.allergens), 'A3', { name: `${byId(d.products, x.s.sku).name}, ${x.customer.name}`, versionBefore: x.s.version, versionAfter: x.s.version + 1 }));
    heldLots.forEach((x) => ch('Production lot', x.l.id, 'Status', [`In stock, dispatch ${hhmm(x.l.dispatchAt)}`], ['On hold until relabelled'], 'A1', { name: `${byId(d.products, x.l.sku).name}, ${x.l.units} units`, kind: 'status' }));

    const actions = [
      { id: 'A1', priority: 'P1', title: `Hold ${heldLots.length} finished lots (${heldUnits} units) before the ${hhmm(dispatch)} dispatch`, why: `They were made with glaze lot ${newLots[0].supplierLot}, the new formulation, and their labels do not declare sesame.`, owner: 'Quality lead', due: `Before ${hhmm(dispatch)}`, finding: 'Lots made with the new formulation', evidence: [...heldLots.map((x) => x.l.id), newLots[0].id, specNew.id], rule: 'ALG-03' },
      { id: 'A2', priority: 'P1', title: `Add sesame to ${1 + srRows.filter((x) => x.missing).length + missingProducts.length} allergen declarations`, why: `${ingredient.id}, ${srRows.map((x) => x.sr.id).join(', ')} and ${missingProducts.length} products inherit sesame from ${sp.id} v${specNew.version}.`, owner: 'Quality lead', due: 'Today', finding: 'Declarations missing sesame', evidence: [ingredient.id, ...srRows.map((x) => x.sr.id), ...missingProducts.map((x) => x.p.id)], rule: 'ALG-02' },
      { id: 'A3', priority: 'P1', title: `Issue ${missingSheets.length} corrected product sheets`, why: `Sheets for ${customers.length} customers list ${missingProducts.length} products without sesame. Each gets a new version.`, owner: 'Quality lead', due: 'Today', finding: 'Sheets missing sesame', evidence: missingSheets.map((x) => x.s.id), rule: 'ALG-02' },
      { id: 'A4', priority: 'P2', title: `Ask ${supplier.name} to confirm the v${specNew.version} formulation`, why: `Lot ${newLots[0].supplierLot} arrived on ${dayShort(newLots[0].receivedAt + 'T00:00:00')}, before the specification dated ${dayShort(specNew.issuedAt + 'T00:00:00')}.`, owner: 'Purchasing', due: 'Today', finding: 'Formulation changed before notice', evidence: [specNew.id, newLots[0].id], rule: 'SPEC-01' },
      { id: 'A5', priority: 'P3', title: `Draft notices to ${customers.length} customers with the new sheets`, why: `${customers.map((c) => c.name).join(', ')} hold affected sheets. Drafts only; sending is a separate step.`, owner: 'Account managers', due: 'After approval', finding: 'Customers holding wrong sheets', evidence: customers.map((c) => c.id), rule: 'ALG-02' },
    ];

    // Matrix rows (hero): products × Annex II
    const matrix = prodRows.map((x) => ({ id: x.p.id, name: x.p.name, declared: x.p.declaredAllergens, required: x.derived, missing: x.missing ? [alg] : [], via: x.via }));

    const ops = (txt) => txt;
    const steps = [
      {
        key: 'event', kind: 'Event', title: 'New specification detected',
        summary: `${sp.id} v${specNew.version} arrived in the spec inbox`,
        op: ops(`Watch stream "Supplier specifications", new file ${specNew.file}`), path: ['SpecVersion'], relations: [],
        evidence: { type: 'doc', title: specNew.file, fields: [['Supplier', supplier.name], ['Supplier product', `${sp.id}, ${sp.name}`], ['Version', `v${specNew.version}`], ['Issued', specNew.issuedAt], ['Effective from supplier lot', specNew.effectiveFromLot], ['Change note', specNew.changeNote]], note: 'Fields extracted from the PDF (pre-extracted in this demo).' },
        rules: ['SPEC-01'], outcome: `Case SPV-0193 opened by the supervision scan. No one asked.`,
        records: [specNew.id],
      },
      {
        key: 'retrieve', kind: 'Retrieve', title: 'Stored records retrieved',
        summary: `${supplier.id}, ${sp.id} and stored spec v${specOld.version}`,
        op: ops(`SupplierProduct where sp_id = ${sp.id}, SpecVersion where sp_id = ${sp.id} and version < ${specNew.version}`), path: ['Supplier', 'SupplierProduct', 'SpecVersion'], relations: ['r1', 'r2'],
        evidence: { type: 'records', rows: [[supplier.id, 'Supplier', supplier.name], [sp.id, 'Supplier product', `${sp.name}, maps to ${sp.ingredientId}`], [specOld.id, 'Spec version', `v${specOld.version}, issued ${specOld.issuedAt}, stored`], [specNew.id, 'Spec version', `v${specNew.version}, issued ${specNew.issuedAt}, received ${hhmm(specNew.receivedAt)}`]] },
        rules: [], outcome: `Stored version v${specOld.version} found for comparison.`,
        records: [supplier.id, sp.id, specOld.id, specNew.id],
      },
      {
        key: 'compare', kind: 'Compare', title: 'Compared with the stored version',
        summary: `${addedIngredients.length} ingredient added, new allergen: ${algName(d, alg)}`,
        op: ops(`Field-by-field comparison ${specOld.id} → ${specNew.id}`), path: ['SpecVersion', 'Allergen'], relations: ['r4'],
        evidence: { type: 'diff', rows: diff },
        rules: ['SPEC-01', 'ALG-01'], outcome: `${algName(d, alg)} is new in v${specNew.version}. It is an Annex II allergen, so every downstream declaration must be checked.`,
        records: [specOld.id, specNew.id, alg],
      },
      {
        key: 'traverse', kind: 'Traverse', title: 'Relationships traversed',
        summary: `${recipes.length} recipes, ${products.length} products, ${sheets.length} sheets, ${prodLots.length} lots linked`,
        op: ops(`Follow SupplierProduct → Ingredient → Sub-recipe → Recipe → Product → Product sheet, and Ingredient → Ingredient lot → Production lot`),
        path: ['SupplierProduct', 'Ingredient', 'SubRecipe', 'Recipe', 'Product', 'ProductSheet'], relations: ['r3', 'r5', 'r6', 'r7', 'r8', 'r9', 'r12', 'r13', 'r14'],
        evidence: { type: 'hops', rows: [
          { from: 'Supplier product', rel: 'maps to', to: 'Ingredient', ids: [ingredient.id], note: ingredient.name },
          { from: 'Ingredient', rel: 'used in', to: 'Sub-recipe', ids: subRecipes.map((x) => x.id), note: subRecipes.map((x) => x.name).join(', ') },
          { from: 'Ingredient or sub-recipe', rel: 'used in', to: 'Recipe', ids: recipes.map((x) => x.id), note: `${recipes.filter((r) => viaOf(r) === 'direct').length} direct, ${recipes.filter((r) => viaOf(r) !== 'direct').length} via ${subRecipes.map((x) => x.id).join(', ')}` },
          { from: 'Recipe', rel: 'produces', to: 'Product', ids: products.map((x) => x.id), note: `${notLinked.length} other products checked, not linked` },
          { from: 'Product', rel: 'described by', to: 'Product sheet', ids: sheets.map((x) => x.id), note: `${uniq(sheets.map((s) => s.customerId)).length} customers` },
          { from: 'Ingredient', rel: 'received as', to: 'Ingredient lot', ids: ingLots.map((x) => x.id), note: ingLots.map((x) => `${x.supplierLot} (${dayShort(x.receivedAt + 'T00:00:00')})`).join(', ') },
          { from: 'Ingredient lot', rel: 'consumed by', to: 'Production lot', ids: prodLots.map((x) => x.id), note: `${prodLots.length} finished lots` },
        ] },
        rules: [], outcome: `The schema bounds the search to ${1 + subRecipes.length + recipes.length + products.length + sheets.length + ingLots.length + prodLots.length} records instead of the whole catalogue.`,
        records: [ingredient.id, ...subRecipes.map((x) => x.id), ...recipes.map((x) => x.id), ...products.map((x) => x.id), ...sheets.map((x) => x.id), ...ingLots.map((x) => x.id), ...prodLots.map((x) => x.id)],
      },
      {
        key: 'discrepancy', kind: 'Rule', title: 'Discrepancy established',
        summary: `${missingProducts.length} of ${products.length} products and ${missingSheets.length} of ${sheets.length} sheets do not declare ${algName(d, alg).toLowerCase()}`,
        op: ops(`For each record: required allergens (from ingredients) minus declared allergens`), path: ['Ingredient', 'Product', 'Allergen'], relations: ['r11'],
        evidence: { type: 'matrix', rows: matrix, extra: [`${ingredient.id} ${ingredient.name}: declares ${ingredient.allergens.map((c) => algName(d, c)).join(', ')}${ingMissing ? ', missing sesame' : ''}`, ...srRows.map((x) => `${x.sr.id} ${x.sr.name}: ${x.missing ? 'missing sesame' : 'declares sesame'}`)] },
        rules: ['ALG-02'], outcome: `${ingMissing ? 1 : 0} ingredient, ${srRows.filter((x) => x.missing).length} sub-recipe, ${missingProducts.length} products and ${missingSheets.length} sheets understate the allergen. ${prodRows.filter((x) => !x.missing).map((x) => x.p.id).join(', ')} already declares it.`,
        records: [ingredient.id, ...missingProducts.map((x) => x.p.id), ...missingSheets.map((x) => x.s.id)],
      },
      {
        key: 'impact', kind: 'Impact', title: 'Impacted lots and customers identified',
        summary: `${heldLots.length} lots (${heldUnits} units) made with the new formulation, ${customers.length} customers`,
        op: ops(`Production lot where ingredient lot ≥ ${specNew.effectiveFromLot} and label lacks ${algName(d, alg).toLowerCase()}`), path: ['IngredientLot', 'ProductionLot', 'ProductSheet', 'Customer'], relations: ['r12', 'r13', 'r10'],
        evidence: { type: 'lots', rows: lotRows, customers: customers.map((c) => ({ c, sheets: missingSheets.filter((x) => x.customer.id === c.id).map((x) => x.s.id) })) },
        rules: ['ALG-03'], outcome: `${heldLots.length} lots must not leave at ${hhmm(dispatch)}. ${shippedAffected.length ? `${shippedAffected.length} shipped lot needs recall review.` : 'No shipped lot used the new formulation.'}`,
        records: [...heldLots.map((x) => x.l.id), ...customers.map((c) => c.id)],
      },
      {
        key: 'plan', kind: 'Plan', title: 'Resolution proposed',
        summary: `${actions.length} actions, ${changes.length} record changes, waiting for review`,
        op: ops(`Build changes from the discrepancies; nothing is written until the operator approves`), path: [], relations: [],
        evidence: { type: 'plan', actions },
        rules: [], outcome: `Plan ready for the quality lead. Changes stay proposed until approved.`,
        records: [],
      },
    ];

    // Instance graph
    const nodes = [], edges = [];
    const node = (id, type, label, sub, col, state, group) => nodes.push({ id, type, label, sub, col, state, group });
    node(supplier.id, 'Supplier', supplier.id, supplier.name, 0, 'source');
    node(sp.id, 'SupplierProduct', sp.id, sp.name, 1, 'source');
    node(specNew.id, 'SpecVersion', `Spec v${specNew.version}`, `issued ${specNew.issuedAt}`, 1, 'changed');
    node(specOld.id, 'SpecVersion', `Spec v${specOld.version}`, 'stored version', 1, 'neutral');
    node(ingredient.id, 'Ingredient', ingredient.id, ingredient.name, 2, ingMissing ? 'affected' : 'ok');
    ingLots.forEach((l) => node(l.id, 'IngredientLot', l.supplierLot, `received ${dayShort(l.receivedAt + 'T00:00:00')}`, 2, newLots.includes(l) ? 'changed' : 'neutral'));
    srRows.forEach((x) => node(x.sr.id, 'SubRecipe', x.sr.id, x.sr.name, 3, x.missing ? 'affected' : 'ok'));
    prodRows.forEach((x) => node(x.recipe.id, 'Recipe', x.recipe.id, x.p.name, 4, 'neutral', x.p.id));
    prodRows.forEach((x) => node(x.p.id, 'Product', x.p.id, x.p.name, 5, x.missing ? 'affected' : 'ok', x.p.id));
    node(alg, 'Allergen', algName(d, alg), 'Annex II item 11', 5, 'changed');
    prodRows.forEach((x) => {
      sheetRows.filter((s) => s.s.sku === x.p.id).forEach((s) => node(s.s.id, 'ProductSheet', s.s.id, s.customer.name, 7, s.missing ? 'affected' : 'ok', x.p.id));
      lotRows.filter((l) => l.l.sku === x.p.id).forEach((l) => node(l.l.id, 'ProductionLot', l.l.id, `${l.l.units} units, ${l.verdict === 'Hold' ? 'hold' : l.l.status}`, 6, l.verdict === 'Hold' ? 'affected' : 'ok', x.p.id));
    });
    const edge = (from, to, label, state = 'normal') => edges.push({ from, to, label, state });
    edge(supplier.id, sp.id, 'supplies');
    edge(sp.id, specNew.id, 'version'); edge(sp.id, specOld.id, 'version');
    edge(specNew.id, alg, 'declares (new)', 'changed');
    edge(sp.id, ingredient.id, 'maps to');
    ingLots.forEach((l) => edge(ingredient.id, l.id, 'received as'));
    srRows.forEach((x) => edge(ingredient.id, x.sr.id, 'used in'));
    prodRows.forEach((x) => edge(x.via === 'direct' ? ingredient.id : x.via, x.recipe.id, 'used in'));
    prodRows.forEach((x) => edge(x.recipe.id, x.p.id, 'produces'));
    prodRows.forEach((x) => edge(alg, x.p.id, x.missing ? 'missing' : 'declared', x.missing ? 'missing' : 'ok'));
    sheetRows.forEach((s) => edge(s.s.sku, s.s.id, 'sheet', s.missing ? 'missing' : 'normal'));
    lotRows.forEach((l) => edge(l.l.sku, l.l.id, 'lot', l.verdict === 'Hold' ? 'missing' : 'normal'));
    lotRows.forEach((l) => edges.push({ from: l.usedLot.id, to: l.l.id, label: 'consumed by', state: l.newFormula ? 'changed' : 'normal', hidden: true }));

    return {
      id: 'SPV-0193', scenario: 'allergen', primary: true, severity: 'Critical', category: 'Food safety',
      title: `Sesame added to supplier spec ${sp.id}`, short: `New allergen in ${sp.name}`,
      stream: 'STR-SPEC', eventId: 'EVT-2206', detectedAt: specNew.receivedAt, detectedBy: 'Supervision agent',
      trigger: `${specNew.file} received from ${supplier.name}`,
      headline: `${sp.name} now contains sesame. ${missingProducts.length} products, ${missingSheets.length} product sheets and ${heldLots.length} lots ready for dispatch do not declare it.`,
      chips: [`${missingProducts.length} products`, `${missingSheets.length} sheets`, `${heldLots.length} lots, ${heldUnits} units`, `${customers.length} customers`],
      deadline: dispatch ? `Lots dispatch at ${hhmm(dispatch)}` : null,
      path: ['Supplier', 'SupplierProduct', 'Ingredient', 'SubRecipe', 'Recipe', 'Product', 'ProductSheet', 'Allergen'],
      pathRelations: ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'r10', 'r11', 'r12', 'r13', 'r14'],
      steps, actions, changes, matrix, diff, alg, algName: algName(d, alg),
      impact: { products: missingProducts.length, productsLinked: products.length, sheets: missingSheets.length, sheetsLinked: sheets.length, lots: heldLots.length, units: heldUnits, customers: customers.length, recordsVisited: steps[3].records.length },
      sheetsByCustomer: customers.map((c) => ({ name: c.name, n: missingSheets.filter((x) => x.customer.id === c.id).length })),
      graph: { nodes, edges, focus: alg },
      records: { specOld, specNew, sp, supplier, ingredient, subRecipes, recipes, products, sheets, ingLots, prodLots, lotRows, notLinked },
    };
  }

  /* ================= SPV-0192, goods receipt below purchase order ================= */
  function receiptCase(d) {
    const grn = byId(d.goodsReceipts, 'GRN-5512');
    const po = byId(d.purchaseOrders, grn.poId);
    const supplier = byId(d.suppliers, po.supplierId);
    const ing = byId(d.ingredients, po.ingredientId);
    const inv = d.inventory.find((i) => i.ingredientId === ing.id);
    const diffKg = grn.qtyKg - po.qtyKg, pct = Math.round((diffKg / po.qtyKg) * 1000) / 10, tolerance = 5;

    const kgPerUnit = (recipe) => Math.round(1000 * recipe.lines.reduce((t, l) => {
      if (l.ref === ing.id) return t + l.qty;
      const sr = byId(d.subRecipes, l.ref);
      return sr ? t + l.qty * (sr.lines.find((x) => x.ref === ing.id) || { qty: 0 }).qty : t;
    }, 0)) / 1000;
    const round1 = (x) => Math.round(x * 10) / 10;
    const shift = d.shifts[0];
    const runs = d.productionRuns.filter((r) => r.shiftId === shift.id).map((r) => {
      const recipe = d.recipes.find((x) => x.sku === r.sku);
      const order = r.orderId ? byId(d.orders, r.orderId) : null;
      return { r, recipe, order, customer: order ? byId(d.customers, order.customerId) : null, product: byId(d.products, r.sku), kgu: kgPerUnit(recipe), need: round1(r.quantity * kgPerUnit(recipe)) };
    }).filter((x) => x.kgu > 0);
    const recipes = uniq(runs.map((x) => x.recipe.id)).map((id) => byId(d.recipes, id));
    const available = inv.freeKg + grn.qtyKg;
    const required = round1(runs.reduce((t, x) => t + x.need, 0));
    const deficit = round1(required - available);
    // Allocate by delivery time, restock last (PLN-01)
    let left = available;
    const alloc = [...runs].sort((a, b) => (a.order ? a.order.deliveryAt : '9') .localeCompare(b.order ? b.order.deliveryAt : '9')).map((x) => {
      const got = round1(Math.min(left, x.need)); left = round1(left - got);
      const short = round1(x.need - got);
      return { ...x, got, short, units: Math.floor(got / x.kgu + 1e-9), status: short <= 0 ? 'Covered' : x.order ? 'At risk' : 'Defer' };
    });
    const atRisk = alloc.filter((x) => x.status === 'At risk');
    const deferred = alloc.filter((x) => x.status === 'Defer');
    const balance = po.qtyKg - grn.qtyKg;
    const alt = byId(d.suppliers, 'SUP-ATLM');
    const altKg = Math.ceil(atRisk.reduce((t, x) => t + x.short, 0) / alt.caseKg) * alt.caseKg;
    const day = d.shifts[1];

    const changes = [];
    let n = 0;
    const ch = (entity, recordId, field, before, after, actionId, extra = {}) => changes.push({ id: `CH-${String(++n).padStart(2, '0')}`, entity, recordId, field, before, after, actionId, source: grn.id, kind: 'status', ...extra });
    ch('Purchase order', po.id, 'Open quantity', ['0 kg'], [`${balance} kg balance requested for ${supplier.sameDayDelivery}`], 'A1', { name: `${supplier.name}, ${ing.name}` });
    alloc.filter((x) => x.status === 'Covered').forEach((x) => ch('Production run', x.r.id, 'Salmon allocated', ['Not allocated'], [`${x.got} kg from ${grn.supplierLot} and stock`], 'A2', { name: `${x.product.name}, ${x.customer.name}` }));
    atRisk.forEach((x) => ch('Production run', x.r.id, 'Schedule', [shift.name], [`${day.name}, 07:30, if the balance is not confirmed by ${supplier.orderCutoff}`], 'A3', { name: `${x.product.name}, ${x.customer.name}` }));
    ch('Purchase order', 'PO-DRAFT-01', 'Status', ['None'], [`Draft: ${altKg} kg from ${alt.name}, not sent`], 'A3', { name: `Fallback, arrives ${alt.nextDayDelivery} on 23 Oct` });
    deferred.forEach((x) => ch('Production run', x.r.id, 'Status', ['Planned'], ['Deferred'], 'A4', { name: `${x.product.name}, store restock` }));

    const actions = [
      { id: 'A1', priority: 'P1', title: `Request the ${balance} kg balance from ${supplier.name}`, why: `Ask for the balance today at ${supplier.sameDayDelivery}. Same-day delivery needs confirmation before ${supplier.orderCutoff}. The balance alone covers the ${deficit} kg gap.`, owner: 'Purchasing', due: `Before ${supplier.orderCutoff}`, finding: 'Receipt below PO', evidence: [po.id, grn.id, supplier.id], rule: 'SUP-01' },
      { id: 'A2', priority: 'P1', title: `Allocate lot ${grn.supplierLot} to the earliest deliveries`, why: `${alloc.filter((x) => x.status === 'Covered').map((x) => `${x.r.id} (${x.order.id})`).join(' and ')} are fully covered from ${available} kg.`, owner: 'Production planner', due: 'Today', finding: 'Raw material short for the night shift', evidence: alloc.filter((x) => x.status === 'Covered').map((x) => x.r.id), rule: 'PLN-01' },
      { id: 'A3', priority: 'P2', title: `Fallback: ${altKg} kg from ${alt.name} and move ${atRisk.map((x) => x.r.id).join(', ')} to the day shift`, why: `${alt.name} delivers at ${alt.nextDayDelivery} on 23 Oct. A 07:30 run still meets ${atRisk.map((x) => `${x.customer.name}'s ${hhmm(x.order.deliveryAt)} delivery`).join(', ')}.`, owner: 'Purchasing, production', due: `Decide at ${supplier.orderCutoff}`, finding: `${atRisk.map((x) => x.order.id).join(', ')} at risk`, evidence: [...atRisk.map((x) => x.r.id), alt.id], rule: 'SUP-01' },
      { id: 'A4', priority: 'P2', title: `Defer ${deferred.map((x) => x.r.id).join(', ')} (store restock)`, why: 'No customer order depends on it.', owner: 'Production planner', due: 'Today', finding: 'Restock lowest priority', evidence: deferred.map((x) => x.r.id), rule: 'PLN-01' },
      { id: 'A5', priority: 'P3', title: `Draft a heads-up for ${atRisk.map((x) => x.customer.name).join(', ')}`, why: 'Only if the balance is not confirmed. Draft only, not sent.', owner: 'Account manager', due: `After ${supplier.orderCutoff}`, finding: 'Customer delivery at risk', evidence: atRisk.map((x) => x.order.id), rule: 'PLN-01' },
    ];

    const steps = [
      { key: 'event', kind: 'Event', title: 'Goods receipt detected', summary: `${grn.id} posted at ${hhmm(grn.receivedAt)}: ${grn.qtyKg} kg of salmon fillet`,
        op: `Watch stream "Goods receipts", new row ${grn.id}`, path: ['GoodsReceipt'], relations: [],
        evidence: { type: 'doc', title: `${grn.id} (ERP receipts export)`, fields: [['Purchase order', po.id], ['Quantity received', `${grn.qtyKg} kg`], ['Supplier lot', grn.supplierLot], ['Received', `${grn.dock}, ${hhmm(grn.receivedAt)}`]], note: 'Row read from the ERP receipts export snapshot.' },
        rules: ['RCV-01'], outcome: 'Case SPV-0192 opened by the supervision scan. No one asked.', records: [grn.id] },
      { key: 'retrieve', kind: 'Retrieve', title: 'Purchase order and stock retrieved', summary: `${po.id}, ${supplier.id}, ${inv.id}`,
        op: `PurchaseOrder where po_id = ${po.id}, Inventory where ingredient_id = ${ing.id}`, path: ['GoodsReceipt', 'PurchaseOrder', 'Supplier', 'Inventory'], relations: ['r17', 'r15', 'r16', 'r19'],
        evidence: { type: 'records', rows: [[po.id, 'Purchase order', `${po.qtyKg} kg ${ing.name}, due ${hhmm(po.dueAt)}`], [supplier.id, 'Supplier', `${supplier.name}, cut-off ${supplier.orderCutoff}, same-day ${supplier.sameDayDelivery}`], [ing.id, 'Ingredient', ing.name], [inv.id, 'Inventory', `${inv.freeKg} kg free in ${inv.location}`]] },
        rules: [], outcome: 'Order line and free stock found.', records: [po.id, supplier.id, ing.id, inv.id] },
      { key: 'compare', kind: 'Compare', title: 'Receipt compared with the order', summary: `−${-diffKg} kg (−${-pct} %) against a ±${tolerance} % tolerance`,
        op: `GoodsReceipt.qty_kg − PurchaseOrder.qty_kg`, path: ['PurchaseOrder', 'GoodsReceipt'], relations: ['r17'],
        evidence: { type: 'qty', ordered: po.qtyKg, received: grn.qtyKg, diffKg, pct, tolerance },
        rules: ['RCV-01'], outcome: `Short by ${-diffKg} kg, beyond tolerance.`, records: [po.id, grn.id] },
      { key: 'traverse', kind: 'Traverse', title: 'Relationships traversed', summary: `${recipes.length} recipes, ${runs.length} runs, ${alloc.filter((x) => x.order).length} orders use ${ing.id}`,
        op: `Follow Ingredient → Recipe (incl. sub-recipes) → Production run → Customer order → Customer`, path: ['Ingredient', 'Recipe', 'ProductionRun', 'CustomerOrder', 'Customer'], relations: ['r7', 'r6', 'r20', 'r21', 'r22'],
        evidence: { type: 'hops', rows: [
          { from: 'Ingredient', rel: 'used in', to: 'Recipe', ids: recipes.map((x) => x.id), note: recipes.map((r) => `${r.id} ${kgPerUnit(r)} kg/unit`).join(', ') },
          { from: 'Recipe', rel: 'followed by', to: 'Production run', ids: runs.map((x) => x.r.id), note: shift.name },
          { from: 'Production run', rel: 'fulfils', to: 'Customer order', ids: runs.filter((x) => x.order).map((x) => x.order.id), note: `${runs.filter((x) => !x.order).length} run is store restock` },
          { from: 'Customer order', rel: 'placed by', to: 'Customer', ids: runs.filter((x) => x.customer).map((x) => x.customer.id), note: runs.filter((x) => x.customer).map((x) => x.customer.name).join(', ') },
        ] },
        rules: [], outcome: 'Only the night-shift runs that consume salmon fillet are in scope.', records: [...recipes.map((x) => x.id), ...runs.map((x) => x.r.id)] },
      { key: 'discrepancy', kind: 'Rule', title: 'Shortfall established', summary: `${required} kg needed, ${available} kg available: ${deficit} kg short`,
        op: `Σ run quantity × kg per unit vs free stock + received`, path: ['Inventory', 'ProductionRun'], relations: ['r18'],
        evidence: { type: 'balance', required, available, deficit, free: inv.freeKg, received: grn.qtyKg, runs },
        rules: ['PLN-01'], outcome: `The night shift is ${deficit} kg short. With the full 120 kg it would have ${round1(inv.freeKg + po.qtyKg - required)} kg spare.`, records: [inv.id] },
      { key: 'impact', kind: 'Impact', title: 'Impacted runs and orders identified', summary: `${atRisk.map((x) => x.order.id).join(', ')} at risk, ${deferred.length} restock run deferred`,
        op: `Allocate ${available} kg by delivery time, restock last`, path: ['ProductionRun', 'CustomerOrder', 'Customer'], relations: ['r21', 'r22'],
        evidence: { type: 'alloc', rows: alloc },
        rules: ['PLN-01'], outcome: `${atRisk.map((x) => `${x.order.id} (${x.customer.name}) can only get ${x.units} of ${x.r.quantity} units`).join('; ')}.`, records: alloc.map((x) => x.r.id) },
      { key: 'plan', kind: 'Plan', title: 'Resolution proposed', summary: `${actions.length} actions, ${changes.length} record changes, waiting for review`,
        op: 'Build changes from the shortfall; nothing is written until the operator approves', path: [], relations: [],
        evidence: { type: 'plan', actions }, rules: [], outcome: 'Plan ready for the purchasing lead. Changes stay proposed until approved.', records: [] },
    ];

    const nodes = [], edges = [];
    const node = (id, type, label, sub, col, state, group) => nodes.push({ id, type, label, sub, col, state, group });
    node(supplier.id, 'Supplier', supplier.id, supplier.name, 0, 'source');
    node(po.id, 'PurchaseOrder', po.id, `${po.qtyKg} kg ordered`, 1, 'source');
    node(grn.id, 'GoodsReceipt', grn.id, `${grn.qtyKg} kg received`, 2, 'changed');
    node(ing.id, 'Ingredient', ing.id, ing.name, 2, 'neutral');
    node(inv.id, 'Inventory', inv.id, `${inv.freeKg} kg free`, 2, 'neutral');
    alloc.forEach((x) => { if (!nodes.find((n) => n.id === x.recipe.id)) node(x.recipe.id, 'Recipe', x.recipe.id, `${x.kgu} kg/unit`, 3, 'neutral', x.r.id); });
    alloc.forEach((x) => node(x.r.id, 'ProductionRun', x.r.id, `${x.product.name}`, 4, x.status === 'Covered' ? 'ok' : 'affected', x.r.id));
    alloc.forEach((x) => { if (x.order) node(x.order.id, 'CustomerOrder', x.order.id, `${x.r.quantity} units, ${hhmm(x.order.deliveryAt)}`, 5, x.status === 'Covered' ? 'ok' : 'affected', x.r.id); });
    alloc.forEach((x) => { if (x.customer && !nodes.find((n) => n.id === x.customer.id)) node(x.customer.id, 'Customer', x.customer.id, x.customer.name, 6, x.status === 'Covered' ? 'neutral' : 'affected', x.r.id); });
    const edge = (from, to, label, state = 'normal') => edges.push({ from, to, label, state });
    edge(supplier.id, po.id, 'receives'); edge(po.id, grn.id, 'received as', 'changed'); edge(po.id, ing.id, 'orders');
    edge(grn.id, inv.id, 'adds to'); edge(ing.id, inv.id, 'stocked as');
    alloc.forEach((x) => edge(ing.id, x.recipe.id, 'used in'));
    alloc.forEach((x) => edges.push({ from: inv.id, to: x.r.id, label: 'allocates', state: x.status === 'Covered' ? 'normal' : 'missing', hidden: true }));
    alloc.forEach((x) => edge(x.recipe.id, x.r.id, 'followed by', x.status === 'Covered' ? 'normal' : 'missing'));
    alloc.forEach((x) => { if (x.order) { edge(x.r.id, x.order.id, 'fulfils', x.status === 'Covered' ? 'normal' : 'missing'); edge(x.order.id, x.customer.id, 'placed by'); } });

    return {
      id: 'SPV-0192', scenario: 'receipt', primary: false, severity: 'High', category: 'Supply',
      title: `Salmon receipt ${grn.qtyKg} kg against ${po.id} for ${po.qtyKg} kg`, short: `Salmon receipt ${-diffKg} kg under its purchase order`,
      stream: 'STR-GRN', eventId: 'EVT-2202', detectedAt: '2026-10-22T06:12:00', detectedBy: 'Supervision agent',
      trigger: `${grn.id} posted from ${grn.dock}`,
      headline: `${supplier.name} delivered ${grn.qtyKg} of ${po.qtyKg} kg. Tonight's runs need ${required} kg; ${available} kg is available.`,
      chips: [`${deficit} kg short tonight`, `${atRisk.length} order at risk`, `${deferred.length} run deferred`],
      deadline: `Supplier cut-off ${supplier.orderCutoff}`,
      path: ['PurchaseOrder', 'Supplier', 'Ingredient', 'GoodsReceipt', 'Inventory', 'Recipe', 'ProductionRun', 'CustomerOrder'],
      pathRelations: ['r15', 'r16', 'r17', 'r18', 'r19', 'r7', 'r6', 'r20', 'r21', 'r22'],
      steps, actions, changes, alloc, required, available, deficit,
      impact: { deficit, atRisk: atRisk.length, deferred: deferred.length, runs: runs.length, recordsVisited: steps[3].records.length },
      graph: { nodes, edges, focus: grn.id },
      records: { grn, po, supplier, ing, inv, runs: alloc },
    };
  }

  App.supervision = { allergenCase, receiptCase, build: (d) => [allergenCase(d), receiptCase(d)] };
})(window.App = window.App || {});
