/* Orchard Noncommercial Research and Evaluation Licence 1.0.
 * Copyright (c) 2026 Kimberley Laverne Asher, to the extent of rights held.
 * Commercial use requires separate written permission. See LICENSE.txt.
 */
/* Stage seven: a new finite study, with a supplied count adapter and reference. */
(function(root){
  'use strict';
  const M=typeof module!=='undefined'&&module.exports?require('../meta/engine.js'):root.OrchardMeta;
  const clone=x=>JSON.parse(JSON.stringify(x)),must=(b,m)=>{if(!b)throw Error(m);};
  const FIELDS=['s','c','permission','anchor','current'];
  const ROUTES=['learned','removed','restored','preinstalled','direct'];
  const CONDITIONS=['valid','renamed','bad-feedback','unapproved','off-language','wrong-map'];
  const risk=(s,c,kind='valid')=>Number(s===1||s===c||(kind==='off-language'&&s===0));
  const oldRisk=(s,c)=>Number(s===0||s===c-1);
  const reference=(x,kind='valid')=>Number(!risk(x.s,x.c,kind)&&x.permission&&x.anchor&&x.current);
  // This installed adapter preserves the existing count interpretation; it is not learned.
  const DIALECTS={or:M.dialect('pair-or'),and:M.dialect('pair-and')};
  const interpret=(g,s,c)=>DIALECTS[g.operator==='and'?'and':'or'].interpret(g,2**c-1,2**s-1,c);
  function domain(totals){return totals.flatMap(c=>Array.from({length:c+1},(_,s)=>Array.from({length:8},(_,bits)=>({s,c,permission:bits&1,anchor:(bits>>1)&1,current:(bits>>2)&1}))).flat());}
  function data(kind='valid',totals=[3,4]){return totals.flatMap(c=>Array.from({length:c+1},(_,s)=>({s,c,y:risk(s,c,kind)})));}
  function fit(G,D){const survivors=G.filter(g=>D.reduce((n,o)=>n+Number(interpret(g,o.s,o.c)!==o.y),0)===0);return {survivors:clone(survivors),predictions:G.length*D.length,candidates:G.length};}
  function key(x,fields){return JSON.stringify(fields.map(f=>x[f]));}
  function qualifyView(fields,rows,kind='valid'){
    const fibres=new Map();let witness=null;
    for(const x of rows){const k=key(x,fields),y=reference(x,kind);if(!fibres.has(k))fibres.set(k,{x,y});else if(fibres.get(k).y!==y&&!witness)witness={left:clone(fibres.get(k).x),right:clone(x),leftAnswer:fibres.get(k).y,rightAnswer:y};}
    return {adequate:!witness,witness,visits:rows.length,classes:fibres.size};
  }
  function searchView(kind='valid'){
    const rows=domain([3,4,5]),candidates=Array.from({length:32},(_,m)=>FIELDS.filter((_,i)=>m&(1<<i))),checks=candidates.map(fields=>({fields,...qualifyView(fields,rows,kind)})),ok=checks.filter(r=>r.adequate).sort((a,b)=>a.fields.length-b.fields.length);
    return {fields:ok[0].fields,minimumSize:ok[0].fields.length,minima:ok.filter(r=>r.fields.length===ok[0].fields.length).length,candidates:checks.length,visits:checks.reduce((s,r)=>s+r.visits,0),coarse:qualifyView(['s','c'],rows,kind)};
  }
  function adapt(x,condition){
    if(condition!=='renamed'&&condition!=='wrong-map')return clone(x);
    const raw={observedCount:x.s,capacity:x.c,ownerGrant:x.permission,warrant:x.anchor,sourceCurrent:x.current};
    return {s:condition==='wrong-map'?raw.capacity:raw.observedCount,c:condition==='wrong-map'?raw.observedCount:raw.capacity,permission:raw.ownerGrant,anchor:raw.warrant,current:raw.sourceCurrent};
  }
  function mapQualified(condition){const rows=domain([3,4,5]);return {passed:rows.every(x=>JSON.stringify(adapt(x,condition))===JSON.stringify(x)),checks:condition==='renamed'||condition==='wrong-map'?rows.length:0};}
  function bind(contract,revision,expression,fields,condition){return JSON.stringify({contract,revision,expression,fields,condition});}
  function capture(expression,fields,condition,revision=1){return {contract:'orchard-obligations/1',revision,binding:bind('orchard-obligations/1',revision,expression,fields,condition)};}
  function isCurrent(receipt,expression,fields,condition,revision=1){return !!receipt&&receipt.contract==='orchard-obligations/1'&&receipt.revision===revision&&receipt.binding===bind('orchard-obligations/1',revision,expression,fields,condition);}
  function census(expression,fields,condition='valid',receivingGrant=false,qualified=false){
    const rows=domain([6,7,8,9]),groups=new Map();
    for(const x of rows){const y=Number(!interpret(expression,x.s,x.c)&&x.permission&&x.anchor&&x.current),k=key(x,fields);if(!groups.has(k))groups.set(k,new Set());groups.get(k).add(y);}
    let warranted=0,wrongLabels=0,admissions=0,wrongAdmissions=0,blocks=0,held=0;
    for(const actual of rows){const observed=adapt(actual,condition),answers=groups.get(key(observed,fields));const y=answers&&answers.size===1?[...answers][0]:null;
      if(y!==null){warranted++;if(y!==reference(actual,condition))wrongLabels++;}
      if(!qualified||!receivingGrant||y===null)held++;else if(y===1){admissions++;if(!reference(actual,condition))wrongAdmissions++;}else blocks++;
    }
    return {total:rows.length,warranted,wrongLabels,admissions,wrongAdmissions,blocks,held};
  }
  function uncheckedCensus(kind='valid'){const rows=domain([6,7,8,9]);let admissions=0,wrongAdmissions=0;for(const x of rows)if(!oldRisk(x.s,x.c)){admissions++;if(!reference(x,kind))wrongAdmissions++;}return {total:rows.length,admissions,wrongAdmissions};}
  function source(artifact){return artifact?M.restoreMethod(artifact):M.restoreMethod(M.acquireMethod(M.evidence('A')).artifact);}
  function compare({route='learned',condition='valid',artifact=null}={}){
    must(ROUTES.includes(route)&&CONDITIONS.includes(condition),'Unknown stage-seven setting.');
    const inherited=['learned','removed','restored'].includes(route)?source(artifact):null,recipe=route==='removed'?'base':route==='restored'?M.restoreMethod(inherited).contract.recipe:inherited?inherited.contract.recipe:'pair-or';
    // The direct comparator has the same primitive meanings and all one-pair AND/OR programs.
    const G=route==='direct'?[...M.generate('base'),...M.generate('pair-and').slice(26),...M.generate('pair-or').slice(26)]:M.generate(recipe);
    const D=data(condition),V=data(condition,[5]);if(condition==='bad-feedback')D.forEach(o=>{o.y=oldRisk(o.s,o.c);});
    const fitted=fit(G,D),expression=fitted.survivors.length===1?fitted.survivors[0]:null,validation=expression?V.filter(o=>interpret(expression,o.s,o.c)!==o.y).length:null;
    const projection=searchView(condition),mapping=mapQualified(condition),authorized=condition!=='unapproved';
    const passed=authorized&&mapping.passed&&!!expression&&validation===0;
    const reason=!authorized?'reference-change-not-authorized':!mapping.passed?'descriptor-map-failed':!expression?(fitted.survivors.length?'ambiguous-expression':'no-expression'):validation?'validation-failed':'qualified';
    const legacyRows=data('valid',[6,7,8,9]),oldExpression={op:'join',operator:'or',left:{op:'eq',rhs:0},right:{op:'eq',rhs:'c-1'}},legacy={predictions:legacyRows.length,preserved:legacyRows.filter(o=>interpret(oldExpression,o.s,o.c)===oldRisk(o.s,o.c)).length};
    const costs={fit:fitted.predictions,validation:expression?V.length:0,projection:projection.visits,mapping:mapping.checks,legacy:legacy.predictions};costs.total=costs.fit+costs.validation+costs.projection+costs.mapping+costs.legacy;
    const receipt=passed?capture(expression,projection.fields,condition):null;
    const phases=[
      {name:'Old responsibility',status:'historical',newWarranted:0,total:272,unsafe:0,explanation:'The old count-risk model and {s,c} view were qualified for the old prediction question. This is a preserved historical result, not a qualification for the new release question.'},
      {name:'Obligations change',status:'hold',newWarranted:0,total:272,unsafe:0,explanation:'A new externally supplied reference changes both the risk question and the conditions for release. The old receipt is out of scope; receiving use holds.'},
      {name:'Learn the new rule',status:'hold',newWarranted:passed?census(expression,['s','c'],condition).warranted:0,total:272,unsafe:0,explanation:expression?'A response expression has been fitted, but the coarse view still merges different permission, warrant and currentness states. Partial labels do not qualify the complete release contract.':'The selected language/feedback does not yield a unique expression. More receiving permission cannot repair this failure.'},
      {name:'Repair and requalify',status:passed?'qualified':'hold',newWarranted:passed?census(expression,projection.fields,condition).warranted:0,total:272,unsafe:0,explanation:passed?'The new rule, adequate view and current receipt qualify the supplied finite contract. A separate current receiving grant is still required.':'The pipeline remains held: '+reason+'.'}
    ];
    return {route,condition,passed,reason,recipe,candidates:G.length,teaching:D.length,validation:expression?V.length:0,validationMismatches:validation,expression,expressionLabel:expression?M.label(expression):null,projection,mapping,costs,receipt,phases,unchecked:uncheckedCensus(condition),frozen:passed?census(expression,projection.fields,condition,true,true):null,sourceRecipe:inherited?inherited.contract.recipe:'supplied',sourceCommonWork:inherited?8394*((artifact?1:2)+(route==='restored'?1:0)):0,legacy,limits:'An authored count adapter, exact feedback, externally supplied reference authorization, 32 coordinate projections and an honest host are fixed foundations. 272 frozen cases at c=6..9 were inspected during development, not independently replicated. Receipt equality is currentness, not authentication. No actual effects or MeRSIA rate theorem.'};
  }
  function atPhase(study,phase,{grant=false,budget=study.costs.total,revision=1}={}){
    must(Number.isInteger(phase)&&phase>=0&&phase<=3&&Number.isInteger(budget)&&budget>=0,'Invalid phase or budget.');
    must(typeof grant==='boolean'&&Number.isInteger(revision)&&revision>=1,'Invalid receiving grant or revision.');
    const current=study.passed&&isCurrent(study.receipt,study.expression,study.projection.fields,study.condition,revision),ready=phase===3&&current&&budget>=study.costs.total;
    const result=study.expression?census(study.expression,phase===3?study.projection.fields:['s','c'],study.condition,grant,ready):{total:272,warranted:0,wrongLabels:0,admissions:0,wrongAdmissions:0,blocks:0,held:272};
    if(phase<2||!study.passed)result.warranted=0;if(phase===3&&!ready)result.warranted=0;
    return {...result,ready,current,reason:phase<3?'new-contract-not-yet-qualified':!study.passed?study.reason:!current?'receipt-stale':budget<study.costs.total?'work-prefix-incomplete':!grant?'receiving-grant-off':'current-qualified-use'};
  }
  const api={FIELDS,ROUTES,CONDITIONS,risk,oldRisk,reference,interpret,domain,data,fit,qualifyView,searchView,adapt,mapQualified,capture,isCurrent,census,uncheckedCensus,source,compare,atPhase};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.OrchardObligations=Object.freeze(api);
})(typeof globalThis!=='undefined'?globalThis:this);
