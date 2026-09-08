import { describe, expect, it } from 'vitest';
import { code } from '../components/code.js';
import { resolveAnnotation } from './annotation.js';
import { evaluateSpec } from './evaluate.js';
import { Rect } from './geometry.js';
import { flatten, measureNode, solve } from './solve.js';
import { syntaxColor } from './syntax.js';
import { COLOR, lineHeight } from './tokens.js';
import { PRESS_THEMES, withPressTheme } from './theme.js';

const category = (treatment = 'highlight') => ({ id: 'meaning', label: 'The relevant source', tone: 'blue', treatment });
const context = (treatment = 'highlight') => ({ composition: true, categories: new Map([['meaning', category(treatment)]]) });
const prepare = (source: string, annotations: unknown, treatment = 'highlight', width = 1000, extra = {}) => {
  const block = code({ code: source, lang: 'js', annotations, ...extra }, context(treatment));
  solve(block, Rect.of(0, 0, width, measureNode(block, width).h));
  return block;
};
const recorder = () => {
  const commands: any[] = [], saved: any[] = [];
  const ctx: any = {
    fillStyle: '', strokeStyle: '', lineWidth: 1, letterSpacing: '0px',
    save() { saved.push({ fillStyle: this.fillStyle, strokeStyle: this.strokeStyle, lineWidth: this.lineWidth }); },
    restore() { Object.assign(this, saved.pop()); },
    fillText(text: string, x: number, y: number) { commands.push({ op: 'text', text, x, y, color: this.fillStyle }); },
    fillRect(x: number, y: number, w: number, h: number) { commands.push({ op: 'fill', x, y, w, h, color: this.fillStyle }); },
    strokeRect(x: number, y: number, w: number, h: number) { commands.push({ op: 'stroke', x, y, w, h, color: this.strokeStyle }); },
  };
  return { ctx, commands };
};
const linesOf = (block: any) => flatten(block).filter((node: any) => typeof node.sourceText === 'string');
const paint = (block: any) => {
  const log = recorder();
  for (const node of linesOf(block)) node.paint(log.ctx, node.rect, COLOR);
  return log.commands;
};

