/* Orchard Noncommercial Research and Evaluation Licence 1.0.
 * Copyright (c) 2026 Kimberley Laverne Asher, to the extent of rights held.
 * Commercial use requires separate written permission. See LICENSE.txt.
 */
/* Acquired expressions in a supplied finite grammar. No evaluated source code. */
(function(root){
  'use strict';
  const insist=(ok,msg)=>{if(!ok)throw new Error(msg);};
  const clone=x=>JSON.parse(JSON.stringify(x));
  function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
  function bits(x){let s=0;for(;x;x>>=1)s+=x&1;return s;}
  function descriptor(n,c){insist(Number.isInteger(n)&&n>=4&&n<=7&&Number.isInteger(c)&&c>=2&&c<=4&&c<n,'Descriptor requires 4≤n≤7, 2≤c≤4 and c<n.');return {n,c};}
  function sets(n,c){descriptor(n,c);return Array.from({length:2**n},(_,K)=>K).filter(K=>bits(K)===c);}
  function queries(n){return Array.from({length:2**n-2},(_,i)=>i+1);}
  function setName(K,n=7){return '{'+Array.from({length:n},(_,i)=>i).filter(i=>K&(1<<i)).join(', ')+'}';}
  const GRAMMAR=freeze(['ge','eq','le'].flatMap(op=>[0,1,2,3,4,'c','c-1'].map(rhs=>({op,rhs}))).concat([2,3].flatMap(mod=>Array.from({length:mod},(_,residue)=>({op:'mod',mod,residue})))));
  const OLD=freeze([{op:'eq',rhs:'c'},{op:'mod',mod:2,residue:1}]);
  function expressionKey(g){return JSON.stringify(g);}
  const grammarKeys=new Set(GRAMMAR.map(expressionKey));
  function validExpression(g){return !!g&&grammarKeys.has(expressionKey(g));}
  function label(g){if(g.op==='mod')return 's mod '+g.mod+' = '+g.residue;return 's '+({ge:'≥',eq:'=',le:'≤'}[g.op])+' '+g.rhs;}
  function interpret(g,K,q,c){insist(validExpression(g),'Expression is outside the supplied grammar.');const s=bits(K&q),r=g.rhs==='c'?c:g.rhs==='c-1'?c-1:g.rhs;return g.op==='mod'?Number(s%g.mod===g.residue):Number(g.op==='ge'?s>=r:g.op==='eq'?s===r:s<=r);}
  // Dialects are trusted developer-installed contracts, never user-authored executable code.
  const BASE_DIALECT=Object.freeze({id:'fixed-26/1',valid:validExpression,interpret});
  function environment(mode,K,q,c){const s=bits(K&q);if(mode==='AND')return Number(s===c);if(mode==='XOR')return s%2;if(mode==='OR')return Number(s>=1);if(mode==='GE2')return Number(s>=2);if(mode==='EQ1')return Number(s===1);throw new Error('Unsupported environment.');}
  function worlds(n,c,L){return L.flatMap(g=>sets(n,c).map(K=>({g,K})));}
  function support(n,c,L,O,dialect=BASE_DIALECT){return worlds(n,c,L).filter(w=>O.every(o=>dialect.interpret(w.g,w.K,o.q,c)===o.y));}
  function actions(H){return [...new Set(H.map(w=>w.K))].sort((a,b)=>a-b);}
  const plans=new Map();
  function plan(n,c,H,price,dialect=BASE_DIALECT){
    const key=JSON.stringify([dialect.id,n,c,price,H]);if(plans.has(key))return plans.get(key);
    const counts={predictions:0,scores:0,nodes:0,replays:0,replayPredictions:0};
    function build(h){counts.nodes++;const a=actions(h);if(!a.length)return {kind:'hold'};if(a.length===1)return {kind:'leaf',K:a[0]};let best=null;
      for(const q of queries(n)){const zero=[],one=[];for(const w of h){counts.predictions++;(dialect.interpret(w.g,w.K,q,c)?one:zero).push(w);}const pairs=zero.reduce((sum,w)=>sum+one.filter(v=>v.K!==w.K).length,0),balance=Math.min(zero.length,one.length),cost=price==='width'?bits(q):1;counts.scores++;
        const r={q,pairs,balance,cost,zero,one};if(!best||pairs>best.pairs||pairs===best.pairs&&(balance>best.balance||balance===best.balance&&(cost<best.cost||cost===best.cost&&q<best.q)))best=r;
      }
      if(!best.pairs)return {kind:'hold'};return {kind:'query',q:best.q,zero:build(best.zero),one:build(best.one)};
    }
    const tree=build(H);
    for(const w of H){let t=tree,depth=0;while(t.kind==='query'){insist(++depth<2**n,'Cyclic diagnostic tree.');counts.replayPredictions++;t=dialect.interpret(w.g,w.K,t.q,c)?t.one:t.zero;}insist(t.kind==='leaf'&&t.K===w.K,'Tree failed represented-world qualification.');counts.replays++;}
    const result=freeze({tree,counts});plans.set(key,result);return result;
  }
  function diagnose(settings,channel,L=OLD,dialect=BASE_DIALECT){
    // Deliberately do not destructure mode or K: they belong only to the simulator.
    const {n=7,c=3,budget=48,price='unit',route='inherited',permission=false,queryPermission=true,refreshPermission=true,watch=true,knownFailure=false,context='fresh-'+n+'-'+c}=settings;
    descriptor(n,c);insist(Number.isInteger(budget)&&budget>=0&&budget<=64&&['unit','width'].includes(price)&&['inherited','active'].includes(route),'Invalid runtime settings.');
    insist(dialect&&typeof dialect.id==='string'&&typeof dialect.valid==='function'&&typeof dialect.interpret==='function','Invalid supplied semantic contract.');
    insist(L.length>=2&&L.every(dialect.valid)&&new Set(L.map(expressionKey)).size===L.length,'Invalid installed library.');
    for(const v of [permission,queryPermission,refreshPermission,watch,knownFailure])insist(typeof v==='boolean','Invalid permission or duty flag.');
    insist(channel&&typeof channel.query==='function'&&typeof channel.version==='function','Missing response channel.');
    let H=worlds(n,c,L),tick=0,work=0,serviced=0,missed=0,reason='unresolved',proposal=null,receipt=null,decision='hold';
    const O=[],trace=[],history=[{query:0,tick:0,worlds:H.length,actions:actions(H).length,phase:'start'}],counts={predictions:0,scores:0,nodes:0,replays:0,replayPredictions:0};
    function charge(kind,cost){let used=0;while(used<cost){if(tick>=budget){reason='budget';return false;}tick++;if(tick%3===0){if(watch)serviced++;else missed++;trace.push({tick,kind:watch?'watch':'missed-watch'});}else{used++;work++;trace.push({tick,kind});}}return true;}
    function follow(h,phase){const compiled=plan(n,c,h,price,dialect);for(const k of Object.keys(counts))counts[k]+=compiled.counts[k];let t=compiled.tree;
      while(t.kind==='query'){if(!queryPermission){reason='query-permission';return false;}if(!charge('query',price==='width'?bits(t.q):1))return false;const answer=channel.query(t.q);insist(answer&&[0,1].includes(answer.y)&&Number.isInteger(answer.version)&&answer.version>=0,'Invalid query response.');if(O.length&&O[0].version!==answer.version){reason='source-version';return false;}O.push({q:t.q,y:answer.y,version:answer.version});H=support(n,c,L,O,dialect);history.push({query:O.length,tick,worlds:H.length,actions:actions(H).length,q:t.q,y:answer.y,phase});t=answer.y?t.one:t.zero;}return true;
    }
    if(!follow(route==='active'?H:worlds(n,c,OLD.slice(0,1)),route==='active'?'active':'inherited'))return finish();
    const atOldLeaf=route==='inherited'?{observations:clone(O),worlds:H.length,actions:actions(H),oldActions:actions(support(n,c,OLD,O,dialect))}:null;
    if(actions(H).length>1&&!follow(H,'constructed'))return finish(atOldLeaf);
    if(!H.length){reason='empty-support';return finish(atOldLeaf);}if(actions(H).length!==1)return finish(atOldLeaf);
    proposal=actions(H)[0];if(!refreshPermission){reason='refresh-permission';return finish(atOldLeaf);}if(!charge('refresh',1)||!charge('qualification',1))return finish(atOldLeaf);
    receipt={version:channel.version(),binding:JSON.stringify({context,n,c,L,O,proposal})};if(channel.afterQualification)channel.afterQualification();
    if(knownFailure){reason='coverage';return finish(atOldLeaf);}if(receipt.version!==channel.version()||O.some(o=>o.version!==receipt.version)){reason='stale';return finish(atOldLeaf);}if(missed){reason='watch';return finish(atOldLeaf);}if(!permission){reason='receiving-permission';return finish(atOldLeaf);}if(!charge('admission',1))return finish(atOldLeaf);
    if(missed){reason='watch';return finish(atOldLeaf);}if(receipt.version!==channel.version()){reason='stale';return finish(atOldLeaf);}decision='admit';reason='current';return finish(atOldLeaf);
    function finish(oldLeaf=null){const decisionTick=tick;while(tick<budget){tick++;if(tick%3===0){if(watch)serviced++;else missed++;trace.push({tick,kind:watch?'watch':'missed-watch'});}else trace.push({tick,kind:'idle'});}return {n,c,L:clone(L),context,O,H,actions:actions(H),proposal,decision,reason,receipt,decisionTick,ticks:tick,work,serviced,missed,trace,history,counts,oldLeaf,permission};}
  }
  function run(settings={},L=OLD){const {n=7,c=3,mode='OR',K=11}=settings;insist(sets(n,c).includes(K)&&['AND','XOR','OR','GE2','EQ1'].includes(mode),'Invalid simulator fixture.');let version=0;const channel={query:q=>({y:environment(mode,K,q,c),version}),version:()=>version,afterQualification(){if(settings.stale)version++;}};const r=diagnose(settings,channel,L);return {...r,environment:{mode,K},scoring:{correct:r.decision==='admit'&&r.proposal===K,incorrect:r.decision==='admit'&&r.proposal!==K,withheld:r.decision==='hold',proposalMatches:r.proposal===null?null:r.proposal===K}};}
  function verifyGap(gap){insist(gap&&gap.type==='orchard-audited-gap/1'&&gap.n===4&&gap.c===2&&gap.audit&&gap.audit.trustedFixture===true&&gap.audit.contradiction===true&&sets(4,2).includes(gap.audit.actualK),'Missing trusted initiating gap.');insist(Array.isArray(gap.observations)&&gap.observations.length&&gap.observations.every(o=>queries(4).includes(o.q)&&[0,1].includes(o.y)&&o.version===0),'Invalid initiating history.');const A=actions(support(4,2,OLD,gap.observations));insist(A.length===1&&A[0]===gap.proposal&&!A.includes(gap.audit.actualK),'Audit does not expose an old-library false conclusion.');return true;}
  function makeEvidence(gap=null){if(gap)verifyGap(gap);const cases=[];
    for(const n of [4,5])for(const c of [2,3]){let bad=null;if(gap&&n===4&&c===2)bad={environment:{K:gap.audit.actualK},proposal:gap.proposal,O:gap.observations};else for(const K of sets(n,c)){const r=run({n,c,mode:'OR',K,budget:64,permission:true});if(r.scoring.incorrect){bad=r;break;}}insist(bad,'No audited failure in calibration scope.');const K=bad.environment.K;cases.push({n,c,audit:{source:'supplied-exact-set-'+n+'-'+c,version:0,trusted:true,incorrect:true,actualK:K,proposal:bad.proposal},trace:clone(bad.O),observations:queries(n).map(q=>({n,c,K,q,y:environment('OR',K,q,c)}))});}
    const validation=[2,3,4].flatMap(c=>sets(6,c).flatMap(K=>queries(6).map(q=>({n:6,c,K,q,y:environment('OR',K,q,c)}))));return {cases,validation,validationSource:{source:'supplied-semantic-measurements-n6',version:0,trusted:true},initiatingGapConsumed:!!gap};
  }
  function checkObservation(o){insist(o&&sets(o.n,o.c).includes(o.K)&&queries(o.n).includes(o.q)&&[0,1].includes(o.y),'Invalid semantic observation.');}
  function ledger(D,grammar=GRAMMAR){D.forEach(checkObservation);insist(grammar.every(validExpression)&&new Set(grammar.map(expressionKey)).size===grammar.length,'Invalid selection grammar.');return grammar.map(g=>({g:clone(g),label:label(g),mismatches:D.filter(o=>interpret(g,o.K,o.q,o.c)!==o.y).length,predictions:D.length}));}
  function select(evidence,grammar=GRAMMAR){
    const result={status:'hold',reason:'feedback',survivors:[],ledger:[],candidate:null,artifact:null,calibrationCount:0,selectionPredictions:0,validationCount:0,validationMismatches:null,grammarCount:grammar.length};
    if(!evidence||!evidence.cases||!evidence.cases.length||!evidence.validationSource||evidence.validationSource.trusted!==true||evidence.cases.some(x=>!x.audit||x.audit.trusted!==true||x.audit.incorrect!==true))return result;
    if(evidence.validationSource.version!==0||evidence.cases.some(x=>x.audit.version!==0)){result.reason='stale-feedback';return result;}
    for(const x of evidence.cases){insist(sets(x.n,x.c).includes(x.audit.actualK)&&x.audit.actualK!==x.audit.proposal,'Invalid exact-set audit.');insist(x.observations.every(o=>o.n===x.n&&o.c===x.c&&o.K===x.audit.actualK),'Calibration measurements do not match the audited dependency set.');}
    const D=evidence.cases.flatMap(x=>x.observations);if(!D.length)return result;
    result.ledger=ledger(D,grammar);result.calibrationCount=D.length;result.selectionPredictions=D.length*grammar.length;result.survivors=result.ledger.filter(x=>!x.mismatches).map(x=>x.g);
    if(result.survivors.length!==1){result.reason=result.survivors.length?'ambiguous':'no-candidate';return result;}
    result.candidate=result.survivors[0];result.status='selected';result.reason='unique';return result;
  }
  function acquire(evidence,grammar=GRAMMAR){
    const result=select(evidence,grammar);if(result.status!=='selected')return result;
    const required=new Set(['4/2','4/3','5/2','5/3']),seen=new Set(evidence.cases.map(x=>x.n+'/'+x.c));
    if(evidence.cases.length!==4||seen.size!==4||[...seen].some(x=>!required.has(x))||evidence.cases.some(x=>x.observations.length!==queries(x.n).length||new Set(x.observations.map(o=>o.q)).size!==queries(x.n).length)){result.status='hold';result.reason='calibration-scope';return result;}
    const D=evidence.cases.flatMap(x=>x.observations),V=evidence.validation;V.forEach(checkObservation);result.validationCount=V.length;result.validationMismatches=V.filter(o=>interpret(result.candidate,o.K,o.q,o.c)!==o.y).length;result.status='hold';
    const expected=sets(6,2).length*62+sets(6,3).length*62+sets(6,4).length*62,coverage=new Set(V.map(o=>[o.n,o.c,o.K,o.q].join('/')));
    if(V.length!==expected||coverage.size!==expected||V.some(o=>o.n!==6||![2,3,4].includes(o.c))){result.reason='validation-scope';return result;}
    if(result.validationMismatches){result.reason='validation';return result;}
    const expression=clone(result.candidate),data=clone(evidence),scope={calibration:[{n:4,c:[2,3]},{n:5,c:[2,3]}],validation:{n:6,c:[2,3,4]},grammar:'fixed-26/1'};
    const certificate={type:'orchard-expression-certificate/1',expression,binding:JSON.stringify({expression,evidence:data,grammar,scope}),scope,calibration:D.length,validation:V.length,mismatches:0,sourceVersion:0};
    result.status='qualified';result.reason='validated';result.artifact=freeze({type:'orchard-expression-artifact/1',expression,evidence:data,grammar:clone(grammar),certificate});return result;
  }
  function restore(artifact){insist(artifact&&artifact.type==='orchard-expression-artifact/1','Missing expression artifact.');const replay=acquire(artifact.evidence,artifact.grammar);insist(replay.status==='qualified'&&expressionKey(replay.artifact.expression)===expressionKey(artifact.expression)&&JSON.stringify(replay.artifact.certificate)===JSON.stringify(artifact.certificate),'Expression certificate or evidence failed replay.');return replay.artifact;}
  function library(artifact){const checked=restore(artifact);return freeze([...clone(OLD),clone(checked.expression)]);}
  function tally(episodes){return {total:episodes.length,correct:episodes.filter(x=>x.scoring.correct).length,incorrect:episodes.filter(x=>x.scoring.incorrect).length,withheld:episodes.filter(x=>x.scoring.withheld).length,queries:episodes.reduce((s,x)=>s+x.O.length,0),work:episodes.reduce((s,x)=>s+x.work,0),missed:episodes.reduce((s,x)=>s+x.missed,0)};}
  function comparison(artifact,{budget=48,price='unit'}={}){const checked=restore(artifact),expanded=[...OLD,checked.expression];return ['inherited','removed','restored','active'].map(arm=>{const L=arm==='removed'?OLD:expanded,route=arm==='active'?'active':'inherited';const episodes=['AND','XOR','OR'].flatMap(mode=>sets(7,3).map(K=>run({n:7,c:3,mode,K,budget,price,route,permission:true},L))),stress=['GE2','EQ1'].flatMap(mode=>sets(7,3).map(K=>run({n:7,c:3,mode,K,budget:64,price,route,permission:true},L)));return {arm,main:tally(episodes),stress:tally(stress),or:tally(episodes.filter(x=>x.environment.mode==='OR')),outcomes:episodes.map(x=>({mode:x.environment.mode,K:x.environment.K,correct:x.scoring.correct,incorrect:x.scoring.incorrect,withheld:x.scoring.withheld}))};});}
  const api={BASE_DIALECT,GRAMMAR,OLD,bits,sets,queries,setName,expressionKey,label,interpret,environment,worlds,support,actions,plan,diagnose,run,verifyGap,makeEvidence,ledger,select,acquire,restore,library,tally,comparison};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.OrchardExpression=Object.freeze(api);
})(typeof globalThis!=='undefined'?globalThis:this);
