import { createCanvas } from '@napi-rs/canvas';
import { describe, expect, it } from 'vitest';
import { DATABASE } from '../lab/framework/composition-fixtures.mjs';
import { schema } from '../components/content.js';
import { evaluateSpec } from './evaluate.js';
import { polylineBlocked } from './geometry.js';
import { paintVector } from './render.js';
import { flatten, measureNode } from './solve.js';
import { CATEGORY_TONES, COMPOSITION_THEME, getPressTheme, withPressTheme } from './theme.js';
import { type } from './tokens.js';

// Mirrors the named dark plate/code tokens in mega-dev/packages/ui/src/base.css
// and the syntax allocation in apps/web/src/drops/shiki.ts. No sibling checkout
// is needed to run producer tests. See spec/framework/design-alignment.md.
describe('composition style regression', () => {
  it('uses the MEGA cabinet, not the experimental pastel palette', () => {
    expect(COMPOSITION_THEME.color).toMatchObject({
      page:'#000000', panel:'#050505', raised:'#0b0b0b',
      red:'#ff0000', blue:'#0000f5', blueText:'#7a7aff',
      text:'#fafafa', ink:'#d9d9d9', muted:'#a1a1a1', line:'#292929',
    });
    expect(CATEGORY_TONES).toEqual({red:'#ff0000',cyan:'#00e5f5',yellow:'#f5d000',magenta:'#f500c8',green:'#00f56a',blue:'#7a7aff',orange:'#fa6600',violet:'#b06bff',neutral:'#a1a1a1'});
    expect(COMPOSITION_THEME.syntax).toMatchObject({keyword:'#ff5555',string:'#7b7bff',number:'#7b7bff',comment:'#8a8a93'});
    expect(type('code')).toMatchObject({family:'mono',tracking:0});
    expect(type('utility').tracking).toBe(.08);
  });

  it('preserves the input and restores the legacy theme after a composition solve', () => {
    const source=JSON.stringify(DATABASE), before=getPressTheme();
    const result=evaluateSpec(DATABASE);
    expect(result.ok).toBe(true);
    expect(JSON.stringify(DATABASE)).toBe(source);
    expect(getPressTheme()).toEqual(before);
  });

  it('keeps every database field name and type on one measured line', () => {
    const result=evaluateSpec(DATABASE);
    expect(result.ok).toBe(true);
    const plate=(result as any).plate;
    const cells=plate.nodes.filter((node:any)=>node.graphCell);
    expect(cells.map((node:any)=>node.key)).toEqual(['agents','tasks','items','artifacts']);
    for(const cell of cells){
      for(const field of cell.bodyRows){
        const texts=flatten(field).filter((node:any)=>node.kind==='text');
        for(const source of [field.field.name,field.field.type]){
          const node=texts.find((n:any)=>n.text===source);
          expect(node._block.lines).toEqual([source]);
          expect(node.role).toBe('code');
        }
        expect(cell.rect.contains(field.rect)).toBe(true);
      }
      const types=cell.bodyRows.map((field:any)=>flatten(field).find((n:any)=>n.text===field.field.type));
      expect(new Set(types.map((node:any)=>node.rect.right)).size).toBe(1);
    }
  });

  it('refuses an undersized identifier instead of silently splitting it', () => {
    withPressTheme(COMPOSITION_THEME,()=>{
      const node=schema({title:'tasks',fields:[{id:'created',name:'created_at',type:'timestamp'}]});
      expect(()=>measureNode(node,300)).toThrow(expect.objectContaining({code:'TEXT_UNBREAKABLE'}));
    });
  });

  it('clears each label over its own route without concealing another edge', () => {
    const result=evaluateSpec(DATABASE);
    expect(result.ok).toBe(true);
    const plate=(result as any).plate;
    expect(plate.links.map((link:any)=>link.label)).toEqual([
      'N tasks : 1 agent','N items : 1 agent','0..1 task per item','N outputs : 1 task',
    ]);
    const canvas=createCanvas(plate.frame.w,plate.frame.h),ctx=canvas.getContext('2d');
    withPressTheme(plate.theme,()=>paintVector(ctx,plate));
    for(const link of plate.links){
      expect(link.labelRect).toBeTruthy();
      for(const other of plate.links)if(other!==link)expect(polylineBlocked(other.points,[link.labelRect])).toBeNull();
      const pixel=ctx.getImageData(Math.round(link.labelRect.cx),Math.round(link.labelRect.cy),1,1).data;
      expect([...pixel]).toEqual([0,0,0,255]);
    }
  });
});
