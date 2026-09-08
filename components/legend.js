import { custom, row, stack, text } from '../src/solve.js';
import { resolveAnnotation, paintAnnotation } from '../src/annotation.js';
import { COLOR, FAMILY, PressError, lineHeight, space, typeSize } from '../src/tokens.js';
import { measure } from '../src/text.js';
import { marker } from '../src/solve.js';
import { categoryColor, categoryFill } from '../src/theme.js';

export function legend({ids,layout='row'}={}, {categories=new Map()}={}) {
  if(!['row','stack'].includes(layout))throw new PressError('LEGEND_LAYOUT','Legend layout must be row or stack.');
  if(ids!==undefined&&(!Array.isArray(ids)||new Set(ids).size!==ids.length))throw new PressError('LEGEND_IDS','Legend IDs must be a list without duplicates.');
  const entries=ids?ids.map(id=>categories.get(id)):[...categories.values()];
  if(!entries.length||entries.some(entry=>!entry))throw new PressError('LEGEND_CATEGORY','Legend needs declared categories; unknown IDs are refused.');
  // Preserve the established compact color key when no annotation grammar is authored.
  if(layout==='row'&&entries.every(entry=>entry.treatment===undefined&&entry.description===undefined)){
    return row({gap:4,children:entries.map(category=>row({gap:1,grow:true,semanticId:`category:${category.id}`,category:category.id,children:[
      marker({alignTo:'body',fill:categoryFill(category.tone),outline:categoryColor(category.tone)}),
      text(category.label,'body',{color:categoryColor(category.tone),grow:true}),
    ]}))});
  }
  const items=entries.map(category=>{
    const style=resolveAnnotation(category),height=lineHeight('body'),width=measure('Aa','body')+space(1);
    const swatch=custom({
      width,
      annotation:style,
      measure:()=>({w:width,h:height}),
      paint:(ctx,rect)=>{
        paintAnnotation(ctx,{x:rect.x,y:rect.y+2,w:width,h:height-4},style);
        ctx.save();ctx.font=`400 ${typeSize('body')}px ${FAMILY.sans}`;
        ctx.textBaseline='middle';ctx.textAlign='center';ctx.fillStyle=style.color;
        ctx.fillText('Aa',rect.x+width/2,rect.y+height/2);ctx.restore();
      },
    });
    return row({gap:2,grow:true,semanticId:`category:${category.id}`,category:category.id,children:[
      swatch,
      stack({gap:1,grow:true,children:[
        text(category.label,'body',{color:COLOR.text}),
        category.description?text(category.description,'body',{color:COLOR.muted}):null,
      ]}),
    ]});
  });
  return (layout==='stack'?stack:row)({gap:3,children:items});
}
