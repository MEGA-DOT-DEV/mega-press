export const PROVIDER_FLOW = {
  id: 'provider-flow',
  title: 'One request contract. Three adapter paths.',
  eyebrow: 'ILLUSTRATIVE ADAPTER CONTRACT',
  description:
    'An invented routing example using OpenAI, Anthropic, and Gemini names. Field mappings, model aliases, and payloads illustrate adapter design; they are not verified provider/API documentation.',
  categories: [
    { id: 'openai', label: 'OpenAI', tone: 'green' },
    { id: 'anthropic', label: 'Anthropic', tone: 'violet' },
    { id: 'gemini', label: 'Gemini', tone: 'cyan' },
  ],
  body: {
    type: 'stack',
    children: [
      {
        type: 'callout',
        text: 'The caller owns one request and response contract. A model prefix selects exactly one adapter; that adapter transforms instructions, messages, generation settings, and result fields. The branches below are alternatives, not a broadcast to three providers.',
      },
      {
        type: 'graph',
        id: 'provider-routing-graph',
        rows: [
          [
            {
              type: 'panel',
              id: 'provider-request',
              title: 'Caller request',
              label: '01 / Stable input',
              children: [
                {
                  type: 'code',
                  id: 'provider-request-json',
                  label: 'Invented request · anthropic branch selected',
                  lang: 'json',
                  text: `{
  "model": "anthropic:demo-model",
  "instructions": "Be concise.",
  "input": [{ "role": "user", "text": "Explain idempotency in one sentence." }],
  "generation": { "maxOutputTokens": 160, "temperature": 0.2 },
  "metadata": { "requestId": "req-demo-042" }
}`,
                },
              ],
            },
          ],
          [
            {
              type: 'panel',
              id: 'provider-router',
              title: 'Prefix router',
              label: '02 / Select one adapter',
              children: [
                {
                  type: 'table',
                  headers: ['Prefix', 'Adapter', 'Model handling'],
                  rows: [
                    ['openai:', 'OpenAI adapter', 'Resolve local alias'],
                    ['anthropic:', 'Anthropic adapter', 'Resolve local alias'],
                    ['gemini:', 'Gemini adapter', 'Resolve local alias'],
                  ],
                },
                {
                  type: 'text',
                  text: 'Split at the first colon; resolve the suffix from configured aliases. Reject an unknown prefix or alias before dispatch. Keep requestId local for response correlation.',
                },
              ],
            },
          ],
          [
            {
              type: 'panel',
              id: 'provider-openai-adapter',
              title: 'OpenAI mapping',
              label: '03A / Illustrative transform',
              category: 'openai',
              children: [
                {
                  type: 'table',
                  headers: ['Caller field', 'Adapter field'],
                  rows: [
                    ['model suffix', 'model alias lookup'],
                    ['instructions', 'messages[0] · system'],
                    ['input[].text', 'messages[].content'],
                    ['maxOutputTokens', 'max_completion_tokens'],
                    ['temperature', 'temperature'],
                  ],
                },
                {
                  type: 'text',
                  text: 'Illustrative result read: choices[0].message.content. Adapter emits the internal result envelope.',
                },
              ],
            },
            {
              type: 'panel',
              id: 'provider-anthropic-adapter',
              title: 'Anthropic mapping',
              label: '03B / Illustrative transform',
              category: 'anthropic',
              children: [
                {
                  type: 'table',
                  headers: ['Caller field', 'Adapter field'],
                  rows: [
                    ['model suffix', 'model alias lookup'],
                    ['instructions', 'system'],
                    ['input[].text', 'messages[].content[]'],
                    ['maxOutputTokens', 'max_tokens'],
                    ['temperature', 'temperature'],
                  ],
                },
                {
                  type: 'text',
                  text: 'Illustrative result read: content[] text blocks. Adapter emits the internal result envelope.',
                },
              ],
            },
            {
              type: 'panel',
              id: 'provider-gemini-adapter',
              title: 'Gemini mapping',
              label: '03C / Illustrative transform',
              category: 'gemini',
              children: [
                {
                  type: 'table',
                  headers: ['Caller field', 'Adapter field'],
                  rows: [
                    ['model suffix', 'model alias lookup'],
                    ['instructions', 'systemInstruction'],
                    ['input[].text', 'contents[].parts[]'],
                    ['maxOutputTokens', 'config.maxOutputTokens'],
                    ['temperature', 'config.temperature'],
                  ],
                },
                {
                  type: 'text',
                  text: 'config abbreviates generationConfig here. Illustrative result read: candidate text parts. Adapter emits the internal result envelope.',
                },
              ],
            },
          ],
          [
            {
              type: 'panel',
              id: 'provider-normalizer',
              title: 'Result normalizer',
              label: '04 / Merge alternative paths',
              children: [
                {
                  type: 'table',
                  headers: ['Internal adapter result', 'Caller response', 'Contract rule'],
                  rows: [
                    ['textSegments[]', 'output[0].text', 'Join text segments in order'],
                    ['finishKind', 'finishReason', 'Map to stop / limit / other'],
                    ['tokenCounts', 'usage', 'Unknown counts remain null'],
                    ['local request context', 'requestId + model', 'Preserve caller identifiers'],
                  ],
                },
                {
                  type: 'text',
                  text: 'This frame shows text-only success. Unsupported input and adapter failures take a separate error path; do not disguise either as an empty successful response.',
                },
              ],
            },
          ],
          [
            {
              type: 'panel',
              id: 'provider-response',
              title: 'Caller response',
              label: '05 / Stable output',
              children: [
                {
                  type: 'code',
                  id: 'provider-response-json',
                  label: 'Invented response · not a captured API result',
                  lang: 'json',
                  text: `{
  "requestId": "req-demo-042",
  "model": "anthropic:demo-model",
  "output": [{ "type": "text", "text": "Idempotency means repeating an operation has the same effect as doing it once." }],
  "finishReason": "stop",
  "usage": { "inputTokens": null, "outputTokens": null }
}`,
                },
              ],
            },
          ],
        ],
        edges: [
          {
            id: 'provider-edge-request-router',
            from: 'provider-request',
            to: 'provider-router',
            label: 'Validate caller contract',
            fromSide: 'bottom',
            toSide: 'top',
          },
          {
            id: 'provider-edge-router-openai',
            from: 'provider-router',
            to: 'provider-openai-adapter',
            label: 'openai: → OpenAI',
            category: 'openai',
            fromSide: 'bottom',
            toSide: 'top',
          },
          {
            id: 'provider-edge-router-anthropic',
            from: 'provider-router',
            to: 'provider-anthropic-adapter',
            label: 'anthropic: → Anthropic',
            category: 'anthropic',
            fromSide: 'bottom',
            toSide: 'top',
          },
          {
            id: 'provider-edge-router-gemini',
            from: 'provider-router',
            to: 'provider-gemini-adapter',
            label: 'gemini: → Gemini',
            category: 'gemini',
            fromSide: 'bottom',
            toSide: 'top',
          },
          {
            id: 'provider-edge-openai-normalizer',
            from: 'provider-openai-adapter',
            to: 'provider-normalizer',
            label: 'Extract message text',
            category: 'openai',
            fromSide: 'bottom',
            toSide: 'top',
          },
          {
            id: 'provider-edge-anthropic-normalizer',
            from: 'provider-anthropic-adapter',
            to: 'provider-normalizer',
            label: 'Collect text blocks',
            category: 'anthropic',
            fromSide: 'bottom',
            toSide: 'top',
          },
          {
            id: 'provider-edge-gemini-normalizer',
            from: 'provider-gemini-adapter',
            to: 'provider-normalizer',
            label: 'Collect candidate parts',
            category: 'gemini',
            fromSide: 'bottom',
            toSide: 'top',
          },
          {
            id: 'provider-edge-normalizer-response',
            from: 'provider-normalizer',
            to: 'provider-response',
            label: 'Return normalized text result',
            fromSide: 'bottom',
            toSide: 'top',
          },
        ],
      },
    ],
  },
  proofs: [
    'Literal JSON at both contract boundaries.',
    'Prefix routing branches into three field-mapping tables.',
    'Eight labelled edges expose dispatch and normalization.',
    'Illustrative mappings, not verified API documentation.',
  ],
};

