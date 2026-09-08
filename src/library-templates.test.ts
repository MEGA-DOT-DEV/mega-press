import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LIBRARY_TEMPLATES } from '../lab/framework/library-templates.mjs';
import { evaluateSpec } from './evaluate.js';
import { flatten } from './solve.js';
import { validateComposition } from './spec.js';
import { getPressTheme, PRESS_THEMES, resetPressTheme } from './theme.js';

beforeEach(resetPressTheme);
afterEach(resetPressTheme);

// IDs on authored components are the stable references a host can use for
// lesson cues. Traverse objects, but only collect actual component slots:
// schema field types and graph relation records are not components.
function componentIds(value: unknown, component = false): string[] {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap(item => componentIds(item, component));
  const object = value as Record<string, unknown>;
  return [
    ...(component && typeof object.id === 'string' ? [object.id] : []),
    ...Object.entries(object).flatMap(([key, child]) =>
      componentIds(child, ['body', 'aside', 'children'].includes(key))),
  ];
}

describe('educational composition library', () => {
  it('offers fourteen distinct sources with useful discovery and accessible preview metadata', () => {
    expect(LIBRARY_TEMPLATES).toHaveLength(14);
    expect(new Set(LIBRARY_TEMPLATES.map(item => item.spec.id)).size).toBe(14);
    for (const item of LIBRARY_TEMPLATES) {
      expect(item.spec.id).toMatch(/^library-[a-z]+(?:-[a-z]+)*$/);
      for (const key of ['name', 'detail', 'family', 'useWhen', 'caption'] as const) {
        expect(item[key], `${item.spec.id}.${key}`).toEqual(expect.any(String));
        expect(item[key].trim(), `${item.spec.id}.${key}`).not.toBe('');
      }
      expect(item.useWhen).not.toBe(item.name);
      expect(item.caption).not.toBe(item.name);
    }
  });

  for (const item of LIBRARY_TEMPLATES) {
    it(`${item.spec.id} points to its editable composition source`, () => {
      const source = JSON.parse(readFileSync(
        new URL(`../example/compositions/${item.spec.id}.json`, import.meta.url), 'utf8',
      ));
      expect(source).toEqual(item.spec);
      expect(source.schemaVersion).toBe('press-composition/1');
      // The public parser checks the registered composition components and
      // their authored parameters, including nested graph bodies.
      expect(() => validateComposition(source)).not.toThrow();
    });

    for (const skin of ['mega', 'paper'] as const) {
      it(`${item.spec.id} preserves its source and named targets in ${skin}`, () => {
        const before = JSON.stringify(item);
        const themeBefore = getPressTheme();
        // Exercise the default project route as well as an explicit skin.
        const result = skin === 'mega'
          ? evaluateSpec(item.spec)
          : evaluateSpec(item.spec, { theme: PRESS_THEMES.paper });
        expect(result.ok, JSON.stringify(result.errors)).toBe(true);
        expect(result.errors).toEqual([]);
        expect(result.plate.theme.color.page).toBe(PRESS_THEMES[skin].color.page);
        expect(result.plate.frame.w).toBeGreaterThan(0);
        expect(result.plate.frame.h).toBeGreaterThan(0);

        const nodes = flatten(result.plate.root);
        for (const id of componentIds(item.spec)) {
          const targets = nodes.filter(node => node.semanticId === id);
          expect(targets, `${item.spec.id}: ${id}`).toHaveLength(1);
          expect(targets[0].rect.w).toBeGreaterThan(0);
          expect(targets[0].rect.h).toBeGreaterThan(0);
        }
        expect(JSON.stringify(item)).toBe(before);
        expect(getPressTheme()).toEqual(themeBefore);
      });
    }
  }
});
