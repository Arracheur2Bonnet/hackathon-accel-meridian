/*
 * Service boundary. Views and the controller call App.api only.
 *
 * Contract (async unless noted):
 *   getContext()              → { meta, streams, events, rules, allergens, schema, questions, sources, customers, seededAudit, records }
 *   listCases()               → Case[]  (shape produced by js/supervision.js; see README "Case contract")
 *   detect(caseId,{onStep})   → Case    (onStep(index, 'running'|'done') as each trace step completes)
 *   decide(caseId, payload)   → FeedbackRecord  payload: { decision: 'approve'|'rejected', changeIds[], reasonCode?, reasonText? }
 *   queryAnalytics(question)  → { kind: 'open'|'sheets'|'lots'|'salmon'|'unsupported', caseId?, text? }
 *   loadEvaluation() / saveEvaluation(obj)   (sync; browser storage, evaluation scaffold only)
 *   reset()                   → clears local state (demo only)
 */
(function (App) {
  App.api = App.config.mode === 'live' ? App.LiveService : App.DemoService;
})(window.App = window.App || {});
