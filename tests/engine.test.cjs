/* Orchard Noncommercial Research and Evaluation Licence 1.0.
 * Copyright (c) 2026 Kimberley Laverne Asher, to the extent of rights held.
 * Commercial use requires separate written permission. See LICENSE.txt.
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const E = require('../dist/experiments/coupled/engine.js');

test('worked encounter: only the coupled repair changes receiving coverage', () => {
  const initial = E.initial();
  assert.deepEqual(E.compare(initial).map(c => c.coverage), [0, 0, 0, 2]);
  const start = E.evaluate(initial);
  const found = E.findRepair(initial);
  const final = E.evaluate(found.state);
  assert.equal(start.worlds, '1073741824');
  assert.equal(final.worlds, start.worlds);
  assert.equal(final.roots, 4);
  assert.deepEqual(final.point.slice(0, 3), [0, 1, null]);
  assert.deepEqual(final.receiving.slice(0, 3), [0, 1, null]);
  assert.equal(found.warrant.cases, 320);
  assert.equal(found.candidates.length, 4);
  assert.equal(found.state.permission, initial.permission);
  assert.deepEqual(found.state.reports, initial.reports);
});

test('independent exhaustive worlds agree across 12,000 rule/view/evidence/bound combinations', () => {
  const pairs = [];
  for (let safe=0; safe<=3; safe++) for (let harmful=0; harmful<=3-safe; harmful++) pairs.push([safe,harmful]);
  let checked = 0;
  for (const n0 of pairs) for (const n1 of pairs) for (const n2 of pairs) for (const budget of [0,1,2]) {
    const counts = [n0,n1,n2];
    const reports = [];
    counts.forEach((n,x) => n.forEach((count,v) => {
      for(let i=0;i<count;i++) reports.push({root:`${x}-${v}-${i}`,context:'encounter-01',state:x,harmful:Boolean(v)});
    }));
    // Independent oracle: enumerate truth assignments on the three observed slots.
    // All other 29 coordinates remain free; no closed-form point-label formula is used.
    const worlds = [];
    for(let mask=0;mask<8;mask++) {
      const values = [0,1,2].map(x=>(mask>>x)&1);
      const errors = reports.filter(r=>Number(r.harmful)!==values[r.state]).length;
      if(errors<=budget) worlds.push(values);
    }
    const expected = Array.from({length:32},(_,x)=>worlds.length === 0 ? [] : x>=3 ? [0,1] : [0,1].filter(v=>worlds.some(w=>w[x]===v)));
    for(const global of [false,true]) for(const refined of [false,true]) {
      const s = {...E.initial(), reports, budget, global, refined};
      const actual = E.evaluate(s);
      assert.equal(BigInt(actual.worlds), BigInt(worlds.length) * (2n**29n));
      assert.deepEqual(actual.possible, expected);
      const old = E.evaluate({...s,global:false});
      actual.point.forEach((v,x)=> {
        if(v!==null) assert.deepEqual(expected[x],[v], 'decisive label must be true in every compatible world');
        if(global) assert.equal(v,expected[x].length===1 ? expected[x][0] : null, 'global rule should expose all decisive point labels');
        if(old.point[x]!==null) assert.equal(v,old.point[x], 'old decisive labels must survive');
        const group = refined ? [x] : [x&~1,(x&~1)+1];
        const first = actual.point[group[0]];
        const receiver = first!==null && group.every(y=>actual.point[y]===first) ? first : null;
        assert.equal(actual.receiving[x],receiver, 'receiver must use the whole class');
      });
      checked++;
    }
  }
  assert.equal(checked,12000);
});

test('qualification checks 320 cases under each declared error allowance', () => {
  assert.deepEqual(E.qualifyRule(1),{passed:true,cases:320});
  assert.deepEqual(E.qualifyRule(2),{passed:true,cases:320});
  assert.deepEqual(E.qualifyRule(0),{passed:true,cases:320});
});

test('weakened evidence or assumptions restore uncertainty; inaccessible views cannot be installed', () => {
  const coupled = {...E.initial(),global:true,refined:true};
  assert.equal(E.evaluate({...coupled,budget:2}).coverage,0);
  assert.equal(E.evaluate({...coupled,reports:E.fixture(false)}).coverage,0);
  const locked = {...E.initial(),exposeAllowed:false};
  assert.equal(E.findRepair(locked).state,null);
  assert.throws(()=>E.evaluate({...locked,refined:true}),/not accessible/);
  assert.equal(E.compare(locked)[3].allowed,false);
});

test('receiving execution independently checks currentness, permission and decisive labels', () => {
  const s = {...E.initial(),global:true,refined:true};
  const receipt = E.capture(s);
  assert.deepEqual(E.execute(s,receipt),{reason:'current',decisions:['release','block']});
  assert.deepEqual(E.execute({...s,permission:false},receipt),{reason:'permission',decisions:['hold','hold']});
  assert.deepEqual(E.execute(s,null),{reason:'no-receipt',decisions:['hold','hold']});
  assert.deepEqual(E.execute({...s,coverageValid:false},receipt),{reason:'coverage',decisions:['hold','hold']});
  for(const patch of [{global:false},{refined:false},{budget:2},{revision:1},{reports:E.fixture(false)},
    {reports:s.reports.map((r,i)=>i===0 ? {...r,root:'different-provenance'} : r)}]) {
    assert.deepEqual(E.execute({...s,...patch},receipt),{reason:'stale',decisions:['hold','hold']});
  }
  const unresolved = E.initial();
  assert.deepEqual(E.execute(unresolved,E.capture(unresolved)).decisions,['hold','hold']);
  // Stored labels cannot override freshly computed receiving semantics.
  assert.deepEqual(E.execute(s,{...receipt,labels:[1,0]}).decisions,['release','block']);
  const revoked = E.findRepair({...E.initial(),permission:false});
  assert.equal(revoked.state.permission,false);
  assert.deepEqual(E.execute(revoked.state,E.capture(revoked.state)).decisions,['hold','hold']);
});

test('root deduplication, conflicting identity and context validation', () => {
  const s = E.initial();
  const duplicate = {...s,reports:[...s.reports,s.reports[0]]};
  assert.equal(E.evaluate(duplicate).roots,4);
  assert.equal(E.binding(duplicate),E.binding(s));
  assert.equal(E.binding({...s,reports:s.reports.slice().reverse()}),E.binding(s));
  assert.throws(()=>E.evaluate({...s,reports:[...s.reports,{...s.reports[0],harmful:true}]}),/Conflicting/);
  assert.throws(()=>E.evaluate({...s,reports:[{...s.reports[0],context:'other'}]}),/Wrong context/);
  assert.throws(()=>E.evaluate({...s,reports:Array.from({length:4},(_,i)=>({root:'r'+i,context:s.context,state:0,harmful:false}))}),/fourth root/);
  assert.throws(()=>E.evaluate({...s,reports:[{...s.reports[0],state:32}]}),/Invalid report/);
  assert.throws(()=>E.evaluate({...s,reports:[{...s.reports[0],extra:true}]}),/Malformed/);
});

test('inconsistent evidence has no worlds and cannot produce a receiving decision', () => {
  const s=E.initial();
  const reports=[0,1].flatMap(x=>[false,true].map((harmful,i)=>({root:`r-${x}-${i}`,context:s.context,state:x,harmful})));
  const impossible={...s,reports,global:true,refined:true};
  const result=E.evaluate(impossible);
  assert.equal(result.worlds,'0');
  assert.equal(result.consistent,false);
  assert.equal(result.coverage,0);
  assert.ok(result.possible.every(values=>values.length===0));
  assert.deepEqual(E.execute(impossible,E.capture(impossible)).decisions,['hold','hold']);
});
