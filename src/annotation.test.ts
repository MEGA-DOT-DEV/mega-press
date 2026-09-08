import { createCanvas } from '@napi-rs/canvas';
import { afterEach, describe, expect, it } from 'vitest';
import { ANNOTATION_TREATMENTS, annotationCss, paintAnnotation, resolveAnnotation } from './annotation.js';
import { evaluateSpec } from './evaluate.js';
import { paintText } from './render.js';
import { hexToRgb } from './screen.js';
import { flatten } from './solve.js';
import { PRESS_THEMES, resetPressTheme, withPressTheme } from './theme.js';
import { contrast } from './tokens.js';

afterEach(resetPressTheme);

const runs = [
  { text: 'Read the evidence, then ' },
  { text: 'compare the exact café é record with the criterion. Read the evidence twice, because a repeated phrase is not a stable address. ', id: 'first', category: 'evidence' },
  { text: 'Preserve spaces  and punctuation: ' },
  { text: 'evidence', id: 'second', category: 'evidence' },
  { text: ' is an observation, not a conclusion.' },
];
const source = runs.map(run => run.text).join('');
const fixture = (treatment = 'ink'): any => ({
  schemaVersion: 'press-composition/1', id: 'annotations', frame: 'reading',
  title: 'A category carries one meaning.',
  categories: [{ id: 'evidence', label: 'Evidence', tone: 'red', treatment, description: 'An observation used to assess the claim.' }],
  body: { type: 'stack', gap: 3, children: [
    { type: 'grid', cols: 2, children: [
      { type: 'panel', title: 'Read the source', children: [{ type: 'text', id: 'prose', role: 'body', runs: structuredClone(runs) }] },
      { type: 'text', role: 'body', content: 'The same category names the same idea wherever it occurs.' },
    ] },
    { type: 'legend', layout: 'stack' },
  ] },
});
const proseOf = (spec: any) => spec.body.children[0].children[0].children[0];
const solve = (spec: any, theme: any) => {
  const result = evaluateSpec(spec, { theme }) as any;
  expect(result.ok, JSON.stringify(result.errors)).toBe(true);
  return result.plate;
};

// A minimal text DOM. Its concatenation and replacement semantics exercise the
// real paintText path without substituting a second annotation renderer.
class TextElement {
  children: TextElement[] = [];
  dataset: Record<string, string> = {};
  style: Record<string, string> = {};
  className = '';
  private value = '';
  constructor(readonly tagName: string) {}
  get textContent(): string { return this.value + this.children.map(child => child.textContent).join(''); }
  set textContent(value: string) { this.value = value; this.children = []; }
  appendChild(child: TextElement) { this.children.push(child); return child; }
}
const document = { createElement: (tag: string) => new TextElement(tag) };

