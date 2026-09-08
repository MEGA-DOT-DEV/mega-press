import "./showcase.css";
import fontCss from "../../src/fonts.css?inline";
import { COLOR, FAMILY, FRAME } from "../../src/tokens.js";
import { evaluateSpec } from "../../src/evaluate.js";
import { mount } from "../../src/render.js";
import { withPressTheme } from "../../src/theme.js";
import { ensurePressFonts, providePressFontCss } from "../../src/mount.ts";
import { createController } from "./model.mjs";
import { SHOWCASE, exampleChrome, exampleSpec, sequenceDocument } from "./showcase-fixtures.mjs";

for (const [key, value] of Object.entries({
  page: COLOR.page, panel: COLOR.panel, raised: COLOR.raised, line: COLOR.line,
  text: COLOR.text, muted: COLOR.muted, quiet: COLOR.quiet, red: COLOR.red,
  focus: COLOR.blueText, heading: FAMILY.heading, mono: FAMILY.mono,
})) document.documentElement.style.setProperty(`--${key}`, value);
providePressFontCss(fontCss);

const $ = (id) => document.getElementById(id);
const cleanups = [];
const reports = new Map();
let expectedRenders = 0;
let disposed = false;
function updateReadiness() {
  const passed = [...reports.values()].filter(Boolean).length;
  $("render-status").textContent = `${passed} OF ${expectedRenders} RENDERED / GEOMETRY CHECKED`;
  document.documentElement.dataset.showcaseReady = String(expectedRenders > 0 && passed === expectedRenders);
}
function listen(node, type, handler) {
  node.addEventListener(type, handler);
  cleanups.push(() => node.removeEventListener(type, handler));
}
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function link(text, href, className) {
  const node = element("a", className, text);
  node.href = href;
  return node;
}
function disclosure(label, content) {
  const node = element("details");
  node.append(element("summary", "", label), content);
  return node;
}
function frameLabel(example) {
  const frame = FRAME[example.spec.frame];
  return `${example.spec.frame} / ${frame.w} × ${frame.h}`;
}
function inspectorReport(example, result, showTitle, painted, presentationError) {
  return JSON.stringify({
    engine: "compileSpec → buildPlate → validate → mount",
    framePolicy: "exact frame (evaluateSpec), not the smallest-fit ladder",
    frame: frameLabel(example), geometryValid: result.ok, presentationMounted: painted,
    titleInSource: example.spec.title, titleRequested: showTitle, titlePainted: painted && showTitle,
    errors: result.errors, warnings: result.warnings, presentationError,
    ...(result.ok ? { textNodes: result.plate.nodes.filter((node) => node.kind === "text").length } : {}),
  }, null, 2);
}

