# Adding an experiment

The display can grow by installing modules. Mathematical capability, valid knowledge transfer and self-improvement must be demonstrated separately.

## Host interface, version 1

Load the module’s engine and interface scripts in `dist/index.html`, after `lab.js`, and register:

```js
window.OrchardLab.register({
  id: 'experiment-id',
  title: '02 · Experiment title',
  version: '0.1.0',
  contractVersion: 1,
  mount({ container, contractVersion }) {
    // Own all state and listeners within this container.
    return {
      dispose() { /* remove listeners and optional page tools */ },
      snapshot() { /* return a JSON-compatible description */ }
    };
  },
  run({ protocol, previous }) {
    // Validate the input protocol and any deliberately consumed artifact.
    return {
      protocol: 'orchard-lab/1',
      experiment: 'experiment-id',
      passed: true,
      summary: 'A precise, bounded result with units and conditions.'
    };
  }
});
```

The host offers selection with `open(id)`, installed-module metadata with `list()`, current state with `snapshot()`, and an ordered run with `runSequence(ids)`. The visible runner uses registration order. It stops after a reported failed stage, checks result identity and protocol, and passes deeply frozen, JSON-compatible prior results to the next stage.

Version 0.5 installs coupled repair, qualified inheritance, constructive enquiry, acquired expression and bounded meta-extensibility. The first runs its repair fixture and acquires a construction method on a separate source internal-view witness. It emits `constructionArtifact` containing a scoped, versioned policy, structural binding, qualification and replayable acquisition record. The second validates this artifact and consumes its policy after a clean bootstrap and current load grant. First-stage observations, receiving labels, grants and receipts do not enter the child. A standalone run of stage two creates its own declared source fixture; it reports `previousConsumed: false`.

Stage three checks the preceding inheritance result’s protocol, identity, passed flag, unchanged authority and absence of evidence transfer. It reports `transfer: 'milestone-provenance-only'` and `constructionTransfer: 'none'`. Its n=4/c=2 AND/XOR model has a different scope from the five-bit rule constructor; the enquiry compiler is supplied separately. No automatic mathematical adapter or learned compiler transfer is claimed. Standalone stage three uses its own declared fixture and reports no previous consumption.

Diagnostic observations are query/answer/source-version records. Source-version mixing is rejected. The policy receives only channel responses, supplied descriptors and operational metadata. Hidden actual mode and required set remain in environment response generation and separate scoring. Qualified tree replay concerns represented worlds. Runtime watches continue through the entire deadline window after a hold; development checking is outside that simulated window. No physical scheduler is implemented.

Stage three now emits `auditedGap`, a versioned `orchard-audited-gap/1` witness containing an n=4/c=2 query history, old-library proposal and supplied exact-set audit. Stage four rejects a preceding envelope without a valid contradictory gap. It reports `transfer: 'audited-calibration-gap'`, `evidenceTransfer: 'initiating-audit-only'` and `runtimeEvidenceTransfer: 'none'`. The initiating audit contributes to calibration, not to held-out diagnosis.

Stage four selects a typed predicate from a supplied finite grammar, validates its finite semantic measurements and emits `expressionArtifact`. The artifact stores the selected program, calibration/validation evidence, grammar and certificate with an exact serialized binding. Import/restore replays selection and validation; it cannot grant authority. This is honest-host structural checking, not a signature or source authentication. Its fresh-dimension census is empirical testing beyond validation, not proof of arbitrary descriptor transfer. Its grammar, interpreter, selector and compiler remain unchanged.

Stage five requires stage four’s `expressionArtifact`, replays its qualification and reports `transfer: qualified-response-expression`, `evidenceTransfer: qualification-replay-only` and `runtimeEvidenceTransfer: none`. Separate supplied A/B measurements teach the recipe and later repair. It emits a frozen `orchard-generator-artifact/1` with append-only 26→47 contract, source witness, source validation, preserved-denotation counts and exact binding. Restoring replays method acquisition; later `orchard-composite-artifact/1` replay checks its own evidence, validation and admitted syntax. Permission is never imported or acquired.

The expression runtime accepts an optional trusted developer-installed semantic dialect. All original calls default to the unchanged 26-program evaluator. The bounded composite decoder adds supplied Boolean interpretation, accepts only generated one-join/two-equality ASTs and is part of the installed foundation. Acquiring a recipe expands operative construction reachability; it does not invent decoder meanings. Its plan cache keys include dialect identity. Constructor removal leaves a previously retained expression intact; a fresh B acquisition clears that controlled instance’s previous B expression before comparing reachability. Teaching and validation records carry matching task-contract IDs. A retained A repair cannot count as filling B’s contract. The known unfilled B-model contract gates new-task admission independently of hidden K; these IDs are scoped bindings, not source authentication.

