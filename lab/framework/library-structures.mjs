import decision from '../../example/compositions/library-decision-map.json' with { type: 'json' };
import parallel from '../../example/compositions/library-parallel-work.json' with { type: 'json' };
import branches from '../../example/compositions/library-branch-and-merge.json' with { type: 'json' };
import layers from '../../example/compositions/library-system-layers.json' with { type: 'json' };
import states from '../../example/compositions/library-state-transitions.json' with { type: 'json' };

// Discovery metadata only. The imported compositions remain the editable source.
export const LIBRARY_STRUCTURES = [
  {
    spec: decision,
    name: 'The decision map',
    detail: 'Two axes turn a broad policy into four distinct responses.',
    family: 'Decisions',
    useWhen: 'Two independent dimensions determine which action fits the situation.',
    caption: 'An illustrative delegation matrix: mistake impact increases to the right; easy-to-reverse actions occupy the top row. Each cell proposes a different degree of review.',
  },
  {
    spec: parallel,
    name: 'Parallel work',
    detail: 'Overlapping intervals meet two concrete readiness gates.',
    family: 'Time',
    useWhen: 'Workstreams have actual start and end dates that belong on one shared clock.',
    caption: 'A fictional production plan from 5 to 12 October 2026. Writing, visuals and review share one UTC scale; review and revision overlap from 10 to 12 October.',
  },
  {
    spec: branches,
    name: 'Branch and merge',
    detail: 'One question fans out into three lenses, then converges.',
    family: 'Systems',
    useWhen: 'Several independent contributions must meet before a shared result can be produced.',
    caption: 'An illustrative research question is sent to evidence, counterexample and analogy branches. All three contribute to the final lesson synthesis.',
  },
  {
    spec: layers,
    name: 'System layers',
    detail: 'Nested boundaries expose ownership and peer responsibilities.',
    family: 'Systems',
    useWhen: 'A system contains subsystems and the distinction between containment and dependency matters.',
    caption: 'A publishing host contains a lesson. Within the lesson, meaning and presentation are peers that both contribute to the rendered frame. Nesting expresses ownership.',
  },
  {
    spec: states,
    name: 'State transitions',
    detail: 'A conditional path includes revision, approval and release.',
    family: 'Decisions',
    useWhen: 'An item can occupy distinct states and events or conditions determine the next state.',
    caption: 'A submitted draft starts in review. Issues send it to revision and resubmission; passing checks makes it ready. Publication requires a separate editor action.',
  },
];
