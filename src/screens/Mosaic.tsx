import { Fragment, useMemo, useRef, useState } from "react";
import { D, type Effect, fmt, fmtTimes } from "watchpot/core";
import { useClockNow } from "watchpot/react";
import { ShaderTile, useShaderTokens } from "watchpot/shader";
import { VisuallyHidden } from "watchpot/ui";
import { useGameState, useGameStore } from "../app/hooks";
import { glyphOf } from "../app/icons";
import { playBuy, playTilePlace } from "../app/sound";
import { MOSAIC_GRID, MOSAIC_PIECES, type MosaicPieceDef } from "../content/mosaic";
import { ACT_BY_ID, type ActId } from "../content/vimActs";
import { CURRENCY, type Currency, STAT, type StatId } from "../content/words";
import { autoArrangeMosaic, crafting, mosaic, open } from "../game/mosaic";
import { TILE_FOIL, TILE_FOIL_UNIFORMS } from "../shaders/tileFoil";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { Title } from "../ui/Title";
import s from "./Mosaic.module.css";

/** The plate is square: six sockets across, six down. */
const COLUMNS = MOSAIC_GRID.width;
const ROWS = MOSAIC_GRID.height;
/** The column heads, so a socket has a name of its own (`d4`) to be pointed at. */
const HEADS = ["a", "b", "c", "d", "e", "f"] as const;
/** The stats in the order the tally reads them. */
const TALLY_ORDER: readonly StatId[] = ["output", "tempo", "inkRate", "gain", "codexGain", "offline"];

/** A piece by its id, for the sockets that name one. */
const PIECE_BY_ID = new Map<string, MosaicPieceDef>(MOSAIC_PIECES.map((piece) => [piece.id, piece]));

/** What the closed ring says it is waiting for: the milestone that opens the 5x5, then the one that opens all six. */
const RING_FIVE = "25 Seals";
const RING_SIX = "3 Codices";

/**
 * A wallet with every Seal ever and no Codex: the ring's own rule asked which cell the 5x5 would open, so the screen
 * never restates the number the board gates the grid on.
 */
const SEALS_ONLY = { wallet: { sealsEver: D("1e300"), codicesEver: D(0) } };

/** Whether the 25-Seal ring is what opens a cell: any Seal at all and no Codex, asked of `open` itself. */
const opensAtFive = (x: number, y: number) => open(SEALS_ONLY, x, y);

/** What the player is holding: a piece off the bench, or one already down that they mean to move. */
type Hand = { from: "tray"; piece: string } | { from: "board"; cell: number } | null;

/** One socket as the plate draws it. */
interface CellView {
  cell: number;
  x: number;
  y: number;
  /** Whether the game has opened it. */
  open: boolean;
  /** What sits on it, open or sealed. */
  piece: MosaicPieceDef | null;
  /** Whether the board counts it: a piece on a cell the game has since closed does not. */
  counted: boolean;
  /** What the piece is worth where it sits, read off the board's own view of it. */
  effects: readonly Effect<StatId>[];
}

/** A bench row: the piece, what the bench holds, what the plate has laid, and the price of one more. */
interface BenchRow {
  piece: MosaicPieceDef;
  held: number;
  laid: number;
  costs: readonly { currency: Currency; amount: number }[];
}

/** A stat's running total on the plate: every multiplier it gives, multiplied over, and every amount added. */
interface TallyRow {
  stat: StatId;
  mul: number;
  add: number;
}

/** The three colour tokens the foil reads, as the theme gives them. */
type Palette = Record<"--ui-ground" | "--ui-ink" | "--ui-accent", string> | null;

/** The socket's name: its column letter and its row number, the way the plate is ruled. */
const coordinateOf = (x: number, y: number) => `${HEADS[x] ?? "?"}${y + 1}`;

/** One effect as the plate prints it: a multiplier in the number face, or an amount with its sign. */
function effectText(effect: Effect<StatId>): string {
  const amount = effect.mul ?? effect.add;
  const value = typeof amount === "number" ? amount : 1;
  return effect.mul !== undefined
    ? `${fmtTimes(value)} ${STAT[effect.stat]}`
    : `+${value.toFixed(2)} ${STAT[effect.stat]}`;
}