Stage-five envelopes separately report `operativeGrammarExpanded: true`, `metaGrammarExpanded: false`, `interpreterMeaningsChanged: false`, `metaSelectorChanged: false` and `authorityExpanded: false`. Neither the host registry nor higher meta-selector self-modifies.

The generic sequence runner does not verify mathematics. The second module implements its own source replay, exact captured-basis check and receiving-effect qualification. Modules are trusted developer-installed JavaScript, not untrusted plugins in a security sandbox. Binding assumes an honest local host.

Receiving comparison inputs supply fresh grants explicitly. Live module-two permission starts false. Failed acquisition attempts consume rounds, and final capture qualification contributes to receiving qualifier counters. Source acquisition and import replay are separate common costs. Counters are not a complete compute or elapsed-time model.

Register extra term entries with `OrchardGuidance.registerDefinitions(entries)`. IDs and aliases must be new; each entry supplies a title, plain-English definition, mathematical definition/status and valid source-page references. Call `annotate(container)` after rendering.

## Every module needs a scientific contract

Specify these before implementation:

1. **Question and support:** what required answer or action is being judged, on which concrete domain.
2. **Observations:** source identity, context, duplicate handling, provenance and currentness. Keep hidden truth and scoring separate from policy input.
3. **Representation:** retained carrier, receiving view, meanings, fibres and available expression or construction language.
4. **Candidate effects:** exactly what may change and what the candidate cannot rewrite.
5. **Qualification:** reference semantics, invariant, preservation obligations and supplied premises. Record what the checker does not establish.
6. **Receiving authority:** who grants use, current binding, release conditions and continuing duties.
7. **Resource accounting:** charged work including failed construction and checking. Separate rounds, candidate counts, logical costs and elapsed time.
8. **Comparison:** matched baseline, removal/restoration controls, held-out tasks and evidence of actual improvement.
9. **Transfer:** typed artifact, qualified scope, exact version and dependencies; receiving context must requalify its use. A previous result does not silently transfer truth, duty fulfilment or grants.
10. **Boundary probes:** internal inconsistency, ambiguity, inaccessible distinctions, stale use, withdrawn permission and actual-world coverage failure.

## Suggested incremental milestones

| Milestone | Next capability to demonstrate | Required comparison |
|---|---|---|
| 1 · coupled repair | Fixed evidence can support a better receiving decision after two qualified effects | Rule alone, view alone, both; unchanged worlds and authority |
| 2 · inherited construction | An acquired method contributes to later repair in a fresh context | Intact, removed, restored, freshly reconstructed, conventional baseline; report rounds and costs separately |
| 3 · constructive enquiry | An action disagreement generates an additional diagnostic test | Enquiry enabled/removed, query costs, correct/incorrect/withheld outcomes |
| 4 · acquired expression | Trusted failure evidence supports a missing expression in a supplied grammar | Fixed library, extension, restored expression, held-out validation and off-grammar failures |
| 5 · meta-extensibility | A change to construction language or machinery satisfies a newly stated contract | Fixed constructor versus revised constructor; stable interpretation and qualification boundary |
| 6 · relative development | Alignment development outpaces specified other capability development | Defined units, matched resource envelopes, held-out tasks, uncertainty and non-regression |

Stage five is implemented as a bounded toy under a fixed meta-grammar and supplied meanings. Broader self-extensibility and the final relative-rate row remain research targets. No result here establishes rate dominance. Before claiming “alignment learns faster,” agree on what alignment development and other capability development mean, on a common resource measure, and on a falsifiable success criterion. More recursion alone does not establish rate dominance.

## Presentation rules

Keep working controls and graphical outcomes prominent. Provide a gentle route through the model and test. Define technical terms in plain English and mathematics, with exact source pages and an explicit implemented/research status. Use computed numerical values, labelled axes, boundary floors/ceilings and counterexample traces. Preserve keyboard access, narrow-screen usability, large-text layout, and offline operation.

Later modules can consume qualified construction artifacts after their transfer contracts are implemented. Do not flatten their distinct models into one universal score or treat a passed fixture as proof of general safety.


## Stage six and the welcome route

`resource-comparison` accepts a passed stage-five envelope only under `orchard-lab/1`, with no authority expansion, and actually replays its generator artifact. It reports a declared resource comparison, not relative-rate dominance. Runtime evidence and grants are not imported. Its output is frozen by the same sequence contract.

The welcome page is a host route, not a seventh experiment. `#home` displays it; each registered experiment has its own hash route. Leaving a module disposes its listeners and optional tools. Welcome sequence execution uses all six registered experiment IDs without changing live controls. Definitions register before the front-page DOM initialization.

The downloadable Python scripts use native reference implementations. Their artifacts support local Python replay; they do not claim serialized interchange with JavaScript bindings. Preserve numerical parity checks when changing either implementation.
