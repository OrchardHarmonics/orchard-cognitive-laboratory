/* Orchard Noncommercial Research and Evaluation Licence 1.0.
 * Copyright (c) 2026 Kimberley Laverne Asher, to the extent of rights held.
 * Commercial use requires separate written permission. See LICENSE.txt.
 */
/* Finite diagnostic enquiry. The policy sees responses, never the simulator's required set. */
(function(root){
  'use strict';
  const N=4,C=2,LIBRARY=['AND','XOR'];
  const ROUTES=[{id:'constructive',title:'Inherited route + constructive enquiry'},{id:'removed',title:'Additional enquiry removed'},{id:'active',title:'Conventional active diagnosis'}];
  function insist(ok,msg){if(!ok)throw new Error(msg);}
  function popcount(mask){let n=0;for(let x=mask;x;x>>=1)n+=x&1;return n;}
  const SETS=Array.from({length:16},(_,i)=>i).filter(i=>popcount(i)===C);
  const QUERIES=Array.from({length:14},(_,i)=>i+1);
  function members(mask){return Array.from({length:N},(_,i)=>i).filter(i=>mask&(1<<i));}
  function setName(mask){return '{'+members(mask).join(', ')+'}';}
  function predict(mode,K,q){const s=popcount(K&q);if(mode==='AND')return Number(s===C);if(mode==='XOR')return s%2;if(mode==='OR')return Number(s>0);throw new Error('Unknown response mechanism.');}
  function worlds(library=LIBRARY){insist(Array.isArray(library)&&library.length&&library.every(x=>LIBRARY.includes(x))&&new Set(library).size===library.length,'Unsupported installed library.');return library.flatMap(mode=>SETS.map(K=>({mode,K})));}
  function support(observations,library=LIBRARY){
    insist(Array.isArray(observations),'Invalid observation history.');
    for(const o of observations)insist(o && QUERIES.includes(o.q) && [0,1].includes(o.y) && Number.isInteger(o.version) && o.version>=0,'Invalid query observation.');
    insist(new Set(observations.map(o=>o.version)).size<=1,'Observations from different source versions cannot be merged.');
    return worlds(library).filter(w=>observations.every(o=>predict(w.mode,w.K,o.q)===o.y));
  }
  function actions(H){return [...new Set(H.map(w=>w.K))].sort((a,b)=>a-b);}
  const counters=()=>({predictions:0,scoreEvaluations:0,treeNodes:0,qualifiedWorlds:0,qualificationPredictions:0});
  function queryPrice(q,price){return price==='width'?popcount(q):1;}
  function rankQueries(H,price='unit',count=counters()){
    return QUERIES.map(q=>{
      const replies=H.map(w=>{count.predictions++;return predict(w.mode,w.K,q);});
      const zero=H.filter((_,i)=>replies[i]===0),one=H.filter((_,i)=>replies[i]===1);
      let separated=0;
      for(let i=0;i<H.length;i++)for(let j=i+1;j<H.length;j++)if(H[i].K!==H[j].K && replies[i]!==replies[j])separated++;
      count.scoreEvaluations++;
      return {q,separated,balance:Math.min(zero.length,one.length),price:queryPrice(q,price),zero,one};
    }).sort((a,b)=>b.separated-a.separated || b.balance-a.balance || a.price-b.price || a.q-b.q);
  }
  function compile(H,price='unit',count=counters()){
    insist(['unit','width'].includes(price),'Unknown query price.');
    count.treeNodes++;
    const A=actions(H);
    if(!A.length)return {kind:'hold',reason:'empty support'};
    if(A.length===1)return {kind:'leaf',K:A[0],worlds:H.length};
    const best=rankQueries(H,price,count)[0];
    if(!best || best.separated===0)return {kind:'hold',reason:'No represented query separates the required actions.'};
    return {kind:'query',q:best.q,price:best.price,worlds:H.length,actions:A.length,
      zero:compile(best.zero,price,count),one:compile(best.one,price,count)};
  }
  function qualify(tree,H,count=counters()){
    insist(Array.isArray(H)&&H.length>0&&H.every(w=>LIBRARY.includes(w.mode)&&SETS.includes(w.K)),'Qualification requires nonempty represented support.');
    for(const w of H){
      let node=tree,depth=0;
      while(node.kind==='query'){
        insist(QUERIES.includes(node.q) && ++depth<=14,'Malformed enquiry tree.');
        count.qualificationPredictions++;
        node=predict(w.mode,w.K,node.q)===0?node.zero:node.one;
      }
      insist(node.kind==='leaf' && node.K===w.K,'Enquiry tree does not reach the correct represented action.');
      count.qualifiedWorlds++;
    }
    return {passed:true,cases:H.length};
  }
  function binding(scope,O){return JSON.stringify({context:scope.context,n:N,c:C,library:LIBRARY,observations:O});}

  // queryChannel exposes a read-only response channel, source version and a supplied lifecycle hook.
  function diagnose(settings,queryChannel){
    const {route='constructive',price='unit',budget=18,permission=false,queryPermission=true,refreshPermission=true,watch=true,knownCoverageFailure=false,context='diagnosis-01'}=settings;
    insist(ROUTES.some(r=>r.id===route)&&['unit','width'].includes(price),'Invalid diagnostic route or price.');
    insist(Number.isInteger(budget)&&budget>=0&&budget<=48,'Runtime tick budget must be 0–48.');
    for(const v of [permission,queryPermission,refreshPermission,watch,knownCoverageFailure])insist(typeof v==='boolean','Invalid permission or duty switch.');
    insist(typeof context==='string'&&context.length>0&&queryChannel&&typeof queryChannel.query==='function'&&typeof queryChannel.version==='function','Invalid receiving context or query channel.');
    let ticks=0,workUnits=0,watchTicks=0,serviced=0,missed=0,queries=0,reason='unresolved';
    const O=[],history=[{query:0,tick:0,worlds:12,actions:6,phase:'start'}],trace=[],counts=counters(),scope={context};
    let H=worlds(),tree=null,extraTree=null,ranking=[],receipt=null,proposal=null,decision='hold';
    function charge(operation,cost){
      let completed=0;
      while(completed<cost){
        if(ticks>=budget){reason='budget';trace.push({tick:ticks,kind:'deadline',operation});return false;}
        ticks++;
        if(ticks%3===0){watchTicks++;if(watch)serviced++;else missed++;trace.push({tick:ticks,kind:watch?'watch':'missed-watch'});}
        else {completed++;workUnits++;trace.push({tick:ticks,kind:operation});}
      }
      return true;
    }
    function follow(compiled,phase){
      let node=compiled;
      while(node.kind==='query'){
        if(!queryPermission){reason='query-permission';return false;}
        if(!charge('query',queryPrice(node.q,price)))return false;
        const answer=queryChannel.query(node.q);
        insist(answer&&[0,1].includes(answer.y)&&Number.isInteger(answer.version),'Invalid response from query source.');
        if(O.length&&answer.version!==O[0].version){reason='source-version';return false;}
        O.push({q:node.q,y:answer.y,version:answer.version});queries++;
        H=support(O);
        history.push({query:queries,tick:ticks,worlds:H.length,actions:actions(H).length,phase,q:node.q,y:answer.y});
        node=answer.y===0?node.zero:node.one;
      }
      return true;
    }
    if(route==='active'){
      tree=compile(H,price,counts);qualify(tree,H,counts);ranking=rankQueries(H,price,counts);
      if(!follow(tree,'active'))return finish();
    }else{
      // The inherited AND-only tree is supplied scaffolding, not the method acquired in milestone two.
      tree=compile(worlds(['AND']),price,counts);qualify(tree,worlds(['AND']),counts);
      if(!follow(tree,'inherited'))return finish();
      const A=actions(H);
      if(A.length>1 && route==='constructive'){
        ranking=rankQueries(H,price,counts);extraTree=compile(H,price,counts);qualify(extraTree,H,counts);
        if(!follow(extraTree,'constructed'))return finish();
      }
    }
    if(!H.length){reason='empty-support';return finish();}
    if(actions(H).length!==1){reason=route==='removed'?'enquiry-removed':'unresolved';return finish();}
    proposal=actions(H)[0];
    if(!refreshPermission){reason='refresh-permission';return finish();}
    if(!charge('refresh',1)||!charge('receipt-qualification',1))return finish();
    receipt={version:queryChannel.version(),binding:binding(scope,O),K:proposal};
    if(queryChannel.afterQualification)queryChannel.afterQualification();
    if(knownCoverageFailure){reason='coverage';return finish();}
    if(receipt.version!==queryChannel.version() || O.some(o=>o.version!==receipt.version)){reason='stale';return finish();}
    if(missed){reason='watch';return finish();}
    if(!permission){reason='receiving-permission';return finish();}
    if(!charge('release-check',1))return finish();
    if(missed){reason='watch';return finish();}
    if(receipt.version!==queryChannel.version()){reason='stale';return finish();}
    decision='admit';reason='current';
    return finish();
    function finish(){
      const decisionTick=ticks;
      // A hold or early admission does not end the continuing watch. Service the entire declared window.
      while(ticks<budget){ticks++;if(ticks%3===0){watchTicks++;if(watch)serviced++;else missed++;trace.push({tick:ticks,kind:watch?'watch':'missed-watch'});}else trace.push({tick:ticks,kind:'idle'});}
      return {route,price,budget,context,n:N,c:C,library:[...LIBRARY],observations:O,support:H,actions:actions(H),proposal,receipt,decision,reason,
        ticks,decisionTick,workUnits,watchTicks,serviced,missed,queries,history,trace,counts,tree,extraTree,ranking,
        permission,queryPermission,refreshPermission,knownCoverageFailure,compilerSupplied:true,grammarExpanded:false};
    }
  }
  function run(options={}){
    const {mode='XOR',K=5}=options;
    insist(['AND','XOR','OR'].includes(mode)&&SETS.includes(K),'Invalid environment fixture.');
    let version=0;
    const queryChannel={query:q=>({y:predict(mode,K,q),version}),version:()=>version,
      afterQualification(){if(options.stale===true)version++;}};
    const result=diagnose(options,queryChannel);
    // This scorer is separate from diagnosis. Hidden fixture truth never enters its support or query score.
    const correctProposal=result.proposal===K;
    return {...result,environment:{mode,K,represented:LIBRARY.includes(mode)},scoring:{correct:result.decision==='admit'&&correctProposal,
      incorrect:result.decision==='admit'&&!correctProposal,withheld:result.decision==='hold',proposalMatches:result.proposal===null?null:correctProposal}};
  }
  function audit(result){
    insist(result&&result.environment&&Array.isArray(result.actions),'No complete local fixture to audit.');
    const actual=result.environment.K;
    return {trustedFixture:true,actualK:actual,proposedK:result.proposal,contradiction:!result.actions.includes(actual),
      admittedIncorrectly:result.scoring.incorrect,coverageEstablished:false};
  }
  function census(options={}){
    return ROUTES.map(r=>{
      const episodes=['AND','XOR'].flatMap(mode=>SETS.map(K=>run({...options,route:r.id,mode,K,permission:true})));
      const stress=SETS.map(K=>run({...options,route:r.id,mode:'OR',K,permission:true}));
      const tally=xs=>({episodes:xs.length,correct:xs.filter(x=>x.scoring.correct).length,incorrect:xs.filter(x=>x.scoring.incorrect).length,
        withheld:xs.filter(x=>x.scoring.withheld).length,queries:xs.reduce((n,x)=>n+x.queries,0),ticks:xs.reduce((n,x)=>n+x.decisionTick,0),missedWatches:xs.reduce((n,x)=>n+x.missed,0)});
      return {route:r.id,registered:tally(episodes),outside:tally(stress)};
    });
  }
  const api={N,C,LIBRARY,SETS,QUERIES,ROUTES,popcount,members,setName,predict,worlds,support,actions,counters,rankQueries,compile,qualify,queryPrice,binding,diagnose,run,audit,census};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.OrchardEnquiry=Object.freeze(api);
})(typeof globalThis!=='undefined'?globalThis:this);
