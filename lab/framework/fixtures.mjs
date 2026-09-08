/** Original illustrative copy for the framework experiment, not sourced data. */
export const FIXTURES = [
  {
    label: "Technical / a checked tool call",
    document: {
      schemaVersion: "press-lab/1",
      id: "checked-tool-call",
      revision: 1,
      recipe: "sequence",
      title: "A tool result is evidence, not the answer.",
      steps: [
        { id: "request", title: "Name the question", detail: "Define the result you need and the evidence that would support it." },
        { id: "call", title: "Make one bounded call", detail: "Choose an allowed tool and validate its arguments before execution." },
        { id: "observe", title: "Inspect the result", detail: "Keep the returned values, units, and source identifiers intact." },
        { id: "verify", title: "Check before answering", detail: "Compare the evidence with the question. Report uncertainty instead of filling a gap." },
      ],
    },
  },
  {
    label: "Nontechnical / water through a catchment",
    document: {
      schemaVersion: "press-lab/1",
      id: "water-through-a-catchment",
      revision: 1,
      recipe: "sequence",
      title: "Follow the water, not just the weather.",
      steps: [
        { id: "evaporation", title: "Water enters the air", detail: "Water evaporates from exposed surfaces. Plants also release water vapour." },
        { id: "condensation", title: "Cloud droplets form", detail: "As moist air cools, water vapour can condense into droplets or ice crystals." },
        { id: "precipitation", title: "Water returns to land", detail: "Rain or snow carries water from clouds to the surface of the catchment." },
        { id: "collection", title: "Paths meet downstream", detail: "Water moves through soil, groundwater, and streams. This is one simplified route, not every possible path." },
      ],
    },
  },
  {
    label: "Integrity / punctuation, units, and code",
    document: {
      schemaVersion: "press-lab/1",
      id: "verbatim-content",
      revision: 1,
      recipe: "sequence",
      title: "Preserve exactly what the author wrote.",
      steps: [
        { id: "range", title: "A range is not a list", detail: "The source range is 2019–2024. Keep its en dash rather than replacing it with a comma." },
        { id: "unit", title: "A quantity keeps its unit", detail: "The label reads 12 days. Never silently rename that unit to share." },
        { id: "literal", title: "Code keeps its bytes", detail: "const label = \"2019–2024\"; Preserve the literal value and its punctuation." },
        { id: "language", title: "Names keep their spelling", detail: "Zażółć gęślą jaźń. Unicode, quotations, and authored wording are content, not layout corrections." },
      ],
    },
  },
];
