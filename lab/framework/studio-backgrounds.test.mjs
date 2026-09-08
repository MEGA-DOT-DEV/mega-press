import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCanvas } from '@napi-rs/canvas';
import { evaluateSpec } from '../../src/evaluate.js';
import { plateGround } from '../../src/field.js';
import { resolve } from '../../src/screen.js';
import { PRESS_THEMES } from '../../src/theme.js';
import { STUDIO_BACKGROUNDS } from './studio-backgrounds.mjs';
import { STUDIO_STUDIES } from './studio-fixtures.mjs';

const applyBackground = (spec, preset) => ({
  ...spec,
  ...(preset.background ? { background: preset.background } : {}),
});

// Compare the engine's solved evidence, including wrapped lines, rather than
// merely checking that the source JSON still contains its original wording.
const contentGeometry = (plate) => plate.nodes.map((node) => ({
  kind: node.kind,
  text: node.text,
  lines: node.lines,
  rect: node.rect,
}));
// Generated node counters are local to each solve. Semantic keys and ports
// identify the relationship while points and label rects carry its geometry.
const relationGeometry = (plate) => plate.links.map(({ from, to, ...link }) => link);

test('studio backgrounds are immutable, portable recipes for existing grounds', () => {
  assert.equal(new Set(STUDIO_BACKGROUNDS.map(({ id }) => id)).size, STUDIO_BACKGROUNDS.length);
  assert.equal(STUDIO_BACKGROUNDS.find(({ id }) => id === 'quiet').background, undefined);
  for (const preset of STUDIO_BACKGROUNDS) {
    assert.ok(Object.isFrozen(preset));
    assert.ok(preset.label && preset.description);
    if (!preset.background) continue;
    assert.ok(Object.isFrozen(preset.background));
    assert.ok(['field', 'band'].includes(preset.background.type));
    assert.doesNotMatch(JSON.stringify(preset.background), /#[\da-f]{3,8}|font|canvas|url\(/i);
    assert.equal(Object.hasOwn(preset.background, 'ink'), false);
    assert.equal(Object.hasOwn(preset.background, 'accent'), false);
  }
});

for (const [themeId, theme] of Object.entries(PRESS_THEMES)) {
  for (const study of STUDIO_STUDIES) {
    test(`${themeId}/${study.spec.id}: every background locks without changing the teaching material`, () => {
      const original = JSON.stringify(study);
      const baseline = evaluateSpec(study.spec, { theme });
      assert.equal(baseline.ok, true, JSON.stringify(baseline.errors));
      for (const preset of STUDIO_BACKGROUNDS) {
        const result = evaluateSpec(applyBackground(study.spec, preset), { theme });
        assert.equal(result.ok, true, `${preset.id}: ${JSON.stringify(result.errors)}`);
        assert.deepEqual(contentGeometry(result.plate), contentGeometry(baseline.plate), preset.id);
        assert.deepEqual(relationGeometry(result.plate), relationGeometry(baseline.plate), preset.id);
        assert.deepEqual(result.plate.frame, baseline.plate.frame, preset.id);
        assert.deepEqual(result.plate.theme, baseline.plate.theme, preset.id);
        if (preset.background?.type === 'band') {
          assert.equal(result.plate.background.fill, theme.color.raised);
          assert.equal(result.plate.background.rect.w, result.plate.frame.w);
        }
      }
      assert.equal(JSON.stringify(study), original);
    });

    test(`${themeId}/${study.spec.id}: canonical dither stays outside text and remains sparse`, () => {
      const signatures = [];
      for (const preset of STUDIO_BACKGROUNDS.filter(({ background }) => background?.type === 'field')) {
        const { plate, ok, errors } = evaluateSpec(applyBackground(study.spec, preset), { theme });
        assert.equal(ok, true, JSON.stringify(errors));
        const cols = Math.ceil(plate.frame.w / 4);
        const rows = Math.ceil(plate.frame.h / 4);
        const field = plateGround(plate, plate.background)(cols, rows, plate.frame);
        const ctx = createCanvas(cols, rows).getContext('2d');
        const raster = resolve(ctx, { cols, rows, ...field });
        assert.equal(field.ink, theme.color.black2, 'the plate theme supplies the ground ink');
        const textRects = plate.nodes.filter(({ kind, rect }) => kind === 'text' && rect).map(({ rect }) => rect);
        let printed = 0;
        for (let y = 0; y < rows; y += 1) {
          for (let x = 0; x < cols; x += 1) {
            if (!raster.data[(y * cols + x) * 4 + 3]) continue;
            printed += 1;
            const px = (x + 0.5) * plate.frame.w / cols;
            const py = (y + 0.5) * plate.frame.h / rows;
            assert.equal(textRects.some((rect) => px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h), false, `${preset.id}: ink beneath text at ${px}, ${py}`);
          }
        }
        assert.ok(printed > 0, `${preset.id} should produce a visible field`);
        assert.ok(printed / (cols * rows) < 0.08, `${preset.id} should leave most of the ground empty`);
        signatures.push(Buffer.from(raster.data).toString('base64'));
      }
      assert.equal(new Set(signatures).size, signatures.length, 'the field presets produce distinct textures');
    });
  }
}