/** The shortest form of one effect, for the corner of a socket: `×1.15`, never the stat's name. */
function effectBadge(effects: readonly Effect<StatId>[]): string {
  const [first] = effects;
  if (!first) return "—";
  const amount = first.mul ?? first.add;
  const value = typeof amount === "number" ? amount : 1;
  return first.mul !== undefined ? fmtTimes(value) : `+${value.toFixed(2)}`;
}

/** How bright a foil runs: the whole of a piece's synergy, folded into 0..1. */
function synergyOf(effects: readonly Effect<StatId>[]): number {
  let gain = 0;
  for (const effect of effects) {
    const amount = effect.mul ?? effect.add;
    if (typeof amount !== "number") continue;
    gain += effect.mul !== undefined ? amount - 1 : amount;
  }
  return Math.min(1, Math.max(0, gain));
}

/** Every effect on the plate folded into one row per stat: multipliers multiplied, amounts added. */
function tallyOf(cells: readonly CellView[]): TallyRow[] {
  const rows = new Map<StatId, TallyRow>(
    TALLY_ORDER.map((stat): [StatId, TallyRow] => [stat, { stat, mul: 1, add: 0 }]),
  );
  for (const cell of cells) {
    for (const effect of cell.effects) {
      const row = rows.get(effect.stat);
      if (!row) continue;
      const amount = effect.mul ?? effect.add;
      if (typeof amount !== "number") continue;
      if (effect.mul !== undefined) row.mul *= amount;
      else row.add += amount;
    }
  }
  return [...rows.values()].filter((row) => Math.abs(row.mul - 1) > 1e-9 || Math.abs(row.add) > 1e-9);
}

/** What a socket says to assistive tech: where it is, and what is on it or what it waits for. */
function socketLabel(view: CellView): string {
  const at = coordinateOf(view.x, view.y);
  if (!view.open) {
    return view.piece
      ? `${at}, sealed, holding the ${view.piece.name}`
      : `${at}, closed until ${opensAtFive(view.x, view.y) ? RING_FIVE : RING_SIX}`;
  }
  if (!view.piece) return `${at}, open socket`;
  const effects = view.counted ? view.effects.map(effectText).join(", ") : "sealed, worth nothing";
  return `${at}, ${view.piece.name}, ${view.piece.rarity}: ${effects}`;
}

/**
 * One socket of the plate: a real button, so the board is walked by tab and pressed with Enter or Space. An open empty
 * cell is an ASCII keycap socket waiting for a cap; a closed one names the milestone that opens it.
 */
function Socket({
  view,
  palette,
  holding,
  isLooked,
  onPress,
  onLook,
}: {
  view: CellView;
  palette: Palette;
  holding: Hand;
  isLooked: boolean;
  onPress: (view: CellView) => void;
  onLook: (cell: number | null) => void;
}) {
  const chosen = holding?.from === "board" && holding.cell === view.cell;
  const target = holding?.from === "tray" && view.open && !view.piece;
  const state = view.piece ? (view.counted ? "laid" : "sealed") : view.open ? "open" : "closed";
  return (
    <button
      type="button"
      className={s.socket}
      data-state={state}
      data-rarity={view.piece?.rarity}
      data-chosen={chosen ? "" : undefined}
      data-target={target ? "" : undefined}
      data-looked={isLooked ? "" : undefined}
      aria-label={socketLabel(view)}
      aria-pressed={chosen}
      onClick={() => onPress(view)}
      onFocus={() => onLook(view.cell)}
      onPointerEnter={() => onLook(view.cell)}
      onPointerLeave={() => onLook(null)}
      onBlur={() => onLook(null)}
    >
      {view.piece && palette && (
        <ShaderTile
          className={s.foil}
          fragment={TILE_FOIL.fragment}
          uniforms={{
            u_ground: palette["--ui-ground"],
            u_ink: palette["--ui-ink"],
            u_accent: palette["--ui-accent"],
            u_active: view.counted ? 1 : 0,
            u_synergy: synergyOf(view.effects),
          }}
          kinds={TILE_FOIL_UNIFORMS}
          maxPixels={40_000}
          paused={!view.counted}
          still={<span className={s.foilStill} style={{ background: TILE_FOIL.still }} />}
        />
      )}
      {view.piece ? (
        <>
          <span className={s.glyph} aria-hidden="true">
            {view.piece.glyph}
          </span>
          <span className={s.badge} aria-hidden="true">
            {view.counted ? effectBadge(view.effects) : "sealed"}
          </span>
        </>
      ) : view.open ? (
        <span className={s.socketText} aria-hidden="true">
          {"[  ]"}
        </span>
      ) : (
        <span className={s.ringText} aria-hidden="true">
          {opensAtFive(view.x, view.y) ? RING_FIVE : RING_SIX}
        </span>
      )}
    </button>
  );
}

