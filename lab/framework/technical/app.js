import './style.css';
import fontCss from '../../../src/fonts.css?inline';
import { COLOR, contrast } from '../../../src/tokens.js';
import { Rect, routeAround, polylineBlocked } from '../../../src/geometry.js';
import { tokenizeLine } from '../../../src/syntax.js';
import { ensurePressFonts, providePressFontCss } from '../../../src/mount.ts';
import { DATABASE_SCHEMA, ANNOTATED_MEDIA } from './schema-annotation.mjs';
import { validateExample, targetsOf, transition, textOfRuns } from './model.mjs';
import { WAVEFORM_SVG, WAVE_REGIONS } from './assets.mjs';
import capture from './assets/gallery-capture.png';

const EXAMPLES = [DATABASE_SCHEMA, ANNOTATED_MEDIA].map(validateExample);
// A controlled categorical palette taken from the roles in the author references.
// This extends the lab cabinet only; authors choose names, not RGB values.
const INKS = { green:'#8bf78a', violet:'#cda2f5', cyan:'#8bd7ec', blue:'#9abaff', amber:'#ffd078', red:'#ff9292', neutral:COLOR.muted };
for (const ink of Object.values(INKS)) if (contrast(ink, COLOR.raised) < 4.5) throw Error('Category contrast failed.');
for (const [key,value] of Object.entries({...COLOR,...INKS})) document.documentElement.style.setProperty(`--${key}`,value);
providePressFontCss(fontCss);
const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const make = (tag, cls, value) => { const n=document.createElement(tag); if(cls)n.className=cls; if(value!==undefined)n.textContent=value; return n; };
const svgNode = (tag, attrs={}) => { const n=document.createElementNS(NS,tag); Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,String(v))); return n; };
const frameTick = () => new Promise(resolve=>requestAnimationFrame(resolve));
let active, generation=0;

