/* Orchard Noncommercial Research and Evaluation Licence 1.0.
 * Copyright (c) 2026 Kimberley Laverne Asher, to the extent of rights held.
 * Commercial use requires separate written permission. See LICENSE.txt.
 */
/* Bounded construction-policy development. Fixed grammar, qualifier and honest host. */
(function (root) {
  'use strict';
  const E = typeof module !== 'undefined' && module.exports ? require('../coupled/engine.js') : root.OrchardCoupled;
  const SCOPE = 'orchard-five-bit/b1/counts-at-most-three/v1';
  const VERSION = 'construction-policy/1';
  const ROUTES = [
    { id: 'intact', title: 'Inherited method intact', rounds: 1 },
    { id: 'removed', title: 'Construction method removed', rounds: 1 },
    { id: 'restored', title: 'Removed, then restored', rounds: 1 },
    { id: 'relearn-one', title: 'Reconstruct · one round', rounds: 1 },
    { id: 'relearn-two', title: 'Reconstruct · two rounds', rounds: 2 },
    { id: 'fresh', title: 'Fresh policy · two rounds', rounds: 2 },
    { id: 'specificity', title: 'Unrelated enquiry removed', rounds: 1 },
    { id: 'preinstalled', title: 'Composite already installed', rounds: 0 },
    { id: 'direct', title: 'Supplied direct search', rounds: 0 }
  ];
  function insist(ok, message) { if (!ok) throw new Error(message); }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function freeze(x) { if (x && typeof x === 'object') { Object.values(x).forEach(freeze); Object.freeze(x); } return x; }
  function canonical(x) {
    if (Array.isArray(x)) return '[' + x.map(canonical).join(',') + ']';
    if (x && typeof x === 'object') return '{' + Object.keys(x).sort().map(k => JSON.stringify(k) + ':' + canonical(x[k])).join(',') + '}';
    return JSON.stringify(x);
  }
  function validatePolicy(p, depth = 0) {
    insist(p && depth < 12, 'Invalid or oversized construction policy.');
    const keys = Object.keys(p).sort().join(',');
    if (['hold','inquiry','construct-rule'].includes(p.kind)) insist(keys === 'kind', 'Unexpected primitive policy fields.');
    else if (p.kind === 'fallback') {
      insist(keys === 'kind,next,old', 'Malformed fallback.'); validatePolicy(p.old, depth + 1); validatePolicy(p.next, depth + 1);
    } else if (p.kind === 'compose') {
      insist(keys === 'basis,kind', 'Malformed captured compositor.'); validatePolicy(p.basis, depth + 1);
      insist(!contains(p.basis, 'compose'), 'Captured component basis must exclude compositors.');
    } else throw new Error('Unknown construction-policy primitive.');
    return true;
  }
  function contains(p, kind) { return p.kind === kind || p.kind === 'fallback' && (contains(p.old, kind) || contains(p.next, kind)); }
  function projection(p) {
    validatePolicy(p);
    if (p.kind === 'compose') return { kind: 'hold' };
    if (p.kind !== 'fallback') return clone(p);
    if (p.next.kind === 'compose') return projection(p.old);
    return { kind: 'fallback', old: projection(p.old), next: projection(p.next) };
  }
  const supplied = () => ({ kind: 'fallback', old: { kind: 'hold' }, next: { kind: 'inquiry' } });
  function removeMethod(p, kind) {
    validatePolicy(p);
    if(p.kind===kind)return {kind:'hold'};
    if(p.kind==='fallback') {
      if(p.next.kind===kind)return clone(p.old);
      return {kind:'fallback',old:removeMethod(p.old,kind),next:removeMethod(p.next,kind)};
    }
    return clone(p);
  }
  const counters = () => ({ rounds: 0, candidates: 0, constructorCalls: 0, qualifierCases: 0, componentUses: 0, pairChecks: 0, executionCalls: 0 });
  function qualify(s, c) { const q = E.qualifyRule(s.budget); c.qualifierCases += q.cases; return q; }
  function preserves(a, b) {
    return a.point.every((v,x) => v === null || b.point[x] === v)
      && a.receiving.every((v,x) => v === null || b.receiving[x] === v);
  }
  function eligible(before, after) {
    const a=E.evaluate(before), b=E.evaluate(after);
    return b.consistent && preserves(a,b) && b.coverage > a.coverage;
  }
  function constructRule(s, c) {
    c.constructorCalls++;
    if (s.global) return null;
    qualify(s,c);
    const next={...s,global:true};
    return eligible(s,next) ? {state:next, steps:['rule'], via:'construct-rule'} : null;
  }
  function transaction(s, order, c) {
    c.pairChecks++;
    if (!s.exposeAllowed) return null;
    let current=s;
    const trace=[];
    for (const step of order) {
      const before=E.evaluate(current);
      const next=step==='rule' ? {...current,global:true} : {...current,refined:true};
      if (step==='rule') qualify(next,c);
      const after=E.evaluate(next);
      insist(E.binding({...next,global:s.global,refined:s.refined}) === E.binding(s), 'An effect changed evidence or scope.');
      if (!after.consistent || !preserves(before,after)) return null;
      trace.push({step, before:before.coverage, after:after.coverage, gain:after.coverage-before.coverage, worlds:after.worlds, emittedActions:0});
      current=next;
    }
    return eligible(s,current) ? {state:current,steps:order,trace,via:'compose'} : null;
  }
  function compose(s, basis, c) {
    if (!s.exposeAllowed || s.global && s.refined) return null;
    // Internal views change visibility for construction only. They do not install a receiving effect.
    const views=s.refined ? [s] : [s, {...s,refined:true}];
    for (const internal of views) {
      const component=invoke(basis,internal,c);
      if (!component || component.via !== 'construct-rule') continue;
      c.componentUses++;
      // Supplied reverse-first enumerator, as in Appendix D. Both orders are checked independently by tests.
      for (const order of [['view','rule'],['rule','view']]) {
        const result=transaction(s,order,c);
        if (result) return result;
      }
    }
    return null;
  }
  function invoke(p,s,c) {
    validatePolicy(p);
    if (p.kind==='fallback') return invoke(p.old,s,c) || invoke(p.next,s,c);
    if (p.kind==='construct-rule') return constructRule(s,c);
    if (p.kind==='compose') return compose(s,p.basis,c);
    // No enquiry is affordable in this encounter. A supplied primitive is distinct from an acquired method.
    return null;
  }
  function extend(old,candidate,witness,c) {
    validatePolicy(old); validatePolicy(candidate);
    if (candidate.kind==='compose') insist(canonical(candidate.basis)===canonical(projection(old)), 'Captured basis does not match the current component policy.');
    insist(invoke(old,witness,c)===null, 'Extension witness must reach the old fallback.');
    const effect=invoke(candidate,witness,c);
    insist(effect && eligible(witness,effect.state), 'No positive construction witness.');
    const policy=freeze({kind:'fallback',old:clone(old),next:clone(candidate)});
    insist(canonical(policy.old)===canonical(old), 'Old policy subtree was not preserved.');
    return {policy,effect};
  }
  function acquireSource() {
    const c=counters(), old=freeze(supplied());
    const witness={...E.initial('source-acquisition'),refined:true,permission:false};
    c.rounds++; c.candidates++;
    const gained=extend(old,{kind:'construct-rule'},witness,c);
    const core={version:VERSION,scope:SCOPE,policy:clone(gained.policy)};
    // Structural currentness, not cryptographic authentication or an adversarial-host certificate.
    return freeze({...core,binding:canonical(core),qualification:{cases:c.qualifierCases,positiveWitnessGain:E.evaluate(gained.effect.state).coverage-E.evaluate(witness).coverage}, acquisition:{rounds:c.rounds,counts:c}});
  }
  function validateArtifact(artifact) {
    insist(artifact && Object.keys(artifact).sort().join(',')==='acquisition,binding,policy,qualification,scope,version', 'Malformed construction artifact.');
    insist(artifact.scope===SCOPE && artifact.version===VERSION, 'Construction artifact has the wrong scope or version.');
    validatePolicy(artifact.policy);
    const core={version:artifact.version,scope:artifact.scope,policy:artifact.policy};
    insist(artifact.binding===canonical(core), 'Construction artifact binding is stale.');
    const replay=acquireSource();
    insist(canonical(artifact.policy)===canonical(replay.policy), 'Source acquisition cannot replay this policy.');
    insist(canonical(artifact.qualification)===canonical(replay.qualification), 'Source qualification does not replay.');
    insist(canonical(artifact.acquisition)===canonical(replay.acquisition), 'Source acquisition record does not replay.');
    return true;
  }
  function bootstrap(artifact, owner, seed) {
    validateArtifact(artifact);
    insist(owner && owner.allowed === true && owner.epoch===1 && owner.version===artifact.version && owner.scope===artifact.scope && owner.binding===artifact.binding, 'A current scoped owner grant is required to load the method.');
    const empty={observations:[],conclusions:[],receivingGrants:[],receipts:[],archive:[]};
    if (seed) insist(canonical(seed)===canonical(empty), 'Bootstrap must be empty of observations, answers, grants, receipts and archive.');
    return freeze({policy:clone(artifact.policy),...empty,loaded:true,scope:artifact.scope});
  }
  function ownerGrant(artifact, allowed=true) { return {allowed,epoch:1,version:artifact.version,scope:artifact.scope,binding:artifact.binding}; }
  function childContext(index, permission=false, access=true) {
    const context='receiving-'+(index+1);
    const s=E.initial(context);
    s.reports=s.reports.map(r=>({...r,root:context+'/'+r.root,harmful:r.state<2 && index%2 ? !r.harmful : r.harmful}));
    return {...s,permission,exposeAllowed:access};
  }
  function learningRound(p,s,c,options) {
    c.rounds++;
    if (!contains(p,'construct-rule') && options.reconstruct) {
      c.candidates++;
      if (s.exposeAllowed) {
        const internal={...s,refined:true};
        if (!invoke(p,internal,c)) {
          const gained=extend(p,{kind:'construct-rule'},internal,c);
          return {policy:gained.policy,learned:'construct-rule',witnessGain:E.evaluate(gained.effect.state).coverage-E.evaluate(internal).coverage};
        }
      }
    }
    c.candidates++;
    const basis=projection(p);
    if (options.counterfeit) {
      try { extend(p,{kind:'compose',basis:supplied()},s,c); }
      catch (e) { return {policy:p,learned:null,rejection:e.message}; }
    }
    const effect=compose(s,basis,c);
    if (!effect) return {policy:p,learned:null,rejection:s.exposeAllowed ? 'No effective construction component in the captured policy.' : 'The missing coordinate is inaccessible.'};
    // extend replays the positive witness and checks exact capture; speculative construction never acts.
    const gained=extend(p,{kind:'compose',basis},s,c);
    return {policy:gained.policy,learned:'compose',witnessGain:E.evaluate(effect.state).coverage-E.evaluate(s).coverage};
  }
  function runRoute(options={}) {
    const route=options.route || 'intact', spec=ROUTES.find(r=>r.id===route);
    insist(spec,'Unknown inheritance route.');
    const maxRounds=options.rounds===undefined ? spec.rounds : options.rounds;
    insist(Number.isInteger(maxRounds) && maxRounds>=0 && maxRounds<=2,'Choose zero, one or two acquisition rounds.');
    const artifact=options.artifact || acquireSource();
    const c=counters();
    const child=bootstrap(artifact,options.owner || ownerGrant(artifact),options.seed);
    let policy=child.policy;
    const interventions=[];
    if (['removed','restored','relearn-one','relearn-two'].includes(route)) {
      policy=freeze(removeMethod(policy,'construct-rule'));
      interventions.push({operation:'remove',method:'construct-rule',policy:clone(policy)});
    }
    if(route==='restored') {
      insist(canonical(policy)===canonical(artifact.policy.old),'Restoration requires the exact source scaffold.');
      policy=freeze(clone(artifact.policy));
      interventions.push({operation:'restore',method:'construct-rule',policy:clone(policy)});
    }
    if (route==='fresh') policy=freeze({kind:'hold'});
    if (route==='specificity') { policy=freeze(removeMethod(policy,'inquiry'));interventions.push({operation:'remove',method:'inquiry',policy:clone(policy)}); }
    if (route==='preinstalled') policy=freeze({kind:'fallback',old:clone(policy),next:{kind:'compose',basis:projection(policy)}});
    const initialPolicy=clone(policy), contexts=[], learning=[];
    for (let index=0;index<2;index++) {
      const s=childContext(index,options.permission===true,options.access!==false);
      const before=E.evaluate(s);
      let effect;
      if (route==='direct') {
        const found=E.findRepair(s);
        c.candidates+=found.candidates.length; c.qualifierCases+=found.warrant.cases;
        effect=found.state ? {state:found.state,steps:['rule','view'],via:'supplied-direct-search',trace:[]} : null;
      } else {
        effect=invoke(policy,s,c);
        while (!effect && c.rounds<maxRounds) {
          const acquired=learningRound(policy,s,c,{reconstruct:['relearn-one','relearn-two','fresh'].includes(route),counterfeit:options.counterfeit===true});
          policy=acquired.policy;
          learning.push({round:c.rounds,context:s.context,learned:acquired.learned,witnessGain:acquired.witnessGain || 0,rejection:acquired.rejection || null});
          effect=invoke(policy,s,c);
        }
      }
      const final=effect ? effect.state : s;
      const after=E.evaluate(final);
      const receipt=E.capture(final), execution=E.execute(final,receipt); c.qualifierCases+=receipt.qualifierCases; c.executionCalls++;
      insist(before.worlds===after.worlds && canonical(before.counts)===canonical(after.counts), 'Repair changed the evidence world set.');
      const decisive=execution.decisions.filter(v=>v!=='hold').length;
      contexts.push({id:s.context,roots:s.reports.map(r=>r.root),reports:clone(s.reports),before:before.coverage,after:after.coverage,worlds:after.worlds,
        labels:E.TARGETS.map(x=>after.receiving[x]),decisions:execution.decisions,reason:execution.reason,decisive,
        permission:s.permission,steps:effect ? effect.steps : [],trace:effect ? effect.trace || [] : [],method:effect ? effect.via : null});
    }
    return freeze({route,scope:SCOPE,child,interventions,initialPolicy,policy,learning,contexts,counts:c,roundBudget:maxRounds,
      repaired:contexts.reduce((n,x)=>n+x.after,0),decisive:contexts.reduce((n,x)=>n+x.decisive,0),targets:4,
      evidenceTransfer:'none',authorityExpanded:false,grammarExpanded:false});
  }
  function compare(options={}) {
    const artifact=options.artifact || acquireSource();
    return ROUTES.map(spec=>runRoute({...options,artifact,route:spec.id,rounds:spec.rounds}));
  }
  const api={SCOPE,VERSION,ROUTES,canonical,projection,validatePolicy,contains,removeMethod,supplied,counters,invoke,transaction,extend,acquireSource,validateArtifact,bootstrap,ownerGrant,childContext,runRoute,compare};
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
  else root.OrchardInheritance=Object.freeze(api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
