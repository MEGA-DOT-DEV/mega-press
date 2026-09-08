import { COLOR, CONTRAST, PressError, contrast } from './tokens.js';
import { categoryColor, categoryGround } from './theme.js';

export const ANNOTATION_TREATMENTS = Object.freeze(['ink', 'highlight', 'underline', 'outline']);

/** Snapshot one category's semantic mark in the current, measured project skin. */
export function resolveAnnotation(category) {
  const treatment=category.treatment??'ink';
  if(!ANNOTATION_TREATMENTS.includes(treatment))throw new PressError('ANNOTATION_TREATMENT','Unknown annotation treatment.');
  const ink=categoryColor(category.tone);
  const background=categoryGround(category.tone);
  const color=treatment==='ink'?ink:COLOR.text;
  if(contrast(color,treatment==='highlight'?background:COLOR.panel)<CONTRAST.text){
    throw new PressError('ANNOTATION_CONTRAST','The project skin cannot make this annotation readable.');
  }
  return Object.freeze({treatment,ink,color,background});
}

/** Decorations stay inside their measured rectangle and never change advances. */
export function paintAnnotation(ctx,rect,style) {
  if(rect.w<=0||rect.h<=0||style.treatment==='ink')return;
  ctx.save();
  if(style.treatment==='highlight'){
    ctx.fillStyle=style.background;ctx.fillRect(rect.x,rect.y,rect.w,rect.h);
  }else if(style.treatment==='underline'){
    const thickness=Math.min(2,rect.h);
    ctx.fillStyle=style.ink;ctx.fillRect(rect.x,rect.y+rect.h-thickness,rect.w,thickness);
  }else if(style.treatment==='outline'){
    const thickness=Math.min(1.5,rect.w,rect.h);
    ctx.strokeStyle=style.ink;ctx.lineWidth=thickness;
    ctx.strokeRect(rect.x+thickness/2,rect.y+thickness/2,rect.w-thickness,rect.h-thickness);
  }
  ctx.restore();
}

/** The DOM treatment follows the same grammar without adding width or padding. */
export function annotationCss(style) {
  const css={color:style.color,boxDecorationBreak:'clone'};
  if(style.treatment==='highlight')css.backgroundColor=style.background;
  if(style.treatment==='underline')Object.assign(css,{textDecorationLine:'underline',textDecorationColor:style.ink,textDecorationThickness:'2px',textUnderlineOffset:'4px',textDecorationSkipInk:'none'});
  if(style.treatment==='outline')css.boxShadow=`inset 0 0 0 1.5px ${style.ink}`;
  return css;
}
