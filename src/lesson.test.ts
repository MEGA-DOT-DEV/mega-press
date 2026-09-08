import { describe, expect, it, vi } from "vitest";
import { createLessonController, sampleLesson } from "./lesson.js";
import type { Lesson, LessonActionResult, LessonEvent, LessonEventSource } from "./lesson.js";

const authorLesson = () => ({
	id: "retrieval-story",
	revision: 2,
	title: "Give a model useful context.",
	steps: [
		{ id: "question", title: "Ask", description: "Start with a specific question.", durationMs: 1000, targetIds: ["prompt"] },
		{ id: "retrieve", title: "Retrieve", description: "Select relevant source material.", durationMs: 2000, targetIds: ["documents", "context"] },
		{ id: "answer", title: "Answer", description: "Ground the answer in the selected context.", durationMs: 1000, targetIds: ["context", "response"] },
	],
});

describe("lesson controller", () => {
	it("commits semantic events with immutable before/after state and explicit provenance", () => {
		const events: LessonEvent[] = [];
		const controller = createLessonController(authorLesson(), { instanceId: "article:diagram-2", onEvent: event => events.push(event) });
		const initial = controller.getState();
		expect(initial).toEqual({ stepId: "question", index: 0 });
		expect(events).toEqual([]);
		const result = controller.next("keyboard");
		expect(result).toEqual({ ok: true, changed: true, event: {
			eventVersion: 1, artifactId: "retrieval-story", revision: 2, instanceId: "article:diagram-2",
			sequence: 1, type: "step.select", targetId: "retrieve", source: "keyboard",
			previous: { stepId: "question", index: 0 }, next: { stepId: "retrieve", index: 1 },
		} });
		expect(events).toHaveLength(1);
		expect(events[0]!.previous).toBe(initial);
		expect(events[0]!.next).toBe(controller.getState());
		expect(Object.isFrozen(events[0])).toBe(true);
		expect(Object.isFrozen(events[0]!.previous)).toBe(true);
		expect(Object.isFrozen(events[0]!.next)).toBe(true);
		expect(Object.isFrozen(controller)).toBe(true);
	});

	it("clamps navigation, emits nothing for repeats, and sequences only committed changes", () => {
		const observed = vi.fn();
		const controller = createLessonController(authorLesson(), { instanceId: "lesson", onEvent: observed });
		expect(controller.previous("host")).toEqual({ ok: true, changed: false });
		expect(controller.reset("host")).toEqual({ ok: true, changed: false });
		expect(controller.select("question", "pointer")).toEqual({ ok: true, changed: false });
		expect(observed).not.toHaveBeenCalled();
		controller.select("answer", "pointer");
		expect(controller.next("playback")).toEqual({ ok: true, changed: false });
		controller.previous("keyboard");
		controller.reset("host");
		expect(observed.mock.calls.map(([event]) => [event.sequence, event.targetId, event.source])).toEqual([
			[1, "answer", "pointer"], [2, "retrieve", "keyboard"], [3, "question", "host"],
		]);
	});

	it("takes a deep snapshot without freezing or mutating the author's objects", () => {
		const authored = authorLesson();
		const controller = createLessonController(authored, { instanceId: "snapshot" });
		authored.steps[0]!.id = "changed";
		authored.steps[1]!.targetIds.push("new-target");
		authored.steps.pop();
		expect(controller.lesson.steps).toHaveLength(3);
		expect(controller.lesson.steps[0]!.id).toBe("question");
		expect(controller.lesson.steps[1]!.targetIds).toEqual(["documents", "context"]);
		expect(controller.next("host")).toMatchObject({ ok: true, changed: true });
		expect(controller.lesson).not.toBe(authored);
		expect(Object.isFrozen(authored)).toBe(false);
		expect(Object.isFrozen(controller.lesson)).toBe(true);
		expect(Object.isFrozen(controller.lesson.steps)).toBe(true);
		expect(Object.isFrozen(controller.lesson.steps[0])).toBe(true);
		expect(Object.isFrozen(controller.lesson.steps[0]!.targetIds)).toBe(true);
	});

	it("isolates instances and refuses invalid navigation without changing selection or sequence", () => {
		const first = createLessonController(authorLesson(), { instanceId: "first" });
		const second = createLessonController(authorLesson(), { instanceId: "second" });
		expect(first.select("missing", "host")).toMatchObject({ ok: false, code: "action.unknownTarget" });
		expect(first.select("retrieve", "scroll" as LessonEventSource)).toMatchObject({ ok: false, code: "action.invalidSource" });
		expect(first.reset(undefined as unknown as LessonEventSource)).toMatchObject({ ok: false, code: "action.invalidSource" });
		expect(first.next("host")).toMatchObject({ ok: true, changed: true, event: { sequence: 1, instanceId: "first" } });
		expect(second.getState()).toEqual({ stepId: "question", index: 0 });
	});

	it("notifies remaining observers after an observer throws and reports failures to the host", () => {
		const failure = new Error("analytics unavailable");
		const controller = createLessonController(authorLesson(), { instanceId: "observers", onEvent: () => { throw failure; } });
		const observer = vi.fn(event => expect(controller.getState()).toBe(event.next));
		controller.subscribe(observer);
		const result = controller.next("pointer");
		expect(result).toMatchObject({ ok: true, changed: true, observerErrors: [failure] });
		expect(observer).toHaveBeenCalledOnce();
		expect(controller.getState().stepId).toBe("retrieve");
		expect(controller.next("host")).toMatchObject({ event: { sequence: 2 } });
	});

	it("refuses reentrant navigation while observers see a single committed state", () => {
		const controller = createLessonController(authorLesson(), { instanceId: "reentrant" });
		const attempts: LessonActionResult[] = [];
		controller.subscribe(() => {
			attempts.push(controller.next("host"), controller.previous("host"), controller.reset("host"), controller.select("answer", "host"));
		});
		const observer = vi.fn();
		controller.subscribe(observer);
		controller.next("keyboard");
		expect(attempts).toHaveLength(4);
		for (const attempt of attempts) expect(attempt).toMatchObject({ ok: false, code: "controller.reentrantDispatch" });
		expect(observer).toHaveBeenCalledOnce();
		expect(controller.getState()).toEqual({ stepId: "retrieve", index: 1 });
		expect(controller.next("keyboard")).toMatchObject({ event: { sequence: 2 } });
	});

	it("supports unsubscribe and adds observers only to future notifications", () => {
		const controller = createLessonController(authorLesson(), { instanceId: "subscribe" });
		const late = vi.fn();
		const removed = vi.fn();
		let unsubscribe = () => {};
		controller.subscribe(() => { unsubscribe(); controller.subscribe(late); });
		unsubscribe = controller.subscribe(removed);
		controller.next("host");
		expect(removed).not.toHaveBeenCalled();
		expect(late).not.toHaveBeenCalled();
		controller.next("host");
		expect(late).toHaveBeenCalledOnce();
		unsubscribe();
	});

	it("disposes idempotently, stops outstanding notification, and keeps the final state readable", () => {
		const controller = createLessonController(authorLesson(), { instanceId: "dispose" });
		controller.subscribe(() => controller.dispose());
		const observer = vi.fn();
		const unsubscribe = controller.subscribe(observer);
		expect(controller.next("host")).toMatchObject({ ok: true, changed: true });
		expect(observer).not.toHaveBeenCalled();
		expect(controller.getState().stepId).toBe("retrieve");
		controller.dispose();
		unsubscribe();
		for (const result of [controller.next("host"), controller.previous("host"), controller.reset("host"), controller.select("answer", "host")]) {
			expect(result).toMatchObject({ ok: false, code: "controller.disposed" });
		}
		expect(() => controller.subscribe(observer)).toThrow(/disposal/);
	});

	it("handles a single-step lesson without inventing interaction events", () => {
		const lesson = authorLesson();
		lesson.steps = lesson.steps.slice(0, 1);
		const onEvent = vi.fn();
		const controller = createLessonController(lesson, { instanceId: "single", onEvent });
		for (const result of [controller.next("host"), controller.previous("host"), controller.reset("host")]) {
			expect(result).toEqual({ ok: true, changed: false });
		}
		expect(onEvent).not.toHaveBeenCalled();
	});
});