const executionRounds = [
  {
    id: 'trace-round-scope',
    title: 'Round 1 / Scope the work and delegate research',
    blocks: [
      {
        id: 'trace-run-orchestrator-scope',
        actor: 'orchestrator',
        outcome: 'Research delegated; drafting blocked on the notes artifact.',
        events: [
          {
            id: 'trace-event-receive-request',
            seq: [1, 1],
            runs: [
              { text: 'Receive the illustrative assignment: write a practical article about safe retries in background jobs. Store the goal in ' },
              { text: 'state.assignment', id: 'trace-ref-assignment', category: 'orchestrator' },
              { text: '; distinguish example scenarios from verified evidence.' },
            ],
          },
          {
            id: 'trace-event-create-tasks',
            seq: [2, 3],
            runs: [
              { text: 'tasks.create', id: 'trace-action-create-tasks', category: 'orchestrator' },
              { text: ' records a research task and a draft task. Set ' },
              { text: 'tasks.draft.dependsOn = research', id: 'trace-ref-draft-dependency', category: 'orchestrator' },
              { text: ' so writing cannot start before a usable handoff exists.' },
            ],
          },
          {
            id: 'trace-event-delegate-research',
            seq: [4, 6],
            runs: [
              { text: 'Set the research task to in_progress, assemble a brief covering duplicate delivery, bounded retries, and idempotency, then call ' },
              { text: 'agents.delegate', id: 'trace-action-delegate-research', category: 'orchestrator' },
              { text: ' for the researcher. Require a ' },
              { text: 'research-notes.md', id: 'trace-artifact-notes-requested', category: 'researcher' },
              { text: ' handoff with assumptions and unresolved questions.' },
            ],
          },
          {
            id: 'trace-event-yield-research',
            seq: [7, 7],
            runs: [
              { text: 'orchestrator.yield', id: 'trace-action-yield-research', category: 'orchestrator' },
              { text: ' returns control while research is outstanding. ' },
              { text: 'tasks.draft.status = blocked', id: 'trace-ref-draft-blocked', category: 'orchestrator' },
              { text: ' remains the scheduling guard, not an elapsed-time measurement.' },
            ],
          },
        ],
      },
    ],
    note: 'Memory · Assignment and task dependency are retained. The notes artifact has been requested, not written; no draft is available yet.',
  },
  {
    id: 'trace-round-research',
    title: 'Round 2 / Produce the research handoff',
    blocks: [
      {
        id: 'trace-run-researcher',
        actor: 'researcher',
        outcome: 'Notes written; research marked complete and returned to the orchestrator.',
        events: [
          {
            id: 'trace-event-read-research-brief',
            seq: [8, 8],
            runs: [
              { text: 'inbox.read', id: 'trace-action-read-research-brief', category: 'researcher' },
              { text: ' opens the delegated brief. Keep the scope on retry safety; the illustrative assignment does not establish production behavior or measured failure rates.' },
            ],
          },
          {
            id: 'trace-event-write-notes',
            seq: [9, 10],
            runs: [
              { text: 'Organize failure scenarios, retry limits, and open questions; then use ' },
              { text: 'files.write', id: 'trace-action-write-notes', category: 'researcher' },
              { text: ' to create ' },
              { text: 'research-notes.md', id: 'trace-artifact-notes-written', category: 'researcher' },
              { text: '. Include “Example: a worker commits a change but loses the acknowledgement” and flag storage-specific guarantees for verification.' },
            ],
          },
          {
            id: 'trace-event-complete-research',
            seq: [11, 12],
            runs: [
              { text: 'tasks.complete', id: 'trace-action-complete-research', category: 'researcher' },
              { text: ' closes the research task with its artifact path. ' },
              { text: 'agents.reply', id: 'trace-action-reply-research', category: 'researcher' },
              { text: ' returns a handoff: notes are ready; examples are illustrative and the verification questions must survive into the draft.' },
            ],
          },
        ],
      },
    ],
    note: 'Memory · research-notes.md is now the shared handoff. Research is complete; the draft remains blocked until the orchestrator consumes the completion message.',
  },
  {
    id: 'trace-round-draft',
    title: 'Round 3 / Release the dependency and write the draft',
    blocks: [
      {
        id: 'trace-run-orchestrator-handoff',
        actor: 'orchestrator',
        outcome: 'Research dependency satisfied; draft delegated with an explicit artifact input.',
        events: [
          {
            id: 'trace-event-consume-research',
            seq: [13, 14],
            runs: [
              { text: 'inbox.read', id: 'trace-action-consume-research', category: 'orchestrator' },
              { text: ' consumes the researcher’s reply. Reconcile ' },
              { text: 'tasks.research.status = completed', id: 'trace-ref-research-completed', category: 'orchestrator' },
              { text: ' and register the notes path as the draft task’s input artifact.' },
            ],
          },
          {
            id: 'trace-event-delegate-draft',
            seq: [15, 17],
            runs: [
              { text: 'tasks.update', id: 'trace-action-unblock-draft', category: 'orchestrator' },
              { text: ' releases the dependency and makes the draft ready. ' },
              { text: 'agents.delegate', id: 'trace-action-delegate-draft', category: 'orchestrator' },
              { text: ' sends the writer the notes path and an outline: failure scenario, retry policy, verification checklist. Record ' },
              { text: 'tasks.draft.status = in_progress', id: 'trace-ref-draft-active', category: 'orchestrator' },
              { text: '.' },
            ],
          },
          {
            id: 'trace-event-yield-draft',
            seq: [18, 18],
            runs: [
              { text: 'orchestrator.yield', id: 'trace-action-yield-draft', category: 'orchestrator' },
              { text: ' hands control to the writer. Keep the parent assignment open; a delegation is not a completed article.' },
            ],
          },
        ],
      },
      {
        id: 'trace-run-writer',
        actor: 'writer',
        outcome: 'Article artifact written; draft task completed and handed back.',
        events: [
          {
            id: 'trace-event-read-notes',
            seq: [19, 20],
            runs: [
              { text: 'files.read', id: 'trace-action-read-notes', category: 'writer' },
              { text: ' loads ' },
              { text: 'research-notes.md', id: 'trace-artifact-notes-read', category: 'researcher' },
              { text: '. Plan the article around the lost-acknowledgement example and carry the notes’ unresolved guarantees into a checklist rather than asserting them as facts.' },
            ],
          },
          {
            id: 'trace-event-write-article',
            seq: [21, 22],
            runs: [
              { text: 'Compose the draft, then call ' },
              { text: 'files.write', id: 'trace-action-write-article', category: 'writer' },
              { text: ' for ' },
              { text: 'article.md', id: 'trace-artifact-article-written', category: 'writer' },
              { text: '. Use sections “When a retry repeats work”, “Bound the retry policy”, and “Verify the persistence boundary”; label the scenario as illustrative.' },
            ],
          },
          {
            id: 'trace-event-complete-draft',
            seq: [23, 24],
            runs: [
              { text: 'tasks.complete', id: 'trace-action-complete-draft', category: 'writer' },
              { text: ' closes the draft task with article.md attached. ' },
              { text: 'agents.reply', id: 'trace-action-reply-draft', category: 'writer' },
              { text: ' returns the artifact path and a concise handoff; the draft retains the verification checklist and makes no measured-performance claims.' },
            ],
          },
        ],
      },
    ],
    note: 'Memory · research-notes.md remains the source handoff; article.md is the resulting draft. The writer has reported completion, but the parent assignment still awaits the final orchestration step.',
  },
  {
    id: 'trace-round-close',
    title: 'Round 4 / Complete the parent assignment',
    blocks: [
      {
        id: 'trace-run-orchestrator-close',
        actor: 'orchestrator',
        outcome: 'Writer completion consumed; parent task closed with the article path.',
        events: [
          {
            id: 'trace-event-close-assignment',
            seq: [25, 26],
            runs: [
              { text: 'inbox.read', id: 'trace-action-consume-draft', category: 'orchestrator' },
              { text: ' consumes the writer’s completion and artifact pointer. ' },
              { text: 'tasks.complete', id: 'trace-action-close-parent', category: 'orchestrator' },
              { text: ' closes the parent assignment with ' },
              { text: 'article.md', id: 'trace-artifact-article-final', category: 'writer' },
              { text: ' as the deliverable; ' },
              { text: 'state.assignment.status = completed', id: 'trace-ref-assignment-completed', category: 'orchestrator' },
              { text: '. This closure records the authored workflow, not an independent quality review.' },
            ],
          },
        ],
      },
    ],
    note: 'Memory · Research, draft, and parent tasks are complete in this example. Both artifact paths remain in the handoff record; completion does not imply publication.',
  },
];

