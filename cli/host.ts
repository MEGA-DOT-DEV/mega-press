import { frameSize } from "../src/kernel/lock.ts";
import { mountArtifact } from "../src/mount.ts";

function loadSpec(): Record<string, unknown> {
	const baked = (globalThis as { __PRESS_SPEC__?: Record<string, unknown> }).__PRESS_SPEC__;
	if (baked) return baked;
	const q = new URLSearchParams(location.search).get("spec");
	if (!q) throw new Error("missing spec");
	return JSON.parse(atob(q)) as Record<string, unknown>;
}

const spec = loadSpec();
const frame = frameSize(String(spec.frame ?? "landscape"));
const el = document.getElementById("plate");
if (!el) throw new Error("missing #plate");
el.style.width = `${frame.w}px`;
el.style.height = `${frame.h}px`;
void mountArtifact(el, spec).ready.then(() => {
	document.documentElement.dataset.pressReady = "1";
});
