import codeAnatomy from '../../example/compositions/library-code-anatomy.json' with {type:'json'};
import jsonContract from '../../example/compositions/library-json-contract.json' with {type:'json'};
import annotatedPassage from '../../example/compositions/library-annotated-passage.json' with {type:'json'};
import codeChange from '../../example/compositions/library-code-change.json' with {type:'json'};

// Semantic treatments are authored categories. The host supplies their inks.
export const LIBRARY_ANNOTATIONS = [
  {
    spec:codeAnatomy,
    name:'Code anatomy',
    detail:'Follow inputs through a condition and a combination rule.',
    family:'Annotations',
    useWhen:'Teach which expressions perform each job inside a working example.',
    caption:'Three marks connect exact JavaScript expressions to their meanings; the results account for the example values.',
  },
  {
    spec:jsonContract,
    name:'JSON contract',
    detail:'Separate identity, declared state, and an evidence reference.',
    family:'Annotations',
    useWhen:'Explain what individual fields claim and which checks still belong to validation.',
    caption:'A marked JSON instance sits beside its legend, with expected field kinds and a contract boundary below.',
  },
  {
    spec:annotatedPassage,
    name:'Annotated passage',
    detail:'Distinguish an observation, interpretation, and proposed action.',
    family:'Annotations',
    useWhen:'A passage contains different kinds of claims that readers should recognize.',
    caption:'Three annotated sentences connect to local explanations, followed by the reasoning sequence they express.',
  },
  {
    spec:codeChange,
    name:'Code change',
    detail:'Compare existing computation with newly explicit behavior.',
    family:'Annotations',
    useWhen:'A small edit changes an edge case while preserving ordinary example results.',
    caption:'Before and after snippets use matching marks; a result table makes the empty-array behavior concrete.',
  },
];
