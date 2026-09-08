/** Capture the canonical mounted layers without reconstructing their layout. */
export async function captureFramePng(original, {width,height,fontCss,scale=2}) {
  if(!original || !Number.isFinite(width) || !Number.isFinite(height) || width<=0 || height<=0)throw new Error('A mounted frame and its dimensions are required.');
  const doc=original.ownerDocument;
  const clone=original.cloneNode(true);
  clone.querySelectorAll('.target-region,.press-strata').forEach(element=>element.remove());
  clone.style.transform='none';clone.style.overflow='hidden';
  const canvases=[...original.querySelectorAll('canvas')];
  [...clone.querySelectorAll('canvas')].forEach((canvas,index)=>{
    const replacement=doc.createElement('img');replacement.src=canvases[index].toDataURL('image/png');
    replacement.style.cssText=canvas.style.cssText;
    replacement.style.position='absolute';replacement.style.inset='0';
    replacement.style.transform='none';replacement.style.opacity='1';canvas.replaceWith(replacement);
  });
  for(const layer of clone.children){layer.style.transform='none';layer.style.opacity='1';}
  const style=doc.createElement('style');
  style.textContent=`${fontCss}\n.press-plate{position:relative}.press-ground{position:absolute;pointer-events:none}.press-dom{position:absolute;inset:0}.press-text{position:absolute;margin:0;white-space:pre}`;
  clone.prepend(style);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">${new XMLSerializer().serializeToString(clone)}</div></foreignObject></svg>`;
  const image=new Image();image.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();
  const canvas=doc.createElement('canvas');canvas.width=width*scale;canvas.height=height*scale;
  canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
  return new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('PNG encoding failed.')),'image/png'));
}

export function downloadBlob(blob,name){
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=name;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
