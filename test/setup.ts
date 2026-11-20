// Registers a DOM for the screen tests (`watchpot/test`'s `renderWith`). Rule and content tests do not need it, but
// the preload runs for every file, so this stays cheap: one window and the globals React touches.
import { Window } from "happy-dom";

const win = new Window({ url: "http://localhost:3000" });
const target = globalThis as unknown as Record<string, unknown>;

target.window = win;
target.document = win.document;
target.navigator = win.navigator;
target.location = win.location;
target.history = win.history;
target.localStorage = win.localStorage;
target.sessionStorage = win.sessionStorage;
target.IS_REACT_ACT_ENVIRONMENT = true;
target.getComputedStyle = win.getComputedStyle.bind(win);
target.requestAnimationFrame = win.requestAnimationFrame.bind(win);
target.cancelAnimationFrame = win.cancelAnimationFrame.bind(win);

const NAMES = [
  "Element",
  "HTMLElement",
  "HTMLCanvasElement",
  "HTMLAnchorElement",
  "HTMLButtonElement",
  "HTMLInputElement",
  "HTMLDivElement",
  "Node",
  "Text",
  "Comment",
  "DocumentFragment",
  "Event",
  "CustomEvent",
  "KeyboardEvent",
  "MouseEvent",
  "PointerEvent",
  "FocusEvent",
  "InputEvent",
  "MutationObserver",
  "ResizeObserver",
  "IntersectionObserver",
  "DOMParser",
  "XMLSerializer",
  "Image",
  "Window",
  "DOMRect",
  "screen",
  "matchMedia",
] as const;

for (const name of NAMES) {
  const value = (win as unknown as Record<string, unknown>)[name];
  if (value !== undefined && target[name] === undefined) target[name] = value;
}
