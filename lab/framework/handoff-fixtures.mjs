import steps from '../../example/compositions/handoff-step-focus.json' with {type:'json'};
import timeline from '../../example/compositions/handoff-timeline-focus.json' with {type:'json'};
import flows from '../../example/compositions/handoff-flow-comparison.json' with {type:'json'};
import palette from '../../example/compositions/handoff-palette.json' with {type:'json'};

// Source-preserving adaptations of the supplied handoff, not another renderer.
export const HANDOFF_DEMOS = [
  {spec:steps,name:'Handoff / Step focus',detail:'Focus lights the arriving segment; progress remains a different state.',caption:'Adapted from megapresshandoff/examples/railSteps/21-slot-wszystko.json. Wording, code, chips and focus target are retained; fit maps to canonical reading height.'},
  {spec:timeline,name:'Handoff / Timeline',detail:'An ordinal rail emphasizes the stop—not an invented duration.',caption:'Adapted from megapresshandoff/examples/timeline/05-akcent.json. The original at labels map to date slots; spacing carries order only.'},
  {spec:flows,name:'Handoff / Flows',detail:'Two transcripts, wrapping badges and intentionally unequal endings.',caption:'Adapted from megapresshandoff/examples/compareFlows/09-pigulki.json through grid, stack and timelineVertical. All source events and badge wording remain intact.'},
  {spec:palette,name:'Handoff / Palette',detail:'Compatible category inks, paired grounds and readable blue swatches.',caption:'A token demonstration based on the supplied TOKENS.md. Printed contrast ratios are for MEGA inks on black; Paper is a separate project skin. Categories are identities, not multiple focus accents.'},
];
