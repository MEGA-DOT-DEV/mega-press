import {STUDIO_STUDIES} from './studio-fixtures.mjs';
import {STUDIO_BACKGROUNDS} from './studio-backgrounds.mjs';
import {evaluateSpec} from '../../src/evaluate.js';
import {mountArtifact, providePressFontCss} from '../../src/mount.ts';
import {PRESS_THEMES} from '../../src/theme.js';
import {createLessonController, sampleLesson} from '../../src/lesson.ts';
import {flatten} from '../../src/solve.js';
import {space} from '../../src/tokens.js';
import {explodeLayers} from '../../src/interact.js';
import fonts from '../../src/fonts.css?inline';
import {captureFramePng} from './export-frame.js';

providePressFontCss(fonts);
const $ = id => document.getElementById(id);
const source = event => event.detail === 0 ? 'keyboard' : 'pointer';
const two = number => String(number).padStart(2,'0');
const clock = ms => `${two(Math.floor(ms/60000))}:${two(Math.floor(ms/1000)%60)}`;
const session = crypto.randomUUID();
const events = [];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let study, controller, mounted, evaluated, generation=0, instance=0;
let timeMs=0, playing=false, raf=0, playOrigin=0, spatial=false, regions=[];
let disposed=false, exporting=false;

function presentedSpec(){
  const preset=STUDIO_BACKGROUNDS.find(item=>item.id===$('background').value);
  return {...study.spec,...(preset?.background?{background:preset.background}:{})};
}

