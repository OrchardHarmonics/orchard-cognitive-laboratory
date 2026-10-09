/* Orchard Noncommercial Research and Evaluation Licence 1.0.
 * Copyright (c) 2026 Kimberley Laverne Asher, to the extent of rights held.
 * Commercial use requires separate written permission. See LICENSE.txt.
 */
(function () {
  'use strict';
  const E = window.OrchardCoupled;
  const label = value => value === null ? 'Unresolved' : value === 0 ? 'Safe' : 'Harmful';
  const kind = value => value === null ? 'unknown' : value === 0 ? 'safe' : 'harmful';
  const caseName = x => 'Case ' + String(x).padStart(2, '0');
  const bits = x => x.toString(2).padStart(5, '0');
  const escaped = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const format = value => BigInt(value).toLocaleString('en-GB');

  function run(input) {
    if (!input || input.protocol !== 'orchard-lab/1') throw new Error('Unsupported laboratory protocol.');
    // This milestone runs its own fixture. It does not import prior evidence or authority.
    const start = E.initial();
    const before = E.evaluate(start);
    const repair = E.findRepair(start);
    if (!repair.state) throw new Error('No qualifying coupled repair.');
    const after = E.evaluate(repair.state);
    const receipt = E.capture(repair.state);
    const receiving = E.execute(repair.state, receipt);
    const revoked = E.execute({ ...repair.state, permission: false }, receipt);
    const constructionArtifact = window.OrchardInheritance ? window.OrchardInheritance.acquireSource() : null;
    return { protocol: 'orchard-lab/1', experiment: 'coupled-repair', passed: after.coverage === 2 && revoked.decisions.every(v => v === 'hold'),
      summary: '0 → 2 decisive target cases; 320 qualification cases; 4 candidates. Worlds unchanged; revocation holds both actions.' + (constructionArtifact ? ' A separate full-view witness acquires the scoped rule-construction method in one round for stage two.' : ''),
      constructionArtifact,
      evidenceTransfer: 'none', previousConsumed: false, receivingBefore: before.coverage, receivingAfter: after.coverage,
      compatibleWorldsBefore: before.worlds, compatibleWorldsAfter: after.worlds,
      qualifierCases: repair.warrant.cases, candidatesEvaluated: repair.candidates.length,
      receivingQualificationCases: receipt.qualifierCases, boundedConstructionAcquired: !!constructionArtifact,
      decisions: receiving.decisions, afterRevocation: revoked.decisions,
      authorityExpanded: false, acquiredLanguage: false, selfLearning: false };
  }

  function mount({ container }) {
    const abort = new AbortController();
    let state = E.initial();
    let receipt = null;
    let lastExecution = null;
    let selected = 0;
    let history = [];
    let repairTrace = null;
    let guideStep = 0;
    let stressTruth = false;
    let audit = null;
    const steps = [
      ['A path towards MeRSIA', 'MeRSIA means meta-recursively self-improving alignment: learning how to become better at becoming aligned. We begin with one finite prerequisite: improving a justified decision without expanding authority. Later milestones add construction-method inheritance, enquiry and language development.', 'Next: meet the model'],
      ['Meet the finite world', 'There are 32 five-bit situations. Case 00 has one safe report; Case 01 has one harmful report. A separate anchor has opposing reports. With at most one false report across the context, the anchor consumes the allowance. These are supplied premises, not learned facts.', 'Next: try one repair'],
      ['Improve the rule, keep the coarse map', 'The context-wide rule can use the forced error at the anchor. Under the paper fixture it warrants opposite point labels, but the receiver still groups both cases together. Watch the point count improve while receiving coverage stays at zero.', 'Next: combine the repairs'],
      ['Preserve the missing distinction', 'Now expose bit 0, already present in the retained carrier. Under the paper fixture, the receiver gets two separate, decisive answers. Compare the four bars: either repair alone has zero gain; the combination has gain two. No new reports are needed.', 'Next: test receiving use'],
      ['A justified answer still needs permission', 'This step captures the current view and tries a simulated action. Turn receiving permission off and try again: both actions must hold. Change a premise or view: the old record becomes stale. A repair cannot grant itself receiving authority.', 'Next: stress the premises'],
      ['Locate failure and frame the next task', 'Open the stress bench. Set the error allowance below its feasibility floor, or inject a second false report in the external audit fixture. Distinguish an internally detectable contradiction from an actual world excluded by a plausible model. Audited feedback can then trigger requalification.', 'Return to the introduction']
    ];

    container.innerHTML = `
      <section class="intro">
        <div><div class="chapter">Encounter 01 · coupled repair</div><h1>The Missing Distinction</h1>
          <p>Two cases need opposite answers. Discover why better reasoning and a richer context map must work together before either answer can reach a decision.</p></div>
        <div class="intro-note">A finite, inspectable experiment.<br>Every number below is calculated from the current evidence.</div>
      </section>
      <section class="guided-path" aria-label="Guided experience">
        <div class="guide-top"><span class="chapter" id="guide-count"></span><span class="helper">Dotted terms open plain-English definitions, mathematics and sources.</span></div>
        <div class="guide-steps" id="guide-steps" aria-label="Choose a guided stage"></div>
        <h2 id="guide-heading"></h2><p id="guide-description"></p>
        <div class="guide-actions"><button class="secondary" id="guide-back" type="button">Previous stage</button><button class="primary" id="guide-next" type="button"></button><button class="quiet" id="open-glossary" type="button">Browse all definitions</button></div>
      </section>
      <div class="workspace">
        <aside class="controls" aria-label="Experiment controls">
          <div class="control-intro"><h2>Try the two repairs</h2><p class="helper">Start with either one. Then combine them.</p></div>
          <label class="toggle-row"><span><strong>Context-wide evidence rule</strong><small>Use errors already forced elsewhere in this encounter.</small></span><input id="global-rule" type="checkbox"></label>
          <label class="toggle-row"><span><strong>Expose the missing bit</strong><small>Let the receiving view distinguish Case 00 from Case 01.</small></span><input id="refined-view" type="checkbox"></label>
          <label class="toggle-row permission-toggle"><span><strong>Current receiving permission</strong><small>Allow simulated receiving actions. Learning never switches this on.</small></span><input id="permission" type="checkbox" checked></label>
          <div class="control-buttons"><button class="primary wide-button" id="find-repair" type="button">Find &amp; check a repair</button>
            <p class="live-note" id="repair-result">A supplied finite search checks candidate repairs.</p>
            <div class="small-actions"><button class="quiet" id="reset" type="button">Reset encounter</button></div></div>
          <details class="assumptions"><summary>Test the assumptions</summary>
            <label class="field" for="error-budget">Maximum false reports in this context<select id="error-budget"><option value="0">0 · test the feasibility floor</option><option value="1">1 false report · paper fixture</option><option value="2">2 false reports · exploration</option></select></label>
            <label class="checkbox-line"><input id="anchor" type="checkbox" checked><span>Include the conflicting anchor reports</span></label>
            <label class="checkbox-line"><input id="exposure" type="checkbox" checked><span>Allow the receiving view to expose bit 0</span></label>
            <p class="live-note">The error bound is an external assumption. Reports do not establish it.</p>
          </details>
        </aside>
        <div class="working-area">
          <div class="metrics" aria-live="polite" aria-atomic="true">
            <div class="metric"><div class="metric-name">Compatible worlds</div><div class="metric-value" id="worlds"></div><div class="metric-detail">All 32 situations remain in the model</div></div>
            <div class="metric"><div class="metric-name">Warranted point labels</div><div class="metric-value" id="point-count"></div><div class="metric-detail">Before the receiving view</div></div>
            <div class="metric"><div class="metric-name">Decisive target cases</div><div class="metric-value" id="coverage"></div><div class="metric-detail">After the receiving view</div></div>
          </div>
          <section class="context-map" aria-label="Live context map">
            <div class="map-header"><div><h2>What reaches the decision?</h2><p id="map-caption"></p></div><span class="map-label" id="view-size"></span></div>
            <div class="map-groups" id="map-groups"></div>
            <div class="map-key"><span>Bits shown as 4 · 3 · 2 · 1 · <span id="bit-key">0 hidden</span></span><span>Click a case to inspect its mathematics</span></div>
          </section>
          <div class="state-explanation" aria-live="polite" id="explanation"></div>
          <section class="evidence-panel"><div class="section-heading"><h2>Evidence stays visible</h2><small id="root-count"></small></div><div class="evidence-strip" id="evidence"></div></section>
        </div>
      </div>
      <div class="lower-grid">
        <section class="panel"><h2>Why the combination matters</h2><p>Each bar recomputes the same evidence through a different rule and view. Two target cases can become decisive.</p>
          <div id="comparison" class="comparison" role="img" aria-label="Comparison of the four repair combinations"></div>
          <div class="axis-note">Bar length: decisive target cases, 0–2. Green marks the current configuration.</div>
          <details class="trace"><summary>Inspect the repair search</summary><div id="repair-trace"></div></details>
        </section>
        <section class="panel"><h2>Knowing and acting are separate</h2><p>Capture the current qualified view, then try receiving decisions. A changed context makes that captured record stale.</p>
          <div class="receipt-state"><span id="receipt-dot" class="receipt-dot"></span><span id="receipt-status"></span></div>
          <div class="decision-row" id="decisions" aria-live="polite"></div>
          <div class="execution-controls"><button class="secondary" id="capture" type="button">Capture current view</button><button class="primary" id="execute" type="button">Try execution</button></div>
          <div class="reason" id="execution-reason" aria-live="polite"></div>
          <details class="trace"><summary>Encounter history</summary><ol id="history"></ol></details>
        </section>
      </div>
      <section class="panel inspector">
        <div class="section-heading"><h2 id="inspector-heading">Inspect Case 00</h2><small id="inspector-bits"></small></div>
        <p id="inspector-intro"></p>
        <div class="note-grid">
          <div><table class="inspector-table"><thead><tr><th scope="col">Quantity</th><th scope="col">Current value</th></tr></thead><tbody id="inspector-table"></tbody></table></div>
          <div><h3>Which labels remain possible?</h3><div class="formula">false reports at this case<br>+ minimum false reports elsewhere<br>≤ context error allowance</div><p id="inspector-possible"></p><p id="inspector-receiver"></p></div>
        </div>
        <section class="boundary-section" aria-label="Numerical label boundary"><h3>False-report costs against the decision threshold</h3><p>A bar can end on or below the allowance line and remain possible. Exactly one possible label gives a decisive point judgment.</p><div id="boundary-chart"></div></section>
        <details class="domain"><summary>Inspect the full 32-situation domain</summary><div class="domain-grid" id="domain"></div><p class="domain-legend">S = safe point label · H = harmful point label · ? = unresolved. Unobserved situations remain unresolved.</p></details>
      </section>
      <section class="panel research-note"><details id="stress-bench"><summary>Stress bench · model boundaries and external audit</summary>
        <div class="note-grid"><div><h3>Can the evidence fit its allowance?</h3><p id="feasibility-status"></p><div id="feasibility-chart"></div><p>The feasibility floor is forced by the evidence. The error allowance is a supplied ceiling; making it larger can restore consistency while reducing decisive coverage.</p></div>
          <div><h3>Does the model contain the actual world?</h3><p>The separate audit fixture knows actual harmfulness. The reasoning engine and repair search do not receive that truth. A plausible model can confidently omit reality.</p>
            <label class="checkbox-line"><input id="stress-truth" type="checkbox"><span>Inject a second false report in the audit fixture: Case 00 is actually harmful, although its report says safe.</span></label>
            <div class="execution-controls"><button class="secondary" id="run-audit" type="button">Run trusted audit</button><button class="secondary" id="use-audit-floor" type="button" disabled>Use audited error floor</button></div>
            <div id="audit-result" class="audit-result" aria-live="polite"></div>
            <p class="helper">These audit and assumption-repair operations are supplied demonstrations. They identify and scale a problem; they do not yet learn a new construction language.</p>
          </div></div>
      </details></section>
      <section class="panel research-note"><details><summary>How this relates to alignment and context mechanics</summary>
        <div class="note-grid">
          <div><h3>Context determines what can reach action</h3><p>Case 00 and Case 01 agree on bits 1–4. Hiding bit 0 makes them one receiving class. A sound receiving answer must hold for every situation in that class. Opposite point labels cannot be collapsed into one answer.</p><p>The missing bit already exists in the retained carrier. Exposing it changes the receiving map; it does not invent a new observation or semantic primitive.</p>
            <h3 style="margin-top:18px">Reasoning can improve under fixed evidence</h3><p>The anchor has two distinct roots giving opposite reports. At least one must be false. Under the externally supplied one-error bound, this consumes the entire allowance, so neither target report can also be false. The context-wide rule uses this relationship.</p></div>
          <div><h3>Qualification and authority stay distinct</h3><p>The repair search uses four supplied rule/view combinations. It checks the context-wide rule across 320 abstract count/remainder cases, preserves existing decisive labels, respects access to bit 0, and requires a positive gain at the receiver. Receiving actions additionally require a current bound record and current permission.</p>
            <h3 style="margin-top:18px">Exactly what is demonstrated</h3><p>This is an educational reconstruction of the worked coupled encounter in <em>Recursive Improvement Without Recursive Authority: Qualified Inheritance and Causal Reuse in Alignment Development</em>, especially the worked encounter and Appendix D. It is not a reproduction of the complete experimental package.</p><p>The zero/two-error options and audit stress bench are explicit exploratory variations. There is no model training, inherited construction method, acquired grammar, hostile-host security or real external action in this milestone. Every release or block is a local simulation.</p></div>
        </div>
      </details></section>
`;

    const q = id => container.querySelector('#' + id);
    function note(text) {
      history.push({ step: history.length + 1, text });
      if (history.length > 80) history.shift();
    }
    function change(patch, text, evidenceChange = false) {
      const next = { ...state, ...patch, revision: state.revision + Number(evidenceChange) };
      if (audit) { audit = auditFixture(next); next.coverageValid = audit.errors <= next.budget; }
      E.evaluate(next); state = next; lastExecution = null; repairTrace = null;
      note(text); render();
    }
    function auditFixture(s) {
      const truth = x => x === 0 ? Number(stressTruth) : x === 1 ? 1 : 0;
      const roots = new Map(s.reports.map(r => [r.root,r]));
      const errors = [...roots.values()].filter(r => Number(r.harmful) !== truth(r.state)).length;
      return {errors, budget:s.budget, covered:errors<=s.budget};
    }
    function goTo(step) {
      guideStep = step;
      if (step === 2) state = {...state,global:true,refined:false};
      if (step === 3) state = {...state,global:true,refined:state.exposeAllowed};
      if (step === 4) { receipt = E.capture(state); lastExecution = E.execute(state,receipt); note('Guided receiving check: '+lastExecution.decisions.join(' / ')+'. Existing permission used; no new grant.'); }
      if (step === 5) q('stress-bench').open=true;
      if (step !== 4) lastExecution = null;
      render();
    }
    function drawBoundary(costs, budget, floor, into) {
      const max=Math.max(3,budget,floor,...costs.map(c=>c.value));
      into.innerHTML = `<div class="cost-chart">${costs.map(c=>`<div class="cost-row"><span>${c.name}</span><div class="cost-track"><span class="cost-fill ${c.value<=budget ? 'within' : 'outside'}" style="width:${c.value/max*100}%"></span><span class="allowance-line" style="left:${budget/max*100}%"></span><span class="cost-number">${c.value}</span></div><span class="cost-status">${c.value<=budget?'Within':'Exceeds'}</span></div>`).join('')}<div class="cost-axis"><span>0</span><span>${max} false reports</span></div><div class="cost-legend"><span>Solid line: allowance b=${budget}</span><span>Feasibility floor M=${floor}</span></div></div>`;
      into.setAttribute('role','img');into.setAttribute('aria-label',costs.map(c=>c.name+' cost '+c.value).join('; ')+'. Error allowance '+budget+'. Feasibility floor '+floor+'.');
    }
    function renderCase(x, result) {
      const binary = bits(x);
      return `<button type="button" class="case ${selected === x ? 'selected' : ''}" data-case="${x}" aria-label="Inspect ${caseName(x)}, point label ${label(result.point[x])}"><span class="case-heading">${caseName(x)}</span><div class="case-bits">${binary.slice(0,4)}<span class="${state.refined ? 'exposed-bit' : 'hidden-bit'}">${binary[4]}</span></div><div class="case-answer ${kind(result.point[x])}">Point label: ${label(result.point[x])}</div></button>`;
    }
    function render() {
      const result = E.evaluate(state);
      q('global-rule').setAttribute('aria-label','Enable context-wide evidence rule');
      q('refined-view').setAttribute('aria-label','Expose the missing bit in the receiving view');
      q('permission').setAttribute('aria-label','Current receiving permission');
      q('global-rule').checked = state.global;
      q('refined-view').checked = state.refined;
      q('refined-view').disabled = !state.exposeAllowed;
      q('permission').checked = state.permission;
      q('error-budget').value = String(state.budget);
      q('anchor').checked = state.reports.some(r => r.root === 'anchor-a');
      q('exposure').checked = state.exposeAllowed;
      q('guide-count').textContent = 'Guided stage '+(guideStep+1)+' of '+steps.length;
      q('guide-steps').innerHTML = ['MeRSIA','Model','One repair','Coupled repair','Receiving use','Stress'].map((name,i)=>`<button type="button" class="guide-stage ${i===guideStep?'active':''}" data-guide="${i}" aria-current="${i===guideStep?'step':'false'}">${i+1} · ${name}</button>`).join('');
      q('guide-heading').textContent=steps[guideStep][0]; q('guide-description').textContent=steps[guideStep][1];
      q('guide-back').disabled=guideStep===0;q('guide-next').textContent=steps[guideStep][2];
      q('worlds').textContent = format(result.worlds);
      q('point-count').textContent = result.pointDecisive + ' / 32';
      q('coverage').textContent = result.coverage + ' / 2';
      q('map-caption').textContent = state.refined ? 'The missing coordinate now reaches the receiver. Each target has its own class.' : 'The receiver sees bits 1–4. These two targets occupy the same class.';
      q('view-size').textContent = result.fibres.length + ' receiving classes';
      q('bit-key').textContent = state.refined ? '0 exposed' : '0 hidden';
      if (state.refined) {
        q('map-groups').innerHTML = [0,1].map(x => `<div class="fibre">${renderCase(x,result)}<div class="receiver-line"></div><div class="receiving-result"><strong>${label(result.receiving[x])}</strong><small>Receiving class {${String(x).padStart(2,'0')}}</small></div></div>`).join('');
      } else {
        const note = result.point[0] !== null && result.point[1] !== null ? 'Two opposite labels share one class' : 'Unresolved point labels share one class';
        q('map-groups').innerHTML = `<div class="fibre merged"><div class="case-pair">${renderCase(0,result)}${renderCase(1,result)}</div><div class="receiver-line"></div><div class="receiving-result"><strong>${label(result.receiving[0])}</strong><small>Receiving class {00, 01} · ${note}</small></div></div>`;
      }
      let heading, explanation;
      if (!result.consistent) { heading = 'No world fits this error allowance.'; explanation = 'The evidence forces '+result.minimumErrors+' false report(s), above the declared allowance of '+state.budget+'. The model is inconsistent and cannot justify either target label. Reconsider the premise or evidence before receiving use.'; }
      else if (!state.coverageValid) { heading = 'An audit found that the model excludes reality.'; explanation = 'The labels below remain conditional on the current error bound. The trusted audit has invalidated that coverage premise, so receiving actions are held. Use the audited floor, then requalify.'; }
      else if (result.coverage === 2) { heading = state.budget===1 ? 'Both repairs make the answers usable.' : 'The current premises make both answers usable.'; explanation = 'The '+(state.global?'context-wide':'local')+' rule warrants opposite point labels under the current allowance, and the refined view preserves the distinction. Receiving actions still need a current record and permission.'; }
      else if (state.budget === 0) { heading = 'The zero-error premise warrants individual reports.'; explanation = 'Without conflicting reports, allowance zero requires every report to be true. Opposite point labels are warranted, but the coarse view still merges them. This exploratory premise is stronger than the paper fixture.'; }
      else if (state.budget === 2) { heading = 'More possible error restores uncertainty.'; explanation = (q('anchor').checked ? 'The anchor forces one false report, but an allowance of two leaves room for a target report to be false too.' : 'With the anchor removed, an allowance of two permits either or both target reports to be false.')+' Neither target label is forced, even with both repairs.'; }
      else if (!q('anchor').checked) { heading = 'Without the anchor, the targets can still be wrong.'; explanation = 'No error is forced elsewhere. Either target report could use the one-error allowance. A richer view cannot turn that unresolved evidence into a justified label.'; }
      else if (state.global) { heading = 'The rule improves; the receiving map still merges.'; explanation = 'The evidence now warrants safe at Case 00 and harmful at Case 01. A shared receiving class cannot return either label soundly. Expose the missing bit.'; }
      else if (state.refined) { heading = 'The map improves; the point labels remain unresolved.'; explanation = 'The receiver can distinguish the cases, but the local rule still requires two agreeing reports at each target. Turn on the context-wide rule.'; }
      else { heading = 'Two different obstacles, one unresolved decision.'; explanation = 'Each target has only one report, and the receiving view merges the targets. Try either repair alone, then both. The four evidence roots can stay exactly the same.'; }
      q('explanation').innerHTML = `<strong>${heading}</strong><p>${explanation}</p>`;
      q('root-count').textContent = result.roots + ' distinct roots · forced errors ' + result.minimumErrors + ' / ' + state.budget;
      q('evidence').innerHTML = `<div class="evidence-item"><h3>Case 00 · root target-00</h3><div class="report-badges"><span class="badge safe">1 safe report</span></div><p>Evidence from this target.</p></div><div class="evidence-item"><h3>Case 01 · root target-01</h3><div class="report-badges"><span class="badge harmful">1 harmful report</span></div><p>Evidence from this target.</p></div><div class="evidence-item ${q('anchor').checked ? '' : 'absent'}"><h3>Case 02 · conflicting anchor</h3><div class="report-badges">${q('anchor').checked ? '<span class="badge safe">1 safe</span><span class="badge harmful">1 harmful</span>' : '<span class="badge">Reports removed</span>'}</div><p>${q('anchor').checked ? 'Two distinct roots. At least one must be false.' : 'No forced error at the anchor.'}</p></div>`;
      const names = ['Neither repair', 'Rule only', 'View only', 'Both repairs'];
      q('comparison').innerHTML = E.compare(state).map((c,i) => `<div class="comparison-row ${c.global === state.global && c.refined === state.refined ? 'current' : ''}"><span class="comparison-label">${names[i]}</span><div class="bar-track"><div class="bar" style="width:${c.allowed ? c.coverage * 50 : 0}%"></div></div><span class="comparison-value">${c.allowed ? c.coverage + '/2' : 'N/A'}</span></div>`).join('');
      q('comparison').setAttribute('aria-label', E.compare(state).map((c,i) => names[i]+': '+(c.allowed ? c.coverage+' of 2 decisive' : 'view exposure not allowed')).join('; '));
      const receiptCurrent = receipt && receipt.snapshot === E.binding(state);
      q('receipt-status').textContent = !receipt ? 'No captured receiving record' : receiptCurrent ? 'Captured record is current' : 'Captured record is stale — recapture before execution';
      q('receipt-dot').className = 'receipt-dot' + (receipt ? receiptCurrent ? ' current' : ' stale' : '');
      const currentExecution = E.execute(state, receipt);
      const decisions = lastExecution ? lastExecution.decisions : ['hold','hold'];
      q('decisions').innerHTML = decisions.map((decision,x) => `<div class="decision ${decision}"><span class="decision-label">${caseName(x)}</span><span class="decision-value">${lastExecution ? decision : 'Not run'}</span></div>`).join('');
      const reasons = { coverage: 'Trusted audit invalidated model coverage. Both cases are held until the premise is repaired and requalified.', 'no-receipt': 'Capture the current receiving view first. No receiving decision has been executed.', stale: 'The captured record no longer matches the current rule, view, evidence or assumptions. Both cases are held.', permission: 'Permission is absent. Both cases are held, even if their labels are decisive.', current: result.coverage === 2 ? 'Current binding and permission passed. Safe releases; harmful blocks. These are local simulated actions.' : 'The record is current, but the receiving labels remain unresolved. Both cases are held.' };
      q('execution-reason').textContent = lastExecution ? reasons[currentExecution.reason] : !state.permission ? 'Permission is off. A current judgment can remain warranted while receiving execution is withheld.' : receipt && !receiptCurrent ? reasons.stale : 'No actions yet. Capture a record, then try execution.';
      q('history').innerHTML = history.slice().reverse().map(h => `<li><time>Step ${h.step}</time>${escaped(h.text)}</li>`).join('');
      q('repair-trace').innerHTML = repairTrace ? `<ol><li>Rule soundness and preservation: ${repairTrace.warrant.cases} abstract cases passed.</li>${repairTrace.candidates.map((c,i) => `<li>${names[i]}: ${!c.allowed ? 'not accessible' : c.coverage+'/2 decisive; '+(c.eligible ? 'eligible positive gain' : c.preserves ? 'no positive gain' : 'would lose a previous label') }.</li>`).join('')}<li>New evidence: none. Additional permission: none.</li></ol>` : '<p>Use “Find &amp; check a repair” to inspect its finite search. Candidate combinations and the qualification checker are supplied.</p>';
      const n = result.counts[selected];
      const elsewhere = result.minimumErrors - Math.min(...n);
      const fibre = result.fibres.find(group => group.includes(selected));
      q('inspector-heading').textContent = 'Inspect ' + caseName(selected);
      q('inspector-bits').textContent = 'Retained carrier: ' + bits(selected);
      q('inspector-intro').textContent = 'Point label: '+label(result.point[selected])+'. Receiving label: '+label(result.receiving[selected])+'. These are computed separately.';
      const rows = [['Safe reports here',n[0]],['Harmful reports here',n[1]],['Minimum false reports elsewhere',elsewhere],['Cost of claiming safe',n[1]+' + '+elsewhere+' = '+(n[1]+elsewhere)],['Cost of claiming harmful',n[0]+' + '+elsewhere+' = '+(n[0]+elsewhere)],['Maximum allowed total',state.budget]];
      q('inspector-table').innerHTML = rows.map(([name,value]) => `<tr><th scope="row">${name}</th><td>${value}</td></tr>`).join('');
      const possibleNames = result.possible[selected].map(label);
      q('inspector-possible').textContent = 'Compatible-world possibilities: '+(possibleNames.length ? possibleNames.join(' or ') : 'none')+'. '+(!result.consistent ? 'No world fits the evidence and allowance; no point answer is licensed.' : possibleNames.length === 1 ? 'Exactly one label is warranted by the full evidence model.' : 'The evidence model does not force a unique label.');
      q('inspector-receiver').textContent = 'Receiving class: {'+fibre.map(x => String(x).padStart(2,'0')).join(', ')+'}. Every member must have the same decisive point label before this class can answer.';
      q('domain').innerHTML = result.point.map((v,x) => `<button class="state-tile ${x === selected ? 'selected' : ''}" data-case="${x}" data-label="${kind(v)}" type="button" aria-label="Inspect ${caseName(x)}, point label ${label(v)}, receiving label ${label(result.receiving[x])}">${String(x).padStart(2,'0')} · ${v === null ? '?' : v === 0 ? 'S' : 'H'}</button>`).join('');
      drawBoundary([{name:'Claim safe',value:n[1]+elsewhere},{name:'Claim harmful',value:n[0]+elsewhere}],state.budget,result.minimumErrors,q('boundary-chart'));
      drawBoundary([{name:'Forced errors',value:result.minimumErrors}],state.budget,result.minimumErrors,q('feasibility-chart'));
      q('feasibility-status').textContent=result.consistent ? 'At least '+result.minimumErrors+' report(s) must be false; allowance '+state.budget+' permits '+format(result.worlds)+' compatible worlds.' : 'The floor is '+result.minimumErrors+' but the allowance is '+state.budget+': zero compatible worlds. This contradiction is visible without an external truth audit.';
      q('stress-truth').checked=stressTruth;
      q('use-audit-floor').disabled=!audit||audit.errors===state.budget;
      q('audit-result').className='audit-result'+(audit&&!audit.covered?' failed':'');
      q('audit-result').textContent= !audit ? stressTruth ? 'Audit not run. The actual fixture now has a second false report, but the reasoning engine still sees the same evidence. Its error-bound premise can be wrong without an internal contradiction.' : 'Audit not run. Coverage currently rests on the supplied premise.' : 'Audit counted '+audit.errors+' actual false report(s) against allowance '+state.budget+'. '+(audit.covered ? 'The audited fixture is contained. Requalification is still required after changing premises.' : 'The actual world is excluded. Coverage validity revoked; receiving actions hold.');
      if (window.OrchardGuidance) window.OrchardGuidance.annotate(container);
    }
    function listen(id, event, fn) { q(id).addEventListener(event, fn, { signal: abort.signal }); }
    listen('global-rule','change', e => change({global:e.target.checked}, 'Evidence rule changed to '+(e.target.checked ? 'context-wide' : 'local')+'.'));
    listen('refined-view','change', e => change({refined:e.target.checked}, e.target.checked ? 'Bit 0 exposed in the receiving view.' : 'Bit 0 hidden from the receiving view.'));
    listen('permission','change', e => change({permission:e.target.checked}, e.target.checked ? 'Current receiving permission granted by the visitor.' : 'Current receiving permission withdrawn.'));
    listen('error-budget','change', e => change({budget:Number(e.target.value)}, 'External maximum-false-report assumption changed to '+e.target.value+'.', true));
    listen('anchor','change', e => change({reports:E.fixture(e.target.checked)}, e.target.checked ? 'Conflicting anchor evidence restored.' : 'Conflicting anchor evidence removed.', true));
    listen('exposure','change', e => change({exposeAllowed:e.target.checked, refined:e.target.checked ? state.refined : false}, e.target.checked ? 'Bit 0 is available to the receiving view.' : 'Exposure of bit 0 is disallowed; view returned to coarse.'));
    listen('reset','click', () => { state = E.initial(); receipt = null; lastExecution = null; selected = 0; history = []; repairTrace = null; guideStep=0; stressTruth=false; audit=null; note('Encounter reset to the paper fixture.'); q('repair-result').textContent = 'A supplied finite search checks candidate repairs.'; render(); });
    listen('find-repair','click', () => {
      repairTrace = E.findRepair(state);
      if (repairTrace.state) { state = repairTrace.state; lastExecution = null; note('A qualifying repair installed: '+(state.global ? 'context-wide rule' : 'local rule')+' and '+(state.refined ? 'refined view' : 'coarse view')+'. Evidence and permission unchanged.'); q('repair-result').textContent = 'Repair qualified: '+repairTrace.warrant.cases+' checks; '+repairTrace.candidates.length+' candidate combinations.'; }
      else { note('Repair search found no accessible, preserving candidate with positive receiving gain.'); q('repair-result').textContent = 'No qualifying positive-gain repair in the supplied toolbox.'; }
      render();
    });
    listen('capture','click', () => { E.qualifyRule(state.budget); receipt = E.capture(state); lastExecution = null; note('Current receiving view captured; no permission added and no action performed.'); render(); });
    listen('execute','click', () => { lastExecution = E.execute(state,receipt); note('Simulated receiving check: '+lastExecution.decisions.join(' / ')+' ('+lastExecution.reason+').'); render(); });
    listen('guide-back','click',()=>goTo(Math.max(0,guideStep-1)));
    listen('guide-next','click',()=>goTo((guideStep+1)%steps.length));
    listen('open-glossary','click',()=>window.OrchardGuidance.showGlossary());
    listen('stress-truth','change',e=>{stressTruth=e.target.checked;audit=null;state={...state,coverageValid:true};lastExecution=null;note('External audit fixture changed. Working evidence unchanged; prior audit withdrawn.');render();});
    listen('run-audit','click',()=>{audit=auditFixture(state);state={...state,coverageValid:audit.covered};lastExecution=null;note('Trusted fixture audit: '+audit.errors+' actual false reports; '+(audit.covered?'model contains audited reality.':'coverage premise invalidated.'));render();});
    listen('use-audit-floor','click',()=>{if(audit)change({budget:audit.errors},'Assumption repaired to audited error floor '+audit.errors+'. Old receiving record requires requalification.',true);});
    container.addEventListener('click', e => {
      const stage = e.target.closest('[data-guide]'); if(stage&&container.contains(stage)){goTo(Number(stage.dataset.guide));return;}
      const button = e.target.closest('[data-case]');
      if (!button || !container.contains(button)) return;
      selected = Number(button.dataset.case); render();
      // Preserve keyboard focus after replacing a selected case button.
      const replacement = container.querySelector('[data-case="'+selected+'"]');
      if (replacement) replacement.focus({preventScroll:true});
    }, { signal: abort.signal });
    note('Four distinct evidence roots retained. Local rule; bit 0 hidden; current permission present.');
    render();
    // Optional imperative WebMCP interface; the same local actions and state as the UI.
    if(document.modelContext && typeof document.modelContext.registerTool==='function') {
      const noArguments = input => { if(!input || typeof input!=='object' || Array.isArray(input) || Object.keys(input).length) throw new Error('This action takes an empty object.'); };
      const read = () => { const r=E.evaluate(state);return {experiment:'coupled-repair',global:state.global,refined:state.refined,budget:state.budget,permission:state.permission,coverageValid:state.coverageValid,compatibleWorlds:r.worlds,decisiveTargets:r.coverage,receiptCurrent:Boolean(receipt&&receipt.snapshot===E.binding(state))}; };
      const tools = [
        {name:'read_coupled_encounter',title:'Read coupled encounter',description:'Read the current local experiment settings and calculated outcome; does not change state.',annotations:{readOnlyHint:true,untrustedContentHint:false},execute(input){noArguments(input);return read();}},
        {name:'capture_coupled_view',title:'Capture current receiving view',description:'Qualify and capture the current local receiving view. Does not grant permission or execute an action.',annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){noArguments(input);q('capture').click();return read();}},
        {name:'simulate_coupled_receiving',title:'Simulate receiving decisions',description:'Try receiving decisions using the existing captured view and current permission. Only local simulated release, block or hold; no external effect.',annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){noArguments(input);q('execute').click();return {state:read(),decisions:lastExecution.decisions,reason:lastExecution.reason};}}
      ];
      for(const tool of tools){try{Promise.resolve(document.modelContext.registerTool({...tool,inputSchema:{type:'object',properties:{},additionalProperties:false}},{signal:abort.signal})).catch(()=>{});}catch{}}
    }
    return { dispose: () => abort.abort(), snapshot: () => ({ version: '0.1.0', state: JSON.parse(JSON.stringify(state)), result: E.evaluate(state), receipt: receipt ? { current: receipt.snapshot === E.binding(state), labels: receipt.labels } : null, lastExecution }) };
  }
  window.OrchardLab.register({ id: 'coupled-repair', title: '01 · The Missing Distinction', version: '0.1.0', contractVersion: 1, mount, run });
})();
