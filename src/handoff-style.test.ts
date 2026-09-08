import {createCanvas} from '@napi-rs/canvas';
import {describe,expect,it} from 'vitest';
import steps from '../example/compositions/handoff-step-focus.json';
import timeline from '../example/compositions/handoff-timeline-focus.json';
import flows from '../example/compositions/handoff-flow-comparison.json';
import palette from '../example/compositions/handoff-palette.json';
import {evaluateSpec} from './evaluate.js';
import {paintVector} from './render.js';
import {chipsRow} from '../components/chips.js';
import {measureNode} from './solve.js';
import {CATEGORY_PALETTE,CATEGORY_SERIES,CATEGORICAL,contrast} from './tokens.js';
import {categoryColor,categoryGround,COMPOSITION_THEME,getPressTheme,PRESS_THEMES,withPressTheme} from './theme.js';

const prove=(spec:any,theme:any=PRESS_THEMES.mega)=>{
  const result=evaluateSpec(spec,{theme});
  expect(result.ok,JSON.stringify(result.errors)).toBe(true);
  return result.plate;
};
const rail=(options:any)=>({...structuredClone(steps),body:{...structuredClone(steps.body),...options}});

describe('author-supplied Press style handoff',()=>{
  it.each([steps,timeline,flows,palette])('keeps $id literal in both supported skins',spec=>{
    const before=JSON.stringify(spec),skin=getPressTheme();
    for(const theme of Object.values(PRESS_THEMES))prove(spec,theme);
    expect(JSON.stringify(spec)).toBe(before);expect(getPressTheme()).toEqual(skin);
  });
  it('uses editorial pixel headings without pixelizing literal code or body copy',()=>{
    expect(COMPOSITION_THEME.fonts?.heading).toContain('Argent Pixel');
    expect(COMPOSITION_THEME.fonts?.sans).toBe('"Geist Sans", sans-serif');
    expect(COMPOSITION_THEME.fonts?.mono).toBe('"Geist Mono", monospace');
  });
  it('keeps every named ink and its ground legible, including light project skins',()=>{
    for(const theme of Object.values(PRESS_THEMES))withPressTheme(theme,()=>{
      for(const tone of Object.keys(CATEGORY_PALETTE)){
        const ink=categoryColor(tone as any),ground=categoryGround(tone as any);
        expect(contrast(ink,ground)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(getPressTheme().color.text,ground)).toBeGreaterThanOrEqual(4.5);
      }
    });
    withPressTheme(PRESS_THEMES.mega,()=>{
      expect(Object.fromEntries(Object.keys(CATEGORY_PALETTE).map(tone=>[tone,categoryGround(tone as any)]))).toEqual({red:'#150000',cyan:'#001415',yellow:'#151200',magenta:'#150011',green:'#001509',blue:'#000015',orange:'#150900',violet:'#0a0015'});
    });
  });
  it('rechecks the handoff wash when a black-page project overrides its prose inks',()=>{
    const color={...PRESS_THEMES.mega.color,panel:'#000000',raised:'#000000',black1:'#000000',text:'#eb0000',ink:'#eb0000',muted:'#eb0000'};
    withPressTheme({...PRESS_THEMES.mega,color},()=>{
      expect(contrast(color.text,CATEGORY_PALETTE.red.ground)).toBeLessThan(4.5);
      expect(contrast(color.text,categoryGround('red'))).toBeGreaterThanOrEqual(4.5);
    });
  });
  it.each([['red','orange'],['blue','violet']])('refuses %s / %s rather than remapping source categories',(a,b)=>{
    const spec={schemaVersion:'press-composition/1',id:'conflict',frame:'reading',categories:[a,b].map(tone=>({id:tone,label:tone,tone})),body:{type:'legend'}};
    expect(evaluateSpec(spec).errors.map((e:any)=>e.code)).toContain('CATEGORY_CONFLICT');
    expect(spec.categories.map(c=>c.tone)).toEqual([a,b]);
  });
  it('keeps automatic series distinct and restores their project colours',()=>{
    const before=[...CATEGORICAL];
    withPressTheme(PRESS_THEMES.paper,()=>expect(CATEGORICAL).toEqual(CATEGORY_SERIES.map(tone=>categoryColor(tone as any))));
    expect(CATEGORICAL).toEqual(before);
    expect(CATEGORY_SERIES).not.toContain('orange');expect(CATEGORY_SERIES).not.toContain('violet');
  });
  it.each([
    [{accentAt:2},[1,2]],
    [{accentAt:3},[2,3]],
    [{accentAt:2,accentReach:'none'},[2]],
    [{accentAt:2,accentReach:'full'},[0,1,2]],
    [{accentAt:-1,activeTo:2},[0,1,2]],
    [{accentAt:-1},[]],
  ])('derives focus/progress markers from the accented segment %#',(options,expected)=>{
    const plate=prove(rail(options));
    const marks=plate.nodes.filter((n:any)=>n.kind==='marker');
    expect(marks.flatMap((n:any,i:number)=>n.ring?[]:[i])).toEqual(expected);
    const lit=plate.rails.filter((r:any)=>r.color===plate.theme.color.red);
    expect(lit).toHaveLength(expected.length>1?1:0);
    if(lit.length){
      expect(lit[0].points[0].y).toBe(marks[expected[0]].rect.cy);
      expect(lit[0].points.at(-1).y).toBe(marks[expected.at(-1)!].rect.cy);
    }
    for(const item of steps.body.items){
      const title=plate.nodes.find((n:any)=>n.text===item.name),detail=plate.nodes.find((n:any)=>n.text===item.detail);
      expect(title.color).toBe(plate.theme.color.text);
      expect(detail.rect.x).toBe(title.rect.x);
    }
  });
  it('refuses competing focus mechanisms and invalid indices',()=>{
    expect(evaluateSpec(rail({activeTo:1})).errors[0].code).toBe('RAIL_ACCENT_CONFLICT');
    expect(evaluateSpec(rail({accentAt:99})).errors[0].code).toBe('RAIL_ACCENT_INDEX');
    expect(evaluateSpec(rail({accentReach:'custom'})).errors[0].code).toBe('RAIL_ACCENT_REACH');
  });
  it('keeps ordinal timeline focus on the stop, never a coloured interval',()=>{
    const plate=prove(timeline);
    expect(plate.rails.every((r:any)=>r.color===plate.theme.color.black2)).toBe(true);
    expect(plate.nodes.filter((n:any)=>n.kind==='marker'&&!n.ring)).toHaveLength(1);
    expect(plate.nodes.find((n:any)=>n.text==='Server names the field').color).toBe(plate.theme.color.red);
    const invalid=structuredClone(timeline);invalid.body.items[0].accent=true;
    expect(evaluateSpec(invalid).errors[0].code).toBe('TIMELINE_ACCENT_CONFLICT');
  });
  it('uses the shared code block without losing outer blank lines or normalizing tabs',()=>{
    const spec=rail({});spec.body.items[2].code='\nconst answer = 42;\n';
    expect(prove(spec).nodes.find((n:any)=>n.codeSource)?.codeSource).toBe(spec.body.items[2].code);
    spec.body.items[2].code='\tconst answer = 42;';
    expect(evaluateSpec(spec).errors[0].code).toBe('CODE_SOURCE_UNSUPPORTED');
  });
  it('does not impose the handoff recipe density caps on a reading composition',()=>{
    const spec=rail({});
    spec.body.items.push({name:'Fifth step',detail:'Literal test content.'},{name:'Sixth step',detail:'Literal test content.'});
    spec.body.items[2].code=Array.from({length:10},(_,i)=>`const value${i} = ${i};`).join('\n');
    const plate=prove(spec);
    expect(plate.nodes.filter((n:any)=>n.kind==='marker')).toHaveLength(6);
    expect(plate.nodes.find((n:any)=>n.codeSource)?.codeSource).toBe(spec.body.items[2].code);
  });
  it('wraps whole badges with one shared measure/paint layout and keeps literal spaces',()=>{
    withPressTheme(PRESS_THEMES.mega,()=>{
      const row=chipsRow([{text:' vendor owned '},{text:'one call'}],'handoff',{exact:true});
      const {h}=measureNode(row,300);
      const labels:any[]=[];
      const ctx:any={fillRect(){},strokeRect(){},fillText(text:string,x:number,y:number){labels.push({text,x,y})}};
      row.paint(ctx,{x:0,y:0,w:300,h},getPressTheme().color);
      expect(labels.map(item=>item.text)).toEqual([' vendor owned ','one call']);
      expect(labels[1].y).toBeGreaterThan(labels[0].y);
      expect(labels.every(item=>item.y<h)).toBe(true);
      expect(()=>measureNode(row,30)).toThrow(expect.objectContaining({code:'CHIP_TOO_WIDE'}));
    });
  });
  it('paints square category grounds and a blue fill with a readable ink border',()=>{
    const plate=prove(palette),canvas=createCanvas(plate.frame.w,plate.frame.h),ctx=canvas.getContext('2d');
    withPressTheme(plate.theme,()=>paintVector(ctx as any,plate));
    const rgb=(x:number,y:number)=>[...ctx.getImageData(Math.floor(x),Math.floor(y),1,1).data];
    const panel=plate.nodes.find((n:any)=>n.kind==='box'&&n.category==='blue');
    expect(rgb(panel.rect.x+2,panel.rect.y+2)).toEqual([0,0,21,255]);
    const swatch=plate.nodes.find((n:any)=>n.kind==='marker'&&n.fill==='#0000f5');
    expect(rgb(swatch.rect.cx,swatch.rect.cy)).toEqual([0,0,245,255]);
    expect(rgb(swatch.rect.x+1,swatch.rect.cy)).toEqual([122,122,255,255]);
  });
});
