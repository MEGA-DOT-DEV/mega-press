import { describe, expect, it } from 'vitest';
import { evaluateSpec } from './evaluate.js';
import { PRESS_THEMES, categoryGround, withPressTheme } from './theme.js';

const composition = (body: unknown) => ({
  schemaVersion: 'press-composition/1', id: 'literal-quadrant', frame: 'reading',
  title: 'The action determines the review.', body,
});
const quadrant = () => ({
  type: 'quadrant', x: 'IMPACT: LOW TO HIGH', y: 'REVERSIBILITY: EASY TO HARD',
  cells: [
    { title: 'Delegate', body: 'Keep the exact explanation: A → B.' },
    { title: 'Preview', body: 'Inspect the proposed change.', accent: true },
    { title: 'Checkpoint', body: 'Preserve the source before acting.' },
    { title: 'Decide', body: 'Let the author make the final choice.' },
  ],
});

describe('literal text in composition data records', () => {
  it.each(['mega', 'paper'] as const)('preserves quadrant descriptions under the %s theme', (theme) => {
    const matrix = quadrant();
    const spec = composition({ type: 'panel', title: 'Four responses', body: matrix });
    const before = structuredClone(spec);
    const result = evaluateSpec(spec, { theme: PRESS_THEMES[theme] });
    expect(result.ok, JSON.stringify(result.errors)).toBe(true);
    const texts = result.plate.nodes.filter((node: any) => node.kind === 'text').map((node: any) => node.text);
    expect(texts).toEqual(expect.arrayContaining(matrix.cells.map(cell => cell.body)));
    const accented = result.plate.nodes.find((node: any) => node.kind === 'box' && node.borderColor === result.plate.theme.color.red);
    expect(accented.fill).toBe(withPressTheme(result.plate.theme, () => categoryGround('red')));
    expect(spec).toEqual(before);
  });

  it.each([
    { type: 'text', role: 'body', content: 'A disguised component', color: '#ff00ff' },
    { type: 'invented-renderer', body: 'A disguised component' },
    ['A list is not a string'],
    42,
  ])('refuses nonliteral quadrant bodies %#', (body) => {
    const matrix: any = quadrant();
    matrix.cells[0].body = body;
    const result = evaluateSpec(composition(matrix));
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatchObject({ code: 'BAD_SPEC', message: expect.stringContaining('expected literal text') });
  });

  it.each([
    { type: 'text', role: 'body', content: 'Raw styles still refuse.', color: '#ff00ff' },
    { type: 'invented-renderer', content: 'Unknown components still refuse.' },
  ])('still validates actual nested graph bodies %#', (body) => {
    const result = evaluateSpec(composition({
      type: 'graph', nodes: [
        { key: 'matrix', rank: 0, body: quadrant() },
        { key: 'next', rank: 1, body },
      ], edges: [{ from: 'matrix', to: 'next' }],
    }));
    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toMatch(/unsupported authored parameter|is not a component/);
  });

  it('continues refusing raw styles on quadrant records', () => {
    const matrix: any = quadrant();
    matrix.cells[0].color = '#ff00ff';
    const result = evaluateSpec(composition(matrix));
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatchObject({ code: 'BAD_SPEC', message: expect.stringContaining('unsupported cells field') });
  });
});
