import {LIBRARY_TEMPLATES} from './library-templates.mjs';
import {FRAME_DEMOS} from './frame-demos.mjs';

const $=id=>document.getElementById(id);
for(const family of [...new Set(LIBRARY_TEMPLATES.map(item=>item.family))].sort()){
  const option=document.createElement('option');option.value=family;option.textContent=family;$('family').append(option);
}
for(const [index,item] of LIBRARY_TEMPLATES.entries()){
  const card=document.createElement('a');card.className='template';card.dataset.family=item.family;
  card.href=`./frames.html?frame=${encodeURIComponent(item.spec.id)}`;
  const preview=document.createElement('div');preview.className='preview';
  const image=document.createElement('img');image.src=new URL(`./previews/${item.spec.id}.png`,import.meta.url).href;
  image.alt=`${item.name}: ${item.caption}`;image.loading=index<4?'eager':'lazy';image.decoding='async';preview.append(image);
  const meta=document.createElement('div');meta.className='template-meta';
  const number=document.createElement('span');number.textContent=String(index+1).padStart(2,'0');
  const family=document.createElement('span');family.textContent=item.family;meta.append(number,family);
  const heading=document.createElement('h2');heading.textContent=item.name;
  const purpose=document.createElement('p');purpose.textContent=item.useWhen;
  const affordance=document.createElement('span');affordance.className='open';affordance.textContent='Open composition ↗';
  card.append(preview,meta,heading,purpose,affordance);$('templates').append(card);
}
function filterLibrary(){
  let count=0;for(const card of $('templates').children){card.hidden=$('family').value!=='all'&&card.dataset.family!==$('family').value;if(!card.hidden)count++;}
  $('count').textContent=`${count} composition${count===1?'':'s'}`;
}
const requestedFamily=new URLSearchParams(location.search).get('family');
if([...$('family').options].some(option=>option.value===requestedFamily))$('family').value=requestedFamily;
filterLibrary();
$('family').addEventListener('change',()=>{
  const url=new URL(location.href);
  if($('family').value==='all')url.searchParams.delete('family');else url.searchParams.set('family',$('family').value);
  history.replaceState(null,'',url);filterLibrary();
});
const newIds=new Set(LIBRARY_TEMPLATES.map(item=>item.spec.id));
for(const item of FRAME_DEMOS.filter(item=>!newIds.has(item.spec.id))){
  const link=document.createElement('a');link.href=`./frames.html?frame=${encodeURIComponent(item.spec.id)}`;link.textContent=`${item.name} ↗`;$('references').append(link);
}