/** The line under the plate: whatever socket the pointer or the keyboard is on, read out in full. */
function Detail({ view }: { view: CellView }) {
  if (!view.piece) {
    return (
      <span className={s.muted}>
        {coordinateOf(view.x, view.y)}
        {view.open
          ? " is an open socket. Hold a piece from the bench, then press it."
          : ` is closed until ${opensAtFive(view.x, view.y) ? RING_FIVE : RING_SIX}.`}
      </span>
    );
  }
  return (
    <>
      <span className={s.code}>{coordinateOf(view.x, view.y)}</span>
      <span className={s.detailName}>{view.piece.name}</span>
      <span className={s.rarity} data-rarity={view.piece.rarity}>
        {view.piece.rarity}
      </span>
      <span className={s.detailEffects}>
        {view.counted
          ? view.effects.length > 0
            ? view.effects.map(effectText).join(" · ")
            : "Nothing, from where it sits."
          : "Sealed: worth nothing until the cell is open."}
      </span>
      <span className={s.detailHint}>{view.piece.synergyHint}</span>
    </>
  );
}

/**
 * The Plugin Mosaic: the six-by-six keycap plate, its sockets, and the bench that cuts the pieces. A piece is worth
 * what the ones beside it make it worth, so the same piece in another socket is a different piece. Every control here
 * is a real button: hold a piece at the bench, press a socket, and the plate answers.
 */