describe("lesson input validation", () => {
	it.each([
		["missing fields", {}],
		["null", null],
		["unknown fields", { ...authorLesson(), theme: "mega" }],
		["blank title", { ...authorLesson(), title: " \n" }],
		["long title", { ...authorLesson(), title: "a".repeat(201) }],
		["trailing newline in ID", { ...authorLesson(), id: "story\n" }],
		["long ID", { ...authorLesson(), id: "a".repeat(81) }],
		["zero revision", { ...authorLesson(), revision: 0 }],
		["unsafe revision", { ...authorLesson(), revision: Number.MAX_SAFE_INTEGER + 1 }],
		["no steps", { ...authorLesson(), steps: [] }],
		["too many steps", { ...authorLesson(), steps: Array(13).fill(authorLesson().steps[0]) }],
		["duplicate step IDs", { ...authorLesson(), steps: [authorLesson().steps[0], authorLesson().steps[0]] }],
		["sparse steps", { ...authorLesson(), steps: Array(2) }],
	])("rejects %s at construction and sampling", (_label, lesson) => {
		expect(() => createLessonController(lesson, { instanceId: "invalid" })).toThrow(TypeError);
		expect(() => sampleLesson(lesson, 0)).toThrow(TypeError);
	});

	it.each([0, -1, 1.5, 300_001, NaN, Infinity, "1000"])("rejects invalid duration %s", durationMs => {
		const lesson = { ...authorLesson(), steps: [{ ...authorLesson().steps[0], durationMs }] };
		expect(() => createLessonController(lesson, { instanceId: "invalid" })).toThrow(/durationMs/);
	});

	it.each([
		{ title: "x".repeat(121) }, { description: " " }, { description: "x".repeat(601) },
		{ targetIds: ["context", "context"] }, { targetIds: ["invalid target"] },
		{ targetIds: Array.from({ length: 25 }, (_, index) => `target-${index}`) }, { extra: true },
	])("rejects invalid step fields %j", override => {
		const lesson = { ...authorLesson(), steps: [{ ...authorLesson().steps[0], ...override }] };
		expect(() => createLessonController(lesson, { instanceId: "invalid" })).toThrow(/steps\/0/);
	});

	it("rejects getters without evaluating them, symbols, and custom array properties", () => {
		const getter = vi.fn(() => "A title");
		const authored = authorLesson();
		Object.defineProperty(authored, "title", { enumerable: true, get: getter });
		expect(() => createLessonController(authored, { instanceId: "invalid" })).toThrow(TypeError);
		expect(getter).not.toHaveBeenCalled();
		expect(() => sampleLesson({ ...authorLesson(), [Symbol("extra")]: true }, 0)).toThrow(TypeError);
		const arrayLesson = authorLesson();
		Object.defineProperty(arrayLesson.steps, "extra", { value: true });
		expect(() => sampleLesson(arrayLesson, 0)).toThrow(/dense JSON array/);
	});

	it("accepts the bounded maximum and target reuse across different steps", () => {
		const lesson: Lesson = { ...authorLesson(), steps: Array.from({ length: 12 }, (_, index) => ({
			id: `step-${index}`, title: "Title", description: "Description", durationMs: 300_000, targetIds: ["shared-target"],
		})) };
		expect(sampleLesson(lesson, 3_600_000)).toMatchObject({ finished: true, durationMs: 3_600_000, index: 11, progress: 1 });
		expect(() => createLessonController({ ...lesson, title: "😀".repeat(200) }, { instanceId: "unicode" })).not.toThrow();
	});

	it("preserves compound semantic addresses used by canonical schema fields and categories", () => {
		const lesson = authorLesson();
		lesson.steps[0]!.targetIds = ["tasks.task-owner", "agents.agent-id", "category:foreign", "x".repeat(160)];
		const controller = createLessonController(lesson, { instanceId: "field-targets" });
		expect(controller.lesson.steps[0]!.targetIds).toEqual(lesson.steps[0]!.targetIds);
		expect(sampleLesson(controller.lesson, 0).stepId).toBe("question");
		lesson.steps[0]!.targetIds = ["x".repeat(161)];
		expect(() => createLessonController(lesson, { instanceId: "long-target" })).toThrow(/targetIds/);
		lesson.steps[0]!.targetIds = ["tasks.\ntask-owner"];
		expect(() => createLessonController(lesson, { instanceId: "target-whitespace" })).toThrow(/targetIds/);
	});

	it.each([{}, { instanceId: " " }, { instanceId: "x".repeat(161) }, { instanceId: "test", extra: true }, { instanceId: "test", onEvent: 4 }])("rejects invalid options %j", options => {
		expect(() => createLessonController(authorLesson(), options as never)).toThrow(TypeError);
	});

	it("rejects invalid subscribers", () => {
		const controller = createLessonController(authorLesson(), { instanceId: "invalid-observer" });
		expect(() => controller.subscribe(null as never)).toThrow(TypeError);
	});
});