function mountFrame(example, host, onEvent) {
  const instanceId=`technical-${crypto.randomUUID()}`;
  const abort=new AbortController();
  const validTargets=targetsOf(example);
  const graphs=[], assets=[], images=[], authored=[];
  const categories=new Map(example.categories.map(c=>[c.id,c]));
  let selected=null, sequence=0, disposed=false, observer;
  const root=make('article','technical-plate');
  root.inert=true;
  root.dataset.instance=instanceId; root.setAttribute('aria-label',example.title);
  const heading=make('header','plate-heading');
  heading.append(make('p','eyebrow',example.eyebrow),make('h2','plate-title',example.title),make('p','plate-description',example.description));
  root.append(heading);
  const colorize=(el,category)=>{ if(category){ const c=categories.get(category); if(!c)throw Error(`Unknown category ${category}`); el.dataset.category=category; el.style.setProperty('--tone',INKS[c.tone]); } };
  const register=(el,id,category)=>{ if(id)el.dataset.target=id; colorize(el,category); return el; };
  const button=(label,id,cls='target-button')=>{const el=make('button',cls,label);el.type='button';el.dataset.select=id;el.setAttribute('aria-pressed','false');return el;};
  const authoredSlot=(el,value)=>{ el.dataset.authored=String(authored.length); authored.push({el,value}); return el; };
  function rich(runs, cls='rich-text') {
    const p=make('p',cls);
    for(const run of runs){
      const part=run.id?button(run.text,run.id,'annotation'):make('span','',run.text);
      register(part,run.id,run.category); p.append(part);
    }
    return authoredSlot(p,textOfRuns(runs));
  }
  function code(node) {
    const shell=make('div','code-shell');
    if(node.label)shell.append(make('p','code-label',node.label));
    const pre=make('pre','code');
    node.text.split('\n').forEach((line,index)=>{
      if(index)pre.append(document.createTextNode('\n'));
      for(const run of tokenizeLine(line,node.lang==='none'?'none':node.lang||'js')) pre.append(make('span',`syntax-${run.cls}`,run.text));
    });
    authoredSlot(pre,node.text); shell.append(pre); return shell;
  }
  function asset(node){
    const figure=register(make('figure','asset'),node.id);
    if(node.asset==='gallery-capture'){
      const img=make('img');img.src=capture;img.alt=node.caption;img.width=1360;img.height=414;
      figure.append(img); images.push(img);
    }else{
      // Only this owned, bundled asset is parsed. No user SVG upload or generic
      // sanitizer is claimed. Every instance gets its own region/ARIA IDs.
      const parsed=new DOMParser().parseFromString(WAVEFORM_SVG,'image/svg+xml');
      if(parsed.querySelector('parsererror'))throw Error('Owned SVG could not be parsed.');
      const svg=document.importNode(parsed.documentElement,true);
      const prefix=`${instanceId}-${node.id}-`;
      for(const el of svg.querySelectorAll('[id]'))el.id=prefix+el.id;
      svg.setAttribute('aria-labelledby',`${prefix}wave-title ${prefix}wave-description`);
      for(const region of WAVE_REGIONS){
        const el=svg.querySelector(`#${CSS.escape(prefix+region.id)}`);
        const target=`${node.id}-${region.id}`;
        register(el,target,node.bindings[region.id]);el.dataset.select=target;
        el.setAttribute('role','button');el.setAttribute('tabindex','0');el.setAttribute('aria-label',region.label);el.setAttribute('aria-pressed','false');
      }
      figure.append(svg);
      const labels=make('div','wave-labels');
      for(const region of WAVE_REGIONS){const b=button(region.id.toUpperCase(),`${node.id}-${region.id}`);colorize(b,node.bindings[region.id]);labels.append(b);}
      figure.append(labels);assets.push({id:node.id,svg});
    }
    if(node.caption)figure.append(make('figcaption','',node.caption));
    return figure;
  }
  function build(node){
    let el;
    if(node.type==='stack'||node.type==='columns'){
      el=make('div',node.type==='stack'?'block-stack':'columns');if(node.count)el.style.setProperty('--columns',node.count);
      node.children.forEach(child=>el.append(build(child)));
    }else if(node.type==='panel'){
      el=make('section','panel');if(node.label)el.append(make('p','panel-label',node.label));
      const h=make('h3'); h.append(node.id?button(node.title,node.id,'heading-button'):document.createTextNode(node.title));el.append(h);
      const body=make('div','panel-body');node.children.forEach(child=>body.append(build(child)));el.append(body);
    }else if(node.type==='schema'){
      el=make('section','schema');const h=make('header','schema-heading');h.append(make('h3','',node.title),make('p','',node.subtitle));el.append(h);
      const fields=make('div','schema-fields');
      for(const field of node.fields){
        const row=register(button('',field.id,'field-row'),field.id);
        const name=make('span','field-name',field.name);const flags=make('span','field-flags');
        if(field.key)flags.append(make('span','flag',field.key==='primary'?'PK':'FK'));
        if(field.nullable)flags.append(make('span','flag','?'));
        const type=make('span','field-type',field.type+(field.nullable?' | null':''));
        row.append(name,flags,type);
        row.setAttribute('aria-label',`${node.title}.${field.name}: ${field.type}${field.key?`, ${field.key} key`:''}${field.nullable?', nullable':''}`);
        row.dataset.category=[field.key,field.nullable?'optional':null].filter(Boolean).join(' ');
        if(field.key)row.style.setProperty('--tone',INKS[categories.get(field.key).tone]);
        fields.append(row);
      }
      el.append(fields);if(node.footer)el.append(make('p','schema-footer',node.footer));
    }else if(node.type==='text')el=rich(node.runs||[{text:node.text}]);
    else if(node.type==='code')el=code(node);
    else if(node.type==='callout')el=authoredSlot(make('aside','callout',node.text),node.text);
    else if(node.type==='table'){
      el=make('table','data-table');const head=make('thead'),hr=make('tr');node.headers.forEach(v=>hr.append(make('th','',v)));head.append(hr);el.append(head);
      const body=make('tbody');node.rows.forEach(row=>{const tr=make('tr');row.forEach(value=>tr.append(authoredSlot(make('td','',value),value)));body.append(tr);});el.append(body);
    }else if(node.type==='metrics'){
      el=make('dl','metrics');node.items.forEach(item=>{const d=make('div');d.append(make('dt','',item.label),make('dd','metric-value',String(item.value)),make('dd','metric-unit',item.unit));el.append(d);});
    }else if(node.type==='asset')el=asset(node);
    else if(node.type==='graph'){
      el=make('div','graph');const vector=svgNode('svg',{'aria-hidden':'true',class:'connections'});const labels=make('div','edge-labels');el.append(vector,labels);
      const graphNodes=[];
      node.rows.forEach(row=>{const rank=make('div','graph-rank');rank.style.setProperty('--columns',row.length);row.forEach(child=>{const cell=build(child);cell.classList.add('graph-node');cell.dataset.nodeId=child.id;rank.append(cell);graphNodes.push(cell);});el.append(rank);});
      graphs.push({el,vector,labels,nodes:graphNodes,edges:node.edges,id:node.id});
    }else if(node.type==='trace'){
      el=make('div','trace');
      for(const round of node.rounds){
        const section=register(make('section','trace-round'),round.id);const rh=make('h3','round-heading');rh.append(button(round.title,round.id,'heading-button'));section.append(rh);
        for(const run of round.blocks){
          const item=register(make('section','actor-run'),run.id,run.actor);const who=make('header','actor-label');who.append(button(categories.get(run.actor).label,run.id,'heading-button'),make('span','', 'ACTOR RUN'));
          const events=make('div','trace-events');
          for(const event of run.events){const row=register(make('div','trace-event'),event.id,run.actor);row.append(button(event.seq[0]===event.seq[1]?`seq ${event.seq[0]}`:`seq ${event.seq[0]}–${event.seq[1]}`,event.id,'sequence-target'),rich(event.runs));events.append(row);}
          item.append(who,events,make('aside','run-outcome',run.outcome));section.append(item);
        }
        if(round.note)section.append(make('p','memory-note',round.note));el.append(section);
      }
    }else throw Error(`No renderer for ${node.type}`);
    register(el,node.id,node.category);return el;
  }
  const legend=make('div','legend');legend.setAttribute('aria-label','Shared category legend');
  for(const c of example.categories){const b=button(c.label,`category:${c.id}`,'legend-button');colorize(b,c.id);b.prepend(make('span','swatch'));legend.append(b);}root.append(legend);
  const content=make('div','plate-content');content.append(build(example.body));root.append(content);host.append(root);
  const edgeList=graphs.flatMap(g=>g.edges);
  function paintSelection(){
    const category=selected?.startsWith('category:')?selected.slice(9):null;
    const related=new Set([selected]);
    const occurrence=selected?root.querySelector(`[data-target="${CSS.escape(selected)}"]`):null;
    const shared=!category&&occurrence?.matches('.annotation, svg [role="button"], .graph-node[data-category], .actor-run')?new Set((occurrence.dataset.category||'').split(' ')):new Set();
    edgeList.forEach(e=>{if(e.id===selected||e.from===selected||e.to===selected){related.add(e.id);related.add(e.from);related.add(e.to);}});
    for(const el of root.querySelectorAll('[data-target],[data-category]')){
      const cats=(el.dataset.category||'').split(' ');
      el.classList.toggle('is-selected',el.dataset.target===selected||Boolean(category&&cats.includes(category)));
      el.classList.toggle('is-related',!category&&el.dataset.target!==selected&&(related.has(el.dataset.target)||cats.some(c=>shared.has(c))));
    }
    for(const b of root.querySelectorAll('[data-select]'))b.setAttribute('aria-pressed',String(b.dataset.select===selected));
  }
  function select(targetId,source){
    const next=transition(selected,targetId,validTargets);if(!next.ok)throw Error(next.code);if(!next.changed)return;
    const previous=selected;selected=targetId;paintSelection();
    const event=Object.freeze({eventVersion:1,schemaVersion:'press-technical-lab/1',artifactId:example.id,revision:1,instanceId,sequence:++sequence,type:targetId===null?'focus.clear':'focus.select',targetId,source,previous:{selectedId:previous},next:{selectedId:targetId}});
    onEvent(event);
  }
  root.addEventListener('click',event=>{const target=event.target.closest('[data-select]');if(target&&root.contains(target))select(target.dataset.select,event.detail===0?'keyboard':'pointer');},{signal:abort.signal});
  root.addEventListener('keydown',event=>{const target=event.target.closest('svg [data-select]');if(target&&['Enter',' '].includes(event.key)){event.preventDefault();select(target.dataset.select,'keyboard');}},{signal:abort.signal});

  function drawGraph(graph){
    const bounds=graph.el.getBoundingClientRect();
    const local=el=>{const r=el.getBoundingClientRect();return new Rect(r.x-bounds.x,r.y-bounds.y,r.width,r.height);};
    const nodes=graph.nodes.map(el=>({el,id:el.dataset.nodeId,rect:local(el)}));
    const target=id=>{const el=graph.el.querySelector(`[data-target="${CSS.escape(id)}"]`);if(!el)throw Error(`Missing rendered target ${id}`);const owner=nodes.find(n=>n.el===el||n.el.contains(el));if(!owner)throw Error('Port has no graph owner');return {el,owner,rect:local(el)};};
    graph.vector.replaceChildren();graph.labels.replaceChildren();graph.vector.setAttribute('viewBox',`0 0 ${bounds.width} ${bounds.height}`);
    const defs=svgNode('defs');graph.vector.append(defs);const labelRects=[];const routes=[];
    const obstacles=nodes.map(n=>({rect:n.rect,name:n.id}));
    const resolved=graph.edges.map(edge=>{
      const a=target(edge.from),b=target(edge.to);const down=b.owner.rect.cy>=a.owner.rect.cy;
      const horizontal=Math.abs(a.owner.rect.cx-b.owner.rect.cx)>Math.abs(a.owner.rect.cy-b.owner.rect.cy);
      return {edge,a,b,fromSide:edge.fromSide||(horizontal?'right':down?'bottom':'top'),toSide:edge.toSide||(horizontal?'left':down?'top':'bottom')};
    });
    const anchor=(entry,end)=>{
      const t=end==='from'?entry.a:entry.b, side=end==='from'?entry.fromSide:entry.toSide;
      const same=resolved.filter(r=>(end==='from'?r.a:r.b).owner.id===t.owner.id&&(end==='from'?r.fromSide:r.toSide)===side);
      const a=same.length>1&&t.el===t.owner.el?t.owner.rect.port(side,same.indexOf(entry),same.length):t.owner.rect.anchor(side);
      if(t.el!==t.owner.el){if(side==='left'||side==='right')a.y=t.rect.cy;else a.x=t.rect.cx;}
      return a;
    };
    for(const entry of resolved){
      const {edge}=entry;
      const corridor=Math.abs(entry.a.owner.rect.cx-entry.b.owner.rect.cx)-(entry.a.owner.rect.w+entry.b.owner.rect.w)/2;
      const stub=['left','right'].includes(entry.fromSide)&&['left','right'].includes(entry.toSide)&&corridor>150?Math.min(88,corridor/2-2):20;
      const points=routeAround(anchor(entry,'from'),anchor(entry,'to'),{obstacles,stub,clearance:24,describe:{from:edge.from,to:edge.to}});
      if(polylineBlocked(points,obstacles))throw Error(`Route crosses content: ${edge.id}`);
      if(points.some(p=>p.x<0||p.y<0||p.x>bounds.width||p.y>bounds.height))throw Error(`Route outside graph: ${edge.id}`);
      const ink=edge.category?INKS[categories.get(edge.category).tone]:COLOR.muted;
      const markerId=`${instanceId}-${edge.id}-arrow`;
      const marker=svgNode('marker',{id:markerId,viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto-start-reverse'});marker.append(svgNode('path',{d:'M 1 1 L 9 5 L 1 9 Z',fill:ink}));defs.append(marker);
      const path=svgNode('path',{d:points.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' '),fill:'none',stroke:ink,'stroke-width':1.5,'marker-end':`url(#${markerId})`});register(path,edge.id,edge.category);graph.vector.append(path);
      const label=register(button(edge.label,edge.id,'edge-label'),edge.id,edge.category);
      label.setAttribute('aria-label',`${edge.from} refers to ${edge.to}: ${edge.label}`);graph.labels.append(label);
      const w=label.offsetWidth,h=label.offsetHeight;
      const candidates=[];
      for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],length=Math.abs(a.x-b.x)+Math.abs(a.y-b.y);if(length<(a.y===b.y?w:h)+8)continue;for(const t of [.5,...Array.from({length:19},(_,j)=>(j+1)/20)])candidates.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,score:length});}
      const intersects=(a,b,pad=5)=>a.x<b.right+pad&&a.right>b.x-pad&&a.y<b.bottom+pad&&a.bottom>b.y-pad;
      const chosen=candidates.sort((a,b)=>b.score-a.score).map(p=>new Rect(p.x-w/2,p.y-h/2,w,h)).find(r=>r.x>=2&&r.y>=2&&r.right<=bounds.width-2&&r.bottom<=bounds.height-2&&!nodes.some(n=>intersects(r,n.rect))&&!labelRects.some(other=>intersects(r,other)));
      if(!chosen)throw Error(`No clear label position for ${edge.id}; widen the composition.`);
      label.style.left=`${chosen.x}px`;label.style.top=`${chosen.y}px`;labelRects.push(chosen);
      routes.push({id:edge.id,from:edge.from,to:edge.to,label:edge.label,points,clear:true});
    }
    return {id:graph.id,nodes:nodes.length,relations:routes};
  }
  function redraw(){
    if(disposed)return;
    const report={mode:'Experimental DOM composition + canonical Press routeAround',instanceId,frame:{width:root.offsetWidth,height:root.offsetHeight},graphs:graphs.map(drawGraph),assets:assets.map(a=>({id:a.id,viewBox:a.svg.getAttribute('viewBox'),width:a.svg.getBoundingClientRect().width})),sourceSlots:authored.length};
    for(const slot of authored)if(slot.el.textContent!==slot.value)throw Error('An authored source slot changed during presentation.');
    paintSelection();root.dataset.ready='true';root.inert=false;return report;
  }
  const ready=(async()=>{await Promise.all(images.map(img=>img.decode()));await document.fonts.ready;await frameTick();if(disposed)return;const report=redraw();observer=new ResizeObserver(()=>{try{const r=redraw();if(r&&active?.root===root){$('report').textContent=JSON.stringify(r,null,2);document.documentElement.dataset.technicalReady='true';}}catch(error){root.dataset.ready='false';if(active?.root===root)showError(error);}});observer.observe(root);return report;})();
  return {root,ready,clear:source=>select(null,source),dispose(){disposed=true;abort.abort();observer?.disconnect();root.remove();}};
}
function showError(error){$('error').hidden=false;$('error').textContent=error.message;$('report').textContent=JSON.stringify({prepared:false,error:error.message},null,2);document.documentElement.dataset.technicalReady='false';$('status').textContent='Preparation refused — see the report.';}
async function show(example){
  const token=++generation;active?.dispose();$('frame-host').replaceChildren();$('error').hidden=true;document.documentElement.dataset.technicalReady='false';$('status').textContent='Preparing layout and connections…';
  $('report').textContent='Preparing…';$('event').textContent='No interaction event yet.';$('selection').textContent='Nothing selected. Try a field, a category, a trace entry or an SVG region.';
  $('source').textContent=JSON.stringify(example,null,2);$('proofs').replaceChildren(...example.proofs.map(p=>make('li','',p)));
  for(const a of $('frame-nav').children)a.setAttribute('aria-current',a.dataset.frame===example.id?'page':'false');
  document.title=`${example.title} — Mega Press`;
  active=mountFrame(example,$('frame-host'),event=>{$('event').textContent=JSON.stringify(event,null,2);$('selection').textContent=`${event.targetId?`Selected: ${event.targetId}`:'Selection cleared'} · local event ${event.sequence}. Nothing is sent.`;});
  active.root.dataset.showTitle=String($('show-title').checked);
  try{const report=await active.ready;if(token!==generation)return;$('report').textContent=JSON.stringify(report,null,2);document.documentElement.dataset.technicalReady='true';$('status').textContent=`${report.frame.width} × ${report.frame.height} / prepared`;}catch(error){if(token===generation)showError(error);}
}
async function start(){
  await ensurePressFonts(document);await document.fonts.load('400 14px "Geist Mono"');
  const loaded=new Set([...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family.replace(/["']/g,'')));
  for(const face of ['Geist Sans','Geist Mono'])if(!loaded.has(face))throw Error(`Required font did not load: ${face}`);
  for(const [i,e] of EXAMPLES.entries()){const a=make('a','',`${String(i+1).padStart(2,'0')} / ${e.id==='database'?'Database schema':e.id==='annotations'?'Annotated media':e.id==='provider-flow'?'Provider flow':'Execution trace'}`);a.href=`?frame=${e.id}`;a.dataset.frame=e.id;a.addEventListener('click',event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();history.replaceState(null,'',a.href);show(e);});$('frame-nav').append(a);}
  const asked=new URLSearchParams(location.search).get('frame');const example=EXAMPLES.find(e=>e.id===asked)||EXAMPLES[0];
  $('show-title').addEventListener('change',()=>{if(active)active.root.dataset.showTitle=String($('show-title').checked);});
  $('clear-selection').addEventListener('click',event=>active?.clear(event.detail===0?'keyboard':'pointer'));
  await show(example);
}
window.addEventListener('pagehide',event=>{if(!event.persisted){generation++;active?.dispose();}});
start().catch(showError);
