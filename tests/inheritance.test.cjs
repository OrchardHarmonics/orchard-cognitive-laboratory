/* Orchard Noncommercial Research and Evaluation Licence 1.0.
 * Copyright (c) 2026 Kimberley Laverne Asher, to the extent of rights held.
 * Commercial use requires separate written permission. See LICENSE.txt.
 */
const assert=require('node:assert/strict');
const {test}=require('node:test');
const H=require('../dist/experiments/inheritance/engine.js');
const E=require('../dist/experiments/coupled/engine.js');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const artifact=H.acquireSource();
test('source acquisition has a positive witness, keeps the old subtree and replays qualification',()=>{
  assert.equal(artifact.qualification.positiveWitnessGain,2);
  assert.equal(artifact.qualification.cases,320);
  assert.equal(artifact.acquisition.rounds,1);
  assert.deepEqual(artifact.policy.old,H.supplied());
  assert.equal(H.validateArtifact(JSON.parse(JSON.stringify(artifact))),true);
  assert.ok(Object.isFrozen(artifact.policy.old.next));
});
test('bootstrap transfers a scoped method into empty observations, conclusions, grants, receipts and archive',()=>{
  const child=H.bootstrap(artifact,H.ownerGrant(artifact));
  for(const k of ['observations','conclusions','receivingGrants','receipts','archive'])assert.deepEqual(child[k],[]);
  assert.deepEqual(child.policy,artifact.policy);
  assert.notEqual(child.policy,artifact.policy);
  assert.throws(()=>H.bootstrap(artifact,H.ownerGrant(artifact,false)),/current scoped owner grant/);
  assert.throws(()=>H.bootstrap(artifact,{...H.ownerGrant(artifact),epoch:0}),/current scoped/);
  assert.throws(()=>H.bootstrap(artifact,{...H.ownerGrant(artifact),scope:'different'}),/current scoped/);
  assert.throws(()=>H.bootstrap(artifact,H.ownerGrant(artifact),{observations:[{}],conclusions:[],receivingGrants:[],receipts:[],archive:[]}),/Bootstrap must be empty/);
});
test('altered binding, policy and claimed qualification are rejected by actual source replay',()=>{
  const copy=()=>JSON.parse(JSON.stringify(artifact));
  const bad=copy();bad.policy.next.kind='inquiry';
  assert.throws(()=>H.validateArtifact(bad),/binding is stale/);
  bad.binding=H.canonical({version:bad.version,scope:bad.scope,policy:bad.policy});
  assert.throws(()=>H.validateArtifact(bad),/cannot replay this policy/);
  const q=copy();q.qualification.cases=999;
  assert.throws(()=>H.validateArtifact(q),/qualification does not replay/);
  const a=copy();a.acquisition.rounds=0;
  assert.throws(()=>H.validateArtifact(a),/acquisition record does not replay/);
});
test('matched removal, restoration, specificity and reconstruction expose causal method reuse',()=>{
  const results=H.compare({artifact,permission:true});
  const r=id=>results.find(x=>x.route===id);
  assert.equal(r('intact').decisive,4);assert.equal(r('intact').counts.rounds,1);
  assert.equal(r('removed').decisive,0);assert.equal(r('removed').counts.rounds,1);
  assert.equal(r('restored').decisive,4);
  assert.deepEqual(r('restored').interventions.map(x=>x.operation),['remove','restore']);
  assert.equal(H.contains(r('restored').interventions[0].policy,'construct-rule'),false);
  assert.equal(H.contains(r('restored').interventions[1].policy,'construct-rule'),true);
  assert.equal(r('specificity').decisive,4);
  assert.equal(r('relearn-one').repaired,0);
  assert.deepEqual(r('relearn-one').learning.map(x=>x.learned),['construct-rule']);
  assert.deepEqual(r('relearn-two').learning.map(x=>x.learned),['construct-rule','compose']);
  assert.equal(r('relearn-two').decisive,4);assert.equal(r('fresh').decisive,4);
  for(const x of results){
    assert.equal(x.authorityExpanded,false);assert.equal(x.grammarExpanded,false);
    assert.deepEqual(x.contexts.map(c=>c.worlds),['1073741824','1073741824']);
  }
  assert.deepEqual(r('intact').contexts[0].decisions,['release','block']);
  assert.deepEqual(r('intact').contexts[1].decisions,['block','release']);
  const roots=r('intact').contexts.flatMap(x=>x.roots);assert.equal(new Set(roots).size,8);
  assert.deepEqual(r('intact').contexts[0].reports,r('removed').contexts[0].reports);
});
test('zero-acquisition controls prevent mistaking acquisition rounds for compute or necessity',()=>{
  for(const route of ['direct','preinstalled']){
    const r=H.runRoute({route,artifact,permission:true});
    assert.equal(r.decisive,4);assert.equal(r.counts.rounds,0);
    assert.ok(r.counts.qualifierCases>0);
  }
  const r=H.runRoute({route:'direct',artifact,permission:true});assert.equal(r.counts.candidates,8);
  assert.equal(H.runRoute({route:'intact',rounds:0,artifact,permission:true}).repaired,0);
});
test('retained developed policy solves the relabelled second context without another acquisition',()=>{
  const r=H.runRoute({artifact,permission:true});
  assert.equal(r.learning.length,1);assert.equal(r.learning[0].context,'receiving-1');
  assert.equal(r.contexts[1].after,2);
  assert.deepEqual(r.policy.old,artifact.policy);
  assert.deepEqual(r.policy.next.basis,H.projection(artifact.policy));
});
test('receiving authority, exposure access and the captured program boundary fail separately',()=>{
  const r=H.runRoute({artifact});
  assert.equal(r.repaired,4);assert.equal(r.decisive,0);
  assert.deepEqual(r.contexts.map(x=>x.reason),['permission','permission']);
  assert.ok(r.contexts.every(x=>x.permission===false));
  const noAccess=H.runRoute({artifact,permission:true,access:false});
  assert.equal(noAccess.repaired,0);assert.match(noAccess.learning[0].rejection,/inaccessible/);
  const badBasis=H.runRoute({artifact,permission:true,counterfeit:true});
  assert.equal(badBasis.repaired,0);assert.match(badBasis.learning[0].rejection,/Captured basis/);
  assert.throws(()=>H.extend(H.supplied(),{kind:'compose',basis:artifact.policy},E.initial(),H.counters()),/Captured basis/);
});
test('the two component orders preserve identical evidence, commute and emit no intermediate actions',()=>{
  const s=H.childContext(0,true),before=E.binding(s);
  const a=H.transaction(s,['view','rule'],H.counters());
  const b=H.transaction(s,['rule','view'],H.counters());
  assert.ok(a&&b);assert.deepEqual(a.state,b.state);
  assert.equal(E.binding(s),before);
  assert.deepEqual(a.trace.map(x=>x.gain),[0,2]);
  assert.ok(a.trace.every(x=>x.emittedActions===0));
  assert.ok(b.trace.every(x=>x.emittedActions===0));
  assert.deepEqual(a.state.reports,s.reports);
  assert.deepEqual(E.execute(a.state,E.capture(a.state)).decisions,['release','block']);
  const calls=[],original=E.execute;
  E.execute=(state,receipt)=>{calls.push({global:state.global,refined:state.refined,context:state.context});return original(state,receipt);};
  try { H.runRoute({artifact,permission:true}); }
  finally { E.execute=original; }
  assert.equal(calls.length,2);
  assert.ok(calls.every(x=>x.global && x.refined));
});
test('frozen capture cannot drift when the caller mutates its old tree or extends the policy',()=>{
  const old=JSON.parse(JSON.stringify(artifact.policy)),s=H.childContext(0,true);
  const gained=H.extend(old,{kind:'compose',basis:H.projection(old)},s,H.counters());
  const binding=H.canonical(gained.policy.next.basis);
  old.next.kind='hold';
  assert.equal(H.canonical(gained.policy.next.basis),binding);
  assert.equal(gained.policy.old.next.kind,'construct-rule');
  assert.ok(Object.isFrozen(gained.policy.next.basis));
  const first=H.invoke(artifact.policy,{...s,refined:true},H.counters());
  const extended=H.invoke(gained.policy,{...s,refined:true},H.counters());
  assert.equal(first.via,'construct-rule');assert.equal(extended.via,first.via);
});
test('real installed sequence transfers its acquired artifact and rejects passing prior answers as the method',()=>{
  const context={window:{OrchardCoupled:E,OrchardInheritance:H},document:{addEventListener(){}}};
  for(const file of ['lab.js','guidance.js','experiments/coupled/module.js','experiments/inheritance/module.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist',file),'utf8'),context);
  const results=context.window.OrchardLab.runSequence(['coupled-repair','qualified-inheritance']);
  assert.equal(results.length,2);assert.ok(results.every(x=>x.passed));
  assert.equal(results[1].previousConsumed,true);
  assert.equal(results[1].sourceBinding,results[0].constructionArtifact.binding);
  assert.equal(results[1].evidenceTransfer,'none');
  assert.equal(results[1].emptyBootstrap.observations.length,0);
  assert.ok(Object.isFrozen(results[0].constructionArtifact.policy));
  assert.equal(Object.keys(context.window.OrchardGuidance.definitions).length,46);
  assert.throws(()=>context.window.OrchardGuidance.registerDefinitions({construction:context.window.OrchardGuidance.definitions.construction}),/duplicate/);
  let second;
  const isolated={window:{OrchardCoupled:E,OrchardInheritance:H,OrchardGuidance:{registerDefinitions(){}},OrchardLab:{register(d){second=d;}}}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/experiments/inheritance/module.js'),'utf8'),isolated);
  assert.throws(()=>second.run({protocol:'orchard-lab/1',previous:{protocol:'orchard-lab/1',experiment:'coupled-repair',passed:true,decisions:['release','block']}}),/needs the checked source method/);
  assert.throws(()=>second.run({protocol:'orchard-lab/1',previous:{...results[0],protocol:'wrong'}}),/needs the checked source method/);
  assert.equal(second.run({protocol:'orchard-lab/1',previous:null}).previousConsumed,false);
});