// The host scales an already-solved fixed artboard. All geometry and paint come
// from canonical Press. No reading-profile or responsive-solver claim is made.
function createPreview(example, host, onReport = () => {}) {
  let mounted;
  const resize = () => {
    if (mounted) mounted.root.style.transform = `scale(${host.clientWidth / FRAME[example.spec.frame].w})`;
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  const frame = FRAME[example.spec.frame];
  host.style.aspectRatio = `${frame.w} / ${frame.h}`;
  host.dataset.example = example.id;
  host.setAttribute("aria-hidden", "true");
  const render = (showTitle = !example.hideTitle, selectedId = null) => {
    let result = { ok: false, errors: [], warnings: [] };
    let presentationError = null;
    let painted = false;
    try {
      const spec = exampleSpec(example, selectedId);
      const theme = { chrome: exampleChrome(example, showTitle) };
      // Exact portrait/square output is a host requirement here. proveArtifact()
      // deliberately selects the smallest fitting frame and is not used for it.
      result = withPressTheme(theme, () => evaluateSpec(spec));
      if (result.ok) {
        // Paint off-tree first. A thrown mount must not leave a partial frame
        // or an old picture claiming to represent newly committed state.
        const staging = host.ownerDocument.createElement("div");
        const next = withPressTheme(theme, () => mount(result.plate, staging, { dpr: Math.min(devicePixelRatio || 1, 2) }));
        host.replaceChildren(next.root);
        mounted = next;
        resize();
        painted = true;
      }
    } catch (error) {
      presentationError = {
        code: result.ok ? "PRESENTATION_FAILED" : "PREPARATION_FAILED",
        message: error instanceof Error ? error.message : String(error),
      };
    }
    if (!painted) {
      mounted = null;
      host.replaceChildren();
      host.removeAttribute("aria-hidden");
      const errors = [...result.errors, ...(presentationError ? [presentationError] : [])];
      const message = element("p", "render-error", errors.map((error) => `${error.code}: ${error.message}`).join("\n"));
      message.setAttribute("role", "alert");
      host.append(message);
    } else host.setAttribute("aria-hidden", "true");
    host.dataset.geometryValid = String(result.ok);
    host.dataset.valid = String(painted);
    reports.set(example.id, painted);
    onReport(inspectorReport(example, result, showTitle, painted, presentationError));
    updateReadiness();
    return painted;
  };
  cleanups.push(() => { observer.disconnect(); mounted?.root.remove(); mounted = null; });
  return render;
}

function buildCollection() {
  for (const [index, example] of SHOWCASE.entries()) {
    const card = element("article", "example-card");
    card.id = example.id;
    const meta = element("div", "card-meta mono");
    meta.append(element("span", "", `${String(index + 1).padStart(2, "0")} / ${example.family}`), element("span", "", example.spec.frame));
    if (example.family === "New combination") card.dataset.new = "true";
    const title = element("h2", "card-title");
    const href = `./showcase.html?example=${example.id}`;
    title.append(link(example.name, href));
    const previewLink = link("", href, "preview-link");
    previewLink.setAttribute("aria-label", `Open ${example.name}${example.stepIds ? " and try step selection" : ""}`);
    const host = element("div", "plate-viewport");
    previewLink.append(host);
    const caption = element("div", "card-caption");
    caption.append(element("p", "form mono", example.form), element("p", "", example.reuse));
    if (example.dataNote) caption.append(element("p", "data-note", example.dataNote));
    caption.append(link(example.stepIds ? "Open + select a step ↗" : "Open frame ↗", href, "open-link mono"));
    card.append(meta, title, previewLink, caption);
    $("collection").append(card);
    createPreview(example, host)();
  }
}

function buildDetail(example) {
  $("intro").hidden = true;
  $("collection").hidden = true;
  $("detail").hidden = false;
  document.title = `${example.name} — Mega Press`;
  const header = element("div", "detail-heading");
  header.append(link("← All seven examples", `./showcase.html#${example.id}`, "back-link mono"));
  header.append(element("p", "eyebrow", `${example.family} / ${example.form}`), element("h1", "", example.name), element("p", "detail-intro", example.reuse));
  $("detail").append(header);

  const controls = element("div", "detail-controls");
  const toggle = element("label", "title-toggle");
  const checkbox = element("input");
  checkbox.type = "checkbox";
  checkbox.id = "show-title";
  checkbox.checked = !example.hideTitle;
  toggle.append(checkbox, document.createTextNode("Show title inside the frame"));
  controls.append(element("span", "mono", frameLabel(example)), toggle);
  $("detail").append(controls);
  $("detail").append(element("p", "pan-hint", "Fixed artboard. On a narrow screen, pan inside the frame; the readable content is also available below."));
  const scroller = element("div", "detail-scroller");
  scroller.tabIndex = 0;
  scroller.setAttribute("role", "region");
  scroller.setAttribute("aria-label", `${example.name}: horizontally scrollable visual. A text description follows.`);
  const host = element("div", "plate-viewport detail-viewport");
  scroller.append(host);
  $("detail").append(scroller);

  const report = element("pre", "source");
  const render = createPreview(example, host, (text) => { report.textContent = text; });
  let controller;
  if (example.stepIds) {
    controller = createController(sequenceDocument(example), { instanceId: `showcase-${crypto.randomUUID()}` });
    const interaction = element("section", "interaction");
    interaction.append(element("h2", "", "Walk through the decisions"), element("p", "", "Select a step to emphasize the path up to it. Pointer and keyboard commit the same semantic state, with no animation or wording changes."));
    const targets = element("div", "step-targets");
    const steps = sequenceDocument(example).steps;
    const buttons = steps.map((step, index) => {
      const button = element("button", "step-button", `${index + 1}. ${step.title}`);
      button.type = "button";
      button.dataset.stepId = step.id;
      button.setAttribute("aria-pressed", "false");
      listen(button, "click", (event) => dispatch({ type: "focus.select", targetId: step.id }, event));
      targets.append(button);
      return button;
    });
    const actions = element("div", "interaction-actions");
    for (const [name, type] of [["Next step", "step.next"], ["Clear focus", "focus.clear"]]) {
      const button = element("button", "secondary", name);
      button.type = "button";
      listen(button, "click", (event) => dispatch({ type }, event));
      actions.append(button);
    }
    const state = element("p", "selection-state", "No step selected. Mounting emitted no event.");
    state.id = "selection-state";
    state.setAttribute("role", "status");
    const eventView = element("pre", "source", "No interaction event yet.");
    eventView.id = "last-event";
    const receipt = disclosure("Latest local event / nothing is sent", eventView);
    interaction.append(targets, actions, state, receipt);
    // Keep the native controls ahead of the tall artboard, so they are usable
    // without scrolling away from its active region. Painting replaces only
    // the plate subtree, never the focused button or its controller.
    $("detail").insertBefore(interaction, scroller);
    const unsubscribe = controller.subscribe((event) => {
      const painted = render(checkbox.checked, event.next.selectedId);
      buttons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.stepId === event.next.selectedId)));
      const selected = steps.find((step) => step.id === event.next.selectedId);
      state.textContent = `${selected ? `Selected: ${selected.title}` : "Focus cleared"}. Local event ${event.sequence}.${painted ? "" : " State committed; visual unavailable. See the frame report."}`;
      state.dataset.sequence = String(event.sequence);
      eventView.textContent = JSON.stringify(event, null, 2);
    });
    function dispatch(action, event) {
      const result = controller.dispatch(action, { source: event.detail === 0 ? "keyboard" : "pointer" });
      if (!result.ok || result.observerErrors?.length) state.textContent = "The action could not be presented. See the geometry report.";
    }
    cleanups.push(() => { unsubscribe(); controller.dispose(); });
  }
  listen(checkbox, "change", () => render(checkbox.checked, controller?.getState().selectedId ?? null));
  render();

  const reading = element("section", "reading");
  reading.append(element("h2", "", "Read the figure"), element("p", "", example.description));
  if (example.stepIds) {
    const list = element("ol");
    for (const step of sequenceDocument(example).steps) {
      const item = element("li");
      item.append(element("strong", "", step.title), document.createTextNode(`. ${step.detail}`));
      list.append(item);
    }
    reading.append(list);
  }
  $("detail").append(reading);

  const inspect = element("section", "inspect");
  const source = element("pre", "source", JSON.stringify(example.spec, null, 2));
  inspect.append(disclosure("Authored component spec / unchanged by title and focus controls", source));
  inspect.append(disclosure("Actual frame and geometry report", report));
  inspect.append(element("p", "provenance", example.origin ? `Reference frame: ${example.origin}` : "New arrangement of existing Press components. No new kind or primitive."));
  $("detail").append(inspect);
  const next = SHOWCASE[(SHOWCASE.indexOf(example) + 1) % SHOWCASE.length];
  $("detail").append(link(`Next: ${next.name} →`, `./showcase.html?example=${next.id}`, "next-example"));
}

