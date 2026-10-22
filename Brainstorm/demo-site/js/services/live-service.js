/*
 * Live service: HTTP adapter for the team backend.
 * NOT CONNECTED YET — endpoint paths in js/config.js are placeholders.
 * Each method must return the same shape as DemoService; map backend
 * responses here (adapt.*), never in the views. Errors are thrown to the
 * UI; there is no silent fallback to demo data.
 *
 * The team's server contract (stonksinho/hackathon-accel,
 * build-package/04-api.md) offers objects/query, objects/:type/:pk,
 * actions/:apiName/run (dryRun) and agent sessions with approvals; the
 * mapping notes in README.md show where each supervision operation fits.
 */
(function (App) {
  async function call(name, params = {}, body) {
    const spec = App.config.endpoints[name];
    if (!spec) throw new Error(`No endpoint configured for ${name}`);
    let [method, path] = spec.split(' ');
    path = path.replace(/\{(\w+)\}/g, (_, k) => encodeURIComponent(params[k]));
    const res = await fetch(App.config.apiBaseUrl + path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) throw new Error(`${method} ${path} failed: HTTP ${res.status}`);
    return res.json();
  }
  const adapt = { context: (r) => r, cases: (r) => r, decision: (r) => r, analytics: (r) => r };

  App.LiveService = {
    mode: 'live',
    async getContext() { return adapt.context(await call('getContext')); },
    async listCases() { return adapt.cases(await call('listCases')); },
    async detect(caseId, { onStep } = {}) {
      // Backend runs the investigation; replace with SSE/polling if the API streams steps.
      const c = (await call('getCase', { caseId }));
      (c.steps || []).forEach((s, i) => { onStep && onStep(i, 'running'); onStep && onStep(i, 'done'); });
      return c;
    },
    async decide(caseId, payload) { return adapt.decision(await call('decide', { caseId }, payload)); },
    async queryAnalytics(question) { return adapt.analytics(await call('queryAnalytics', {}, { question })); },
    loadEvaluation() { return App.DemoService.loadEvaluation(); },
    saveEvaluation(o) { return App.DemoService.saveEvaluation(o); },
    async reset() {},
  };
})(window.App = window.App || {});