export function MosaicScreen() {
  const store = useGameStore();
  const st = useGameState((state) => state);
  const now = useClockNow(500);
  const scope = useRef<HTMLFieldSetElement>(null);
  const palette = useShaderTokens(scope, ["--ui-ground", "--ui-ink", "--ui-accent"]);
  const [hand, setHand] = useState<Hand>(null);
  const [note, setNote] = useState("");
  const [looked, setLooked] = useState<number | null>(null);

  // Keyed on the four slices `limits` reads, so a tick that only moves Ink never rebuilds the plate.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the memo is keyed on what the limits read
  const plate = useMemo(() => {
    const limits = mosaic.select.limits(st);
    const worth = new Map<number, readonly Effect<StatId>[]>();
    for (const piece of mosaic.def.board.placed(st.mosaic.cells, limits)) {
      worth.set(piece.view.cell, piece.effects);
    }
    const cells: CellView[] = [];
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLUMNS; x += 1) {
        const cell = mosaic.def.board.cellOf(x, y);
        cells.push({
          cell,
          x,
          y,
          open: limits.open?.(x, y) ?? true,
          piece: PIECE_BY_ID.get(st.mosaic.cells[cell] ?? "") ?? null,
          counted: worth.has(cell),
          effects: worth.get(cell) ?? [],
        });
      }
    }
    return cells;
  }, [st.mosaic.cells, st.crafting.made, st.wallet.sealsEver, st.wallet.codicesEver]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: the memo is keyed on what the limits read
  const bench = useMemo(() => {
    const limits = mosaic.select.limits(st);
    return MOSAIC_PIECES.map(
      (piece): BenchRow => ({
        piece,
        held: limits.held?.(piece.id) ?? 0,
        laid: mosaic.def.board.used(st.mosaic.cells, piece.id),
        costs: Object.entries(piece.recipe.inputs).map(([currency, amount]) => ({
          currency: currency as Currency,
          amount: amount ?? 0,
        })),
      }),
    );
  }, [st.mosaic.cells, st.crafting.made, st.wallet.sealsEver, st.wallet.codicesEver]);

  const tally = useMemo(() => tallyOf(plate), [plate]);
  const laid = plate.filter((cell) => cell.counted).length;
  const sockets = plate.filter((cell) => cell.open).length;
  const inHand = bench.reduce((total, row) => total + row.held, 0);
  const detail = plate[looked ?? (hand?.from === "board" ? hand.cell : -1)] ?? null;
  const holding = hand?.from === "tray" ? PIECE_BY_ID.get(hand.piece) : undefined;

  /** A press on a socket: pick a piece up, put one down, or swap two cells. */
  const onCell = (view: CellView) => {
    if (!view.open) {
      setNote(`${coordinateOf(view.x, view.y)} stays shut until the plate grows.`);
      return;
    }
    if (!hand) {
      if (view.piece) setHand({ from: "board", cell: view.cell });
      return;
    }
    if (hand.from === "tray") {
      if (view.piece) {
        setNote(`${coordinateOf(view.x, view.y)} is taken. Lift what is on it first.`);
        return;
      }
      const refused = store.getState().mosaic.place(view.cell, hand.piece);
      if (refused === "none-left") {
        setNote("None of that one left in hand. Cut another at the bench.");
        return;
      }
      if (refused) {
        setNote("That socket will not take it.");
        return;
      }
      playTilePlace();
      setNote("");
      // The hand lets go once the last one is down, so the next press is a fresh choice rather than a refusal.
      const after = store.getState();
      const spare =
        (mosaic.select.limits(after).held?.(hand.piece) ?? 0) -
        mosaic.def.board.used(after.mosaic.cells, hand.piece);
      if (spare <= 0) setHand(null);
      return;
    }
    if (hand.cell === view.cell) {
      setHand(null);
      return;
    }
    if (store.getState().mosaic.move(hand.cell, view.cell)) {
      setNote("That piece will not sit there.");
    } else {
      playTilePlace();
      setNote("");
    }
    setHand(null);
  };

  const onHold = (piece: MosaicPieceDef) => {
    setHand((was) =>
      was?.from === "tray" && was.piece === piece.id ? null : { from: "tray", piece: piece.id },
    );
    setNote("");
  };

  const onLift = () => {
    if (hand?.from !== "board") return;
    store.getState().mosaic.lift(hand.cell);
    setHand(null);
    setNote("");
  };

  const onAutoArrange = () => {
    const state = store.getState();
    state.mosaic.lay(autoArrangeMosaic(state));
    setHand(null);
    setNote("Arranged greedily: every piece held, in the best socket the bench could find for it.");
    playTilePlace();
  };

  const onClear = () => {
    store.getState().mosaic.clear();
    setHand(null);
    setNote("The plate is bare. Every piece is back in hand.");
  };

  const onCraft = (id: string) => {
    if (!store.getState().crafting.craft(id)) return;
    playBuy();
    if (st.vim.seenBeats.mosaic !== true) store.getState().vim.completeBeat("mosaic");
    setNote("");
  };

  const heldCell = hand?.from === "board" ? plate[hand.cell] : undefined;
  const introBeat = !st.settings.veteranMode && st.vim.seenBeats.mosaic !== true;
  const openBench = bench.filter((row) => crafting.select.open(st, row.piece.id));
  const nextLockedPiece = bench.find((row) => !crafting.select.open(st, row.piece.id));
  const shownBench = st.settings.veteranMode
    ? bench
    : nextLockedPiece
      ? [...openBench, nextLockedPiece]
      : openBench;

  return (
    <div className={s.screen}>
      <Title>Mosaic</Title>
      {introBeat ? (
        <Panel heading="New · Plugin Mosaic">
          <p className={s.standing}>
            A mouse-friendly keycap board: spend <strong>Ink</strong> &amp; <strong>Shards</strong> on the
            Bench to cut tiles, then place them on the 4×4 plate. Adjacent tiles boost each other&apos;s
            multipliers!
          </p>
        </Panel>
      ) : (
        <p className={s.standing}>
          Keycaps cut from Ink &amp; Shards, laid on a ruled plate. Where a piece sits decides what it is
          worth, because adjacent pieces boost each other.
        </p>
      )}

      <div className={s.stage}>
        <Panel
          heading="The Plate"
          aside={
            <span>
              {laid} of {sockets} laid
            </span>
          }
        >
          <div className={s.toolbar}>
            <Button onClick={onAutoArrange} disabled={inHand === 0}>
              Auto-Arrange
            </Button>
            <Button variant="ghost" onClick={onLift} disabled={hand?.from !== "board"}>
              Lift
            </Button>
            <Button variant="ghost" onClick={onClear} disabled={laid === 0}>
              Clear
            </Button>
          </div>
          <p className={s.hint} aria-live="polite">
            {note ||
              (holding
                ? `Holding ${holding.glyph} ${holding.name}. Press an open socket.`
                : heldCell
                  ? `Holding ${coordinateOf(heldCell.x, heldCell.y)}. Press another socket to swap, or Lift.`
                  : "Hold a piece at the bench, or press a laid piece to move it.")}
          </p>

          <fieldset ref={scope} className={s.plate} aria-label="Plugin Mosaic board">
            <span className={s.corner} aria-hidden="true" />
            {HEADS.slice(0, COLUMNS).map((head) => (
              <span key={head} className={s.head} aria-hidden="true">
                {head}
              </span>
            ))}
            {Array.from({ length: ROWS }, (_, y) => (
              <Fragment key={y}>
                <span className={s.rail} aria-hidden="true">
                  {y + 1}
                </span>
                {HEADS.slice(0, COLUMNS).map((head, x) => {
                  const view = plate[y * COLUMNS + x];
                  if (!view) return null;
                  return (
                    <Socket
                      key={head}
                      view={view}
                      palette={palette}
                      holding={hand}
                      isLooked={looked === view.cell}
                      onPress={onCell}
                      onLook={setLooked}
                    />
                  );
                })}
              </Fragment>
            ))}
          </fieldset>

          <dl className={s.tally}>
            {tally.length === 0 ? (
              <div className={s.tallyRow}>
                <dt className={s.tallyLabel}>The plate</dt>
                <dd className={s.tallyValue}>Nothing laid. Every piece is in hand.</dd>
              </div>
            ) : (
              tally.map((row) => (
                <div key={row.stat} className={s.tallyRow}>
                  <dt className={s.tallyLabel}>{STAT[row.stat]}</dt>
                  <dd className={s.tallyValue}>
                    {row.mul !== 1 && <span className={s.figure}>{fmtTimes(row.mul)}</span>}
                    {row.add !== 0 && <span className={s.figure}>+{row.add.toFixed(2)}</span>}
                  </dd>
                </div>
              ))
            )}
          </dl>

          <p className={s.detail} aria-live="polite">
            {detail ? (
              <Detail view={detail} />
            ) : (
              <span className={s.muted}>Point at or focus a socket to read what sits on it.</span>
            )}
          </p>
        </Panel>

        <Panel heading="Keycap Bench" aside={<span>{inHand} in hand</span>}>
          <ul className={s.bench}>
            {shownBench.map(({ piece, held, laid: down, costs }) => {
              const unlocked = crafting.select.open(st, piece.id);
              const canCut = crafting.select.craftable(st, piece.id) > 0;
              const left =
                piece.recipe.takesMs === undefined ? null : crafting.select.nextInMs(st, piece.id, now);
              const act = piece.recipe.minAct === undefined ? null : ACT_BY_ID[piece.recipe.minAct as ActId];
              return (
                <li key={piece.id} className={s.benchRow} data-rarity={piece.rarity}>
                  <button
                    type="button"
                    className={s.hold}
                    aria-pressed={hand?.from === "tray" && hand.piece === piece.id}
                    aria-label={`Hold the ${piece.name} to lay it on the plate`}
                    onClick={() => onHold(piece)}
                  >
                    <span className={s.glyph} aria-hidden="true">
                      {piece.glyph}
                    </span>
                    <span className={s.benchText}>
                      <span className={s.name}>{piece.name}</span>
                      <span className={s.line}>{piece.synergyHint}</span>
                      <span className={s.figures}>
                        {costs.map((cost) => (
                          <span key={cost.currency} className={s.cost}>
                            {glyphOf(CURRENCY[cost.currency].glyph, 12)}
                            <span className={s.figure}>{fmt(cost.amount).text}</span>
                            <VisuallyHidden>{CURRENCY[cost.currency].plural}</VisuallyHidden>
                          </span>
                        ))}
                        <span className={s.count}>
                          {held} in hand · {down} laid
                        </span>
                      </span>
                    </span>
                  </button>
                  <span className={s.benchAction}>
                    {unlocked ? (
                      <Button className={s.cut} disabled={!canCut} onClick={() => onCraft(piece.id)}>
                        Cut
                      </Button>
                    ) : (
                      <span className={s.locked}>Act {act?.numeral ?? "?"}</span>
                    )}
                    {left !== null && <span className={s.queue}>cutting · {Math.ceil(left / 1000)}s</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
