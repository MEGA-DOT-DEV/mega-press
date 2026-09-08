import loop from '../../example/compositions/from-prompt-to-proof.json' with {type:'json'};
import budget from '../../example/compositions/context-is-a-budget.json' with {type:'json'};
import schema from '../../example/compositions/relationships-have-addresses.json' with {type:'json'};
import loopLesson from '../../example/lessons/from-prompt-to-proof.json' with {type:'json'};
import budgetLesson from '../../example/lessons/context-is-a-budget.json' with {type:'json'};
import schemaLesson from '../../example/lessons/relationships-have-addresses.json' with {type:'json'};

// Navigation only. The editable JSON files are the canonical source material.
export const STUDIO_STUDIES = [
  {label:'The decision loop',topic:'Cause & effect',spec:loop,lesson:loopLesson},
  {label:'A finite context',topic:'Parts & whole',spec:budget,lesson:budgetLesson},
  {label:'An exact relationship',topic:'Structure & meaning',spec:schema,lesson:schemaLesson},
];
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
freeze(STUDIO_STUDIES);
