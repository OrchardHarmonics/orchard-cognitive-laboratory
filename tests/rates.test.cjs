/* Orchard Noncommercial Research and Evaluation Licence 1.0.
 * Copyright (c) 2026 Kimberley Laverne Asher, to the extent of rights held.
 * Commercial use requires separate written permission. See LICENSE.txt.
 */
const assert=require('node:assert/strict'),{test}=require('node:test');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const R=require('../dist/experiments/rates/engine.js'),M=require('../dist/experiments/meta/engine.js');
const E=require('../dist/experiments/coupled/engine.js'),I=require('../dist/experiments/inheritance/engine.js'),Q=require('../dist/experiments/enquiry/engine.js'),X=require('../dist/experiments/expression/engine.js');
test('actual fitting, checking and replay are charged, with evaluation separate',()=>{
 const s=R.compare(),[f,c]=s.arms;
 assert.deepEqual([f.selection,c.selection,c.validation,c.preservation,c.truth,c.replaySelection,c.replayValidation],[2068,2068,2170,312,4,2068,2170]);
 assert.equal(f.threshold,2068);assert.equal(c.threshold,8792);assert.equal(s.commonWork,8394);
 assert.deepEqual(f.expression,c.expression);assert.ok(s.arms.every(a=>a.score.correct===8820&&a.score.total===8820));
 assert.equal(R.atBudget(s,2067)[0].accuracy,null);assert.equal(R.atBudget(s,2068)[0].available,true);assert.equal(R.atBudget(s,8791)[1].available,false);assert.equal(R.atBudget(s,8792)[1].available,true);
});
test('weights reprice the ledger and common source work shifts both prefixes equally',()=>{
 for(const v of [1,2,4])for(const p of [1,2,4]){const s=R.compare({validationWeight:v,preservationWeight:p,includeCommon:true});
 assert.equal(s.commonWork,5280+2170*v+944*p);assert.equal(s.arms[0].threshold,2068+s.commonWork);
 assert.equal(s.arms[1].threshold,4136+4340*v+316*p+s.commonWork);assert.ok(s.arms[1].threshold>s.arms[0].threshold);}
 assert.throws(()=>R.compare({validationWeight:0}),/Invalid/);assert.throws(()=>R.atBudget(R.compare(),-1),/Invalid/);
});
test('faults cause checked holds that cannot be bought away with more budget',()=>{
 const reasons={'wrong-teaching':'repair-validation',untrusted:'feedback',stale:'feedback','bad-validation':'repair-validation','drop-old':'preservation'};
 for(const [kind,reason] of Object.entries(reasons)){const s=R.compare({kind}),[f,c]=s.arms;assert.equal(c.threshold,null);assert.equal(c.expression,null);assert.equal(c.reason,reason);assert.equal(R.atBudget(s,1000000)[1].available,false);assert.ok(f.expression);if(kind==='wrong-teaching')assert.ok(f.score.correct<f.score.total);}
 assert.equal(R.compare({kind:'untrusted'}).arms[1].selection,0);assert.equal(R.compare({kind:'drop-old'}).arms[1].selection,0);
});
test('six-stage sequence replays the constructor and does not claim relative-rate dominance',()=>{
 const context={window:{OrchardCoupled:E,OrchardInheritance:I,OrchardEnquiry:Q,OrchardExpression:X,OrchardMeta:M,OrchardRates:R},document:{addEventListener(){}}};
 for(const file of ['lab.js','guidance.js',...['coupled','inheritance','enquiry','expression','meta','rates'].map(id=>'experiments/'+id+'/module.js')])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist',file),'utf8'),context);
 const rows=context.window.OrchardLab.runSequence(context.window.OrchardLab.list().map(m=>m.id)),last=rows[5];
 assert.equal(rows.length,6);assert.ok(rows.every(r=>r.passed));assert.equal(last.transfer,'qualified-constructor');assert.equal(last.runtimeEvidenceTransfer,'none');assert.equal(last.authorityExpanded,false);assert.equal(last.relativeRateDominanceEstablished,false);assert.equal(Object.keys(context.window.OrchardGuidance.definitions).length,79);assert.ok(Object.isFrozen(last.comparison[0].score));
 const bad=JSON.parse(JSON.stringify(rows[4]));bad.generatorArtifact.binding+='changed';const def=context.window.OrchardLab; // Replay failure cannot be bypassed by a claimed pass.
 let module;const isolated={window:{OrchardRates:R,OrchardMeta:M,OrchardGuidance:{registerDefinitions(){}},OrchardLab:{register(d){module=d;}}}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/experiments/rates/module.js'),'utf8'),isolated);
 assert.throws(()=>module.run({protocol:'orchard-lab/1',previous:bad}),/replay/);
 assert.throws(()=>module.run({protocol:'orchard-lab/1',previous:{...rows[4],protocol:'wrong'}}),/requires/);
});
