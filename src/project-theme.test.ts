import { createCanvas } from '@napi-rs/canvas';
import { afterEach, describe, expect, it } from 'vitest';
import { FRAME_DEMOS } from '../lab/framework/frame-demos.mjs';
import { evaluateSpec, proveArtifact } from './evaluate.js';
import { mountArtifact } from './mount.js';
import { paintVector } from './render.js';
import { COLOR, FAMILY, GROUND } from './tokens.js';
import {
  categoryColor, categoryGround, configurePress, getPressTheme, PRESS_THEMES,
  resetPressTheme, resolvePressTheme, SUPPORTED_PRESS_FONTS, withPressTheme,
} from './theme.js';

afterEach(resetPressTheme);

const source = {
  schemaVersion: 'press-composition/1', id: 'project-skin', frame: 'landscape',
  title: 'One source, many projects.',
  categories: [
    { id: 'input', label: 'Input', tone: 'red' },
    { id: 'output', label: 'Output', tone: 'blue' },
    { id: 'context', label: 'Context', tone: 'neutral' },
  ],
  body: { type: 'stack', gap: 4, children: [
    { type: 'legend' },
    { type: 'panel', title: 'A meaningful relationship', category: 'input', body: {
      type: 'text', role: 'body', runs: [
        { id: 'selected', text: 'An annotated input', category: 'input' },
        { text: ' produces an output.' },
      ],
    } },
  ] },
};

describe('project skins on the canonical composition route', () => {
  it.each(Object.entries(PRESS_THEMES))('solves the complete demo corpus with the %s skin', (_name, theme) => {
    const before = getPressTheme();
    for (const { spec } of FRAME_DEMOS) {
      const input = JSON.stringify(spec);
      const result = evaluateSpec(spec, { theme });
      expect(result.ok, `${spec.id}: ${JSON.stringify((result as any).errors)}`).toBe(true);
      expect(JSON.stringify(spec)).toBe(input);
      expect((result as any).plate.theme.color.page).toBe(theme.color?.page);
      expect(getPressTheme()).toEqual(before);
    }
  });

  it('resolves component, legend, annotated text and relation inks through the same skin', () => {
    const result = evaluateSpec(source, { theme: PRESS_THEMES.paper }) as any;
    expect(result.ok).toBe(true);
    const colors = PRESS_THEMES.paper.color!;
    const texts = result.plate.nodes.filter((node: any) => node.kind === 'text');
    for (const [label, ink] of [['Input', colors.red], ['Output', colors.blueText], ['Context', colors.muted]]) {
      expect(texts.find((node: any) => node.text === label).color).toBe(ink);
    }
    expect(texts.find((node: any) => node.runs)?.runs[0].color).toBe(colors.red);
    expect(result.plate.nodes.find((node: any) => node.category === 'input' && node.kind === 'box').borderColor).toBe(colors.red);

    const database = FRAME_DEMOS.find((demo: any) => demo.spec.id === 'database')!.spec;
    const related = evaluateSpec(database, { theme: PRESS_THEMES.paper }) as any;
    for (const link of related.plate.links) {
      if (link.category) {
        const tone = database.categories.find((entry: any) => entry.id === link.category).tone;
        expect(link.color).toBe(({ red: colors.red, blue: colors.blueText, neutral: colors.muted } as any)[tone]);
      }
    }
  });

  it('captures independent prepared skins, including real vector paint after later theme changes', () => {
    const mega = proveArtifact(source, { theme: PRESS_THEMES.mega }) as any;
    const paper = proveArtifact(source, { theme: { ...PRESS_THEMES.paper, fonts: { ...PRESS_THEMES.paper.fonts, heading: '"Geist Sans", sans-serif' } } }) as any;
    expect(mega.ok && paper.ok).toBe(true);
    expect(mega.plate.theme.fonts.heading).not.toBe(paper.plate.theme.fonts.heading);
    configurePress(PRESS_THEMES.paper);
    const canvas = createCanvas(1600, 1000), ctx = canvas.getContext('2d');
    for (const { plate } of [mega, paper, mega]) {
      ctx.clearRect(0, 0, 1600, 1000);
      withPressTheme(plate.theme, () => paintVector(ctx as any, plate));
      const panel = plate.nodes.find((node: any) => node.kind === 'box' && node.fill);
      const actual = [...ctx.getImageData(Math.ceil(panel.rect.x + 8), Math.ceil(panel.rect.y + 8), 1, 1).data];
      const hex = panel.fill;
      expect(hex).toBe(withPressTheme(plate.theme, () => categoryGround('red')));
      const expected = [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
      expect(actual).toEqual([...expected, 255]);
    }
    expect(getPressTheme().color.page).toBe(PRESS_THEMES.paper.color?.page);
  });

  it('uses configured project choices in compositions and permits a complete per-mount override', () => {
    configurePress(PRESS_THEMES.paper);
    const project = evaluateSpec(source) as any;
    expect(project.ok).toBe(true);
    expect(project.plate.theme.color.page).toBe(PRESS_THEMES.paper.color?.page);
    const override = evaluateSpec(source, { theme: PRESS_THEMES.mega }) as any;
    expect(override.ok).toBe(true);
    expect(override.plate.theme.color).toEqual(resolvePressTheme(PRESS_THEMES.mega, { composition: true }).color);
    expect(override.plate.theme.color.page).toBe('#000000');
    expect(getPressTheme().color.page).toBe(PRESS_THEMES.paper.color?.page);
  });

  it('rolls back every token and project choice when later validation fails', () => {
    const before = getPressTheme(), grounds = { ...GROUND };
    expect(() => configurePress({ chrome: 'embed', color: { red: '#ff3333' }, fonts: { heading: 'Unknown Family, serif' } })).toThrow(expect.objectContaining({ code: 'THEME_FONT_UNMEASURED' }));
    expect(getPressTheme()).toEqual(before);
    expect(GROUND).toEqual(grounds);
    expect(categoryColor('red')).toBe(before.color.red);
    expect(() => withPressTheme(PRESS_THEMES.paper, () => {
      expect(COLOR.page).toBe('#f6f3eb');
      throw Error('render failed');
    })).toThrow('render failed');
    expect(getPressTheme()).toEqual(before);
    expect((evaluateSpec(source) as any).plate.theme.color.page).toBe('#000000');
  });

  it('refuses unmeasured first families and accepts every bundled family without fallback substitution', () => {
    for (const first of ['Arial', 'unregistered, "Geist Sans"', 'serif', '"Geist Sans']) {
      expect(() => configurePress({ fonts: { heading: first } })).toThrow(expect.objectContaining({ code: 'THEME_FONT_UNMEASURED' }));
    }
    for (const first of SUPPORTED_PRESS_FONTS) {
      configurePress({ fonts: { heading: `'${first}', serif` } });
      expect(FAMILY.heading).toBe(`"${first}", serif`);
    }
  });

  it('checks the effective requested font at mount readiness', async () => {
    const fonts = Object.assign([
      { family: 'Geist Sans', status: 'loaded' },
      { family: 'Geist Mono', status: 'loaded' },
      { family: 'Geist Pixel', status: 'loaded' },
    ], { load: async () => [], ready: Promise.resolve() });
    const element = { ownerDocument: { fonts, getElementById: () => ({}) } } as unknown as HTMLElement;
    const mounted = mountArtifact(element, source, { theme: PRESS_THEMES.paper });
    await expect(mounted.ready).rejects.toMatchObject({ codes: ['FONT_NOT_READY'], message: expect.stringContaining('Argent Pixel') });
    mounted.unmount();
    expect(getPressTheme().color.page).toBe('#000000');
  });
});
