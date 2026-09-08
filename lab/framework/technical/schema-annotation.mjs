export const DATABASE_SCHEMA = {
  id: "database", eyebrow: "STRUCTURE / NAMED FIELD CONNECTIONS",
  title: "The relationship belongs to a field.",
  description: "An illustrative agent-workspace schema. Foreign-key arrows point from the referencing field to its key, not from one anonymous box to another. Select a field or a legend entry.",
  categories: [
    { id: "primary", label: "Primary key", tone: "amber" },
    { id: "foreign", label: "Foreign-key reference", tone: "cyan" },
    { id: "optional", label: "Nullable field", tone: "violet" },
  ],
  proofs: ["Structured entity bodies", "Field-addressed ports", "Labelled orthogonal routes", "One legend, shared meanings"],
  body: { type: "stack", children: [
    { type: "graph", id: "workspace-schema", rows: [
      [
        { type: "schema", id: "agents", title: "agents", subtitle: "Who performs the work", fields: [
          { id: "agents-id", name: "id", type: "uuid", key: "primary" },
          { id: "agents-role", name: "role", type: "text" },
          { id: "agents-model", name: "model", type: "text" },
          { id: "agents-created", name: "created_at", type: "timestamp" },
        ], footer: "One agent can own many tasks and emit many items." },
        { type: "schema", id: "tasks", title: "tasks", subtitle: "What must be completed", fields: [
          { id: "tasks-id", name: "id", type: "uuid", key: "primary" },
          { id: "tasks-agent", name: "agent_id", type: "uuid", key: "foreign" },
          { id: "tasks-title", name: "title", type: "text" },
          { id: "tasks-status", name: "status", type: "task_state" },
          { id: "tasks-priority", name: "priority", type: "integer" },
        ], footer: "The state is data: todo, waiting, in_progress, done or blocked." },
      ],
      [
        { type: "schema", id: "items", title: "items", subtitle: "The ordered record of an execution", fields: [
          { id: "items-id", name: "id", type: "uuid", key: "primary" },
          { id: "items-agent", name: "agent_id", type: "uuid", key: "foreign" },
          { id: "items-task", name: "task_id", type: "uuid", key: "foreign", nullable: true },
          { id: "items-sequence", name: "sequence", type: "integer" },
          { id: "items-type", name: "type", type: "item_kind" },
          { id: "items-payload", name: "payload", type: "jsonb" },
        ], footer: "A message or tool result can exist without a task association." },
        { type: "schema", id: "artifacts", title: "artifacts", subtitle: "The durable outputs", fields: [
          { id: "artifacts-id", name: "id", type: "uuid", key: "primary" },
          { id: "artifacts-task", name: "task_id", type: "uuid", key: "foreign" },
          { id: "artifacts-path", name: "path", type: "text" },
          { id: "artifacts-bytes", name: "bytes", type: "bigint" },
        ], footer: "The database records a file reference, not a fabricated file body." },
      ],
    ], edges: [
      { id: "task-owner", from: "tasks-agent", to: "agents-id", fromSide: "left", toSide: "right", label: "N tasks : 1 agent", category: "foreign" },
      { id: "item-emitter", from: "items-agent", to: "agents-id", fromSide: "left", toSide: "left", label: "N items : 1 agent", category: "foreign" },
      { id: "item-task", from: "items-task", to: "tasks-id", fromSide: "right", toSide: "left", label: "0..1 task per item", category: "optional" },
      { id: "artifact-task", from: "artifacts-task", to: "tasks-id", fromSide: "right", toSide: "right", label: "N outputs : 1 task", category: "foreign" },
    ] },
    { type: "columns", count: 2, children: [
      { type: "panel", id: "closed-envelope", title: "A specialized message", label: "BEFORE / ONE CONTENT SHAPE", children: [
        { type: "code", lang: "json", text: '{\n  "role": "assistant",\n  "content": "The research is ready."\n}' },
        { type: "text", text: "Useful when every record is a message. Tool calls and reasoning need another place to live." },
      ] },
      { type: "panel", id: "open-envelope", title: "An event envelope", label: "AFTER / EXPLICIT VARIANTS", children: [
        { type: "code", lang: "json", text: '{\n  "type": "function_call",\n  "payload": { "name": "write_artifact" }\n}' },
        { type: "text", text: "A discriminant makes the variant explicit. Each payload still needs its own validation; JSON alone is not a schema." },
      ] },
    ] },
    { type: "callout", text: "Reading the arrows: the arrowhead identifies the referenced key. The labels state multiplicity. Nullability belongs to the field and remains visible independently of colour." },
  ] },
};

