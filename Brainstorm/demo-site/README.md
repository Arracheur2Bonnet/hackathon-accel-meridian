# Meridian Supervision: hackathon demo frontend

Meridian Supervision is a proactive supervision agent that runs over a semantic business schema, built for a fresh-food operator (Kumo, illustrative). The agent:

1. watches incoming events,
2. retrieves the exact records it needs through the schema,
3. compares them with stored records and business rules,
4. traces the downstream impact,
5. proposes a plan that an operator approves or rejects.

Every decision is stored as a structured feedback signal.

It is plain HTML, CSS and JavaScript. There is no build step, no dependencies and no backend. All data is synthetic.

## Run it

```bash
cd "H:\Downloads\Hackhaton Accel\Brainstorm\demo-site"
python -m http.server 8765
```

Open http://localhost:8765. For recording, use a 1920×1080 window at 100 % zoom. **Reset demo** (bottom of the sidebar) restores the initial state without reloading.

## The two cases

| Case | Event | Why it matters |
|---|---|---|
| **SPV-0193** (primary) | Supplier spec `SP-TER-05` v3 (teriyaki glaze) adds **sesame**. The case appears when you press *Deliver SP-TER-05_v3.pdf* on the Supervision page. | Food safety. The impact sits four relationships away from the event: 4 products, 10 product sheets, and 3 lots (446 units) that dispatch at 11:00. |
| **SPV-0192** (second) | Goods receipt `GRN-5512`: 80 kg received against `PO-7731` for 120 kg. | Supply. Tonight's runs are 19 kg short; `ORD-2481` is at risk. |

**Why B is the primary case.**
- The notes' business model already lists *Allergène*, *Lot* and *Recette*. Their stated value includes fewer health risks, and one of the planned agents is *traçabilité et rappel de lot*.
- The sesame case shows schema traversal best: no single file contains the answer.

**Why the salmon case is detected from the ERP receipt rather than the supplier email.** A receipt compared with its PO line is a pure record-to-record check through the schema. An email would make the agent look like a model reading a document.

## Three-minute recording script

| Time | Screen | Do |
|---|---|---|
| 0:00 | Supervision | Show the event stream (matches, no-impact, escalated) and the supervised streams. |
| 0:15 | Supervision | Press *Deliver SP-TER-05_v3.pdf*. The agent opens SPV-0193 by itself, with no request, and the trace runs live in the lead card. |
| 0:35 | Investigations | Step 3 shows the v2 → v3 diff. Step 4 shows the traversal (schema path and hop counts). Step 5 shows the **allergen matrix**. Step 6 shows lots, including the old-lot lot that is correctly *not* affected. |
| 1:20 | Ontology | *Trace the sesame impact* highlights the 19 records to review. The *Business schema* tab with *Replay the agent's traversal* shows the path through the ER schema. |
| 1:50 | Action plans | Show the matrix preview and change preview. Untick one sheet, add a reason, then **Approve**. The matrix fills in green. |
| 2:20 | Audit and feedback | Show the decision with its feedback signal (JSON) and the three-tier capability panel. |
| 2:40 | Ops Analyst | Ask "Which product sheets need correcting, by customer?". |

## What is real in this prototype, and what is simulated

| Item | Status |
|---|---|
| Traversal and impact | **Computed.** `js/supervision.js` walks the demo records along `schema.relations`. Products, sheets, lots, changes and graphs are derived, not typed in. |
| Detection | **Simulated.** A demo control delivers the event. The "scan every 15 min" is a label, and there is no live connector. Sources are snapshot files. |
| Agent | **Deterministic engine, no language model.** The trace shows operations, records and rules, never model reasoning. PDF fields are pre-extracted. |
| Approval | **Recorded in browser memory only.** Nothing is written to the ERP, PIM or supplier systems. |
| Feedback | The decision log and its JSON export **work**. The rates are computed from the log. Learning from feedback (an RLHF-like loop) is **not built**. |
| Evaluation | A scaffold only: method, expected answer derived from the dataset, and hand-entered results stored in the browser. **No benchmark has been run**, and no Claude Cowork figures exist. |
| Seeded history | SPV-0181, 0185 and 0187 are invented past decisions, labelled *Seeded history*. |

## Files

```
index.html               shell + icon sprite
styles.css               tokens, shell, home, investigation
components.css           allergen matrix, plan, ontology, audit, evaluation, analyst, responsive
data/demo-data.js        SYNTHETIC dataset for both cases + ER schema + operator questions
js/supervision.js        engine: event → trace steps, diff, traversal, impact, changes, actions, graph
js/graph.js              case lineage graph + ER diagram (SVG)
js/charts.js             analyst charts
js/views.js              screens (pure render functions)
js/app.js                state, detection replay, decisions, exports, reset
js/services/*.js         service boundary: demo (local) / live (HTTP, not connected)
```

## Design notes

The structure follows the team's first reference (stonksinho/hackathon-accel): a sidebar of applications, an app bar, dense records and a schema view.
The graphic charter follows the second reference (Arracheur2Bonnet/Borderless, `design/`), and the `frontend-design` skill was used to critique the result (installed in `Brainstorm/.claude/skills/frontend-design`).

- **Paper and ink, one accent.** Paper `#f6f5f1`, ink `#16171a`, and ultramarine `#2741d4` only for actions, links, focus and the agent's current step.
- **Meaning colours only for meaning.** Green means done, amber needs attention, red is a food-safety risk. Each is always shown with an icon and a word, never as a filled badge.
- **Hairlines instead of boxes.** A card appears only where a decision is needed: the lead case, the decision bar, the trace detail and the matrix.
- **Type carries the hierarchy.** Inter, body 16/24, titles semibold at −0.022em, sentence case. Uppercase is used only for tiny labels. Mono is reserved for identifiers and raw source fields.
- **Less on screen.** The home shows one decision card and today's events; the supervised streams sit in a disclosure. The trace rail shows one summary at a time. Plan actions show a count of records rather than a wall of IDs.
- **One signature element and one motion.** The element is the EU 1169/2011 Annex II allergen matrix. The motion is the detection and trace sequence.

## Connecting the real backend

Views only call `App.api`. To switch to the backend, open `?mode=live&api=<url>`, then map the endpoints in `js/config.js` and response shapes in `js/services/live-service.js`. A backend error is shown as an error; there is no fallback to demo data.

**Case contract.** A backend case should match what `js/supervision.js` returns:

```
{ id, scenario, severity, category, title, headline, chips[], deadline, detectedAt, stream, trigger,
  steps[{ key, kind, title, summary, op, path[entity], relations[relId], records[id],
          evidence{type,...}, rules[ruleId], outcome }],
  impact{...}, actions[{ id, priority, title, why, owner, due, finding, evidence[], rule }],
  changes[{ id, entity, recordId, field, before[], after[], actionId, source }],
  graph{ nodes[{ id, type, label, sub, col, state }], edges[{ from, to, label, state }] } }
```

Alternatively, the backend can return raw records in the `demo-data.js` shape and keep `supervision.js` client-side.

**Where the reference server API fits** (`build-package/04-api.md`):

| Supervision operation | Reference endpoint |
|---|---|
| Records | `objects/query`, `objects/:type/:pk` |
| Schema | `GET workspace` (object and link types), `semantics` |
| Approving a change | `actions/:apiName/run` with `dryRun` for the preview, then apply |
| Agent progress | agent sessions and SSE events |

None of this is wired yet.