describe("lesson sampling", () => {
	it.each([
		[-500, "question", 0, 0, 0, false],
		[0, "question", 0, 0, 0, false],
		[500, "question", 0, 0.5, 500, false],
		[1000, "retrieve", 1, 0, 1000, false],
		[2000, "retrieve", 1, 0.5, 2000, false],
		[3000, "answer", 2, 0, 3000, false],
		[3500, "answer", 2, 0.5, 3500, false],
		[4000, "answer", 2, 1, 4000, true],
		[5000, "answer", 2, 1, 4000, true],
	])("samples %sms deterministically", (input, stepId, index, progress, timeMs, finished) => {
		const sample = sampleLesson(authorLesson(), input as number);
		expect(sample).toEqual({ stepId, index, progress, timeMs, durationMs: 4000, finished });
		expect(Object.isFrozen(sample)).toBe(true);
	});

	it("supports fractional seeks and order-independent replay without telemetry or state changes", () => {
		const onEvent = vi.fn();
		const controller = createLessonController(authorLesson(), { instanceId: "sample", onEvent });
		const initial = controller.getState();
		const expected = sampleLesson(controller.lesson, 1250.5);
		expect(expected.progress).toBe(0.12525);
		for (const time of [4000, 0, 3900, 1000, 4]) sampleLesson(controller.lesson, time);
		expect(sampleLesson(controller.lesson, 1250.5)).toEqual(expected);
		expect(controller.getState()).toBe(initial);
		expect(onEvent).not.toHaveBeenCalled();
	});

	it.each([NaN, Infinity, -Infinity, "1000", null, undefined])("refuses non-finite time %s", time => {
		expect(() => sampleLesson(authorLesson(), time as number)).toThrow(/timeMs/);
	});
});
