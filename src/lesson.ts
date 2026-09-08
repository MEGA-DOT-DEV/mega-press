/** A renderer-independent story. Targets refer to semantic IDs owned by the host. */
export type LessonStep = {
	readonly id: string;
	readonly title: string;
	readonly description: string;
	readonly durationMs: number;
	readonly targetIds: readonly string[];
};

export type Lesson = {
	readonly id: string;
	readonly revision: number;
	readonly title: string;
	readonly steps: readonly LessonStep[];
};

export type LessonState = { readonly stepId: string; readonly index: number };
export type LessonEventSource = "keyboard" | "pointer" | "host" | "playback";

/** No timestamps or user identity: the host owns storage, consent, and transport. */
export type LessonEvent = {
	readonly eventVersion: 1;
	readonly artifactId: string;
	readonly revision: number;
	readonly instanceId: string;
	readonly sequence: number;
	readonly type: "step.select";
	readonly targetId: string;
	readonly source: LessonEventSource;
	readonly previous: LessonState;
	readonly next: LessonState;
};

/** Observers run synchronously after a committed change. */
export type LessonObserver = (event: LessonEvent) => void;
export type LessonControllerOptions = {
	readonly instanceId: string;
	readonly onEvent?: LessonObserver;
};

export type LessonActionResult =
	| { readonly ok: true; readonly changed: false }
	| {
			readonly ok: true;
			readonly changed: true;
			readonly event: LessonEvent;
			readonly observerErrors?: readonly unknown[];
		}
	| {
			readonly ok: false;
			readonly code: "controller.disposed" | "controller.reentrantDispatch" | "action.invalidSource" | "action.unknownTarget";
			readonly message: string;
		};

export type LessonController = {
	readonly lesson: Lesson;
	getState(): LessonState;
	select(stepId: string, source: LessonEventSource): LessonActionResult;
	next(source: LessonEventSource): LessonActionResult;
	previous(source: LessonEventSource): LessonActionResult;
	reset(source: LessonEventSource): LessonActionResult;
	subscribe(observer: LessonObserver): () => void;
	dispose(): void;
};

export type LessonSample = LessonState & {
	/** Progress through the selected step, from 0 to 1. */
	readonly progress: number;
	/** Clamped absolute time within the whole lesson. */
	readonly timeMs: number;
	/** Total duration of the whole lesson. */
	readonly durationMs: number;
	readonly finished: boolean;
};

const fail = (path: string, message: string): never => {
	throw new TypeError(`Invalid lesson input at ${path}: ${message}`);
};

/** Inspect descriptors before reading so authored getters never execute. */
function record(input: unknown, keys: readonly string[], path: string, optional: readonly string[] = []): Record<string, unknown> {
	if (input === null || typeof input !== "object"
		|| ![Object.prototype, null].includes(Object.getPrototypeOf(input))) {
		return fail(path, "expected a plain object.");
	}
	const ownKeys = Reflect.ownKeys(input);
	if (ownKeys.length < keys.length || ownKeys.length > keys.length + optional.length
		|| keys.some(key => !Object.hasOwn(input, key))) {
		return fail(path, `expected fields ${keys.join(", ")}.`);
	}
	const snapshot: Record<string, unknown> = {};
	for (const key of ownKeys) {
		const property = Object.getOwnPropertyDescriptor(input, key);
		if (typeof key !== "string" || (!keys.includes(key) && !optional.includes(key))
			|| !property?.enumerable || !Object.hasOwn(property, "value")) {
			return fail(path, "unexpected field or non-JSON property.");
		}
		snapshot[key] = property.value;
	}
	return snapshot;
}

function array(input: unknown, min: number, max: number, path: string): readonly unknown[] {
	if (!Array.isArray(input) || input.length < min || input.length > max) {
		return fail(path, `expected an array of ${min}–${max} items.`);
	}
	if (Reflect.ownKeys(input).length !== input.length + 1) return fail(path, "expected a dense JSON array.");
	const snapshot: unknown[] = [];
	for (let index = 0; index < input.length; index++) {
		const property = Object.getOwnPropertyDescriptor(input, String(index));
		if (!property?.enumerable || !Object.hasOwn(property, "value")) return fail(`${path}/${index}`, "expected a JSON value.");
		snapshot.push(property.value);
	}
	return snapshot;
}

function text(input: unknown, max: number, path: string): string {
	if (typeof input !== "string" || input.length > max * 2 || !/\S/u.test(input) || [...input].length > max) {
		return fail(path, `expected nonblank text of at most ${max} characters.`);
	}
	return input;
}

function id(input: unknown, path: string): string {
	if (typeof input !== "string" || input.length > 80 || !/^[A-Za-z][A-Za-z0-9_-]*$(?![\s\S])/u.test(input)) {
		return fail(path, "expected an ID of at most 80 ASCII letters, digits, underscores, or hyphens, starting with a letter.");
	}
	return input;
}

/** Host addresses may include namespaces such as tasks.owner or category:key. */
function targetId(input: unknown, path: string): string {
	const target = text(input, 160, path);
	if (/\s/u.test(target)) return fail(path, "expected a semantic address without whitespace.");
	return target;
}

