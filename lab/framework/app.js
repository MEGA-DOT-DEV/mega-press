import "./style.css";
import fontCss from "../../src/fonts.css?inline";
import { COLOR, FAMILY, FRAME, GROUND } from "../../src/tokens.js";
import { Rect } from "../../src/geometry.js";
import { cellCanvas, resolve } from "../../src/screen.js";
import { plateGround } from "../../src/field.js";
import { buildArtifact } from "../../src/build.ts";
import { parseArtifact } from "../../src/parse.ts";
import { ensurePressFonts, mountArtifact, providePressFontCss } from "../../src/mount.ts";
import { FIXTURES } from "./fixtures.mjs";
import { createController, listRecipes, sampleTransition, validateDocument } from "./model.mjs";

const $ = (id) => document.getElementById(id);
const presentationSchema = listRecipes()[0].schema.properties.presentation.properties;
const presentationValue = (key) => documentValue.presentation?.[key] ?? presentationSchema[key].enum[0];
const tokens = {
  page: COLOR.page, panel: COLOR.panel, raised: COLOR.raised, black2: COLOR.black2,
  line: COLOR.line, text: COLOR.text, muted: COLOR.muted, quiet: COLOR.quiet,
  red: COLOR.red, blue: COLOR.blue, "blue-text": COLOR.blueText, "accent-ground": GROUND.accent,
  "heading-font": FAMILY.heading, "mono-font": FAMILY.mono,
  // A named reading-profile experiment, using a face already shipped by Press.
  "reading-font": '"Geist Sans", system-ui, sans-serif',
};
for (const [key, value] of Object.entries(tokens)) document.documentElement.style.setProperty(`--${key}`, value);
providePressFontCss(fontCss);

let controller;
let stopSubscription;
let legacyMount;
let legacyInfo = null;
let generation = 0;
let documentValue;
let events = [];
let totalEvents = 0;
let transition = { from: { selectedId: null }, to: { selectedId: null } };
let raf = null;
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const motionOff = () => reduced.matches || $("reduce-motion").checked;
const cleanups = [];
function listen(node, type, handler) { node.addEventListener(type, handler); cleanups.push(() => node.removeEventListener(type, handler)); }
function stopAnimation() { if (raf !== null) cancelAnimationFrame(raf); raf = null; }

function paintProgress(progress) {
  const pose = sampleTransition(transition.from, transition.to, progress, { reducedMotion: motionOff() });
  for (const button of $("steps").querySelectorAll("button")) {
    const id = button.dataset.targetId;
    const weight = pose.fromId === pose.toId ? Number(id === pose.toId) :
      id === pose.toId ? pose.progress : id === pose.fromId ? 1 - pose.progress : 0;
    button.querySelector(".step-emphasis").style.opacity = String(weight);
  }
  $("progress").value = String(Math.round(pose.progress * 100));
  $("pose-report").value = `${pose.settled ? "Settled" : "Seeking"} / ${Math.round(pose.progress * 100)}%`;
  $("artifact").dataset.settled = String(pose.settled);
}

function play() {
  stopAnimation();
  if (motionOff() || transition.from.selectedId === transition.to.selectedId) { paintProgress(1); return; }
  // Wall-clock ownership stays in this disposable browser driver, never the model.
  const start = performance.now();
  const frame = (now) => {
    const progress = Math.min(1, (now - start) / 480);
    paintProgress(progress);
    raf = progress < 1 ? requestAnimationFrame(frame) : null;
  };
  paintProgress(0);
  raf = requestAnimationFrame(frame);
}

function showEvents() {
  $("event-log").replaceChildren();
  $("event-count").textContent = totalEvents === 0 ? "No events. Mounting is not an interaction." :
    `Showing latest ${events.length} of ${totalEvents} events in this view. Nothing is sent.`;
  for (const event of events.toReversed()) {
    const item = document.createElement("li");
    const disclosure = document.createElement("details");
    disclosure.open = event === events.at(-1);
    const title = document.createElement("summary");
    title.textContent = `${event.sequence.toString().padStart(2, "0")} / ${event.type}`;
    const meta = document.createElement("span");
    meta.className = "event-meta";
    meta.textContent = `${event.source} → ${event.targetId ?? "all steps"}`;
    title.append(meta);
    const content = document.createElement("pre");
    content.textContent = JSON.stringify(event, null, 2);
    disclosure.append(title, content);
    item.append(disclosure);
    $("event-log").append(item);
  }
}

