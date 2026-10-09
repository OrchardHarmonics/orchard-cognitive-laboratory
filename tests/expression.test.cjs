/* Orchard Noncommercial Research and Evaluation Licence 1.0.
 * Copyright (c) 2026 Kimberley Laverne Asher, to the extent of rights held.
 * Commercial use requires separate written permission. See LICENSE.txt.
 */
const assert=require('node:assert/strict'),{test}=require('node:test');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const X=require('../dist/experiments/expression/engine.js');
const Q=require('../dist/experiments/enquiry/engine.js');
const E=require('../dist/experiments/coupled/engine.js');
const I=require('../dist/experiments/inheritance/engine.js');
const copy=x=>JSON.parse(JSON.stringify(x));
const evidence=X.makeEvidence(),learned=X.acquire(evidence),L=X.library(learned.artifact);
function independent(g,K,q,c,n){const required=Array.from({length:n},(_,i)=>i).filter(i=>Math.floor(K/2**i)%2),asked=Array.from({length:n},(_,i)=>i).filter(i=>Math.floor(q/2**i)%2),s=required.filter(i=>asked.includes(i)).length;if(g.op==='mod')return Number(s%g.mod===g.residue);const rhs=g.rhs==='c'?c:g.rhs==='c-1'?c-1:g.rhs;return Number(g.op==='ge'?s>=rhs:g.op==='eq'?s===rhs:s<=rhs);}
test('the 26 fixed programs agree with independent set-intersection semantics',()=>{
  assert.equal(X.GRAMMAR.length,26);assert.equal(new Set(X.GRAMMAR.map(X.expressionKey)).size,26);
  for(const g of X.GRAMMAR)for(const o of evidence.validation)assert.equal(X.interpret(g,o.K,o.q,o.c),independent(g,o.K,o.q,o.c,o.n));
  assert.throws(()=>X.interpret({op:'javascript',rhs:'anything'},3,1,2),/outside/);
});
test('four audited wrong proposals yield 88 learning observations with no mechanism name',()=>{
  assert.equal(evidence.cases.length,4);assert.equal(evidence.cases.flatMap(x=>x.observations).length,88);assert.equal(evidence.validation.length,3100);
  for(const c of evidence.cases){assert.ok(c.audit.trusted&&c.audit.incorrect);assert.notEqual(c.audit.actualK,c.audit.proposal);assert.equal(new Set(c.observations.map(o=>o.q)).size,2**c.n-2);assert.ok(c.observations.every(o=>o.K===c.audit.actualK));assert.equal(c.mode,undefined);assert.equal(c.audit.mode,undefined);for(const o of c.observations)assert.equal(o.mode,undefined);}
  const failure=Q.run({mode:'OR',K:3,permission:true}),gap={type:'orchard-audited-gap/1',n:4,c:2,observations:failure.observations,proposal:failure.proposal,audit:Q.audit(failure)};
  assert.equal(X.makeEvidence(gap).initiatingGapConsumed,true);assert.deepEqual(X.makeEvidence(gap).cases[0].trace,failure.observations);
  const bad=copy(gap);bad.audit.actualK=bad.proposal;assert.throws(()=>X.makeEvidence(bad),/false conclusion/);
});
test('selection uniqueness is checked against the grammar; trust, ambiguity and contradictions hold',()=>{
  const D=evidence.cases.flatMap(x=>x.observations),expected=X.GRAMMAR.filter(g=>D.every(o=>independent(g,o.K,o.q,o.c,o.n)===o.y));
  assert.deepEqual(expected,[{op:'ge',rhs:1}]);assert.equal(learned.selectionPredictions,2288);assert.equal(learned.calibrationCount,88);
  for(const row of learned.ledger)assert.equal(row.mismatches,D.filter(o=>independent(row.g,o.K,o.q,o.c,o.n)!==o.y).length);
  const sparse=copy(evidence);sparse.cases=sparse.cases.slice(0,1);sparse.cases[0].observations=sparse.cases[0].observations.slice(0,1);assert.equal(X.acquire(sparse).reason,'ambiguous');
  const conflict=copy(evidence),o=conflict.cases[0].observations[0];conflict.cases[0].observations.push({...o,y:1-o.y});assert.equal(X.acquire(conflict).reason,'no-candidate');
  assert.equal(X.acquire(evidence,X.GRAMMAR.filter(g=>X.expressionKey(g)!==X.expressionKey(expected[0]))).reason,'no-candidate');
  const untrusted=copy(evidence);untrusted.cases[0].audit.trusted=false;assert.equal(X.acquire(untrusted).reason,'feedback');
  const stale=copy(evidence);stale.validationSource.version++;assert.equal(X.acquire(stale).reason,'stale-feedback');
  const incomplete=copy(evidence);incomplete.cases[0].observations.pop();assert.equal(X.acquire(incomplete).reason,'calibration-scope');
});
test('semantic validation requires complete distinct measurements and certificate replay rejects alterations',()=>{
  assert.equal(learned.status,'qualified');assert.equal(learned.validationCount,3100);assert.equal(learned.validationMismatches,0);assert.ok(Object.isFrozen(learned.artifact));
  const corrupted=copy(evidence);corrupted.validation[0].y=1-corrupted.validation[0].y;assert.equal(X.acquire(corrupted).reason,'validation');
  const duplicate=copy(evidence);duplicate.validation[1]=copy(duplicate.validation[0]);assert.equal(X.acquire(duplicate).reason,'validation-scope');
  const trusted=copy(evidence);trusted.validationSource.trusted=false;assert.equal(X.acquire(trusted).reason,'feedback');
  for(const mutate of [a=>a.expression.rhs=2,a=>a.certificate.sourceVersion++,a=>a.evidence.validation[0].y^=1,a=>a.certificate.binding+='changed',a=>a.evidence.cases[0].audit.trusted=false]){const a=copy(learned.artifact);mutate(a);assert.throws(()=>X.restore(a),/failed replay/);}
  assert.deepEqual(X.restore(learned.artifact).expression,learned.artifact.expression);
});
test('expanded trees independently qualify every represented world in the fresh dimension',()=>{
  const H=X.worlds(7,3,L),plan=X.plan(7,3,H,'unit');assert.equal(H.length,105);assert.equal(plan.counts.replays,105);
  for(const w of H){let t=plan.tree;while(t.kind==='query')t=independent(w.g,w.K,t.q,3,7)?t.one:t.zero;assert.equal(t.K,w.K);}
  const settings={n:7,c:3,budget:48,permission:true};for(const key of ['K','mode'])Object.defineProperty(settings,key,{get(){throw new Error('Hidden truth accessed');}});
  const r=X.diagnose(settings,{query:q=>({y:independent({op:'ge',rhs:1},11,q,3,7),version:0}),version:()=>0},L);
  assert.equal(r.proposal,11);assert.equal(r.decision,'admit');assert.equal(r.environment,undefined);
});
test('fixed observations reopen an old wrong singleton before further enquiry finds the actual set',()=>{
  const old=X.run({permission:true},X.OLD),r=X.run({permission:true},L);
  assert.equal(old.proposal,7);assert.equal(old.scoring.incorrect,true);assert.equal(r.proposal,11);assert.equal(r.scoring.correct,true);
  assert.deepEqual(r.O.slice(0,old.O.length),old.O);assert.deepEqual(r.oldLeaf.oldActions,[7]);assert.equal(r.oldLeaf.actions.length,31);assert.ok(r.oldLeaf.actions.includes(11));
  const h0=X.support(7,3,X.OLD,old.O),h1=X.support(7,3,L,old.O);assert.ok(h0.every(w=>h1.some(v=>v.K===w.K&&X.expressionKey(v.g)===X.expressionKey(w.g))));
  assert.equal(r.O.length,9);assert.equal(old.O.length,4);assert.equal(X.run({permission:false},L).reason,'receiving-permission');
});
test('a frozen held-out census locates expression gain and preserves residual coverage failures',()=>{
  const before=JSON.stringify(learned.artifact),c=X.comparison(learned.artifact),[retained,removed,restored,active]=c;
  assert.deepEqual([retained.main.correct,removed.main.correct,restored.main.correct,active.main.correct],[105,71,105,105]);
  assert.equal(removed.main.incorrect,34);assert.deepEqual(retained.outcomes,restored.outcomes);assert.equal(retained.or.correct,35);assert.equal(removed.or.correct,1);
  for(const prior of removed.outcomes.filter(x=>x.correct))assert.ok(retained.outcomes.find(x=>x.mode===prior.mode&&x.K===prior.K).correct);
  assert.equal(retained.stress.incorrect,68);assert.equal(active.stress.incorrect,38);assert.equal(JSON.stringify(learned.artifact),before);
});
test('all runtime gates and complete watch windows survive expression acquisition',()=>{
  for(const [patch,reason] of [[{permission:false},'receiving-permission'],[{queryPermission:false},'query-permission'],[{refreshPermission:false},'refresh-permission'],[{watch:false},'watch'],[{stale:true},'stale'],[{knownFailure:true},'coverage'],[{budget:0},'budget']]){const r=X.run({permission:true,...patch},L);assert.equal(r.decision,'hold');assert.equal(r.reason,reason);}
  for(const price of ['unit','width'])for(const budget of [0,12,24,48])for(const mode of ['AND','XOR','OR'])for(const K of X.sets(7,3)){const r=X.run({mode,K,price,budget,permission:true},L);assert.equal(r.ticks,budget);assert.equal(r.trace.length,budget);assert.equal(r.serviced,Math.floor(budget/3));assert.equal(r.missed,0);for(const t of r.trace)if(!['watch','idle'].includes(t.kind))assert.notEqual(t.tick%3,0);if(r.decision==='admit')assert.equal(r.proposal,K);}
});
test('four installed modules transfer audited learning evidence without leaking runtime answers or grants',()=>{
  const context={window:{OrchardCoupled:E,OrchardInheritance:I,OrchardEnquiry:Q,OrchardExpression:X},document:{addEventListener(){}}};
  for(const file of ['lab.js','guidance.js','experiments/coupled/module.js','experiments/inheritance/module.js','experiments/enquiry/module.js','experiments/expression/module.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist',file),'utf8'),context);
  const rows=context.window.OrchardLab.runSequence(['coupled-repair','qualified-inheritance','constructive-enquiry','acquired-expression']);assert.equal(rows.length,4);assert.ok(rows.every(r=>r.passed));
  assert.equal(rows[3].transfer,'audited-calibration-gap');assert.equal(rows[3].runtimeEvidenceTransfer,'none');assert.equal(rows[3].authorityExpanded,false);assert.equal(rows[3].grammarExpanded,false);assert.equal(rows[3].selectorChanged,false);assert.ok(Object.isFrozen(rows[3].expressionArtifact));assert.equal(Object.keys(context.window.OrchardGuidance.definitions).length,64);
  let definition;const isolated={window:{OrchardExpression:X,OrchardGuidance:{registerDefinitions(){}},OrchardLab:{register(d){definition=d;}}}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/experiments/expression/module.js'),'utf8'),isolated);
  assert.throws(()=>definition.run({protocol:'orchard-lab/1',previous:{...rows[2],auditedGap:null}}),/initiating gap/);
});
