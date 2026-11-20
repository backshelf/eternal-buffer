import type { ReactNode, SVGAttributes } from "react";

/** The currency glyphs a game picks from by id: single-ink 14px marks in `currentColor`. */
export type GlyphId =
  | "coin"
  | "drop"
  | "gem"
  | "leaf"
  | "star"
  | "moon"
  | "bolt"
  | "shell"
  | "flame"
  | "key"
  | "sun"
  | "seed"
  | "glyph"
  | "ink"
  | "seal"
  | "shard"
  | "treat"
  | "codex";

/**
 * The archival line: one weight, square caps, mitred joins. Every glyph below is cut from these rules, so a row of
 * them reads as one hand rather than a set of clip art.
 */
const LINE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.25,
  strokeLinecap: "square",
  strokeLinejoin: "miter",
} as const satisfies SVGAttributes<SVGElement>;

/** A filled accent inside an outlined mark (a coin's hole, a keycap's pip). */
const SOLID = { fill: "currentColor", stroke: "none" } as const satisfies SVGAttributes<SVGElement>;

const GLYPH_PATHS: Record<GlyphId, ReactNode> = {
  // A milled coin with a square hole: the archive's smallest unit of value.
  coin: (
    <g {...LINE}>
      <circle cx="7" cy="7" r="5.4" />
      <path d="M5.2 5.2h3.6v3.6H5.2Z" />
    </g>
  ),
  // An ink drop, holding its own highlight.
  drop: (
    <g {...LINE}>
      <path d="M7 1.8c1.9 2.4 3.1 4 3.1 5.6a3.1 3.1 0 0 1-6.2 0C3.9 5.8 5.1 4.2 7 1.8Z" />
      <path d="M5.5 7.6c0 1 .7 1.9 1.7 2" />
    </g>
  ),
  // An emerald-cut stone: table, girdle, pavilion facets.
  gem: (
    <g {...LINE}>
      <path d="M4.4 2.4h5.2L12 6 7 12.6 2 6Z" />
      <path d="M2 6h10M4.4 2.4 7 12.6M9.6 2.4 7 12.6" />
    </g>
  ),
  // A pressed leaf, midrib and one cross vein.
  leaf: (
    <g {...LINE}>
      <path d="M2.6 11.4C2.6 6.6 6.6 2.6 11.4 2.6c0 4.8-4 8.8-8.8 8.8Z" />
      <path d="M2.6 11.4 8.4 5.6M4.4 9.6h2.4" />
    </g>
  ),
  // An eight-point archival asterisk: the mark a colophon sets beside a name.
  star: (
    <g {...LINE}>
      <path d="M7 1.4v11.2M1.4 7h11.2M3.1 3.1l7.8 7.8M10.9 3.1 3.1 10.9" />
      <circle cx="7" cy="7" r="1.1" {...SOLID} />
    </g>
  ),
  // A crescent with one spark held in its hollow.
  moon: (
    <g {...LINE}>
      <path d="M9.4 2.1a5.4 5.4 0 1 0 2.4 8.9 6.4 6.4 0 0 1-2.4-8.9Z" />
      <path d="M8.8 5.2 9.3 6.6 10.7 7.1 9.3 7.6 8.8 9 8.3 7.6 6.9 7.1 8.3 6.6Z" {...SOLID} />
    </g>
  ),
  // A struck bolt, cut sharp.
  bolt: <path d="M8.6 1.4 3.2 8.2h3.3L5.4 12.6l5.4-6.8H7.5Z" {...LINE} />,
  // A cowrie: the archive keeps its accounts on them.
  shell: (
    <g {...LINE}>
      <path d="M7 2.2C4 2.2 2.2 4.8 2.2 7.4L7 12l4.8-4.6c0-2.6-1.8-5.2-4.8-5.2Z" />
      <path d="M7 2.2V12M4.4 4.8 7 6.4l2.6-1.6M3.4 8.6 7 9.4l3.6-.8" />
    </g>
  ),
  // A candle flame with its inner core.
  flame: (
    <g {...LINE}>
      <path d="M7 1.6c2.7 2.7 4 4.6 4 6.7a4 4 0 0 1-8 0c0-2.1 1.3-4 4-6.7Z" />
      <path d="M7 5.4c1.2 1.5 1.8 2.5 1.8 3.4a1.8 1.8 0 0 1-3.6 0c0-.9.6-1.9 1.8-3.4Z" />
    </g>
  ),
  // A bow key with two cut teeth.
  key: (
    <g {...LINE}>
      <circle cx="4.6" cy="4.6" r="2.6" />
      <path d="M6.4 6.4 12.2 12.2M9.4 9.4l1.8-1.8M11 11l1.8-1.8" />
    </g>
  ),
  // A plain sun, eight rays.
  sun: (
    <g {...LINE}>
      <circle cx="7" cy="7" r="2.6" />
      <path d="M7 1.2v1.8M7 11v1.8M1.2 7h1.8M11 7h1.8M2.9 2.9l1.3 1.3M9.8 9.8l1.3 1.3M11.1 2.9 9.8 4.2M4.2 9.8 2.9 11.1" />
    </g>
  ),
  // A seedling: stem and two held leaves.
  seed: (
    <g {...LINE}>
      <path d="M7 12.6V8.2" />
      <path d="M7 8.2C4.6 8.2 2.8 6.4 2.8 4c2.4 0 4.2 1.8 4.2 4.2Z" />
      <path d="M7 8.2C9.4 8.2 11.2 6.4 11.2 4c-2.4 0-4.2 1.8-4.2 4.2Z" />
    </g>
  ),
  // A keycap with its pip lit: what the player earns, one keystroke at a time.
  glyph: (
    <g {...LINE}>
      <path d="M2.6 3.6h8.8v5.4H2.6Z" />
      <path d="M4 9h6v2.2H4Z" />
      <path d="M7 5 8.2 6.3 7 7.6 5.8 6.3Z" {...SOLID} />
    </g>
  ),
  // A fountain-pen nib: breather hole and slit.
  ink: (
    <g {...LINE}>
      <path d="M7 1.8 10.6 8 7 12.2 3.4 8Z" />
      <circle cx="7" cy="5.6" r="1.1" />
      <path d="M7 6.7v3.3" />
    </g>
  ),
  // A wax seal: fluted edge, raised rim, stamped pip.
  seal: (
    <g {...LINE}>
      <circle cx="7" cy="7" r="4.7" strokeDasharray="1.6 1.2" />
      <circle cx="7" cy="7" r="2.3" />
      <path d="M7 5.4 8.6 7 7 8.6 5.4 7Z" {...SOLID} />
    </g>
  ),
  // A splinter of prism: irregular, sharp, faceted.
  shard: (
    <g {...LINE}>
      <path d="M8.8 1.6 11.2 6.6 8 12.4 4.6 9 5.6 4.4Z" />
      <path d="M8.8 1.6 6 8.2 8 12.4M4.6 9h4.6" />
    </g>
  ),
  // A margin fish, tail and eye: what the cat is paid in.
  treat: (
    <g {...LINE}>
      <path d="M3.2 7c1.5-1.9 3.2-2.8 4.9-2.8 1.9 0 3.2 1.3 3.9 2.8-.7 1.5-2 2.8-3.9 2.8-1.7 0-3.4-.9-4.9-2.8Z" />
      <path d="M3.2 7 1.4 5.4M3.2 7 1.4 8.6" />
      <circle cx="9.9" cy="6.4" r=".7" {...SOLID} />
    </g>
  ),
  // A bound tome: spine, bands, ruled lines.
  codex: (
    <g {...LINE}>
      <path d="M4.4 2.4h6.6v9.2H4.4Z" />
      <path d="M2.8 2.4v9.2M2.8 4.6h1.6M2.8 9.4h1.6" />
      <path d="M5.9 5.2h3.5M5.9 7.1h3.5M5.9 9h2.3" />
    </g>
  ),
};

