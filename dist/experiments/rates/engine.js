/* Orchard Noncommercial Research and Evaluation Licence 1.0.
 * Copyright (c) 2026 Kimberley Laverne Asher, to the extent of rights held.
 * Commercial use requires separate written permission. See LICENSE.txt.
 */
/* A declared logical-work comparison, not a physical-compute or full MeRSIA rate theorem. */
(function(root){
  'use strict';
  const M=typeof module!=='undefined'&&module.exports?require('../meta/engine.js'):root.OrchardMeta;
  const X=typeof module!=='undefined'&&module.exports?require('../expression/engine.js'):root.OrchardExpression;
  const copy=x=>JSON.parse(JSON.stringify(x)),must=(ok,msg)=>{if(!ok)throw Error(msg);};
  const CASES=['valid','wrong-teaching','untrusted','stale','bad-validation','drop-old'];
  function fixtures(kind='valid'){must(CASES.includes(kind),'Unknown rate fixture.');const D=M.evidence('B'),V=M.validation('B');if(kind==='wrong-teaching')D.observations=M.evidence('A').observations;if(kind==='untrusted')D.trusted=false;if(kind==='stale')D.version=1;if(kind==='bad-validation')V.observations[0].y^=1;return {D,V,dropOld:kind==='drop-old'};}
  function score(g){let correct=0,total=0;if(!g)return null;const d=M.dialect('pair-or');for(const c of [3,4])for(const K of X.sets(7,c))for(const q of X.queries(7)){total++;if(d.interpret(g,K,q,c)===M.target('B',K,q,c))correct++;}return {correct,total,accuracy:correct/total};}
  const cost=(row,w)=>row.selection+row.validation*w.validation+(row.preservation+row.truth)*w.preservation+row.replaySelection+row.replayValidation*w.validation;
  function compare({kind='valid',validationWeight=1,preservationWeight=1,includeCommon=false}={}){
    must([1,2,4].includes(validationWeight)&&[1,2,4].includes(preservationWeight)&&typeof includeCommon==='boolean','Invalid declared resource weights.');
    const w={validation:validationWeight,preservation:preservationWeight},{D,V,dropOld}=fixtures(kind),G=M.generate('pair-or',dropOld),f=M.fit(G,D.observations,M.dialect('pair-or'));
    const fitCandidate=f.complete&&f.survivors.length===1?f.survivors[0]:null;
    const raw={arm:'fit-only',status:fitCandidate?'fitted':'hold',reason:fitCandidate?'unique-fit':'no-unique-fit',expression:fitCandidate,selection:f.predictions,validation:0,preservation:0,truth:0,replaySelection:0,replayValidation:0};
    let checked={arm:'checked',status:'hold',reason:'feedback',expression:null,selection:0,validation:0,preservation:0,truth:0,replaySelection:0,replayValidation:0};
    if(D.trusted===true&&V.trusted===true&&D.version===0&&V.version===0){const q=M.qualifyConstructor('pair-or',{dropOld});checked.preservation=q.preservationCases;checked.truth=q.truthCases;
      if(!q.passed)checked.reason='preservation';else {const r=M.acquireRepair(D,V,'pair-or');checked.selection=r.fit?r.fit.predictions:0;checked.validation=r.validationCount;checked.reason=r.reason;if(r.artifact){const retained=M.restoreRepair(r.artifact);checked.status='qualified';checked.expression=retained.expression;checked.replaySelection=r.fit.predictions;checked.replayValidation=r.validationCount;}}
    }
    const method=M.acquireMethod(M.evidence('A')),common={selection:method.predictions,validation:method.validationCount,preservation:method.rows.reduce((s,r)=>s+r.qualification.preservationCases,0),truth:method.rows.reduce((s,r)=>s+r.qualification.truthCases,0),replaySelection:0,replayValidation:0};
    const commonWork=cost(common,w),commonCharged=includeCommon?commonWork:0;
    const arms=[raw,checked].map(a=>{const work=cost(a,w),available=!!a.expression;return {...a,work,chargedWork:work+commonCharged,threshold:available?work+commonCharged:null,score:score(a.expression)};});
    return {kind,weights:w,includeCommon,common,commonWork,commonCharged,arms,units:'Declared logical work: response-prediction=1; semantic-validation and preservation checks have displayed weights. Replay recharges its prediction/validation work.',excluded:'Fixture generation, data-shape and structural equality overhead, support rebuilding, memory, elapsed time and hardware costs are not priced. This is not total compute.',evaluation:'8,820 frozen n=7/c=3,4 response checks. Evaluation is separate from acquisition and excluded from its resource index; fixtures were inspected during development.',rateClaim:'The checked learner does not acquire faster in the valid fixture under these weights. It applies stronger adoption obligations. No relative-rate dominance or general alignment guarantee is established.'};
  }
  function atBudget(study,budget){must(Number.isInteger(budget)&&budget>=0,'Invalid logical-work budget.');return study.arms.map(a=>({arm:a.arm,available:a.threshold!==null&&budget>=a.threshold,accuracy:a.threshold!==null&&budget>=a.threshold?a.score.accuracy:null,reason:a.threshold===null?a.reason:budget<a.threshold?'resource-prefix-incomplete':a.reason}));}
  function freeze(o){if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;}
  const api={CASES,fixtures,score,compare,atBudget};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.OrchardRates=freeze(api);
})(typeof globalThis!=='undefined'?globalThis:this);
