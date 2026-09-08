import {describe,expect,it} from 'vitest';
import {FRAME_DEMOS} from '../lab/framework/frame-demos.mjs';
import {evaluateSpec} from './evaluate.js';
import {polylineBlocked} from './geometry.js';
import {withPressTheme} from './theme.js';

const source=(id:string)=>FRAME_DEMOS.find((demo:any)=>demo.spec.id===id)!.spec;
const proved=(id:string)=>{
  const result=evaluateSpec(source(id));
  expect(result.ok,JSON.stringify(result.errors)).toBe(true);
  return (result as any).plate;
};

describe('current-engine demo compositions',()=>{
  it.each(FRAME_DEMOS)('proves $name without modifying its editable JSON',(demo:any)=>{
    const before=JSON.stringify(demo.spec),plate=proved(demo.spec.id);
    expect(demo.spec.schemaVersion).toBe('press-composition/1');
    expect(plate.theme.color.page).toBe('#000000');
    expect(plate.theme.color.blueText).toBe('#7a7aff');
    expect(plate.frame).toEqual({w:1600,h:demo.spec.id==='database'?3048:demo.spec.id==='cost-comparison'?1000:2000});
    expect(JSON.stringify(demo.spec)).toBe(before);
  });

  it('keeps the branch topology and every relation label clear of other routes',()=>{
    const spec=source('branching-flow'),graph=spec.body.children.find((node:any)=>node.type==='graph');
    expect(graph.edges.map((edge:any)=>[edge.from,edge.to])).toEqual([
      ['lookup','reuse'],['lookup','fetch'],['reuse','response'],['fetch','response'],
    ]);
    const plate=proved(spec.id);
    expect(plate.links.map((link:any)=>link.label)).toEqual(graph.edges.map((edge:any)=>edge.label));
    for(const link of plate.links){
      expect(link.labelRect).toBeTruthy();
      for(const other of plate.links)if(other!==link)expect(polylineBlocked(other.points,[link.labelRect])).toBeNull();
    }
  });

  it('draws the dated spans proportionally and keeps the source table on the same clock',()=>{
    const spec=source('time-flow'),plate=proved(spec.id);
    const tracks=spec.body.children.find((node:any)=>node.type==='panel').body.tracks;
    const spans=tracks.flatMap((track:any)=>track.spans);
    const table=spec.body.children.find((node:any)=>node.type==='table');
    expect(table.rows.map((row:any)=>[row.from,row.to])).toEqual(spans.map((span:any)=>[span.from,span.to]));
    const from=Math.min(...spans.map((span:any)=>Date.parse(span.from)));
    const to=Math.max(...spans.map((span:any)=>Date.parse(span.to)));
    expect(spec.body.children[0].items.map((item:any)=>item.value)).toEqual([String((to-from)/86400000),String(tracks.length),String(spans.length)]);
    const bars:any[]=[],labels:string[]=[];
    const ctx:any={beginPath(){},moveTo(){},lineTo(){},stroke(){},fillRect(x:number,y:number,w:number,h:number){bars.push({x,y,w,h})},fillText(text:string){labels.push(text)}};
    const chart=plate.nodes.find((node:any)=>node.kind==='custom');
    withPressTheme(plate.theme,()=>chart.paint(ctx,chart.rect,plate.theme.color));
    expect(bars).toHaveLength(4);
    const origin=bars[0].x,axisWidth=chart.rect.right-origin;
    for(let i=0;i<spans.length;i++){
      expect(bars[i].x-origin).toBeCloseTo(axisWidth*(Date.parse(spans[i].from)-from)/(to-from),6);
      expect(bars[i].w).toBeCloseTo(axisWidth*(Date.parse(spans[i].to)-Date.parse(spans[i].from))/(to-from),6);
    }
    expect(labels).toEqual(expect.arrayContaining(['Draft','Revise','Generate','Inspect','2026-09-01','2026-09-08']));
  });

  it('compares the same message before and after wrapping, without changing its content',()=>{
    const columns=source('contract-comparison').body.children[0].children;
    const before=JSON.parse(columns[0].children[0].code),after=JSON.parse(columns[1].children[0].code);
    expect(after.type).toBe('message');expect(after.payload).toEqual(before);
  });

  it('retains the earlier repair values, EUR and one zero-based scale',()=>{
    const spec=source('cost-comparison'),bars=spec.body.children[1].children[1];
    expect(bars.items.map((item:any)=>item.value)).toEqual([18,26,40,140]);
    expect(bars.unit).toBe('EUR');expect(bars.max).toBe(140);
    expect(bars.items.map((item:any)=>item.category)).toEqual(['repair','repair','repair','replace']);
  });
});