describe('semantic annotations share a readable, measured grammar', () => {
  it.each(Object.entries(PRESS_THEMES))('%s resolves all treatments through category inks and preserves contrast', (_name, theme) => {
    const palette = theme.color!;
    withPressTheme(theme, () => {
      for (const [tone, ink] of Object.entries({ red: palette.red, blue: palette.blueText, neutral: palette.muted })) {
        for (const treatment of ANNOTATION_TREATMENTS) {
          const style = resolveAnnotation({ tone, treatment });
          const css = annotationCss(style) as any;
          expect(Object.isFrozen(style)).toBe(true);
          expect(style.ink).toBe(ink);
          expect(style.color).toBe(treatment === 'ink' ? ink : palette.text);
          expect(contrast(style.color, treatment === 'highlight' ? style.background : palette.panel)).toBeGreaterThanOrEqual(4.5);
          expect(css.color).toBe(style.color);
          expect(Object.keys(css).some(key => /width|padding|margin|font|letterSpacing/i.test(key))).toBe(false);
          if (treatment === 'highlight') expect(css.backgroundColor).toBe(style.background);
          if (treatment === 'underline') expect(css.textDecorationColor).toBe(style.ink);
          if (treatment === 'outline') expect(css.boxShadow).toContain(style.ink);
        }
      }
      expect(() => resolveAnnotation({ tone: 'red', treatment: 'glow' })).toThrow(expect.objectContaining({ code: 'ANNOTATION_TREATMENT' }));
    });
  });

  it.each(ANNOTATION_TREATMENTS)('%s paints within its measured box and restores the caller canvas state', treatment => {
    const style = withPressTheme(PRESS_THEMES.mega, () => resolveAnnotation({ tone: 'red', treatment }));
    for (const rect of [{ x: 8, y: 8, w: 32, h: 20 }, { x: 8, y: 8, w: 1, h: 1 }, { x: 8, y: 8, w: 0, h: 0 }]) {
      const ctx = createCanvas(48, 40).getContext('2d');
      ctx.fillStyle = '#123456'; ctx.strokeStyle = '#654321'; ctx.lineWidth = 7;
      ctx.globalAlpha = 0.75; ctx.setLineDash([3, 2]);
      const state = () => ({ width: ctx.lineWidth, alpha: ctx.globalAlpha, dash: ctx.getLineDash() });
      const before = state();
      paintAnnotation(ctx, rect, style);
      expect(state()).toEqual(before);
      const pixels = ctx.getImageData(0, 0, 48, 40).data;
      let painted = 0;
      for (let y = 0; y < 40; y++) for (let x = 0; x < 48; x++) {
        if (!pixels[(y * 48 + x) * 4 + 3]) continue;
        painted++;
        expect(x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h, `ink at ${x},${y} outside ${JSON.stringify(rect)}`).toBe(true);
      }
      if (treatment === 'ink' || rect.w === 0) expect(painted).toBe(0);
      else if (rect.w > 1) expect(painted).toBeGreaterThan(0);
      // NAPI's style getters retain the last assigned string after restore(),
      // while the native paint state is correctly restored. Compare subsequent
      // paint with an untouched control canvas to test the actual contract.
      const control = createCanvas(48, 40).getContext('2d');
      control.fillStyle = '#123456'; control.strokeStyle = '#654321'; control.lineWidth = 7;
      control.globalAlpha = 0.75; control.setLineDash([3, 2]);
      for (const target of [ctx, control]) {
        target.clearRect(0, 0, 48, 40);
        target.fillRect(2, 2, 4, 4); target.strokeRect(20, 10, 16, 20);
      }
      expect(ctx.getImageData(0, 0, 48, 40).data).toEqual(control.getImageData(0, 0, 48, 40).data);
    }
  });

  it.each(Object.entries(PRESS_THEMES))('%s preserves exact prose and its wrapped source ranges across every treatment', (_name, theme) => {
    let geometry: unknown;
    for (const treatment of ANNOTATION_TREATMENTS) {
      const spec = fixture(treatment), before = JSON.stringify(spec);
      const plate = solve(spec, theme);
      const text = plate.nodes.find((node: any) => node.semanticId === 'prose');
      expect(text.text).toBe(source);
      expect(text.runs.map((run: any) => run.text).join('')).toBe(source);
      expect(text._block.fragments.length).toBeGreaterThan(1);
      for (const fragment of text._block.fragments) expect(source.slice(fragment.start, fragment.end)).toBe(fragment.text);
      const measured = { frame: plate.frame, rect: text.rect, block: text._block };
      if (geometry === undefined) geometry = measured;
      else expect(measured).toEqual(geometry);
      expect(JSON.stringify(spec)).toBe(before);

      const host = new TextElement('div');
      withPressTheme(plate.theme, () => paintText(document, host, plate));
      const paragraphs = host.children.filter(element => element.dataset.pressTarget === 'prose');
      expect(paragraphs.map(element => element.textContent)).toEqual(text._block.lines);
      const spans = paragraphs.flatMap(element => element.children);
      expect(spans.map(span => span.textContent).join('')).toBe(source);
      for (const span of spans) {
        expect(span.tagName).toBe('span');
        const start = Number(span.dataset.sourceStart), end = Number(span.dataset.sourceEnd);
        expect(source.slice(start, end)).toBe(span.textContent);
        if (span.dataset.pressCategory) {
          expect(span.dataset.pressCategory).toBe('evidence');
          expect(span.dataset.pressTreatment).toBe(treatment);
          expect(span.style).toMatchObject(annotationCss(text.runs.find((run: any) => run.id === span.dataset.pressTarget).annotation));
        }
      }
      for (const run of runs.filter(run => run.id)) {
        const fragments = spans.filter(span => span.dataset.pressTarget === run.id);
        expect(fragments.map(span => span.textContent).join('')).toBe(run.text);
        if (run.id === 'first') expect(fragments.length).toBeGreaterThan(1);
      }
    }
  });

  it.each(Object.entries(PRESS_THEMES))('%s legend preserves category meaning and paints the same category mark as the source', (_name, theme) => {
    for (const treatment of ANNOTATION_TREATMENTS) {
      const spec = fixture(treatment), plate = solve(spec, theme);
      const entry = plate.nodes.find((node: any) => node.semanticId === 'category:evidence');
      expect(entry.category).toBe('evidence');
      const nodes = flatten(entry), labels = nodes.filter((node: any) => node.kind === 'text').map((node: any) => node.text);
      expect(labels).toEqual([spec.categories[0].label, spec.categories[0].description]);
      const swatch = nodes.find((node: any) => node.kind === 'custom');
      const ctx = createCanvas(1600, Math.ceil(plate.frame.h)).getContext('2d');
      withPressTheme(plate.theme, () => swatch.paint(ctx, swatch.rect));
      const pixels = ctx.getImageData(Math.floor(swatch.rect.x), Math.floor(swatch.rect.y), Math.ceil(swatch.rect.w), Math.ceil(swatch.rect.h)).data;
      const colors = new Set<string>();
      for (let offset = 0; offset < pixels.length; offset += 4) if (pixels[offset + 3] === 255) colors.add([...pixels.slice(offset, offset + 3)].join(','));
      const annotation = plate.nodes.find((node: any) => node.semanticId === 'prose').runs.find((run: any) => run.category).annotation;
      expect(colors.has(hexToRgb(treatment === 'highlight' ? annotation.background : annotation.ink).join(','))).toBe(true);
    }
  });
});

