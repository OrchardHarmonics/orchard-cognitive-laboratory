/* Orchard Noncommercial Research and Evaluation Licence 1.0. See LICENSE.txt. */
const assert=require('node:assert/strict'),{test}=require('node:test'),{execFileSync}=require('node:child_process'),path=require('node:path');
const S=require('../../dist/experiments/obligations/engine.js'),py=process.env.ORCHARD_PYTHON||'python3';
const script=path.join(__dirname,'../../dist/downloads/07_changing_obligations.py');
test('native stage seven matches all construction routes, stress gates and current-use boundaries',()=>{
 for(const [route,condition] of [...S.ROUTES.map(r=>[r,'valid']),...S.CONDITIONS.slice(1).map(c=>['learned',c])]){
  const p=JSON.parse(execFileSync(py,[script,'--route',route,'--condition',condition,'--permission'],{encoding:'utf8'})),j=S.compare({route,condition});
  for(const key of ['passed','reason','candidates','teaching','validation','validationMismatches','expression','projection','mapping','costs','unchecked','frozen','sourceCommonWork','legacy'])assert.deepEqual(p.study[key],j[key],route+'/'+condition+'/'+key);
  assert.deepEqual(p.live,S.atPhase(j,3,{grant:true}),route+'/'+condition+'/live');
 }
 const s=S.compare();for(const args of [[],['--phase','2','--permission'],['--budget','4302','--permission'],['--revision','2','--permission']]){
  const p=JSON.parse(execFileSync(py,[script,...args],{encoding:'utf8'}));assert.equal(p.live.held,272);
 }
 assert.equal(s.frozen.total,272);
});
