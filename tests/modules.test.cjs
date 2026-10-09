/* Orchard Noncommercial Research and Evaluation Licence 1.0.
 * Copyright (c) 2026 Kimberley Laverne Asher, to the extent of rights held.
 * Commercial use requires separate written permission. See LICENSE.txt.
 */
const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const E=require('../dist/experiments/coupled/engine.js');
function host(){
  const context={window:{},document:{addEventListener(){}}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/lab.js'),'utf8'),context);
  return context.window.OrchardLab;
}
function module(id,run){return {id,title:id,version:'test',contractVersion:1,mount(){return{dispose(){},snapshot(){return{}}}},run};}
function result(id,passed=true){return {protocol:'orchard-lab/1',experiment:id,passed,summary:'test result',artifact:{values:[1,2]}};}
test('experiment host enforces the contract and rejects duplicate or unsupported installation',()=>{
  const lab=host();
  assert.throws(()=>lab.register({}),/Incomplete/);
  assert.throws(()=>lab.register({...module('one',()=>result('one')),contractVersion:2}),/Unsupported/);
  lab.register(module('one',()=>result('one')));
  assert.throws(()=>lab.register(module('one',()=>result('one'))),/duplicate/);
  assert.equal(lab.list().length,1);
  assert.throws(()=>lab.runSequence(['missing']),/nonempty sequence/);
  assert.throws(()=>lab.runSequence(['one','one']),/distinct/);
});
test('ordered stages receive deeply frozen previous results, with no implicit evidence transfer',()=>{
  const lab=host();let order=[];
  lab.register(module('first',input=>{order.push('first');assert.equal(input.previous,null);return result('first');}));
  lab.register(module('second',input=>{order.push('second');assert.equal(input.previous.experiment,'first');assert.ok(Object.isFrozen(input.previous.artifact.values));return result('second');}));
  const outputs=lab.runSequence(['first','second']);
  assert.deepEqual(order,['first','second']);
  assert.equal(outputs.length,2);
  assert.ok(Object.isFrozen(outputs[0].artifact));
});
test('sequence stops after a failed stage and rejects dishonest result identity',()=>{
  const lab=host();let ranLater=false;
  lab.register(module('failure',()=>result('failure',false)));
  lab.register(module('later',()=>{ranLater=true;return result('later')}));
  assert.equal(lab.runSequence(['failure','later']).length,1);
  assert.equal(ranLater,false);
  const other=host();other.register(module('claimed',()=>result('wrong-id')));
  assert.throws(()=>other.runSequence(['claimed']),/Invalid experiment result/);
});
test('installed first module reports a bounded result without implying learning or authority expansion',()=>{
  let definition;
  const context={window:{OrchardCoupled:E,OrchardLab:{register(d){definition=d;}}}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/experiments/coupled/module.js'),'utf8'),context);
  const result=definition.run({protocol:'orchard-lab/1',previous:{evidence:'must not be inherited'}});
  assert.equal(result.passed,true);
  assert.equal(result.previousConsumed,false);
  assert.equal(result.receivingBefore,0);
  assert.equal(result.receivingAfter,2);
  assert.equal(result.compatibleWorldsBefore,result.compatibleWorldsAfter);
  assert.deepEqual(Array.from(result.afterRevocation),['hold','hold']);
  assert.equal(result.authorityExpanded,false);
  assert.equal(result.selfLearning,false);
});
