import uncertainty from '../../example/compositions/library-uncertainty.json' with {type:'json'};
import partsAndWhole from '../../example/compositions/library-parts-and-whole.json' with {type:'json'};
import inputOutput from '../../example/compositions/library-input-output.json' with {type:'json'};
import evidenceMatrix from '../../example/compositions/library-evidence-matrix.json' with {type:'json'};
import learningPath from '../../example/compositions/library-learning-path.json' with {type:'json'};

// Library descriptions belong to the host; each editable composition stands alone.
export const LIBRARY_EVIDENCE = [
  {
    spec:uncertainty,
    name:'Estimate & interval',
    detail:'A point, its range, and the difference between them.',
    family:'Evidence',
    useWhen:'An estimate needs its uncertainty visible on the same scale.',
    caption:'Three shared-axis intervals above a compact explanation and two range-width metrics.',
  },
  {
    spec:partsAndWhole,
    name:'Parts & whole',
    detail:'One dataset answers two different questions.',
    family:'Comparison',
    useWhen:'Readers need to compare both shares of a whole and absolute amounts.',
    caption:'A segmented whole opens the frame; separate bars below preserve the exact values.',
  },
  {
    spec:inputOutput,
    name:'Input → output',
    detail:'A transformation with its meaning intact.',
    family:'Learning',
    useWhen:'Teach a conversion by showing its source, result, and checks together.',
    caption:'Paired verbatim snippets followed by a three-stage horizontal process.',
  },
  {
    spec:evidenceMatrix,
    name:'Evidence matrix',
    detail:'What a check establishes, and what remains open.',
    family:'Evidence',
    useWhen:'A comparison needs careful claims and visible limits.',
    caption:'Four observation rows lead into one actionable review habit.',
  },
  {
    spec:learningPath,
    name:'Learning path',
    detail:'Notice, try, explain, and transfer an idea.',
    family:'Learning',
    useWhen:'Turn an abstract idea into a sequence of concrete learning activities.',
    caption:'A vertical progression sits beside a focal number and an independent practice card.',
  },
];
