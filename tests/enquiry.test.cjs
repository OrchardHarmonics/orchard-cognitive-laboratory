/* Orchard Noncommercial Research and Evaluation Licence 1.0.
 * Copyright (c) 2026 Kimberley Laverne Asher, to the extent of rights held.
 * Commercial use requires separate written permission. See LICENSE.txt.
 */
const assert=require('node:assert/strict'),{test}=require('node:test');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const Q=require('../dist/experiments/enquiry/engine.js');
const E=require('../dist/experiments/coupled/engine.js');
const H=require('../dist/experiments/inheritance/engine.js');
const sets=[[0,1],[0,2],[1,2],[0,3],[1,3],[2,3]];
const mask=s=>s.reduce((n,i)=>n+2**i,0);
const selected=q=>[0,1,2,3].filter(i=>Boolean(q&(1<<i)));
function reference(mode,set,q){const inQuery=selected(q);return mode==='AND'?Number(set.every(i=>inQuery.includes(i))):set.filter(i=>inQuery.includes(i)).length%2;}
const referenceWorlds=['AND','XOR'].flatMap(mode=>sets.map(set=>({mode,K:mask(set),set})));
test('independent set semantics agree on every represented world and proper query',()=>{
  assert.equal(Q.worlds().length,12);assert.equal(Q.SETS.length,6);
  for(const w of referenceWorlds)for(let q=1;q<15;q++)assert.equal(Q.predict(w.mode,w.K,q),reference(w.mode,w.set,q));
  for(let q=1;q<15;q++)for(let y=0;y<2;y++){
    const expected=referenceWorlds.filter(w=>reference(w.mode,w.set,q)===y).map(w=>w.mode+'/'+w.K);
    assert.deepEqual(Q.support([{q,y,version:0}]).map(w=>w.mode+'/'+w.K),expected);
  }
});
test('constructed trees independently lead all represented worlds to their correct action',()=>{
  for(const price of ['unit','width']){
    const tree=Q.compile(Q.worlds(),price),warrant=Q.qualify(tree,Q.worlds());
    assert.equal(warrant.cases,12);
    for(const w of referenceWorlds){let node=tree;while(node.kind==='query')node=reference(w.mode,w.set,node.q)?node.one:node.zero;assert.equal(node.K,w.K);}
  }
  assert.throws(()=>Q.qualify({kind:'leaf',K:3},Q.worlds()),/correct represented action/);
  assert.throws(()=>Q.qualify({kind:'leaf',K:3},[]),/nonempty/);
  const empty=Q.support([{q:1,y:0,version:0},{q:1,y:1,version:0}]);
  assert.equal(empty.length,0);assert.deepEqual(Q.actions(empty),[]);
  assert.equal(Q.compile(empty).kind,'hold');
});
test('query score counts different-action pairs, and the action projection can stop without mechanism identity',()=>{
  const sameAction=[{mode:'AND',K:3},{mode:'XOR',K:3}];
  assert.equal(Q.compile(sameAction).kind,'leaf');
  assert.equal(Q.rankQueries(sameAction)[0].separated,0);
  const H=Q.worlds(),rank=Q.rankQueries(H);
  for(const r of rank){let pairs=0;for(let i=0;i<referenceWorlds.length;i++)for(let j=i+1;j<referenceWorlds.length;j++)if(referenceWorlds[i].K!==referenceWorlds[j].K&&reference(referenceWorlds[i].mode,referenceWorlds[i].set,r.q)!==reference(referenceWorlds[j].mode,referenceWorlds[j].set,r.q))pairs++;assert.equal(r.separated,pairs);}
  assert.ok(rank.every((r,i)=>i===0||rank[i-1].separated>=r.separated));
});
test('the receiving policy cannot read hidden required sets or mechanism labels',()=>{
  const settings={permission:true,budget:18};
  Object.defineProperty(settings,'K',{get(){throw new Error('Truth leaked');}});
  Object.defineProperty(settings,'mode',{get(){throw new Error('Mechanism leaked');}});
  const channel={query:q=>({y:reference('XOR',[0,2],q),version:0}),version:()=>0};
  const r=Q.diagnose(settings,channel);
  assert.equal(r.proposal,5);assert.equal(r.decision,'admit');assert.equal(r.environment,undefined);
  for(let i=0;i<=r.observations.length;i++){
    const O=r.observations.slice(0,i),expected=referenceWorlds.filter(w=>O.every(o=>reference(w.mode,w.set,o.q)===o.y));
    assert.deepEqual(Q.support(O).map(w=>w.mode+'/'+w.K),expected.map(w=>w.mode+'/'+w.K));
  }
});
test('enquiry removal holds the represented action gap, while construction and conventional diagnosis complete it',()=>{
  const c=Q.census({budget:18}),get=id=>c.find(x=>x.route===id);
  assert.deepEqual([get('constructive').registered.correct,get('removed').registered.correct,get('active').registered.correct],[12,2,12]);
  assert.ok(c.every(x=>x.registered.incorrect===0));
  assert.equal(get('removed').registered.withheld,10);
  const r=Q.run({route:'constructive',permission:true}),removed=Q.run({route:'removed',permission:true});
  assert.deepEqual(r.observations.slice(0,removed.queries),removed.observations);
  assert.equal(removed.actions.length,3);assert.equal(removed.reason,'enquiry-removed');
  assert.ok(r.extraTree);assert.equal(r.actions.length,1);
});
test('deadlines, permission, freshness and continuing duties remain separate release gates',()=>{
  assert.equal(Q.run({}).reason,'receiving-permission');
  for(const [patch,reason] of [[{queryPermission:false},'query-permission'],[{refreshPermission:false},'refresh-permission'],[{watch:false},'watch'],[{stale:true},'stale'],[{knownCoverageFailure:true},'coverage'],[{budget:0},'budget']]){
    const r=Q.run({permission:true,...patch});assert.equal(r.decision,'hold');assert.equal(r.reason,reason);
  }
  assert.throws(()=>Q.support([{q:1,y:0,version:0},{q:2,y:1,version:1}]),/different source versions/);
  assert.throws(()=>Q.support([{q:15,y:0,version:0}]),/Invalid query/);
});
test('full runtime windows preserve watches, including after early holds, across prices and deadlines',()=>{
  for(const price of ['unit','width'])for(const route of Q.ROUTES.map(x=>x.id))for(const budget of [0,3,6,9,12,18,30,48])for(const w of referenceWorlds){
    const r=Q.run({price,route,budget,mode:w.mode,K:w.K,permission:true});
    assert.equal(r.ticks,budget);assert.ok(r.decisionTick<=budget);assert.equal(r.watchTicks,Math.floor(budget/3));assert.equal(r.serviced,r.watchTicks);assert.equal(r.missed,0);
    assert.equal(r.trace.filter(x=>x.kind!=='deadline').length,budget);
    for(const x of r.trace)if(['query','refresh','receipt-qualification','release-check'].includes(x.kind))assert.notEqual(x.tick%3,0);
    if(r.decision==='admit')assert.equal(r.proposal,w.K);
  }
  const held=Q.run({queryPermission:false});assert.equal(held.decisionTick,0);assert.equal(held.serviced,6);
});
test('outside-library confidence can be incorrect, and a separate audit creates a hold without installing a model',()=>{
  const r=Q.run({mode:'OR',K:3,permission:true});
  assert.equal(r.actions.length,1);assert.equal(r.proposal,9);assert.equal(r.scoring.incorrect,true);
  const audit=Q.audit(r);assert.equal(audit.contradiction,true);assert.equal(audit.actualK,3);assert.equal(audit.coverageEstablished,false);
  const held=Q.run({mode:'OR',K:3,permission:true,knownCoverageFailure:true});assert.equal(held.reason,'coverage');assert.deepEqual(held.library,['AND','XOR']);
  const c=Q.census({budget:18});assert.equal(c.find(x=>x.route==='constructive').outside.incorrect,3);assert.equal(c.find(x=>x.route==='active').outside.incorrect,3);
});
test('the three-module sequence distinguishes scoped inheritance from enquiry provenance',()=>{
  const context={window:{OrchardCoupled:E,OrchardInheritance:H,OrchardEnquiry:Q},document:{addEventListener(){}}};
  for(const file of ['lab.js','guidance.js','experiments/coupled/module.js','experiments/inheritance/module.js','experiments/enquiry/module.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist',file),'utf8'),context);
  const results=context.window.OrchardLab.runSequence(['coupled-repair','qualified-inheritance','constructive-enquiry']);
  assert.equal(results.length,3);assert.ok(results.every(x=>x.passed));
  assert.equal(results[2].previousConsumed,true);assert.equal(results[2].transfer,'milestone-provenance-only');assert.equal(results[2].constructionTransfer,'none');assert.equal(results[2].evidenceTransfer,'none');assert.equal(results[2].authorityExpanded,false);
  assert.equal(Object.keys(context.window.OrchardGuidance.definitions).length,55);
});
