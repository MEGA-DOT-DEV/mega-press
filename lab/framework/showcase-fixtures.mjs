// A curated component-composition study, not another recipe registry.
// Every `spec` is accepted by the existing src/spec.js compiler. No coordinates,
// fonts, colours, new primitives, or sibling-project runtime imports.
const freeze = (value) => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

export const SHOWCASE = freeze([
  {
    id: "night-sky",
    name: "Planning a night under the stars",
    family: "Familiar frame",
    form: "Fan-in / landscape",
    origin: "mega-content/lab/plates/24-fanin.js",
    reuse: "The original three-input, one-hub, one-output topology. New subject; the engine still derives every box, port and connector.",
    description: "Cloud cover, moonlight and target altitude feed a shared observing window, which feeds a night plan.",
    spec: {
      id: "night-sky",
      frame: "landscape",
      title: "Three conditions. One observing window.",
      lead: "A simple planning model for an evening with a telescope.",
      body: {
        type: "graph", dir: "x", gap: 5, rankGap: 3,
        nodes: [
          { key: "cloud", rank: 0, title: "Cloud cover" },
          { key: "moon", rank: 0, title: "Moonlight" },
          { key: "altitude", rank: 0, title: "Target altitude" },
          { key: "window", rank: 1, title: "Shared window", accent: true },
          { key: "plan", rank: 2, title: "Night plan" },
        ],
        edges: [
          { from: "cloud", to: "window" },
          { from: "moon", to: "window" },
          { from: "altitude", to: "window" },
          { from: "window", to: "plan" },
        ],
      },
    },
  },
  {
    id: "repair",
    name: "Repair, rather than replace",
    family: "Familiar frame",
    form: "Claim + evidence / landscape",
    origin: "mega-content/lab/plates/19-split-chart.js",
    reuse: "The existing split composition puts a claim beside a chart attachment. The attachment is a component, not a screenshot slot.",
    description: "Illustrative quotes for one jacket: patch 18 EUR, seam 26 EUR, zip 40 EUR, replacement 140 EUR. These are sample values, not market research.",
    dataNote: "Illustrative prices, not market research.",
    spec: {
      id: "repair",
      frame: "landscape", layout: "split", ratio: "1/2",
      title: "A repair changes the price of keeping it.",
      lead: "Four illustrative quotes for one jacket.",
      body: { type: "note", content: "Compare the actual repair with the actual replacement. The most expensive option here is buying another jacket." },
      aside: {
        type: "bars", unit: "EUR", max: 140,
        items: [
          { label: "Patch", value: 18 },
          { label: "Seam", value: 26 },
          { label: "Zip", value: 40 },
          { label: "Replace", value: 140, accent: true },
        ],
      },
    },
  },
  {
    id: "garden",
    name: "A balcony garden, in five decisions",
    family: "Familiar frame",
    form: "Portrait brief / interactive",
    origin: "mega-content/lab/plates/22-portrait-brief.js",
    reuse: "The original tall brief: a numbered rail and a note over a content-derived band. Native buttons drive the existing rail's activeTo parameter through the lab's sequence controller.",
    description: "Observe the light, choose one plant, prepare its container, place it within reach, then keep notes. Select a step to emphasize the path up to it; no wording changes.",
    stepIds: ["observe", "choose", "prepare", "place", "learn"],
    spec: {
      id: "garden", frame: "portrait", gap: 5,
      title: "Start with the balcony you actually have.",
      lead: "Five decisions before a collection of pots becomes a garden.",
      background: { type: "band", fill: "raised", pad: 4 },
      body: {
        type: "stack", gap: 5,
        children: [
          {
            type: "railSteps", gap: 5, activeTo: -1,
            items: [
              { name: "Observe the light", detail: "Watch where direct sunlight falls at different times. Record what you see before choosing plants for a balcony you have only imagined." },
              { name: "Choose one plant", detail: "Start with one plant suited to those conditions. Read its care requirements instead of assuming every pot needs the same routine." },
              { name: "Prepare its container", detail: "Choose a suitable container and growing medium. Check drainage before filling the pot, when changing it is still easy." },
              { name: "Place it within reach", detail: "Make watering and inspection convenient. Leave a clear route past the pot and a stable place for the tools you will use." },
              { name: "Keep notes, then expand", detail: "Notice what changes over the following weeks. Let that experience guide the next pot rather than buying the entire garden at once." },
            ],
          },
          { type: "note", content: "This is a starting method, not a universal care schedule. The plant's actual needs decide the routine." },
        ],
      },
    },
  },
  {
    id: "principle",
    name: "The original square principle",
    family: "Familiar frame",
    form: "Centred statement / square",
    origin: "mega-content/lab/plates/23-square-claim.js",
    reuse: "The original title, quotation, attribution, centred measure and field ground are retained. Optional kicker/footer copy is omitted; this is a fresh render in canonical Press, not the stored PNG.",
    description: "Fewer degrees of freedom. Quotation from the original Press reference: Precision failures do not respond to better instructions. They respond to fewer degrees of freedom. Attribution: PRESS / PRINCIPLES.MD.",
    spec: {
      id: "principle", frame: "square", layout: "centred", ratio: "3/5", gap: 5,
      title: "Fewer degrees of freedom.",
      background: { type: "field" },
      body: {
        type: "quote",
        text: "Precision failures do not respond to better instructions. They respond to fewer degrees of freedom.",
        attribution: "PRESS / PRINCIPLES.MD",
      },
    },
  },
  {
    id: "one-jar",
    name: "One object, several possible lives",
    family: "New combination",
    form: "Focal number + branching graph / square",
    reuse: "An existing hero numeral is stacked with a top-to-bottom fan-out graph. No dedicated reuse-object template or new drawing primitive.",
    description: "One empty jar can store seeds, hold pencils, or become a gift container. These are three alternatives, not three steps in a process.",
    spec: {
      id: "one-jar", frame: "square", gap: 5,
      title: "One jar. More than one next chapter.",
      body: {
        type: "stack", gap: 5,
        children: [
          { type: "hero", value: "1", caption: "EMPTY JAR / THREE POSSIBLE USES" },
          {
            type: "graph", dir: "y", gap: 5, rankGap: 3,
            nodes: [
              { key: "jar", rank: 0, title: "Keep the jar", accent: true },
              { key: "seeds", rank: 1, title: "Store seeds" },
              { key: "pencils", rank: 1, title: "Hold pencils" },
              { key: "gift", rank: 1, title: "Pack a gift" },
            ],
            edges: [
              { from: "jar", to: "seeds" },
              { from: "jar", to: "pencils" },
              { from: "jar", to: "gift" },
            ],
          },
        ],
      },
    },
  },
  {
    id: "free-hour",
    name: "A titleless map for a free hour",
    family: "New combination",
    form: "Decision map + commentary / square",
    hideTitle: true,
    reuse: "A quadrant and a note share a titleless article-style frame. The title stays in the source; the host suppresses its paint. Turn it on to compare without rewriting anything.",
    description: "An illustrative activity map. Left to right: more time. Bottom to top: more attention. Top left: sketch an object. Top right: learn a song. Bottom left: make tea. Bottom right: take a gentle walk. These placements are suggestions, not measured scores.",
    spec: {
      id: "free-hour", frame: "square", layout: "stacked", gap: 5,
      title: "What kind of hour do you have?",
      body: {
        type: "stack", gap: 5,
        children: [
          {
            type: "quadrant", x: "MORE TIME TO THE RIGHT", y: "MORE ATTENTION ABOVE",
            cells: [
              { title: "Sketch an object", body: "A short, focused exercise.", accent: true },
              { title: "Learn a song", body: "Stay with one new passage." },
              { title: "Make tea", body: "A small pause between things." },
              { title: "Take a gentle walk", body: "Leave room to wander." },
            ],
          },
          { type: "note", content: "Illustrative placements, not measured scores. Choose for the time and attention you have today." },
        ],
      },
    },
  },
  {
    id: "uncertainty",
    name: "A number is not the whole forecast",
    family: "New combination",
    form: "Focal estimate + intervals / landscape",
    reuse: "A hero numeral and an existing distribution component occupy a split frame. All three ranges share an axis and the same midpoint; only their uncertainty differs.",
    description: "Illustrative estimates, all with midpoint 12 days: narrow range 11 to 13, wider range 8 to 16, widest range 4 to 20. These are chosen bounds, not measured confidence intervals.",
    dataNote: "Illustrative bounds, not measured confidence intervals.",
    spec: {
      id: "uncertainty", frame: "landscape", layout: "split", ratio: "1/3",
      title: "The midpoint hides the range.",
      lead: "Same estimate. Three different amounts of uncertainty.",
      body: { type: "hero", value: "12", caption: "DAYS / EVERY MIDPOINT" },
      aside: {
        type: "distribution", unit: "days / illustrative bounds", from: 4, to: 20,
        items: [
          { label: "Narrow", lo: 11, mid: 12, hi: 13 },
          { label: "Wider", lo: 8, mid: 12, hi: 16 },
          { label: "Widest", lo: 4, mid: 12, hi: 20, accent: true },
        ],
      },
    },
  },
]);

export function sequenceDocument(example) {
  if (!example.stepIds) throw new Error("This example is not the sequence specimen.");
  const items = example.spec.body.children[0].items;
  return {
    schemaVersion: "press-lab/1", id: example.id, revision: 1, recipe: "sequence",
    title: example.spec.title,
    steps: items.map((item, index) => ({ id: example.stepIds[index], title: item.name, detail: item.detail })),
  };
}

// View state never changes the authored fixture. A host may suppress a title;
// an interaction may emphasize the rail. Neither is an authoring edit.
export function exampleSpec(example, selectedId = null) {
  const spec = structuredClone(example.spec);
  if (example.stepIds) {
    if (selectedId !== null && !example.stepIds.includes(selectedId)) throw new Error("Unknown step ID.");
    spec.body.children[0].activeTo = example.stepIds.indexOf(selectedId);
  }
  return spec;
}

export function exampleChrome(example, showTitle = !example.hideTitle) {
  return { title: showTitle, brand: false, marks: !example.hideTitle };
}
