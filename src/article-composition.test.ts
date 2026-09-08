import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT=fileURLToPath(new URL('..',import.meta.url));
const BIN=join(ROOT,'bin/press.mjs');
const DATABASE=join(ROOT,'example/compositions/database.json');
const temp=mkdtempSync(join(tmpdir(),'press-article-contract-'));
const run=(args:string[])=>spawnSync(process.execPath,[BIN,...args],{cwd:ROOT,encoding:'utf8',timeout:30000});
beforeAll(()=>{if(!existsSync(join(ROOT,'dist/parse.js')))expect(spawnSync('pnpm',['build'],{cwd:ROOT,encoding:'utf8'}).status).toBe(0)});
afterAll(()=>rmSync(temp,{recursive:true,force:true}));

const chrome=[process.env.CHROME,'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Chromium.app/Contents/MacOS/Chromium','/usr/bin/google-chrome','/usr/bin/chromium'].find(path=>path&&existsSync(path));

describe('static article authoring route',()=>{
  it('discovers the actual composition building blocks',()=>{
    const result=run(['components','--json']);
    expect(result.status).toBe(0);
    const catalogue=JSON.parse(result.stdout);
    expect(catalogue.schemaVersion).toBe('press-composition/1');
    expect(catalogue.groups.flatMap((group:any)=>group.components.map((component:any)=>component.name))).toEqual(expect.arrayContaining(['panel','schema','graph','legend','code','metrics','lineChart','timelineVertical']));
  });

  it('checks and returns the standalone approved source without normalization',()=>{
    expect(run(['check',DATABASE,'--json']).status).toBe(0);
    const result=run(['render',DATABASE,'--format','json','--json']);
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).spec).toEqual(JSON.parse(readFileSync(DATABASE,'utf8')));
  });

  it('preserves literal code through HTML transport, including replacement/script tokens',()=>{
    const spec={schemaVersion:'press-composition/1',id:'literal-source',frame:'reading',title:'Literal source survives transport.',body:{type:'code',lang:'js',code:'const value = "$& </script> 2019–2024";'}};
    const source=join(temp,'source.json'),dest=join(temp,'source.html');
    writeFileSync(source,JSON.stringify(spec));
    const result=run(['render',source,'--format','html','--out',dest,'--json']);
    expect(result.status).toBe(0);
    const html=readFileSync(dest,'utf8');
    const payload=html.match(/<script>globalThis\.__PRESS_SPEC__=([\s\S]*?)<\/script>/)?.[1];
    expect(payload).toBeTruthy();
    expect(JSON.parse(payload!)).toEqual(spec);
    expect(html).not.toMatch(/<script[^>]+src=/);
  },60000);

  it('refuses raw styling instead of falling back to a legacy figure',()=>{
    const spec={schemaVersion:'press-composition/1',id:'refuse-style',body:{type:'text',role:'body',content:'Keep the source.',color:'#f0f'}};
    const source=join(temp,'refusal.json'),dest=join(temp,'refusal.html');
    writeFileSync(source,JSON.stringify(spec));
    const result=run(['render',source,'--format','html','--out',dest,'--json']);
    expect(result.status).toBe(1);
    expect(existsSync(dest)).toBe(false);
  });

  it.skipIf(!chrome)('exports the complete content-height PNG, not a legacy-sized crop',()=>{
    const dest=join(temp,'database.png');
    const result=run(['render',DATABASE,'--format','png','--scale','1','--out',dest,'--json']);
    expect(result.status,result.stdout+result.stderr).toBe(0);
    const bytes=readFileSync(dest);
    expect([...bytes.subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
    expect(bytes.readUInt32BE(16)).toBe(1600);
    expect(bytes.readUInt32BE(20)).toBe(3048);
    expect(JSON.parse(result.stdout).warnings).toEqual(expect.any(Array));
  },60000);
});
