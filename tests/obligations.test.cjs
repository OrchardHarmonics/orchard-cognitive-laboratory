/* Orchard Noncommercial Research and Evaluation Licence 1.0. See LICENSE.txt. */
const assert=require('node:assert/strict'),{test}=require('node:test');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const S=require('../dist/experiments/obligations/engine.js'),M=require('../dist/experiments/meta/engine.js');
test('different risk expression and all five context fields are actually acquired',()=>{
 const s=S.compare();assert.equal(s.passed,true);assert.equal(s.candidates,47);assert.equal(s.teaching,9);assert.equal(s.validation,6);
 assert.deepEqual(s.expression,{op:'join',operator:'or',left:{op:'eq',rhs:1},right:{op:'eq',rhs:'c'}});
 assert.deepEqual(s.projection.fields,['s','c','permission','anchor','current']);assert.equal(s.projection.minima,1);assert.equal(s.projection.visits,3840);
 assert.equal(s.phases[2].newWarranted,64);assert.equal(s.frozen.warranted,272);assert.equal(s.frozen.admissions,26);assert.equal(s.frozen.wrongAdmissions,0);
});
test('independent finite release oracle agrees beyond teaching and validation',()=>{
 const s=S.compare();let allowed=0,unsafe=0,total=0;
 for(let c=6;c<=9;c++)for(let count=0;count<=c;count++)for(const p of [0,1])for(const a of [0,1])for(const v of [0,1]){
  // Derive the count independently from a finite marked set.
  const marked=new Set(Array.from({length:count},(_,i)=>i));const blocked=marked.size===1||marked.size===c;
  const eligible=Number(!blocked&&p===1&&a===1&&v===1),x={s:count,c,permission:p,anchor:a,current:v};
  assert.equal(S.reference(x),eligible);const acquired=Number(!S.interpret(s.expression,count,c)&&p&&a&&v);assert.equal(acquired,eligible);allowed+=eligible;total++;
  if(count!==0&&count!==c-1&&!eligible)unsafe++;
 }
 assert.equal(total,272);assert.equal(allowed,26);assert.equal(unsafe,190);assert.equal(s.unchecked.wrongAdmissions,unsafe);
});
test('the collision is an impossibility witness in the declared projection language',()=>{
 const s=S.compare(),w=s.projection.coarse.witness;assert.deepEqual([w.left.s,w.left.c],[w.right.s,w.right.c]);assert.notEqual(S.reference(w.left),S.reference(w.right));
 for(const field of S.FIELDS){const q=S.qualifyView(S.FIELDS.filter(f=>f!==field),S.domain([3,4,5]));assert.equal(q.adequate,false,field);}
});
test('removal, restoration and strong comparators bound the inheritance claim',()=>{
 assert.equal(S.compare({route:'removed'}).reason,'no-expression');const learned=S.compare(),restored=S.compare({route:'restored'}),pre=S.compare({route:'preinstalled'}),direct=S.compare({route:'direct'});
 assert.deepEqual(restored.expression,learned.expression);assert.deepEqual(pre.frozen,learned.frozen);assert.deepEqual(direct.frozen,learned.frozen);
 assert.equal(learned.costs.total,4303);assert.equal(pre.costs.total,4303);assert.equal(direct.costs.total,4492);assert.equal(direct.candidates,68);
 assert.equal(learned.sourceCommonWork,16788);assert.equal(restored.sourceCommonWork,25182);assert.equal(pre.sourceCommonWork,0);
 assert.equal(learned.legacy.preserved,34);
});
test('no grant, insufficient work and a changed revision hold every receiving effect',()=>{
 const s=S.compare();assert.equal(S.atPhase(s,3).held,272);assert.equal(S.atPhase(s,3).warranted,272);
 for(const phase of [0,1,2])assert.equal(S.atPhase(s,phase,{grant:true}).held,272);
 assert.equal(S.atPhase(s,3,{grant:true,budget:4302}).held,272);assert.equal(S.atPhase(s,3,{grant:true,budget:4303}).admissions,26);
 assert.equal(S.atPhase(s,3,{grant:true,revision:2}).reason,'receipt-stale');assert.equal(S.isCurrent(s.receipt,s.expression,s.projection.fields,'renamed'),false);
 assert.throws(()=>S.atPhase(s,3,{grant:'yes'}),/grant/);assert.throws(()=>S.atPhase(s,4),/phase/);
});
test('wrong feedback, unauthorized reference, off-language target and descriptor mismatch stay held',()=>{
 const expected={'bad-feedback':'validation-failed',unapproved:'reference-change-not-authorized','off-language':'no-expression','wrong-map':'descriptor-map-failed'};
 for(const [condition,reason] of Object.entries(expected)){const s=S.compare({condition});assert.equal(s.reason,reason);assert.equal(s.passed,false);assert.equal(S.atPhase(s,3,{grant:true,budget:1000000}).held,272);assert.equal(s.phases[2].newWarranted,0);}
 const renamed=S.compare({condition:'renamed'});assert.equal(renamed.passed,true);assert.equal(renamed.costs.mapping,120);assert.equal(renamed.costs.total,4423);
});
test('seven-stage sequence carries and replays the real constructor through stage six',()=>{
 const names={coupled:'Coupled',inheritance:'Inheritance',enquiry:'Enquiry',expression:'Expression',meta:'Meta',rates:'Rates',obligations:'Obligations'},window={};
 for(const [dir,name] of Object.entries(names))window['Orchard'+name]=require('../dist/experiments/'+dir+'/engine.js');
 const context={window,document:{addEventListener(){}}};for(const file of ['lab.js','guidance.js',...Object.keys(names).map(id=>'experiments/'+id+'/module.js')])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist',file),'utf8'),context);
 const rows=window.OrchardLab.runSequence(window.OrchardLab.list().map(x=>x.id));assert.equal(rows.length,7);assert.ok(rows.every(r=>r.passed));assert.ok(rows[5].generatorArtifact);assert.equal(rows[6].previousConsumed,true);assert.equal(rows[6].study.sourceCommonWork,8394);assert.equal(rows[6].runtimeEvidenceTransfer,'none');assert.equal(rows[6].authorityExpanded,false);assert.equal(rows[6].relativeRateDominanceEstablished,false);
 assert.ok(Object.isFrozen(rows[6].study.receipt));
 let definition;const isolated={window:{OrchardObligations:S,OrchardMeta:M,OrchardGuidance:{registerDefinitions(){}},OrchardLab:{register(d){definition=d;}}}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/experiments/obligations/module.js'),'utf8'),isolated);
 const bad=JSON.parse(JSON.stringify(rows[5]));bad.generatorArtifact.binding+='tampered';assert.throws(()=>definition.run({protocol:'orchard-lab/1',previous:bad}),/replay/);
 assert.throws(()=>definition.run({protocol:'orchard-lab/1',previous:rows[4]}),/stage-six/);
});
