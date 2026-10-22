/*
 * Runtime configuration.
 * mode: 'demo' → deterministic local services (js/services/demo-service.js)
 *       'live' → HTTP calls to the team backend (js/services/live-service.js)
 * Switch without editing: add ?mode=live&api=http://localhost:8000 to the URL.
 */
(function (App) {
  const params = new URLSearchParams(location.search);
  App.config = {
    mode: params.get('mode') || 'demo',
    apiBaseUrl: params.get('api') || 'http://localhost:8000',
    // Placeholders. Map them to the real backend contract (see README).
    endpoints: {
      getContext: 'GET /api/supervision/context',
      listCases: 'GET /api/supervision/cases',
      getCase: 'GET /api/supervision/cases/{caseId}',
      decide: 'POST /api/supervision/cases/{caseId}/decision',
      queryAnalytics: 'POST /api/analytics/query',
    },
    // Delay between trace steps when replaying an investigation (ms)
    stepDelayMs: 750,
  };
})(window.App = window.App || {});
