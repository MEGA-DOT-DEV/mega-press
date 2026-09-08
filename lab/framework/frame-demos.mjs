import flow from '../../example/compositions/branching-flow.json' with {type:'json'};
import time from '../../example/compositions/time-flow.json' with {type:'json'};
import comparison from '../../example/compositions/contract-comparison.json' with {type:'json'};
import costs from '../../example/compositions/cost-comparison.json' with {type:'json'};
import database from '../../example/compositions/database.json' with {type:'json'};

// Navigation metadata only. The editable JSON files are the canonical sources;
// all five specimens use the same public mountArtifact path.
export const FRAME_DEMOS = [
  {spec:flow, name:'Branching flow', detail:'Compound nodes · conditional paths · labelled merge'},
  {spec:time, name:'Time flow', detail:'Shared UTC date axis · overlapping durations · source table'},
  {spec:comparison, name:'Before / after', detail:'Code comparison · nested panels · ordered handling steps'},
  {spec:costs, name:'Numbers', detail:'The earlier repair example · same values · current MEGA design'},
  {spec:database, name:'Database', detail:'Reviewed baseline · typed fields · named relationship ports'},
];