/** A currency's glyph: its 14px mark in `currentColor`, sized by the slot it sits in. */
export const glyphOf = (id: GlyphId, size = 14): ReactNode => (
  <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true" focusable="false">
    {GLYPH_PATHS[id]}
  </svg>
);

/** A 20px line drawing in `currentColor`: the frame the tab icons are drawn in. */
const line20 = (path: ReactNode) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="square"
    strokeLinejoin="miter"
    aria-hidden="true"
    focusable="false"
  >
    {path}
  </svg>
);

/** The tab icons, one per screen kind: a nib, a mosaic, a compass chart, a tier tree, a rebind, a trial, the wall. */
export const TAB_ICONS = {
  // The hero Buffer: an inked nib, ready to cut.
  make: line20(
    <>
      <path d="M12.4 3.2 16.8 7.6 8.4 16 3.2 16.8 4 11.6Z" />
      <path d="M6.6 13.4 13.4 6.6" />
    </>,
  ),
  // The Plugin Mosaic: three set tiles and one socket still open.
  mosaic: line20(
    <>
      <path d="M3 3h5.6v5.6H3Zm8.4 0H17v5.6h-5.6ZM3 11.4h5.6V17H3Z" />
      <path d="M11.4 11.4H17v5.6h-5.6Z" strokeDasharray="1.8 1.8" />
    </>,
  ),
  // Margin Expeditions: a chart compass with its needle set.
  expeditions: line20(
    <>
      <circle cx="10" cy="10" r="6.8" />
      <path d="M13.4 6.6 8.6 11.4 6.6 13.4 11.4 8.6Z" />
      <path d="M10 9.1 10.9 10 10 10.9 9.1 10Z" fill="currentColor" stroke="none" />
    </>,
  ),
  // The upgrade tree: a root, two branches, two tiers of nodes.
  tree: line20(
    <>
      <path d="M10 16.8v-6M10 10.8 5.4 6.2M10 10.8l4.6-4.6" />
      <path d="M4 3.2h2.8v2.8H4Zm9.2 0H16v2.8h-2.8ZM8.6 16.8h2.8" />
    </>,
  ),
  // Prestige: the rebind cycle, two arrows chasing the archive around.
  prestige: line20(
    <>
      <path d="M4 10a6 6 0 0 1 10.6-3.9" />
      <path d="M14.9 2.6v3.8h-3.8" />
      <path d="M16 10a6 6 0 0 1-10.6 3.9" />
      <path d="M5.1 17.4v-3.8h3.8" />
    </>,
  ),
  // Vim Skill Challenges: a trial shield with the bolt that breaks it.
  challenges: line20(
    <>
      <path d="M10 2.8 16.2 5.2v5.2c0 3.6-2.8 5.8-6.2 6.8-3.4-1-6.2-3.2-6.2-6.8V5.2Z" />
      <path d="M11.4 6.6 8.2 11h2.6l-1 2.6L13.2 9h-2.6Z" />
    </>,
  ),
  // Marginalia: the wall of tiles, the last one still unfilled.
  achievements: line20(
    <>
      <path d="M3.2 3.2h5.6v5.6H3.2Zm8 0h5.6v5.6h-5.6ZM3.2 11.2h5.6v5.6H3.2Z" />
      <path d="M11.2 11.2h5.6v5.6h-5.6Z" strokeDasharray="1.8 1.8" />
    </>,
  ),
};

