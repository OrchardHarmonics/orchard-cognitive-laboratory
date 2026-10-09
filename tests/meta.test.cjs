/* Orchard Noncommercial Research and Evaluation Licence 1.0.
 * Copyright (c) 2026 Kimberley Laverne Asher, to the extent of rights held.
 * Commercial use requires separate written permission. See LICENSE.txt.
 */
const assert=require('node:assert/strict'),{test}=require('node:test');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const M=require('../dist/experiments/meta/engine.js'),X=require('../dist/experiments/expression/engine.js');
const E=require('../dist/experiments/coupled/engine.js'),I=require('../dist/experiments/inheritance/engine.js'),Q=require('../dist/experiments/enquiry/engine.js');
const copy=x=>JSON.parse(JSON.stringify(x));
const source=M.sourceFixture(),A=M.evidence('A'),B=M.evidence('B'),VB=M.validation('B'),method=M.acquireMethod(A),repair=M.acquireRepair(B,VB,'pair-or');
function independent(g,K,q,c,n){if(g.op==='join'){const a=independent(g.left,K,q,c,n),b=independent(g.right,K,q,c,n);return Number(g.operator==='or'?a||b:a&&b);}const required=Array.from({length:n},(_,i)=>i).filter(i=>Math.floor(K/2**i)%2),asked=Array.from({length:n},(_,i)=>i).filter(i=>Math.floor(q/2**i)%2),s=required.filter(i=>asked.includes(i)).length,r=g.rhs==='c'?c:g.rhs==='c-1'?c-1:g.rhs;return Number(g.op==='mod'?s%g.mod===g.residue:g.op==='ge'?s>=r:g.op==='eq'?s===r:s<=r);}
test('bounded Boolean dialects agree with independent set semantics and reject deeper or unknown syntax',()=>{
  for(const recipe of ['base','pair-and','pair-or']){const G=M.generate(recipe),d=M.dialect(recipe);assert.equal(G.length,recipe==='base'?26:47);assert.equal(new Set(G.map(X.expressionKey)).size,G.length);for(const g of G)for(const o of VB.observations)assert.equal(d.interpret(g,o.K,o.q,o.c),independent(g,o.K,o.q,o.c,o.n));}
  const d=M.dialect('pair-or'),g=copy(repair.artifact.expression);g.left=copy(g);assert.equal(d.valid(g),false);assert.throws(()=>d.interpret(g,15,1,4),/depth or syntax/);assert.throws(()=>M.generate('arbitrary'),/Unknown/);
});
test('a complete language witness selects exactly one conservative constructor with distinct preservation obligations',()=>{
  assert.equal(A.observations.length,44);assert.ok(M.checkData(A));assert.equal(M.fit(M.generate('base'),A.observations,M.dialect('base')).survivors.length,0);
  assert.equal(method.status,'qualified');assert.equal(method.predictions,5280);assert.deepEqual(method.rows.map(r=>r.fit.survivors.length),[0,0,1]);assert.deepEqual(method.survivors,['pair-or']);assert.equal(method.validationCount,2170);assert.equal(method.validationMismatches,0);
  const q=method.artifact.qualification;assert.equal(q.preservationCases,312);assert.equal(q.preservationFailures,0);assert.equal(q.truthCases,4);assert.equal(q.truthFailures,0);assert.ok(q.retained);assert.ok(Object.isFrozen(method.artifact.contract));
  assert.equal(M.acquireMethod(A,{dropOld:true}).reason,'no-qualified-method');assert.equal(M.acquireMethod(A,{table:[0,0,1,1]}).reason,'no-qualified-method');
});
test('trust, currentness and full measurement scope are premises of constructor growth, and sufficient old language does not warrant it',()=>{
  for(const change of [a=>a.trusted=false,a=>a.version=1]){const a=copy(A);change(a);assert.equal(M.acquireMethod(a).reason,'feedback');}
  for(const change of [a=>a.observations.pop(),a=>a.observations[1]=copy(a.observations[0])]){const a=copy(A);change(a);assert.equal(M.acquireMethod(a).reason,'measurement-scope');}
  assert.equal(M.acquireMethod(M.evidence('OR')).reason,'no-language-witness');
});
test('constructor and later-repair replays reject altered contracts, evidence and structural bindings',()=>{
  assert.deepEqual(M.restoreMethod(method.artifact),method.artifact);assert.deepEqual(M.restoreRepair(repair.artifact),repair.artifact);
  for(const change of [a=>a.contract.maxNewLeaves=3,a=>a.contract.recipe='pair-and',a=>a.binding+='changed',a=>a.data.observations[0].y^=1,a=>a.qualification.preservationCases=0]){const a=copy(method.artifact);change(a);assert.throws(()=>M.restoreMethod(a),/failed replay/);}
  for(const change of [a=>a.method='base',a=>a.expression.right.rhs='c',a=>a.binding+='changed',a=>a.validation.observations[0].y^=1]){const a=copy(repair.artifact);change(a);assert.throws(()=>M.restoreRepair(a),/failed replay/);}
  const bad=copy(source);bad.certificate.binding+='changed';assert.throws(()=>M.receiving({permission:true},bad,repair.artifact),/failed replay/);
});
test('a later different repair uses its own evidence and validation; incomplete search differs from complete language failure',()=>{
  assert.equal(repair.status,'qualified');assert.notDeepEqual(repair.artifact.expression,method.artifact.witness);assert.equal(repair.fit.checked,47);assert.equal(repair.fit.survivors.length,1);assert.equal(repair.validationCount,2170);assert.equal(repair.mismatches,0);
  for(const allowance of [0,26,46])assert.equal(M.acquireRepair(B,VB,'pair-or',allowance).reason,'search-incomplete');
  assert.equal(M.acquireRepair(B,VB,'base').reason,'no-expression');assert.equal(M.acquireRepair(M.evidence('C'),M.validation('C'),'pair-or').reason,'no-expression');
  const v=copy(VB);v.observations[0].y^=1;assert.equal(M.acquireRepair(B,v,'pair-or').reason,'repair-validation');v.observations[1]=copy(v.observations[0]);assert.equal(M.acquireRepair(B,v,'pair-or').reason,'measurement-scope');
});
test('five matched arms separate new gap completion, old outcome preservation, costs and conventional preinstallation',()=>{
  const before=JSON.stringify(method.artifact),study=M.study(source);assert.equal(study.offGrammar.survivors,0);
  assert.deepEqual(study.arms.map(a=>[a.newTask.correct,a.newTask.incorrect,a.newTask.withheld]),[[0,0,70],[70,0,0],[0,0,70],[70,0,0],[70,0,0]]);
  assert.ok(study.arms.every(a=>a.legacy.correct===210&&a.legacy.incorrect===0&&a.legacy.withheld===0));assert.ok(study.arms.every(a=>a.newTask.missed===0&&a.legacy.missed===0));
  assert.deepEqual(study.arms.map(a=>a.methodAcquisitionRounds),[0,1,1,1,0]);assert.deepEqual(study.arms.map(a=>a.methodRestorationReplays),[0,0,0,1,0]);
  const learned=study.arms[1];assert.equal(learned.legacy.work,2131);assert.equal(study.arms[0].legacy.work,2074);assert.equal(learned.newTask.work,690);assert.deepEqual(learned.newTask,study.arms[3].newTask);assert.deepEqual(learned.newTask,study.arms[4].newTask);assert.equal(JSON.stringify(method.artifact),before);
});
test('removal before fresh acquisition loses reachability; removal after acquisition preserves the retained object',()=>{
  assert.equal(M.acquireRepair(B,VB,'base').artifact,null);const without=M.receiving({permission:true},source),withRepair=M.receiving({permission:true},source,repair.artifact);
  assert.equal(without.knownModelGap,true);assert.equal(without.decision,'hold');assert.equal(withRepair.scoring.correct,true);
  // Active constructor is intentionally absent from receiving: a retained expression has its own checked decoder.
  M.generate('base');assert.deepEqual(M.receiving({permission:true},source,repair.artifact),withRepair);const restored=M.restoreMethod(method.artifact);assert.equal(M.acquireRepair(B,VB,restored.contract.recipe).status,'qualified');
});
test('expanded diagnosis cannot read hidden truth and all receiving duties remain independent of acquisition',()=>{
  const L=[...M.sourceLibrary(source),repair.artifact.expression],d=M.dialect('pair-or'),settings={n:7,c:4,budget:48,permission:true};
  for(const k of ['K','mode','task'])Object.defineProperty(settings,k,{get(){throw Error('Hidden truth accessed');}});
  const r=X.diagnose(settings,{query:q=>({y:independent(repair.artifact.expression,15,q,4,7),version:0}),version:()=>0},L,d);assert.equal(r.decision,'admit');assert.equal(r.proposal,15);
  for(const [patch,reason] of [[{permission:false},'receiving-permission'],[{queryPermission:false},'query-permission'],[{refreshPermission:false},'refresh-permission'],[{watch:false},'watch'],[{stale:true},'stale'],[{budget:0},'budget']]){const x=M.receiving({permission:true,...patch},source,repair.artifact);assert.equal(x.decision,'hold');assert.equal(x.reason,reason);}
});
test('bounded extension remains sound across two prices, three budgets and both fresh cardinalities',()=>{
  const L=[...M.sourceLibrary(source),repair.artifact.expression],d=M.dialect('pair-or');for(const c of [3,4])for(const price of ['unit','width'])for(const budget of [6,18,64])for(const K of X.sets(7,c)){const r=X.diagnose({n:7,c,budget,price,permission:true},{query:q=>({y:independent(repair.artifact.expression,K,q,c,7),version:0}),version:()=>0},L,d);assert.equal(r.trace.length,budget);assert.equal(r.serviced,Math.floor(budget/3));assert.equal(r.missed,0);if(r.decision==='admit')assert.equal(r.proposal,K);for(const t of r.trace)if(!['watch','idle'].includes(t.kind))assert.notEqual(t.tick%3,0);}
});
test('five real modules transfer qualified models and freeze acquired methods without authority or runtime evidence transfer',()=>{
  const context={window:{OrchardCoupled:E,OrchardInheritance:I,OrchardEnquiry:Q,OrchardExpression:X,OrchardMeta:M},document:{addEventListener(){}}};for(const file of ['lab.js','guidance.js',...['coupled','inheritance','enquiry','expression','meta'].map(id=>'experiments/'+id+'/module.js')])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist',file),'utf8'),context);
  const rows=context.window.OrchardLab.runSequence(context.window.OrchardLab.list().map(m=>m.id));assert.equal(rows.length,5);assert.ok(rows.every(r=>r.passed));const r=rows[4];assert.equal(r.transfer,'qualified-response-expression');assert.equal(r.runtimeEvidenceTransfer,'none');assert.equal(r.authorityExpanded,false);assert.equal(r.operativeGrammarExpanded,true);assert.equal(r.metaGrammarExpanded,false);assert.equal(r.interpreterMeaningsChanged,false);assert.equal(r.metaSelectorChanged,false);assert.ok(Object.isFrozen(r.generatorArtifact.contract));assert.equal(Object.keys(context.window.OrchardGuidance.definitions).length,73);
  let definition;const isolated={window:{OrchardMeta:M,OrchardExpression:X,OrchardGuidance:{registerDefinitions(){}},OrchardLab:{register(d){definition=d;}}}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/experiments/meta/module.js'),'utf8'),isolated);assert.throws(()=>definition.run({protocol:'orchard-lab/1',previous:{...rows[3],expressionArtifact:null}}),/checked expression/);
});

test('an acquired expression for another teaching contract cannot fill the declared Task B model gap',()=>{
  const a=M.acquireRepair(M.evidence('A'),M.validation('A'),'pair-or');assert.equal(a.status,'qualified');const wrongScope=M.receiving({permission:true},source,a.artifact);assert.equal(wrongScope.knownModelGap,true);assert.equal(wrongScope.decision,'hold');assert.equal(M.receiving({permission:true},source,repair.artifact).scoring.correct,true);
  assert.equal(M.acquireRepair(B,M.validation('A'),'pair-or').reason,'measurement-scope');const changed=copy(repair.artifact);changed.data.contract='orchard-method-task-A/1';assert.throws(()=>M.restoreRepair(changed),/failed replay/);
});