const executionActors = new Set();
const executionItems = new Set();
for (const round of executionRounds) {
  for (const block of round.blocks) {
    executionActors.add(block.actor);
    for (const event of block.events) {
      for (let seq = event.seq[0]; seq <= event.seq[1]; seq += 1) {
        executionItems.add(seq);
      }
    }
  }
}

export const EXECUTION_TRACE = {
  id: 'execution-trace',
  title: 'Research handoff → article draft → completion',
  eyebrow: 'ILLUSTRATIVE ORDERED TRACE',
  description:
    'An authored workflow example, not actual measured telemetry. Sequence ranges are inclusive ordered items, not timestamps or durations. Actor runs show control handoffs; memory notes are separate annotations and do not add items.',
  categories: [
    { id: 'orchestrator', label: 'Orchestrator', tone: 'blue' },
    { id: 'researcher', label: 'Researcher', tone: 'violet' },
    { id: 'writer', label: 'Writer', tone: 'green' },
  ],
  body: {
    type: 'stack',
    children: [
      {
        type: 'metrics',
        items: [
          { label: 'Ordered rounds', value: String(executionRounds.length), unit: 'rounds' },
          { label: 'Distinct actors', value: String(executionActors.size), unit: 'actors' },
          { label: 'Unique covered items', value: String(executionItems.size), unit: 'items' },
        ],
      },
      { type: 'trace', rounds: executionRounds },
    ],
  },
  proofs: [
    'Inclusive ranges partition the authored sequence without overlap.',
    'Action names, file artifacts, and state references are selectable runs.',
    'Research and draft completion are distinct from parent-task closure.',
    'Summary values are derived from rounds, actors, and covered items.',
  ],
};