function handleTransition(event) {
  // Explicit interruption policy for this emphasis-only study: settle the old
  // endpoint, then animate from the last committed state. No layout tweening.
  stopAnimation();
  paintProgress(1);
  transition = { from: event.previous, to: event.next };
  for (const button of $("steps").querySelectorAll("button")) {
    button.setAttribute("aria-pressed", String(button.dataset.targetId === event.next.selectedId));
  }
  const selected = documentValue.steps.find((step) => step.id === event.next.selectedId);
  $("selection-status").textContent = selected ? `Emphasis: ${selected.title}` : "All steps have equal emphasis.";
  totalEvents += 1;
  events.push(event);
  if (events.length > 6) events.shift();
  showEvents();
  play();
}

function requestAction(action, source) {
  const result = controller.dispatch(action, { source });
  if (!result.ok) $("selection-status").textContent = `Refused: ${result.error?.code ?? result.code ?? "ACTION_REFUSED"}`;
}

function renderSteps(doc) {
  $("steps").replaceChildren();
  for (const [index, step] of doc.steps.entries()) {
    const li = document.createElement("li");
    li.className = "step";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "step-target";
    button.dataset.targetId = step.id;
    button.setAttribute("aria-pressed", "false");
    const emphasis = document.createElement("span");
    emphasis.className = "step-emphasis";
    emphasis.setAttribute("aria-hidden", "true");
    const number = document.createElement("span");
    number.className = "step-number";
    number.textContent = String(index + 1).padStart(2, "0");
    number.setAttribute("aria-hidden", "true");
    const copy = document.createElement("span");
    copy.className = "step-copy";
    const title = document.createElement("strong");
    title.textContent = step.title;
    const detail = document.createElement("span");
    detail.className = "detail";
    detail.textContent = step.detail;
    copy.append(title, detail);
    button.append(emphasis, number, copy);
    // These listeners are owned by removed nodes; no document/global listeners.
    button.addEventListener("click", (event) => requestAction(
      { type: "focus.select", targetId: step.id }, event.detail === 0 ? "keyboard" : "pointer",
    ));
    li.append(button);
    $("steps").append(li);
  }
}

function updateLegacyReport() {
  if (!legacyInfo) return;
  const { host, altered } = legacyInfo;
  const width = Math.round(host.getBoundingClientRect().width);
  $("legacy-status").textContent = altered ?
    "Mounted, but legacy compilation changed source text. Inspect the integrity fixture; this is a known production gap, not a proposed behaviour." :
    `Mounted by the current Press engine. In this ${width}px host, its 26px body role scales to about ${(26 * width / 1600).toFixed(1)}px.`;
  $("legacy-status").dataset.error = String(altered);
}

async function renderLegacy(doc, ownGeneration) {
  legacyMount?.unmount();
  legacyMount = null;
  legacyInfo = null;
  // Each mount owns a distinct host, avoiding a stale unmount clearing a newer one.
  const host = document.createElement("div");
  $("legacy-frame").replaceChildren(host);
  $("legacy-status").textContent = "Preparing the baseline.";
  $("legacy-status").dataset.error = "false";
  const parsed = parseArtifact({ kind: "railSteps", id: doc.id, title: doc.title,
    steps: doc.steps.map((step) => ({ name: step.title, detail: step.detail })) });
  const built = parsed.ok ? buildArtifact(parsed.plan) : parsed;
  if (!built.ok) {
    $("legacy-status").textContent = `Legacy refusal: ${built.errors.map((error) => error.code).join(", ")}`;
    $("legacy-status").dataset.error = "true";
    return;
  }
  const ref = mountArtifact(host, built.spec);
  legacyMount = ref;
  try {
    await ref.ready;
    if (generation !== ownGeneration) return;
    const sourceDetails = doc.steps.map((step) => step.detail);
    const compiledText = JSON.stringify(built.spec);
    const altered = sourceDetails.some((detail) => !compiledText.includes(JSON.stringify(detail).slice(1, -1)));
    legacyInfo = { host, altered };
    updateLegacyReport();
  } catch (error) {
    if (generation !== ownGeneration) return;
    $("legacy-status").textContent = `Legacy mount refused: ${error.codes?.join(", ") ?? error.message}`;
    $("legacy-status").dataset.error = "true";
  }
}

function drawGround() {
  if (!documentValue || presentationValue("background") !== "field") return;
  const root = $("artifact");
  const bounds = root.getBoundingClientRect();
  const width = root.clientWidth, height = root.clientHeight;
  const scale = FRAME.landscape.w / width;
  const { cols, rows, ctx } = cellCanvas($("ground-canvas"), width, height, 2);
  if (!ctx) return;
  // The field's halo uses artboard units. Rect supplies the anchors its SDF needs.
  // This HTML lab measures boxes; production keeps using solved rectangles.
  const nodes = [...root.querySelectorAll(".artifact-chase, h3, .step-target, figcaption")].map((element) => {
    const r = element.getBoundingClientRect();
    return { kind: "box", rect: new Rect(
      (r.x - bounds.x - root.clientLeft) * scale, (r.y - bounds.y - root.clientTop) * scale,
      r.width * scale, r.height * scale,
    ) };
  });
  const size = { w: FRAME.landscape.w, h: height * scale };
  const field = plateGround({ nodes, rails: [], links: [], rules: [] },
    { baseDensity: 0.12, gradient: 0.72, contrast: 1 })(cols, rows, size);
  resolve(ctx, { cols, rows, ...field });
}