export const ANNOTATED_MEDIA = {
  id: "annotations", eyebrow: "SOURCE / ANNOTATION / LOCAL VECTOR ASSET",
  title: "A highlighted phrase is an addressable thing.",
  description: "A schematic transcription example, not an audio measurement or benchmark. The vector regions, marked text and legend share category identities. Activate a waveform region or highlighted phrase with pointer or keyboard.",
  categories: [
    { id: "source", label: "Supported by the source", tone: "cyan" },
    { id: "added", label: "Added without support", tone: "red" },
    { id: "literal", label: "Literal text to preserve", tone: "amber" },
  ],
  proofs: ["Measured SVG inside the layout", "Linked region / text / legend", "Exact multilingual source", "A real screenshot attachment"],
  body: { type: "stack", children: [
    { type: "panel", id: "signal", title: "Speech ends. The generated sentence continues.", label: "SCHEMATIC SIGNAL / NOT SAMPLED AUDIO", children: [
      { type: "asset", id: "wave-one", asset: "waveform", bindings: { speech: "source", silence: "added" }, caption: "The speech and silence regions are registered SVG targets. Their geometry scales with the asset's viewBox." },
      { type: "text", runs: [
        { text: "TRANSCRIPT  " },
        { id: "spoken-phrase", category: "source", text: '"Turn off the lights when you leave the room."' },
        { text: "  " },
        { id: "unsupported-phrase", category: "added", text: "Thanks for watching! Don't forget to like and subscribe." },
      ] },
      { type: "callout", text: "The added closing has no counterpart in this illustrative source. A shared annotation category connects that claim to the silent region, without changing either text or waveform." },
    ] },
    { type: "panel", id: "reading", title: "Annotations must survive a full paragraph.", label: "EXACT SOURCE / WRAPPING IS NOT REWRITING", children: [
      { type: "text", runs: [
        { text: "A useful explanation separates what the source contains from what a system inferred. In this example, " },
        { id: "evidence-span", category: "source", text: "the spoken instruction is the evidence" },
        { text: ". The friendly closing is fluent, but fluency does not make it part of the recording. We mark " },
        { id: "unsupported-span", category: "added", text: "the unsupported continuation" },
        { text: " rather than silently deleting it, because the failure itself is what the reader needs to inspect. The same category appears in the legend, the transcript and the vector region above.\n\nA literal name is a different kind of constraint. " },
        { id: "street-name", category: "literal", text: "Piotrkowska" },
        { text: " is not an invitation to translate a street name. The test string " },
        { id: "unicode-literal", category: "literal", text: "Łódź — 東京 — 2019–2024" },
        { text: " deliberately mixes scripts and punctuation. Its characters must survive selection, resizing and export. Highlighting may change emphasis; it must not change what was authored.\n\nA reader can follow a category across the document or select one occurrence. Those are separate addresses: a shared meaning can appear many times, while the interaction still identifies the particular phrase or region that was activated." },
      ] },
    ] },
    { type: "columns", count: 2, children: [
      { type: "panel", id: "input-text", title: "Authored input", label: "TRANSFORMATION / SOURCE", children: [
        { type: "code", lang: "json", text: '{\n  "street": "Piotrkowska",\n  "period": "2019–2024",\n  "city": "Łódź"\n}' },
      ] },
      { type: "panel", id: "output-text", title: "The same values, another view", label: "TRANSFORMATION / PRESENTATION ONLY", children: [
        { type: "table", headers: ["Field", "Exact value"], rows: [["street", "Piotrkowska"], ["period", "2019–2024"], ["city", "Łódź"]] },
        { type: "text", text: "This is a change of representation, not a claim that a program was executed." },
      ] },
    ] },
    { type: "panel", id: "screen-evidence", title: "Screenshots remain screenshots.", label: "MEDIA / CONTAIN, DO NOT DITHER", children: [
      { type: "asset", id: "gallery-evidence", asset: "gallery-capture", caption: "A cropped, actual browser capture of the earlier gallery. The crop is explicit; pixels and labels are preserved, not recoloured or reconstructed." },
    ] },
  ] },
};