/**
 * The Margin Moth: the visitor that comes to the paper. Drawn soft on purpose — the one creature in the archive that
 * is not rules and right angles — with the wing lines that mark it as a moth rather than a butterfly.
 */
export const VISITOR_MARK: ReactNode = (
  <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true" focusable="false">
    <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      {/* Antennae. */}
      <path d="M14.2 10.4 10.6 5.8M15.8 10.4l3.6-4.6" />
      {/* Forewings. */}
      <path d="M13.6 12.4C10.6 8.2 6 6.8 3.6 8.4c-2 1.4-1.4 4.8 1.6 6.2 2.4 1.2 6 1 8.4-2.2Z" />
      <path d="M16.4 12.4c3-4.2 7.6-5.6 10-4 2 1.4 1.4 4.8-1.6 6.2-2.4 1.2-6 1-8.4-2.2Z" />
      {/* Hindwings. */}
      <path d="M13.8 18c-2.8 1.4-5.6 4.2-4.2 6 1.4 1.8 4.4.6 5-2.4.3-1.4 0-2.6-.8-3.6Z" />
      <path d="M16.2 18c2.8 1.4 5.6 4.2 4.2 6-1.4 1.8-4.4.6-5-2.4-.3-1.4 0-2.6.8-3.6Z" />
      {/* Wing lines. */}
      <path d="M12.6 12 7.2 9.6M12.2 13.6 8.4 13.6M17.4 12l5.4-2.4M17.8 13.6h3.8M13.6 19.4 10.6 22.4M16.4 19.4l3 3" />
      {/* Eyespots. */}
      <circle cx="7.6" cy="11" r="1.1" />
      <circle cx="22.4" cy="11" r="1.1" />
    </g>
    {/* Body and head. */}
    <ellipse cx="15" cy="16.4" rx="1.7" ry="5.4" fill="currentColor" />
    <circle cx="15" cy="10.4" r="1.3" fill="currentColor" />
  </svg>
);

/** The fluted rim a seal is stamped with: a dashed ring of the same wax, at 22px. */
const WAX = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "square",
  strokeLinejoin: "miter",
} as const satisfies SVGAttributes<SVGElement>;

/** An achievement tile's mark: a wax seal, struck once earned, a question on a hidden one. */
export const tileMark = (earned: boolean, hidden: boolean): ReactNode => (
  <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" focusable="false">
    <g {...WAX}>
      <circle cx="11" cy="11" r="7.4" strokeDasharray="2.4 1.8" />
      <circle cx="11" cy="11" r="4.6" />
    </g>
    {hidden ? (
      <path
        d="M9.4 9.2a1.7 1.7 0 1 1 2.3 1.6c-.4.2-.6.5-.6.9v.5m0 1.8v.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    ) : (
      <path
        d="M11 8.4 13 11 11 13.6 9 11Z"
        fill={earned ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="miter"
      />
    )}
  </svg>
);
