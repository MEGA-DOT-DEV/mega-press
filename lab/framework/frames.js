import {FRAME_DEMOS} from './frame-demos.mjs';
import {HANDOFF_DEMOS} from './handoff-fixtures.mjs';
import {LIBRARY_TEMPLATES} from './library-templates.mjs';
import {STUDIO_BACKGROUNDS} from './studio-backgrounds.mjs';
import {captureFramePng,downloadBlob} from './export-frame.js';
import {evaluateSpec} from '../../src/evaluate.js';
import {PRESS_THEMES} from '../../src/theme.js';
import {mountArtifact,providePressFontCss} from '../../src/mount.ts';
import fonts from '../../src/fonts.css?inline';

providePressFontCss(fonts);
const $=id=>document.getElementById(id);
const examples=[...HANDOFF_DEMOS,...LIBRARY_TEMPLATES,...FRAME_DEMOS];
let mounted=null,generation=0,download=null,active=null,exporting=false;
for(const demo of examples){
  const link=document.createElement('a');
  link.href=`?frame=${encodeURIComponent(demo.spec.id)}`;
  link.textContent=demo.name;link.dataset.frame=demo.spec.id;
  link.addEventListener('click',event=>{
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    event.preventDefault();history.pushState(null,'',link.href);show();
  });
  $('frames').append(link);
}
for(const preset of STUDIO_BACKGROUNDS){
  const option=document.createElement('option');option.value=preset.id;option.textContent=preset.label;
  $('background').append(option);
}

async function show(){
  const current=++generation;
  mounted?.unmount();mounted=null;active=null;
  $('plate').replaceChildren();$('error').hidden=true;$('png').disabled=true;
  document.documentElement.dataset.framesReady='false';
  $('status').textContent='Preparing composition…';$('report').textContent='';
  const params=new URLSearchParams(location.search);
  const requested=params.get('frame');
  const demo=requested?examples.find(d=>d.spec.id===requested):examples[0];
  if(!demo){$('error').hidden=false;$('error').textContent=`Unknown frame: ${requested}`;$('status').textContent='Choose one of the listed examples.';return;}
  const skin=params.get('theme')==='paper'?'paper':'mega';
  const ground=STUDIO_BACKGROUNDS.some(item=>item.id===params.get('ground'))?params.get('ground'):'authored';
  $('theme').value=skin;$('background').value=ground;
  const theme=PRESS_THEMES[skin];
  const spec=structuredClone(demo.spec);
  if(ground!=='authored'){
    delete spec.background;
    const preset=STUDIO_BACKGROUNDS.find(item=>item.id===ground);
    if(preset.background)spec.background=preset.background;
  }
  for(const link of $('frames').children){
    if(link.dataset.frame===spec.id)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
    const url=new URL(location.href);url.searchParams.set('frame',link.dataset.frame);link.href=url.href;
  }
  $('name').textContent=demo.name;$('detail').textContent=demo.useWhen||demo.detail;
  $('caption').textContent=demo.caption||demo.detail;
  const source=JSON.stringify(spec,null,2);
  $('source').textContent=source;
  if(download)URL.revokeObjectURL(download);
  download=URL.createObjectURL(new Blob([`${source}\n`],{type:'application/json'}));
  $('json').href=download;$('json').download=`${spec.id}.json`;
  const evaluated=evaluateSpec(spec,{theme});
  const report={artifactId:spec.id,schemaVersion:spec.schemaVersion,theme:skin,background:ground,geometryValid:evaluated.ok,presentationMounted:false,warnings:evaluated.warnings||[],frame:evaluated.plate?.frame};
  try{
    if(!evaluated.ok)throw Error(evaluated.errors.map(e=>`${e.code}: ${e.message}`).join('\n'));
    mounted=mountArtifact($('plate'),spec,{theme});
    await mounted.ready;
    if(current!==generation)return;
    if(JSON.stringify(spec,null,2)!==source)throw Error('The authored source changed during presentation.');
    report.presentationMounted=true;
    $('report').textContent=JSON.stringify(report,null,2);
    $('status').textContent=`${report.frame.w} × ${report.frame.h} · ${skin==='mega'?'MEGA':'Paper'} · ${report.warnings.length?`${report.warnings.length} review note(s) — see preparation report`:'geometry checked'}`;
    active={id:spec.id,skin,frame:report.frame};
    document.documentElement.dataset.framesReady='true';$('png').disabled=exporting;
  }catch(error){
    if(current!==generation)return;
    mounted?.unmount();mounted=null;
    $('error').hidden=false;$('error').textContent=error.message;
    $('status').textContent='Preparation refused.';
    $('report').textContent=JSON.stringify({...report,error:error.message},null,2);
  }
}

for(const [id,param] of [['theme','theme'],['background','ground']]){
  $(id).addEventListener('change',()=>{
    const url=new URL(location.href);url.searchParams.set(param,$(id).value);
    history.replaceState(null,'',url);show();
  });
}
$('png').addEventListener('click',async()=>{
  if(!active||exporting)return;
  exporting=true;$('png').disabled=true;$('png').textContent='Exporting…';
  const current=generation,{id,skin,frame}=active;
  try{
    const blob=await captureFramePng($('plate').querySelector('.press-plate'),{width:frame.w,height:frame.h,fontCss:fonts});
    downloadBlob(blob,`${id}-${skin}.png`);
  }catch(error){if(current===generation){$('error').hidden=false;$('error').textContent=error.message;}}
  finally{exporting=false;$('png').disabled=!active;$('png').textContent='PNG ↓';}
});
addEventListener('popstate',show);
addEventListener('pagehide',event=>{if(event.persisted)return;generation++;mounted?.unmount();if(download)URL.revokeObjectURL(download);});
show();