function download(value, name, type='application/json') {
  const blob = value instanceof Blob ? value : new Blob([JSON.stringify(value,null,2)+'\n'],{type});
  const url=URL.createObjectURL(blob), link=document.createElement('a');
  link.href=url;link.download=name;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function observe(event) {
  // Host envelope: local session/time belong here, not in the portable runtime.
  events.push({...event,observedAt:new Date().toISOString()});
  if(events.length>500)events.shift();
  $('event-empty').hidden=true;
  $('events').replaceChildren(...events.slice(-4).reverse().map(item=>{
    const row=document.createElement('li');
    const number=document.createElement('span');number.textContent=two(item.sequence);
    const detail=document.createElement('span');
    const name=document.createElement('strong');name.textContent=item.targetId;
    const from=document.createElement('span');from.textContent=` ← ${item.previous.stepId}`;
    detail.append(name,from);
    const trigger=document.createElement('span');trigger.className='event-source';trigger.textContent=item.source;
    row.append(number,detail,trigger);return row;
  }));
  $('event-count').textContent=`${events.length} events retained · latest 500`;
}

function pause() {
  playing=false;cancelAnimationFrame(raf);raf=0;
  $('play').textContent='▶';$('play').setAttribute('aria-label','Play lesson');
}
function stepStart(index) {return controller.lesson.steps.slice(0,index).reduce((sum,item)=>sum+item.durationMs,0);}
function updateTime(){
  const sample=sampleLesson(controller.lesson,timeMs);
  $('seek').max=String(sample.durationMs);$('seek').value=String(sample.timeMs);
  const label=`${clock(sample.timeMs)} / ${clock(sample.durationMs)}`;
  if($('time').textContent!==label)$('time').textContent=label;
  $('seek').setAttribute('aria-valuetext',`${Math.floor(sample.timeMs/1000)} of ${Math.floor(sample.durationMs/1000)} seconds`);
}
function showStep() {
  const {index,stepId}=controller.getState();
  const cue=controller.lesson.steps[index];
  $('step-count').textContent=`${two(index+1)} / ${two(controller.lesson.steps.length)}`;
  $('cue-label').textContent=`IDEA ${two(index+1)}`;
  $('cue-title').textContent=cue.title;$('cue-description').textContent=cue.description;
  for(const button of $('steps').children)button.setAttribute('aria-pressed',String(button.dataset.step===stepId));
  for(const {button,stepId:target} of regions)button.setAttribute('aria-pressed',String(target===stepId));
  $('previous').disabled=index===0;
  $('next').disabled=index===controller.lesson.steps.length-1;
}
function panToCue(){
  if(spatial)return;
  const cue=regions.find(region=>region.stepId===controller.getState().stepId);
  if(!cue)return;
  const viewport=$('viewport'), scale=$('plate').clientWidth/evaluated.plate.frame.w;
  if(viewport.scrollWidth<=viewport.clientWidth && viewport.scrollHeight<=viewport.clientHeight)return;
  const x=parseFloat(cue.button.style.left)*scale, y=parseFloat(cue.button.style.top)*scale;
  const w=parseFloat(cue.button.style.width)*scale, h=parseFloat(cue.button.style.height)*scale;
  viewport.scrollTo({left:Math.max(0,x-(viewport.clientWidth-w)/2),top:Math.max(0,y-(viewport.clientHeight-h)/2),behavior:'instant'});
}
function select(stepId,trigger){
  pause();
  const result=controller.select(stepId,trigger);
  if(!result.ok)throw new Error(result.message);
  timeMs=stepStart(controller.getState().index);showStep();updateTime();panToCue();
}
function seek(time,trigger){
  timeMs=time;
  const sample=sampleLesson(controller.lesson,time);
  const result=controller.select(sample.stepId,trigger);
  if(!result.ok)throw new Error(result.message);
  timeMs=sample.timeMs;
  if(result.changed){showStep();panToCue();}
  updateTime();
  return sample;
}
function tick(now) {
  if(!playing||disposed)return;
  const sample=seek(now-playOrigin,'playback');
  if(sample.finished){pause();return;}
  raf=requestAnimationFrame(tick);
}
function play(){
  if(playing){pause();return;}
  const sample=sampleLesson(controller.lesson,timeMs);
  if(sample.finished)seek(0,'playback');
  playing=true;playOrigin=performance.now()-timeMs;
  $('play').textContent='Ⅱ';$('play').setAttribute('aria-label','Pause lesson');
  raf=requestAnimationFrame(tick);
}

function placeRegions(){
  regions=[];
  const plate=$('plate').querySelector('.press-plate');
  if(!plate)return;
  const nodes=flatten(evaluated.plate.root);
  for(const cue of controller.lesson.steps){
    for(const targetId of cue.targetIds){
      const targets=nodes.filter(node=>node.semanticId===targetId && node.rect);
      if(targets.length!==1)throw new Error(`Lesson target ${targetId} must resolve to one measured region; found ${targets.length}.`);
      const target=targets[0], {rect}=target;
      const button=document.createElement('button');
      button.className='target-region';button.dataset.target=targetId;
      button.setAttribute('aria-label',`Explore: ${cue.title}`);
      button.style.left=`${rect.x}px`;button.style.top=`${rect.y}px`;
      button.style.width=`${rect.w}px`;button.style.height=`${rect.h}px`;
      // Framed panels already own their padding. Bare content needs room
      // around its focus ink; field rows stay clear of adjacent dividers.
      const padded=target.kind==='box' && target.pad>0;
      const padX=padded?0:space(target.portId?1:2);
      const padY=padded?0:target.portId?space(1)/2:space(2);
      button.style.setProperty('--focus-x',`${Math.max(0,Math.min(padX,rect.x,evaluated.plate.frame.w-rect.x-rect.w))}px`);
      button.style.setProperty('--focus-y',`${Math.max(0,Math.min(padY,rect.y,evaluated.plate.frame.h-rect.y-rect.h))}px`);
      button.addEventListener('click',event=>select(cue.id,source(event)));
      plate.append(button);regions.push({button,stepId:cue.id});
    }
  }
}
function showSpatial(next){
  spatial=next;
  $('workspace').classList.toggle('is-spatial',spatial);
  $('flat').setAttribute('aria-pressed',String(!spatial));
  $('spatial').setAttribute('aria-pressed',String(spatial));
  $('spatial-note').hidden=!spatial;
  explodeLayers($('plate'),spatial,{spread:Number($('depth').value)});
}
function showError(error){
  $('error').textContent=error instanceof Error ? error.message : String(error);
  $('error').hidden=false;
}
async function render(){
  const current=++generation;
  pause();mounted?.unmount();mounted=null;regions=[];
  $('plate').replaceChildren();$('error').hidden=true;
  document.documentElement.dataset.studioReady='false';
  $('geometry-status').textContent='Measuring & checking…';
  $('export-png').disabled=true;
  const skin=$('theme').value;
  document.documentElement.dataset.skin=skin;
  try{
    const theme=PRESS_THEMES[skin];
    const spec=presentedSpec();
    evaluated=evaluateSpec(spec,{theme});
    if(!evaluated.ok)throw new Error(evaluated.errors.map(item=>`${item.code}: ${item.message}`).join('\n'));
    mounted=mountArtifact($('plate'),spec,{theme});
    await mounted.ready;
    if(current!==generation||disposed)return;
    placeRegions();showStep();showSpatial(spatial);
    const {w,h}=evaluated.plate.frame;
    $('geometry-status').textContent=`${w} × ${h} · ${evaluated.warnings.length ? `${evaluated.warnings.length} review note` : 'geometry checked'}`;
    $('geometry-status').title=evaluated.warnings.map(item=>`${item.code}: ${item.message}`).join('\n');
    document.documentElement.dataset.studioReady='true';
    $('export-png').disabled=false;
  }catch(error){
    if(current!==generation||disposed)return;
    mounted?.unmount();mounted=null;showError(error);
    $('geometry-status').textContent='Preparation refused';
  }
}
function openStudy(index){
  pause();controller?.dispose();
  study=STUDIO_STUDIES[index];timeMs=0;
  controller=createLessonController(study.lesson,{instanceId:`${session}:${++instance}`,onEvent:observe});
  const url=new URL(location.href);url.searchParams.set('study',study.spec.id);history.replaceState(null,'',url);
  for(const button of $('studies').children)button.setAttribute('aria-current',String(button.dataset.study===study.spec.id));
  $('figure-label').textContent=`COMPOSITION / ${two(index+1)}`;
  $('steps').replaceChildren(...controller.lesson.steps.map((cue,i)=>{
    const button=document.createElement('button');button.className='step';button.dataset.step=cue.id;
    const number=document.createElement('span');number.className='step-number';number.textContent=two(i+1);
    const title=document.createElement('span');title.textContent=cue.title;button.append(number,title);
    button.addEventListener('click',event=>select(cue.id,source(event)));return button;
  }));
  $('transcript').replaceChildren(...controller.lesson.steps.map(cue=>{
    const item=document.createElement('li'), title=document.createElement('strong'), description=document.createElement('p');
    title.textContent=cue.title;description.textContent=cue.description;item.append(title,description);return item;
  }));
  showStep();updateTime();render();
}

// Rasterize the mounted canonical plate, including its actual canvas and DOM
// layers. No layout is reconstructed. Embedded font data avoids external assets.
async function exportPng(){
  if(exporting||!mounted||document.documentElement.dataset.studioReady!=='true')return;
  exporting=true;$('export-png').disabled=true;
  const exportGeneration=generation;
  try{
    const original=$('plate').querySelector('.press-plate');
    const size={...evaluated.plate.frame};
    const filename=`${study.spec.id}-${$('theme').value}.png`;
    const blob=await captureFramePng(original,{width:size.w,height:size.h,fontCss:fonts});
    download(blob,filename);
  }catch(error){if(exportGeneration===generation&&!disposed)showError(error);}
  finally{exporting=false;$('export-png').disabled=document.documentElement.dataset.studioReady!=='true';}
}

STUDIO_STUDIES.forEach((item,index)=>{
  const button=document.createElement('button');button.className='study';button.dataset.study=item.spec.id;
  const number=document.createElement('span');number.className='study-index';number.textContent=two(index+1);
  const caption=document.createElement('span'),title=document.createElement('strong'),topic=document.createElement('small');
  title.textContent=item.label;topic.textContent=item.topic;caption.append(title,topic);
  const arrow=document.createElement('span');arrow.className='study-arrow';arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');
  button.append(number,caption,arrow);button.addEventListener('click',()=>openStudy(index));$('studies').append(button);
});
for(const preset of STUDIO_BACKGROUNDS){
  const option=document.createElement('option');option.value=preset.id;option.textContent=preset.label;
  option.title=preset.description;$('background').append(option);
}
$('background').value='signal';
$('background').addEventListener('change',render);
$('theme').addEventListener('change',render);
$('play').addEventListener('click',play);
$('reset').addEventListener('click',event=>select(controller.lesson.steps[0].id,source(event)));
$('previous').addEventListener('click',event=>select(controller.lesson.steps[Math.max(0,controller.getState().index-1)].id,source(event)));
$('next').addEventListener('click',event=>select(controller.lesson.steps[Math.min(controller.lesson.steps.length-1,controller.getState().index+1)].id,source(event)));
let seekSource='pointer';
$('seek').addEventListener('keydown',()=>{seekSource='keyboard';});
$('seek').addEventListener('pointerdown',()=>{seekSource='pointer';});
$('seek').addEventListener('input',()=>{pause();seek(Number($('seek').value),seekSource);});
$('flat').addEventListener('click',()=>showSpatial(false));
$('spatial').addEventListener('click',()=>{pause();showSpatial(true);});
$('depth').addEventListener('input',()=>showSpatial(true));
$('download-frame').addEventListener('click',()=>download(presentedSpec(),`${study.spec.id}.json`));
$('download-lesson').addEventListener('click',()=>download(controller.lesson,`${study.spec.id}.lesson.json`));
$('download-events').addEventListener('click',()=>download({sessionId:session,retentionLimit:500,events},'press-interactions.json'));
$('export-png').addEventListener('click',exportPng);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
reducedMotion.addEventListener('change',()=>pause());
addEventListener('pagehide',event=>{pause();if(event.persisted)return;disposed=true;generation++;controller?.dispose();mounted?.unmount();});
const requested=new URLSearchParams(location.search).get('study');
openStudy(Math.max(0,STUDIO_STUDIES.findIndex(item=>item.spec.id===requested)));