function loadDocument(raw) {
  generation += 1;
  stopAnimation();
  stopSubscription?.();
  controller?.dispose();
  const validated = validateDocument(raw);
  if (!validated.ok) throw new Error(validated.errors.map((error) => `${error.path}: ${error.message}`).join("; "));
  documentValue = validated.document;
  controller = createController(documentValue, { instanceId: `framework-study-${generation}` });
  stopSubscription = controller.subscribe(handleTransition);
  transition = { from: controller.getState(), to: controller.getState() };
  events = [];
  totalEvents = 0;
  $("artifact-title").textContent = documentValue.title;
  $("artifact").setAttribute("aria-labelledby", "artifact-title");
  $("artifact-revision").textContent = `Revision ${documentValue.revision}`;
  $("document-status").textContent = "Valid / press-lab/1";
  const preserved = JSON.stringify(raw) === JSON.stringify(documentValue);
  $("integrity-status").textContent = preserved ? "Verbatim / preserved" : "Changed / refused";
  $("integrity-status").dataset.error = String(!preserved);
  $("document-json").textContent = JSON.stringify(documentValue, null, 2);
  $("selection-status").textContent = "Select a step to explore its role.";
  renderSteps(documentValue);
  $("ground").value = $("artifact").dataset.ground = presentationValue("background");
  $("treatment").value = $("artifact").dataset.treatment = presentationValue("treatment");
  drawGround();
  showEvents();
  paintProgress(1);
  renderLegacy(documentValue, generation);
}

function loadFixture(index) { loadDocument(FIXTURES[index].document); }
function changePresentation(key, value) {
  if (value === presentationValue(key)) return;
  loadDocument({ ...documentValue, revision: documentValue.revision + 1,
    presentation: { ...documentValue.presentation, [key]: value } });
}
function inputSource(event) { return event.detail === 0 ? "keyboard" : "pointer"; }
async function main() {
  await ensurePressFonts(document);
  for (const [index, fixture] of FIXTURES.entries()) {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = fixture.label;
    $("subject").append(option);
  }
  for (const [id, key] of [["ground", "background"], ["treatment", "treatment"]]) {
    for (const value of presentationSchema[key].enum) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value[0].toUpperCase() + value.slice(1);
      $(id).append(option);
    }
    listen($(id), "change", () => changePresentation(key, $(id).value));
  }
  $("schema-json").textContent = JSON.stringify(listRecipes(), null, 2);
  listen($("subject"), "change", () => loadFixture(Number($("subject").value)));
  listen($("reading-width"), "change", () => $("preview-shell").classList.toggle("phone", $("reading-width").value === "phone"));
  listen($("next-step"), "click", (event) => requestAction({ type: "step.next" }, inputSource(event)));
  listen($("clear-focus"), "click", (event) => requestAction({ type: "focus.clear" }, inputSource(event)));
  listen($("clear-log"), "click", () => { events = []; totalEvents = 0; showEvents(); });
  listen($("progress"), "input", () => { stopAnimation(); paintProgress(Number($("progress").value) / 100); });
  listen($("replay"), "click", play);
  listen($("reduce-motion"), "change", () => { stopAnimation(); paintProgress(1); });
  listen(reduced, "change", () => { if (motionOff()) { stopAnimation(); paintProgress(1); } });
  const ro = new ResizeObserver(() => {
    $("width-report").textContent = `${Math.round($("artifact").getBoundingClientRect().width)}px / 16px body`;
    updateLegacyReport();
    drawGround();
  });
  ro.observe($("artifact"));
  ro.observe($("legacy-frame"));
  cleanups.push(() => ro.disconnect());
  loadFixture(0);
  document.documentElement.dataset.frameworkReady = "1";
}

function dispose() {
  generation += 1;
  stopAnimation();
  stopSubscription?.();
  controller?.dispose();
  legacyMount?.unmount();
  for (const cleanup of cleanups.splice(0)) cleanup();
}
// Vite module replacement and real page teardown own the runtime; no leaked RAFs.
if (import.meta.hot) import.meta.hot.dispose(dispose);
listen(window, "pagehide", (event) => { if (!event.persisted) dispose(); });
main().catch((error) => {
  document.documentElement.dataset.frameworkError = "1";
  const report = document.createElement("p");
  report.setAttribute("role", "alert");
  report.textContent = `Framework lab could not start: ${error.message}`;
  document.querySelector("main").prepend(report);
  console.error(error);
});
