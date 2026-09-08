import test from 'node:test';
import assert from 'node:assert/strict';
import { DATABASE_SCHEMA, ANNOTATED_MEDIA } from './technical/schema-annotation.mjs';
import { validateExample, targetsOf, transition, textOfRuns } from './technical/model.mjs';

for (const example of [DATABASE_SCHEMA, ANNOTATED_MEDIA]) {
  test(`technical ${example.id}: detached, immutable, source-preserving composition`, () => {
    const copy=validateExample(example);
    assert.deepEqual(copy,example); assert.notEqual(copy,example);
    assert.ok(Object.isFrozen(copy.body));
    assert.throws(()=>{copy.body.type='unknown';},TypeError);
  });
}
test('technical graphs reject unknown field references and unsupported styling',()=>{
  const bad=structuredClone(DATABASE_SCHEMA);bad.body.children[0].edges[0].to='not-a-field';
  assert.throws(()=>validateExample(bad),/Dangling/);
  const styled=structuredClone(DATABASE_SCHEMA);styled.body.children[0].x=90;
  assert.throws(()=>validateExample(styled),/unsupported field x/);
});
test('technical schema rejects nullable primary keys',()=>{
  const bad=structuredClone(DATABASE_SCHEMA);bad.body.children[0].rows[0][0].fields[0].nullable=true;
  assert.throws(()=>validateExample(bad),/Primary keys/);
});
test('owned SVG bindings resolve to shared categories and unique region targets',()=>{
  const example=validateExample(ANNOTATED_MEDIA), targets=targetsOf(example);
  assert.ok(targets.has('wave-one-speech')); assert.ok(targets.has('wave-one-silence'));assert.ok(targets.has('category:added'));
  const bad=structuredClone(ANNOTATED_MEDIA);bad.body.children[0].children[0].bindings.speech='unknown';
  assert.throws(()=>validateExample(bad),/known category/);
});
test('semantic selection refuses unknown targets and suppresses no-ops',()=>{
  const targets=targetsOf(DATABASE_SCHEMA);
  assert.deepEqual(transition(null,'tasks-agent',targets),{ok:true,changed:true,previous:null,next:'tasks-agent'});
  assert.equal(transition('tasks-agent','tasks-agent',targets).changed,false);
  assert.equal(transition(null,'unknown',targets).ok,false);
  assert.equal(transition(null,null,targets).changed,false);
});
test('annotated text retains Unicode, whitespace and exact run concatenation',()=>{
  assert.equal(textOfRuns([{text:'\tŁódź — '},{text:'東京\n'},{text:'2019–2024'}]),'\tŁódź — 東京\n2019–2024');
  const example=validateExample(ANNOTATED_MEDIA);
  const runs=example.body.children[1].children[0].runs;
  assert.ok(textOfRuns(runs).includes('Łódź — 東京 — 2019–2024'));
});
test('composition refuses non-JSON values and duplicate addresses',()=>{
  const duplicate=structuredClone(DATABASE_SCHEMA);duplicate.body.children[0].rows[0][1].id='agents';
  assert.throws(()=>validateExample(duplicate),/duplicate/);
  const hook=structuredClone(ANNOTATED_MEDIA);hook.toJSON=()=>({});
  assert.throws(()=>validateExample(hook),/JSON/);
});
