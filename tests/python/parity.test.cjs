/* Orchard Noncommercial Research and Evaluation Licence 1.0.
 * Copyright (c) 2026 Kimberley Laverne Asher, to the extent of rights held.
 * Commercial use requires separate written permission. See LICENSE.txt.
 */
const assert=require('node:assert/strict'),{test}=require('node:test'),{execFileSync}=require('node:child_process'),path=require('node:path');
const base=path.join(__dirname,'../..'),py=process.env.ORCHARD_PYTHON||'python3';
const E=require(base+'/dist/experiments/coupled/engine.js'),I=require(base+'/dist/experiments/inheritance/engine.js'),Q=require(base+'/dist/experiments/enquiry/engine.js'),X=require(base+'/dist/experiments/expression/engine.js'),M=require(base+'/dist/experiments/meta/engine.js'),R=require(base+'/dist/experiments/rates/engine.js');
const native=(stem,args=[])=>JSON.parse(execFileSync(py,[base+'/dist/downloads/'+stem+'.py',...args],{encoding:'utf8',maxBuffer:10*1024*1024}));
const project=(a,keys)=>Object.fromEntries(keys.map(k=>[k,a[k]]));
test('native coupled repair computes matching world counts, warranted labels and revocation',()=>{
 const p=native('01_coupled_repair'),s=E.initial(),b=E.evaluate(s),r=E.findRepair(s).state,a=E.evaluate(r);
 assert.equal(p.before,b.coverage);assert.equal(p.after,a.coverage);assert.equal(p.worldsBefore,b.worlds.toString());assert.equal(p.worldsAfter,a.worlds.toString());assert.deepEqual(p.labels,E.capture(r).labels);assert.ok(p.live.decisions.every(x=>x==='hold'));assert.ok(p.afterRevocation.decisions.every(x=>x==='hold'));
});
test('native inheritance matches nine route decisions and every charged counter',()=>{
 const p=native('02_qualified_inheritance'),j=I.compare({permission:true});assert.equal(p.comparison.length,j.length);
 p.comparison.forEach((r,i)=>{assert.equal(r.route,j[i].route);assert.equal(r.decisive,j[i].decisive);assert.equal(r.repaired,j[i].repaired);assert.deepEqual(r.counts,j[i].counts);});
 assert.equal(p.live.decisive,0);
});
test('native enquiry matches registered and separate stress censuses',()=>{
 const p=native('03_constructive_enquiry');assert.deepEqual(p.comparison,Q.census({budget:18,price:'unit'}));
});
test('native expression acquisition and interventions match computed browser results',()=>{
 const p=native('04_acquired_expression'),a=X.acquire(X.makeEvidence());assert.deepEqual(p.expression,a.artifact.expression);assert.equal(p.calibration,a.calibrationCount);assert.equal(p.validation,a.validationCount);assert.equal(p.selectionPredictions,a.selectionPredictions);
 const j=X.comparison(a.artifact);p.comparison.forEach((r,i)=>{for(const k of ['main','stress'])assert.deepEqual(r[k],j[i][k]);});
});
test('native constructor, distinct later repair and five interventions match browser study',()=>{
 const p=native('05_bounded_meta_extension'),j=M.study();assert.equal(p.method.recipe,j.method.artifact.contract.recipe);assert.deepEqual(p.method.witness,j.method.artifact.witness);assert.equal(p.method.predictions,j.method.predictions);assert.equal(p.method.validationCount,j.method.validationCount);
 assert.deepEqual(p.laterRepair,M.acquireRepair(M.evidence('B'),M.validation('B'),'pair-or').artifact.expression);
 p.comparison.forEach((r,i)=>{for(const k of Object.keys(r))assert.deepEqual(r[k],j.arms[i][k]);});assert.equal(p.boundary.survivors,j.offGrammar.survivors);
});
test('native rate ledgers, fault holds and resource sensitivity match browser calculation',()=>{
 const options=[[],['--rate-case','wrong-teaching'],['--rate-case','untrusted'],['--rate-case','drop-old'],['--rate-case','bad-validation'],['--rate-case','stale'],['--validation-weight','4','--preservation-weight','2','--include-common']];
 for(const args of options){const p=native('06_resource_comparison',args).study,j=R.compare({kind:p.kind,validationWeight:p.weights.validation,preservationWeight:p.weights.preservation,includeCommon:p.includeCommon});for(const k of ['arms','common','commonWork','commonCharged'])assert.deepEqual(p[k],j[k]);}
});