describe('annotation declarations fail closed', () => {
  it.each([
    ['surrogate pair', '\uD83D', '\uDE80'],
    ['combining accent', 'e', '\u0301'],
    ['joined emoji', '👩', '\u200D💻'],
    ['flag sequence', '🇵', '🇱'],
  ])('refuses a run boundary inside a %s while accepting the complete grapheme', (_name, start, end) => {
    const spec = fixture();
    proseOf(spec).runs = [{ text: start, category: 'evidence' }, { text: end }];
    const before = JSON.stringify(spec);
    const refused = evaluateSpec(spec) as any;
    expect(refused.ok).toBe(false);
    expect(JSON.stringify(refused.errors)).toContain('Unicode grapheme');
    expect(JSON.stringify(spec)).toBe(before);
    proseOf(spec).runs = [{ text: start + end, category: 'evidence' }];
    const plate = solve(spec, PRESS_THEMES.mega);
    const host = new TextElement('div');
    withPressTheme(plate.theme, () => paintText(document, host, plate));
    const paragraphs = host.children.filter(element => element.dataset.pressTarget === 'prose');
    expect(paragraphs.flatMap(element => element.children).map(element => element.textContent)).toEqual([start + end]);
  });

  it('checks each occurrence against the actual band ground, not the parent text ink', () => {
    for (const treatment of ANNOTATION_TREATMENTS) {
      const spec = {
        schemaVersion: 'press-composition/1', id: 'annotation-ground', frame: 'landscape',
        title: 'The actual ground determines contrast.',
        categories: [{ id: 'evidence', label: 'Evidence', tone: 'red', treatment }],
        background: { type: 'band', fill: 'black1', pad: 3 },
        body: { type: 'text', role: 'body', runs: [{ text: 'Evidence', category: 'evidence' }] },
      };
      const result = evaluateSpec(spec, { theme: PRESS_THEMES.mega }) as any;
      if (treatment === 'ink') {
        expect(contrast(PRESS_THEMES.mega.color!.red, PRESS_THEMES.mega.color!.black1)).toBeLessThan(4.5);
        expect(result.ok).toBe(false);
        expect(result.errors.some((error: any) => error.code === 'CONTRAST_BELOW_FLOOR')).toBe(true);
      } else expect(result.ok, JSON.stringify(result.errors)).toBe(true);
    }
  });

  it('refuses a low-contrast legend sample even when its label and description are readable', () => {
    for (const treatment of ANNOTATION_TREATMENTS) {
      const spec = {
        schemaVersion: 'press-composition/1', id: 'legend-ground', frame: 'landscape',
        title: 'The legend sample carries the same category.',
        categories: [{ id: 'evidence', label: 'Evidence', tone: 'red', treatment, description: 'An observation used to assess the claim.' }],
        background: { type: 'band', fill: 'black1', pad: 3 },
        body: { type: 'legend', layout: 'stack' },
      };
      const result = evaluateSpec(spec, { theme: PRESS_THEMES.mega }) as any;
      if (treatment === 'ink') {
        expect(result.ok).toBe(false);
        expect(result.errors).toContainEqual(expect.objectContaining({
          code: 'CONTRAST_BELOW_FLOOR',
          detail: expect.objectContaining({ treatment: 'ink', fg: PRESS_THEMES.mega.color!.red, bg: PRESS_THEMES.mega.color!.black1 }),
        }));
      } else expect(result.ok, JSON.stringify(result.errors)).toBe(true);
    }
  });

  const cases: [string, (spec: any) => void][] = [
    ['unknown category', spec => { proseOf(spec).runs[1].category = 'missing'; }],
    ['unknown tone', spec => { spec.categories[0].tone = 'purple'; }],
    ['unknown treatment', spec => { spec.categories[0].treatment = 'glow'; }],
    ['empty description', spec => { spec.categories[0].description = ' '; }],
    ['nontext description', spec => { spec.categories[0].description = 12; }],
    ['nonarray categories', spec => { spec.categories = {}; }],
    ['duplicate category', spec => { spec.categories.push({ ...spec.categories[0] }); }],
    ['duplicate occurrence', spec => { proseOf(spec).runs[3].id = 'first'; }],
    ['occurrence matching component ID', spec => { proseOf(spec).runs[1].id = 'prose'; }],
    ['duplicate component', spec => { spec.body.children[1].id = 'prose'; }],
    ['blank occurrence ID', spec => { proseOf(spec).runs[1].id = ' '; }],
    ['unknown legend category', spec => { spec.body.children[1].ids = ['missing']; }],
    ['duplicate legend category', spec => { spec.body.children[1].ids = ['evidence', 'evidence']; }],
    ['raw run color', spec => { proseOf(spec).runs[1].color = '#ff00ff'; }],
    ['raw category color', spec => { spec.categories[0].color = '#ff00ff'; }],
    ['raw run style', spec => { proseOf(spec).runs[1].style = { padding: '10px' }; }],
    ['raw text width', spec => { proseOf(spec).width = 350; }],
    ['raw text font', spec => { proseOf(spec).font = 'Arial'; }],
  ];
  it.each(cases)('refuses %s without changing the source', (_name, change) => {
    const spec = fixture(); change(spec);
    const before = JSON.stringify(spec);
    const result = evaluateSpec(spec) as any;
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.plate).toBeUndefined();
    expect(JSON.stringify(spec)).toBe(before);
  });
});
