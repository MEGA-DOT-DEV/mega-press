import { frameSize } from "../src/kernel/lock.ts";
import { mountArtifact } from "../src/mount.ts";

function loadSpec(): Record<string, unknown> {
	const baked = (globalThis as { __PRESS_SPEC__?: Record<string, unknown> }).__PRESS_SPEC__;
	if (baked) return baked;
	const q = new URLSearchParams(location.search).get("spec");
	if (!q) throw new Error("missing spec");
	return JSON.parse(atob(q)) as Record<string, unknown>;
}

const reportStatus = (body: Record<string, unknown>) => {
	void fetch("/__press__/status", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
		keepalive: true,
	}).catch(() => undefined);
};

const spec = loadSpec();
const frame = frameSize(String(spec.frame ?? "landscape"));
const el = document.getElementById("plate");
if (!el) throw new Error("missing #plate");
el.style.width = `${frame.w}px`;
el.style.height = `${frame.h}px`;
void mountArtifact(el, spec).ready.then(
	() => {
		document.documentElement.dataset.pressReady = "1";
		reportStatus({ ok: true });
	},
	(err: { errors?: { code: string; message: string }[]; code?: string; message?: string }) => {
		const errors = err?.errors ?? [
			{ code: err?.code ?? "MOUNT_FAILED", message: err?.message ?? String(err) },
		];
		const report = { ok: false, errors };
		document.documentElement.dataset.pressError = "1";
		document.documentElement.dataset.pressReport = JSON.stringify(report);
		const node = document.createElement("script");
		node.id = "press-error";
		node.type = "application/json";
		node.textContent = JSON.stringify(report);
		document.body.appendChild(node);
		reportStatus(report);
	},
);
