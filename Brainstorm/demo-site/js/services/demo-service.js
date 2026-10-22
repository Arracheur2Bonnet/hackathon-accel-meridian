/*
 * Demo service: deterministic local implementation of the service contract
 * (see js/services/api.js). No network calls. Cases come from the
 * supervision engine (js/supervision.js) run over data/demo-data.js.
 */
(function (App) {
  const D = () => window.DEMO_DATA;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  let cases = null;
  const built = () => cases || (cases = App.supervision.build(D()));
  let decisions = 0;

  // Demo clock: meta.now plus N minutes, as a local ISO string
  const demoTime = (min) => { const d = new Date(D().meta.now); d.setMinutes(d.getMinutes() + min); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`; };

  /** Every record in the dataset, keyed by id, with its entity type (for inspectors). */
  function recordIndex(d) {
    const idx = {};
    const put = (arr, entity, sourceOf) => arr.forEach((r) => { idx[r.id || r.code] = { entity, record: r, source: sourceOf ? sourceOf(r) : r.sourceId }; });
    put(d.suppliers, 'Supplier', () => 'SRC-ERP');
    put(d.supplierProducts, 'SupplierProduct');
    put(d.specVersions, 'SpecVersion', () => 'SRC-SPEC');
    put(d.ingredients, 'Ingredient');
    put(d.subRecipes, 'SubRecipe');
    put(d.recipes, 'Recipe');
    put(d.products, 'Product');
    put(d.productSheets, 'ProductSheet', () => 'SRC-PIM');
    put(d.ingredientLots, 'IngredientLot', () => 'SRC-STK');
    put(d.productionLots, 'ProductionLot', () => 'SRC-STK');
    put(d.purchaseOrders, 'PurchaseOrder', () => 'SRC-ERP');
    put(d.goodsReceipts, 'GoodsReceipt', () => 'SRC-ERP');
    put(d.inventory, 'Inventory', () => 'SRC-STK');
    put(d.orders, 'CustomerOrder', () => 'SRC-ERP');
    put(d.productionRuns, 'ProductionRun', () => 'SRC-PLAN');
    put(d.customers, 'Customer', () => 'SRC-ERP');
    put(d.allergens.map((a) => ({ ...a, id: a.code })), 'Allergen', () => 'Regulation');
    return idx;
  }

  /** Structured feedback record for one operator decision. */
  function feedbackRecord(c, p) {
    const accepted = p.decision === 'rejected' ? 0 : p.changeIds.length;
    const decision = p.decision === 'rejected' ? 'rejected' : accepted < c.changes.length ? 'partial' : 'approved';
    decisions += 1;
    return {
      caseId: c.id, at: demoTime(10 + decisions * 3), scenario: c.scenario, title: c.title,
      trigger: c.trigger, records: [...new Set(c.steps.flatMap((s) => s.records))].slice(0, 40),
      discrepancy: c.steps[4].summary, impacted: c.chips.join(', '), actions: c.actions.map((a) => a.title),
      decision, proposed: c.changes.length, accepted,
      acceptedChanges: p.decision === 'rejected' ? [] : p.changeIds, excludedChanges: c.changes.map((x) => x.id).filter((id) => p.decision === 'rejected' || !p.changeIds.includes(id)),
      reasonCode: p.reasonCode || null, reasonText: p.reasonText || '', operator: 'Ops manager (demo)',
      agentVersion: D().meta.agentVersion, ruleset: D().meta.rulesetVersion, live: true,
    };
  }

  const DemoService = {
    mode: 'demo',
    async getContext() {
      const d = D();
      return clone({ meta: d.meta, streams: d.streams, events: d.events, rules: d.rules, allergens: d.allergens, schema: d.schema, questions: d.operatorQuestions, sources: d.sources, customers: d.customers, seededAudit: d.seededAudit, records: recordIndex(d) });
    },
    async listCases() { return clone(built()); },

    /** Replays the detection and investigation of a case, one step at a time. */
    async detect(caseId, { onStep } = {}) {
      const c = built().find((x) => x.id === caseId);
      for (let i = 0; i < c.steps.length; i++) {
        if (onStep) onStep(i, 'running');
        await delay(App.config.stepDelayMs);
        if (onStep) onStep(i, 'done');
      }
      return clone(c);
    },

    async decide(caseId, payload) {
      await delay(300);
      return clone(feedbackRecord(built().find((x) => x.id === caseId), payload));
    },

    /** Deterministic keyword router. Not a language model. */
    async queryAnalytics(question) {
      await delay(350);
      const q = question.toLowerCase();
      const salmon = /spv-0192|salmon|saumon|receipt|grn|po-7731|shortfall/.test(q);
      const open = /\b(open|show)\b.*\b(spv-\d+|case|investigation)\b|^spv-\d+$/.test(q);
      if (open) {
        const id = (q.match(/spv-\d+/) || [salmon ? 'spv-0192' : 'spv-0193'])[0].toUpperCase();
        if (!built().some((c) => c.id === id)) return { kind: 'unsupported', text: `No case ${id} in this demo. Cases: ${built().map((c) => c.id).join(', ')}.` };
        return { kind: 'open', caseId: id };
      }
      if (salmon) return { kind: 'salmon', caseId: 'SPV-0192' };
      if (/lot|hold|units|dispatch/.test(q)) return { kind: 'lots', caseId: 'SPV-0193' };
      if (/sheet|customer|exposure|sesame|allergen/.test(q)) return { kind: 'sheets', caseId: 'SPV-0193' };
      return { kind: 'unsupported', text: 'This demo assistant answers a fixed set of questions about SPV-0193 and SPV-0192. Try one of the suggestions below.' };
    },

    loadEvaluation() { try { return JSON.parse(localStorage.getItem('meridian-eval') || '{}'); } catch (e) { return {}; } },
    saveEvaluation(obj) { try { localStorage.setItem('meridian-eval', JSON.stringify(obj)); } catch (e) { /* storage unavailable */ } },

    async reset() { decisions = 0; },
  };

  App.DemoService = DemoService;
})(window.App = window.App || {});