describe('source-addressed code annotations', () => {
  for (const skin of ['mega', 'paper'] as const) {
    it.each(['ink', 'highlight', 'underline', 'outline'])(`paints %s inside exact source bounds in ${skin}`, (treatment) => {
      withPressTheme(PRESS_THEMES[skin], () => {
        const source = 'const value = "Łódź";';
        const annotations = [{ id: 'focus', text: 'value', category: 'meaning' }];
        const before = structuredClone(annotations);
        const block = prepare(source, annotations, treatment);
        const commands = paint(block);
        const text = commands.filter(command => command.op === 'text');
        expect(text.map(command => command.text).join('')).toBe(source);
        expect(text.find(command => command.text === 'value').color).toBe(resolveAnnotation(category(treatment)).color);
        expect(text.find(command => command.text.trim() === 'const').color).toBe(syntaxColor('keyword', COLOR));
        expect(text.find(command => command.text === '"Łódź"').color).toBe(syntaxColor('string', COLOR));
        const decorations = commands.filter(command => command.op !== 'text');
        expect(decorations).toHaveLength(treatment === 'ink' ? 0 : 1);
        if (decorations.length) {
          const marked = text.find(command => command.text === 'value');
          const next = text.find(command => command.x > marked.x);
          expect(decorations[0].x).toBeGreaterThanOrEqual(marked.x);
          expect(decorations[0].x + decorations[0].w).toBeLessThanOrEqual(next.x + .01);
          expect(commands.indexOf(decorations[0])).toBeLessThan(commands.indexOf(marked));
        }
        expect(block.codeSource).toBe(source);
        expect(annotations).toEqual(before);
      });
    });
  }

  it('chooses an explicit repeated occurrence without touching its other appearances', () => {
    const source = 'const value = value + value;';
    const block = prepare(source, [{ text: 'value', occurrence: 2, category: 'meaning', id: 'second' }]);
    const start = source.indexOf('value', source.indexOf('value') + 1);
    expect(block.codeAnnotations[0]).toMatchObject({ start, end: start + 5, id: 'second' });
    expect(paint(block).filter(command => command.op === 'fill')).toHaveLength(1);
  });

  it('retains multiline source, indentation and a trailing empty line', () => {
    const source = 'function check() {\n  return {\n    ok: true\n  };\n}\n';
    const selected = 'return {\n    ok: true\n  }';
    const block = prepare(source, [{ text: selected, category: 'meaning' }]);
    const lines = linesOf(block);
    expect(lines.map((line: any) => line.sourceText).join('\n')).toBe(source);
    expect(block.codeAnnotations[0]).toMatchObject({ start: source.indexOf(selected), end: source.indexOf(selected) + selected.length });
    expect(lines.filter((line: any) => line.sourceAnnotations.length)).toHaveLength(3);
    expect(paint(block).filter(command => command.op === 'fill')).toHaveLength(3);
  });

  it('continues the same annotation across visual wraps without changing source', () => {
    const source = 'const message = "A carefully wrapped explanation keeps every character intact.";';
    const block = prepare(source, [{ text: 'carefully wrapped explanation keeps every character', category: 'meaning' }], 'highlight', 420);
    const commands = paint(block);
    expect(commands.filter(command => command.op === 'text').map(command => command.text).join('')).toBe(source);
    const marks = commands.filter(command => command.op === 'fill');
    expect(marks.length).toBeGreaterThan(1);
    expect(new Set(marks.map(mark => mark.y)).size).toBe(marks.length);
    for (const mark of marks) {
      expect(mark.h).toBe(lineHeight('code'));
      expect(mark.x).toBeGreaterThanOrEqual(linesOf(block)[0].rect.x);
      expect(mark.x + mark.w).toBeLessThanOrEqual(linesOf(block)[0].rect.right + .01);
    }
  });

  it('resolves UTF-16 offsets after non-ASCII content and allows adjacent distinct ranges', () => {
    const source = 'const city = "Łódź";';
    const block = prepare(source, [{ text: 'Łó', category: 'meaning' }, { text: 'dź', category: 'meaning' }]);
    expect(block.codeAnnotations.map((item: any) => [item.start, item.end])).toEqual([
      [source.indexOf('Łó'), source.indexOf('Łó') + 2],
      [source.indexOf('dź'), source.indexOf('dź') + 2],
    ]);
    const astral = 'const icon = "🚀";\nconst ready = true;';
    const astralBlock = code({ code: astral, annotations: [{ text: 'ready', category: 'meaning' }] }, context());
    expect(astralBlock.codeAnnotations[0].start).toBe(astral.indexOf('ready'));
    expect(astralBlock.codeAnnotations[0].start).toBeGreaterThan([...astral.slice(0, astral.indexOf('ready'))].length);
  });

  it('refuses selectors that would split surrogate pairs or combining characters during paint', () => {
    for (const [source, text] of [['const icon = "🚀";', '\uD83D'], ['const x = "e\u0301";', 'e']]) {
      expect(() => code({ code: source, annotations: [{ text, category: 'meaning', occurrence: 1 }] }, context()))
        .toThrow(expect.objectContaining({ code: 'CODE_ANNOTATION_BOUNDARY' }));
    }
  });

  it('paints complete annotated graphemes together across syntax-token boundaries', () => {
    const selected = 'cafe\u0301';
    const source = `const ${selected} = 1;`;
    const commands = paint(prepare(source, [{ text: selected, category: 'meaning' }]));
    const text = commands.filter(command => command.op === 'text');
    expect(text.map(command => command.text).join('')).toBe(source);
    expect(text.filter(command => command.text === selected)).toHaveLength(1);
    expect(text.some(command => command.text === '\u0301')).toBe(false);
    expect(text.find(command => command.text === '1').color).toBe(syntaxColor('number', COLOR));
  });

  it.each([
    ['non-array', null, 'CODE_ANNOTATIONS_INVALID'],
    ['non-record', ['value'], 'CODE_ANNOTATION_INVALID'],
    ['empty selector', [{ text: '', category: 'meaning' }], 'CODE_ANNOTATION_TEXT'],
    ['invisible selector', [{ text: '\n', category: 'meaning' }], 'CODE_ANNOTATION_TEXT'],
    ['missing source', [{ text: 'missing', category: 'meaning' }], 'CODE_ANNOTATION_MISSING'],
    ['ambiguous source', [{ text: 'value', category: 'meaning' }], 'CODE_ANNOTATION_AMBIGUOUS'],
    ['zero occurrence', [{ text: 'value', occurrence: 0, category: 'meaning' }], 'CODE_ANNOTATION_OCCURRENCE'],
    ['fractional occurrence', [{ text: 'value', occurrence: 1.5, category: 'meaning' }], 'CODE_ANNOTATION_OCCURRENCE'],
    ['string occurrence', [{ text: 'value', occurrence: '1', category: 'meaning' }], 'CODE_ANNOTATION_OCCURRENCE'],
    ['missing occurrence', [{ text: 'value', occurrence: 3, category: 'meaning' }], 'CODE_ANNOTATION_OCCURRENCE'],
    ['unknown category', [{ text: 'const', category: 'unknown' }], 'CODE_ANNOTATION_CATEGORY'],
    ['missing category', [{ text: 'const' }], 'CODE_ANNOTATION_CATEGORY'],
    ['raw color', [{ text: 'const', category: 'meaning', color: '#fff' }], 'CODE_ANNOTATION_UNKNOWN_FIELD'],
    ['invalid ID', [{ text: 'const', category: 'meaning', id: 'not a slug' }], 'CODE_ANNOTATION_ID'],
    ['duplicate ID', [{ text: 'const', category: 'meaning', id: 'same' }, { text: '=', category: 'meaning', id: 'same' }], 'CODE_ANNOTATION_ID'],
    ['overlap', [{ text: 'const value', category: 'meaning' }, { text: 'value', occurrence: 1, category: 'meaning' }], 'CODE_ANNOTATION_OVERLAP'],
    ['duplicate range', [{ text: 'const', category: 'meaning' }, { text: 'const', category: 'meaning' }], 'CODE_ANNOTATION_OVERLAP'],
  ])('refuses %s selectors', (_name, annotations, code) => {
    expect(() => prepare('const value = value;', annotations)).toThrow(expect.objectContaining({ code }));
  });

  it('refuses conflicting accentLines and annotations, even on separate lines', () => {
    expect(() => prepare('const first = 1;\nconst second = 2;', [{ text: 'second', category: 'meaning' }], 'highlight', 1000, { accentLines: [1] }))
      .toThrow(expect.objectContaining({ code: 'CODE_ANNOTATION_CONFLICT' }));
  });

  it('preserves existing exact-source refusals for tabs and carriage returns', () => {
    for (const source of ['\tconst value = 1;', 'const value = 1;\r\n']) {
      expect(() => prepare(source, [{ text: 'value', category: 'meaning' }]))
        .toThrow(expect.objectContaining({ code: 'CODE_SOURCE_UNSUPPORTED' }));
    }
  });

  it('prepares annotated JSON through the canonical envelope in both skins', () => {
    const source = '{\n  "name": "Ada",\n  "enabled": true\n}';
    const spec = {
      schemaVersion: 'press-composition/1', id: 'annotated-json', frame: 'reading', title: 'A value carries meaning.',
      categories: [category('outline')],
      body: { type: 'code', lang: 'json', code: source, annotations: [{ id: 'enabled-value', text: 'true', category: 'meaning' }] },
    };
    for (const theme of [PRESS_THEMES.mega, PRESS_THEMES.paper]) {
      const result = evaluateSpec(spec, { theme });
      expect(result.ok, JSON.stringify(result.errors)).toBe(true);
      expect(result.plate.nodes.find((node: any) => node.codeSource)?.codeSource).toBe(source);
    }
  });
});
