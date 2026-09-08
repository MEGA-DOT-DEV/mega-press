import databaseDocument from '../../example/compositions/database.json' with { type: 'json' };
import { PROVIDER_FLOW, EXECUTION_TRACE } from './technical/flow-trace.mjs';

// Fixture construction only. The resulting JSON is the authoring surface;
// every example goes through compileSpec → buildPlate → validate → mount.
const literal = content => ({ type: 'text', role: 'body', content });
// Deliberate fixture presentation, replacing the prototype's non-brand tones.
// This is authored JSON, not a compiler silently remapping someone else's colours.
const houseCategories = categories => categories.map((category, index) => ({...category, tone: ['red', 'blue', 'neutral'][index]}));
function block(source) {
  const { id, category } = source;
  const meta = { ...(id ? { id } : {}), ...(category ? { category } : {}) };
  if (source.type === 'text') return { type: 'text', role: 'body', ...meta, ...(source.runs ? { runs: source.runs } : { content: source.text }) };
  if (source.type === 'callout') return { type: 'note', content: source.text, ...meta };
  if (source.type === 'code') return { type: 'code', code: source.text, lang: source.lang, ...meta, ...(source.label ? { label: source.label } : {}) };
  if (source.type === 'schema') return {...structuredClone(source), fields: source.fields.map(field => ({...field, ...(field.key ? {category: field.key === 'primary' ? 'primary' : 'foreign'} : {})}))};
  if (source.type === 'metrics') return structuredClone(source);
  if (source.type === 'columns') return { type: 'grid', cols: source.count, align: 'start', children: source.children.map(block), ...meta };
  if (source.type === 'stack') return { type: 'stack', gap: 4, children: source.children.map(block), ...meta };
  if (source.type === 'panel') return { type: 'panel', title: source.title, ...meta, ...(source.label ? { label: source.label } : {}), children: source.children.map(block) };
  if (source.type === 'table') {
    const keys = source.headers.map((_,i)=>`column-${i}`);
    return { type: 'table', ...meta,
      columns: source.headers.map((label,i)=>({key:keys[i],label,type:'tag',grow:true})),
      rows: source.rows.map(row=>Object.fromEntries(row.map((value,i)=>[keys[i],value]))),
    };
  }
  if (source.type === 'graph') {
    const owners = new Map();
    const nodes = source.rows.flatMap((rank,rankIndex)=>rank.map(node=>{
      owners.set(node.id,{node:node.id});
      for(const field of node.fields||[])owners.set(field.id,{node:node.id,port:field.id});
      return {key:node.id,rank:rankIndex,body:block(node),...(node.category?{category:node.category}:{})};
    }));
    return {type:'graph',dir:'y',...meta,nodes,edges:source.edges.map(edge=>{
      const from=owners.get(edge.from),to=owners.get(edge.to);
      return {id:edge.id,from:from.node,to:to.node,label:edge.label,
        ...(from.port?{fromPort:from.port}:{}),...(to.port?{toPort:to.port}:{}),
        ...(edge.fromSide?{fromAnchor:edge.fromSide}:{}),...(edge.toSide?{toAnchor:edge.toSide}:{}),
        ...(edge.category?{category:edge.category}:{}),
      };
    })};
  }
  throw Error(`No fixture translation for ${source.type}; content was not discarded.`);
}
function example(source, body=block(source.body)) {
  return {schemaVersion:'press-composition/1',id:source.id,frame:'reading',title:source.title,
    kicker:source.eyebrow,lead:source.description,categories:houseCategories(source.categories),
    body:{type:'stack',gap:4,children:[{type:'legend'},body]},
  };
}
// The approved static article example is ordinary JSON outside the lab.
export const DATABASE = databaseDocument;
export const PROVIDER = example(PROVIDER_FLOW);
const trace = EXECUTION_TRACE.body.children.find(b=>b.type==='trace');
const actors = new Map(EXECUTION_TRACE.categories.map(c=>[c.id,c]));
const metrics = EXECUTION_TRACE.body.children.find(b=>b.type==='metrics');
export const EXECUTION = example(EXECUTION_TRACE,{type:'stack',gap:4,children:[
  structuredClone(metrics),
  ...trace.rounds.map(round=>({type:'panel',id:round.id,title:round.title,children:[
    ...round.blocks.map(run=>({type:'panel',id:run.id,title:actors.get(run.actor).label,category:run.actor,children:[
      {type:'timelineVertical',items:run.events.map(event=>({id:event.id,
        date:event.seq[0]===event.seq[1]?`seq ${event.seq[0]}`:`seq ${event.seq[0]}–${event.seq[1]}`,
        body:{type:'text',role:'body',runs:structuredClone(event.runs)},
      }))},
      {type:'note',content:run.outcome},
    ]})),
    literal(round.note),
  ]})),
]});

const counts = new Map([...actors.keys()].map(id=>[id,0]));
const cumulative=[];let total=0;
trace.rounds.forEach((round,index)=>{
  for(const run of round.blocks)for(const event of run.events){const count=event.seq[1]-event.seq[0]+1;counts.set(run.actor,counts.get(run.actor)+count);total+=count;}
  cumulative.push({x:index+1,y:total});
});
export const NUMBERS = {
  schemaVersion:'press-composition/1',id:'numbers',frame:'reading',
  title:'The same 26 items, seen three ways.',kicker:'COUNTS / COMPARISON / PROGRESSION',
  lead:'Derived from the authored execution example—not production telemetry. Counts, bars and the progression chart share the same records. Round number is not elapsed time.',
  categories:structuredClone(EXECUTION.categories),
  body:{type:'stack',gap:4,children:[
    {type:'legend'},
    {type:'panel',title:'Scope of this example',body:structuredClone(metrics)},
    {type:'panel',title:'Who accounts for the items?',label:'ZERO-BASED COMPARISON / EXACT COUNTS',body:{type:'bars',unit:'ordered items',max:total,
      items:[...counts].map(([id,value])=>({id:`count-${id}`,label:actors.get(id).label,value,category:id})),
    }},
    {type:'panel',title:'How the record grows',label:'NUMERIC ROUND AXIS / CUMULATIVE COUNT',body:{type:'lineChart',
      xAxis:{label:'Round number',min:1,max:4,ticks:4},
      yAxis:{label:'Cumulative ordered items',min:0,max:26,ticks:5},
      series:[{label:'Cumulative items',points:cumulative}],
    }},
    {type:'note',content:'15 orchestrator items + 5 researcher items + 6 writer items = 26. Grouped ranges are inclusive; memory notes are not counted. The line chart shows cumulative item count—not execution speed.'},
  ]},
};
export const STEPS = {
  schemaVersion:'press-composition/1',id:'steps',frame:'landscape',title:'The same language fits a simple slide.',
  lead:'A short sequence needs no special page template. This uses the existing step component.',
  body:{type:'railSteps',items:[
    {name:'Read',detail:'Identify the claim and its source material.'},
    {name:'Compose',detail:'Choose the content and the relationships.'},
    {name:'Check',detail:'Solve, validate and inspect the actual output.'},
  ]},
};
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export const COMPOSITIONS = freeze([DATABASE,PROVIDER,EXECUTION,NUMBERS,STEPS]);