async function start() {
  await ensurePressFonts(document);
  if (disposed) return;
  // The production helper currently swallows load failures. FontFaceSet.check
  // alone also accepts missing families through fallback; inspect real faces.
  const familyName = (value) => value.split(",")[0].trim().replace(/^["']|["']$/g, "");
  const required = new Set([...Object.values(FAMILY).map(familyName), "Geist Sans"]);
  const loaded = new Set([...(document.fonts ?? [])].filter((face) => face.status === "loaded").map((face) => familyName(face.family)));
  const missing = [...required].filter((family) => !loaded.has(family));
  if (missing.length) throw new Error(`Required Press fonts did not load: ${missing.join(", ")}. Fallback geometry is not accepted.`);
  const id = new URLSearchParams(location.search).get("example");
  const example = id ? SHOWCASE.find((candidate) => candidate.id === id) : null;
  if (id && !example) throw new Error(`Unknown example: ${id}. Return to showcase.html for the seven available frames.`);
  expectedRenders = example ? 1 : SHOWCASE.length;
  if (example) buildDetail(example);
  else buildCollection();
  updateReadiness();
  if (!example && location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
}
function dispose() {
  if (disposed) return;
  disposed = true;
  cleanups.splice(0).reverse().forEach((cleanup) => cleanup());
}
listen(window, "pagehide", (event) => { if (!event.persisted) dispose(); });
start().catch((error) => {
  $("fatal-error").hidden = false;
  $("fatal-error").textContent = error.message;
  $("render-status").textContent = "Preparation failed. See the error below.";
  document.documentElement.dataset.showcaseReady = "false";
});