/** Copies only the bounded authored shape; caller objects are never frozen. */
function snapshotLesson(input: unknown): Lesson {
	const source = record(input, ["id", "revision", "title", "steps"], "/");
	const lessonId = id(source.id, "/id");
	if (!Number.isSafeInteger(source.revision) || (source.revision as number) < 1) {
		return fail("/revision", "expected a positive safe integer.");
	}
	const title = text(source.title, 200, "/title");
	const seen = new Set<string>();
	const steps = array(source.steps, 1, 12, "/steps").map((value, index): LessonStep => {
		const path = `/steps/${index}`;
		const step = record(value, ["id", "title", "description", "durationMs", "targetIds"], path);
		const stepId = id(step.id, `${path}/id`);
		if (seen.has(stepId)) return fail(`${path}/id`, "step IDs must be unique.");
		seen.add(stepId);
		if (!Number.isSafeInteger(step.durationMs) || (step.durationMs as number) < 1 || (step.durationMs as number) > 300_000) {
			return fail(`${path}/durationMs`, "expected an integer from 1 to 300000 milliseconds.");
		}
		const targets = array(step.targetIds, 0, 24, `${path}/targetIds`).map((target, targetIndex) => targetId(target, `${path}/targetIds/${targetIndex}`));
		if (new Set(targets).size !== targets.length) return fail(`${path}/targetIds`, "target IDs must be unique within a step.");
		return Object.freeze({
			id: stepId,
			title: text(step.title, 120, `${path}/title`),
			description: text(step.description, 600, `${path}/description`),
			durationMs: step.durationMs as number,
			targetIds: Object.freeze(targets),
		});
	});
	return Object.freeze({ id: lessonId, revision: source.revision as number, title, steps: Object.freeze(steps) });
}

type RefusalCode = Extract<LessonActionResult, { ok: false }>["code"];
const refuse = (code: RefusalCode, message: string): LessonActionResult => Object.freeze({ ok: false, code, message });

/**
 * Starts at the first step without emitting. Navigation clamps at each end;
 * only a changed selection emits. A controller owns no renderer or timer.
 * Construction throws on invalid authored data or options. Actions return
 * refusals after disposal, for invalid input, or during observer notification.
 */
export function createLessonController(input: unknown, options: LessonControllerOptions): LessonController {
	const lesson = snapshotLesson(input);
	const opts = record(options, ["instanceId"], "/options", ["onEvent"]);
	const instanceId = text(opts.instanceId, 160, "/options/instanceId");
	if (Object.hasOwn(opts, "onEvent") && typeof opts.onEvent !== "function") {
		return fail("/options/onEvent", "expected a synchronous observer function.");
	}
	const listeners = new Set<LessonObserver>();
	if (opts.onEvent) listeners.add(opts.onEvent as LessonObserver);
	let state: LessonState = Object.freeze({ stepId: lesson.steps[0]!.id, index: 0 });
	let sequence = 0;
	let disposed = false;
	let notifying = false;

	const select = (stepId: string, source: LessonEventSource): LessonActionResult => {
		if (disposed) return refuse("controller.disposed", "Controller has been disposed.");
		if (notifying) return refuse("controller.reentrantDispatch", "Navigation during observer notification is refused.");
		if (!["keyboard", "pointer", "host", "playback"].includes(source)) return refuse("action.invalidSource", "An explicit supported source is required.");
		const index = lesson.steps.findIndex(step => step.id === stepId);
		if (index < 0) return refuse("action.unknownTarget", "Target must identify a step in this lesson.");
		if (index === state.index) return Object.freeze({ ok: true, changed: false });
		const previous = state;
		state = Object.freeze({ stepId, index });
		const event: LessonEvent = Object.freeze({
			eventVersion: 1, artifactId: lesson.id, revision: lesson.revision, instanceId,
			sequence: ++sequence, type: "step.select", targetId: stepId, source, previous, next: state,
		});
		const observerErrors: unknown[] = [];
		notifying = true;
		try {
			for (const listener of [...listeners]) {
				if (!listeners.has(listener)) continue;
				try { listener(event); } catch (error) { observerErrors.push(error); }
			}
		} finally { notifying = false; }
		return Object.freeze({ ok: true, changed: true, event,
			...(observerErrors.length ? { observerErrors: Object.freeze(observerErrors) } : {}),
		});
	};

	return Object.freeze({
		lesson,
		getState: () => state,
		select,
		next: (source: LessonEventSource) => select(lesson.steps[Math.min(lesson.steps.length - 1, state.index + 1)]!.id, source),
		previous: (source: LessonEventSource) => select(lesson.steps[Math.max(0, state.index - 1)]!.id, source),
		reset: (source: LessonEventSource) => select(lesson.steps[0]!.id, source),
		subscribe(observer: LessonObserver) {
			if (disposed) throw new Error("Cannot subscribe after lesson controller disposal.");
			if (typeof observer !== "function") throw new TypeError("Lesson observer must be a function.");
			listeners.add(observer);
			return () => { listeners.delete(observer); };
		},
		dispose() { disposed = true; listeners.clear(); },
	});
}

/**
 * Deterministic seek for static, interactive, and video hosts. Exact internal
 * boundaries select the following step at progress 0; the final boundary
 * selects the last step at progress 1. Sampling never changes a controller.
 */
export function sampleLesson(input: unknown, timeMs: number): LessonSample {
	if (!Number.isFinite(timeMs)) return fail("/timeMs", "expected finite milliseconds.");
	const lesson = snapshotLesson(input);
	const durationMs = lesson.steps.reduce((total, step) => total + step.durationMs, 0);
	const time = Math.max(0, Math.min(durationMs, timeMs));
	let startMs = 0;
	for (let index = 0; index < lesson.steps.length; index++) {
		const step = lesson.steps[index]!;
		if (time < startMs + step.durationMs || index === lesson.steps.length - 1) {
			return Object.freeze({ stepId: step.id, index, progress: (time - startMs) / step.durationMs,
				timeMs: time, durationMs, finished: time === durationMs });
		}
		startMs += step.durationMs;
	}
	throw new Error("A validated lesson must contain at least one step.");
}
