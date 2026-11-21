// The Midnight Archivist Workstation: a bespoke 3-zone TUI desk with NO template header bar.
//
// Desktop (>= 1060px):
//   [Left Wing: Brand, Ledger, Rooms, Help/Settings] | [CENTER: Centered Vim Buffer] | [Right Wing: Scribes & Desk]
// The wings are fixed hairline-split tracks around the center column, so the Vim buffer stays
// dead-center from 0:00 through hour 12 — whether 0, 1, or 2 wings have woken up. On an ultrawide the
// whole desk centers itself as one bounded shell, and `:zen` (settings.zenMode) folds the wings away,
// leaving the buffer with a quiet Glyphs/Flow strip and an Exit Zen button.
// Secondary archive rooms (Codex, Expeditions, Mosaic, Volumes, Trials, Marginalia) open as crisp ASCII
// overlay panes over the dimmed desk, and Esc snaps the cursor straight back into Vim.
import { useEffect, useState } from "react";
import { D, fmt } from "watchpot/core";
import { useClockNow } from "watchpot/react";
import { type BuyMode, VisuallyHidden } from "watchpot/ui";
import { BufferEditor, FOCUS_BUFFER_EVENT } from "../components/BufferEditor";
import { Chalkboard } from "../components/Chalkboard";
import { CoachBar } from "../components/CoachBar";
import { ErrataSlip } from "../components/ErrataSlip";
import { ExLine } from "../components/ExLine";
import { TildeBar } from "../components/TildeBar";
import { CHALLENGES } from "../content/challenges";
import { FLOW_PER_STACK } from "../content/economy";
import { CURRENCY_HELP } from "../content/guide";
import { ACTS } from "../content/vimActs";
import { VISITOR_BUFFS } from "../content/visitor";
import { CURRENCY, type Currency, NAME, STAT } from "../content/words";
import { activeVimRateOf, inkRateOf } from "../game/income";
import { volumeGain } from "../game/prestige";
import { stats } from "../game/stats";
import { GeneratorList } from "../screens/Generators";
import { Button } from "../ui/Button";
import { BuyAmount } from "../ui/BuyAmount";
import type { ShellTab } from "../ui/Shell";
import { Tooltip } from "../ui/Tooltip";
import { useGameState, useGameStore } from "./hooks";
import { glyphOf } from "./icons";
import { isScribesRevealed, type Tab, totalScribes } from "./tabs";
import { BoostChip } from "./Visitor";
import s from "./Workstation.module.css";

const BUY_MODES = [
  { value: 1, label: "×1" },
  { value: 10, label: "×10" },
  { value: "max", label: "Max" },
] as const satisfies readonly { value: BuyMode; label: string }[];
type Mode = (typeof BUY_MODES)[number]["value"];

const FLOW_SEGMENTS = 10;

function CurrencyTip({ currency }: { currency: Currency }) {
  const info = CURRENCY_HELP[currency];
  return (
    <span className={s.tip}>
      <span className={s.tipHead}>{info.title}</span>
      <span className={s.tipLine}>{info.summary}</span>
      <span className={s.tipMuted}>{info.detail}</span>
    </span>
  );
}

function ClarityTip({ rows }: { rows: ReturnType<typeof stats.select.parts> }) {
  return (
    <span className={s.tip}>
      <span className={s.tipHead}>{STAT.output} · Glyph multiplier</span>
      <span className={s.tipMuted}>Multiplies every Glyph rescued from mending red rot.</span>
      {rows.length === 0 && <span className={s.tipRow}>Base ×1.00</span>}
      {rows.map((row, index) => (
        <span key={`${index}:${row.label}`} className={s.tipRow} data-muted={row.muted ?? undefined}>
          <span className={s.tipLabel}>{row.label}</span>
          <span className={s.tipVal}>
            {row.op === "add"
              ? `+${fmt(row.value, { decimals: 2 }).text}`
              : `×${fmt(row.value, { decimals: 2 }).text}`}
            {row.times > 1 ? ` (${row.times}×)` : ""}
          </span>
        </span>
      ))}
    </span>
  );
}

export interface WorkstationProps {
  tabs: readonly ShellTab<Tab>[];
  activeRoom: Tab;
  onSelectRoom: (room: Tab) => void;
  onHelp: () => void;
  onSettings: () => void;
  sheetOpen: boolean;
}

export function Workstation({
  tabs,
  activeRoom,
  onSelectRoom,
  onHelp,
  onSettings,
  sheetOpen,
}: WorkstationProps) {
  const store = useGameStore();
  const st = useGameState((x) => x);
  const now = useClockNow(250);
  const [buyMode, setBuyMode] = useState<Mode>(1);
  const [mobileDrawer, setMobileDrawer] = useState<"none" | "ledger" | "scribes">("none");

  const roomTabs = tabs.filter((t) => t.id !== "make");
  const openRoom = activeRoom === "make" ? null : (tabs.find((t) => t.id === activeRoom) ?? null);

  // Esc closes an open room overlay (or mobile drawer) and puts focus straight back into the Vim buffer.
  useEffect(() => {
    if (!openRoom && mobileDrawer === "none") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || sheetOpen) return;
      event.preventDefault();
      if (openRoom) onSelectRoom("make");
      if (mobileDrawer !== "none") setMobileDrawer("none");
      window.setTimeout(() => window.dispatchEvent(new Event(FOCUS_BUFFER_EVENT)), 30);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openRoom, mobileDrawer, sheetOpen, onSelectRoom]);

  const scribesOwned = totalScribes(st);
  const scribesOpen = isScribesRevealed(st);
  const ledgerOpen =
    st.vim.totalAnomaliesCleared > 0 ||
    st.vim.totalFoliosCleared > 0 ||
    st.wallet.earned.gt(0) ||
    st.settings.veteranMode;
  const inkVisible = scribesOwned > 0 || st.wallet.ink.gt(0);
  const clarityVisible = ledgerOpen && (st.vim.totalFoliosCleared > 0 || st.stats.output.gt(1.001));
  const showFlow = st.vim.flow > 0 || st.vim.totalFoliosCleared >= 1 || st.settings.veteranMode;
  const bindRevealed = st.wallet.earned.gte(15_000) || st.wallet.sealsEver.gte(1);
  const zenMode = st.settings.zenMode;

  const activeRate = activeVimRateOf(st);
  const inkRate = inkRateOf(st);
  const flowMult = D(1).add(D(st.vim.flow * FLOW_PER_STACK).mul(st.stats.tempo));
  const flowLit = st.vim.flowCap > 0 ? Math.round((st.vim.flow / st.vim.flowCap) * FLOW_SEGMENTS) : 0;
  const flowBar =
    "█".repeat(Math.max(0, Math.min(FLOW_SEGMENTS, flowLit))) +
    "░".repeat(Math.max(0, FLOW_SEGMENTS - flowLit));

  const act = ACTS.find((entry) => entry.id === st.vim.highestAct);
  const trial = st.trials.active === null ? null : CHALLENGES.find((c) => c.id === st.trials.active);
  const writeGain = volumeGain(st);
  const bindReady = writeGain.gte(1);
  const humming = VISITOR_BUFFS.some((buff) => (st.boosts.active[buff.id]?.until ?? 0) > now);
  const clarityRows = stats.select.parts(st, "output");

  const extraCurrencies: readonly Currency[] = (["shards", "treats", "seals", "codices"] as const).filter(
    (c) => st.wallet[c].gt(0),
  );

  const showVeteranSwitch =
    !st.settings.veteranMode && st.vim.highestAct === 1 && st.vim.totalFoliosCleared < 5;

  const isBeatNew = (id: Tab): boolean => {
    if (st.settings.veteranMode) return false;
    if (id === "tree") return st.vim.seenBeats.codex !== true;
    if (id === "expeditions") return st.vim.seenBeats.expeditions !== true;
    if (id === "mosaic") return st.vim.seenBeats.mosaic !== true;
    if (id === "prestige") return st.vim.seenBeats.volumes !== true;
    return false;
  };

  const selectRoom = (id: Tab) => {
    setMobileDrawer("none");
    onSelectRoom(id);
  };

  // `:zen` off: back to the full desk, with the cursor straight back in the buffer.
  const exitZen = () => {
    store.getState().settings.change({ zenMode: false });
    window.setTimeout(() => window.dispatchEvent(new Event(FOCUS_BUFFER_EVENT)), 30);
  };

  const leftContent = (
    <div className={s.wingInner}>
      <div className={s.brand}>
        <p className={s.brandTitle}>{NAME}</p>
        <p className={s.brandSub}>DESK 7 · MIDNIGHT SHIFT</p>
      </div>

      {ledgerOpen && (
        <section className={s.section} aria-label="Archive ledger">
          <p className={s.sectionHead}>LEDGER</p>
          <div className={s.ledger}>
            <Tooltip content={<CurrencyTip currency="glyphs" />} side="right">
              <div className={s.ledgerRow} data-primary="">
                <span className={s.ledgerName}>
                  {glyphOf(CURRENCY.glyphs.glyph, 13)}
                  <span>Glyphs</span>
                </span>
                <span className={s.ledgerAmt}>{fmt(st.wallet.glyphs).text}</span>
                <span className={s.ledgerSub}>
                  {st.vim.totalFoliosCleared === 0
                    ? "from mending red rot"
                    : `+${fmt(activeRate, { decimals: 1 }).text}/s active`}
                </span>
              </div>
            </Tooltip>

            {inkVisible && (
              <Tooltip content={<CurrencyTip currency="ink" />} side="right">
                <div className={s.ledgerRow}>
                  <span className={s.ledgerName}>
                    {glyphOf(CURRENCY.ink.glyph, 13)}
                    <span>Ink</span>
                  </span>
                  <span className={s.ledgerAmt}>{fmt(st.wallet.ink).text}</span>
                  <span className={s.ledgerSub}>+{fmt(inkRate, { decimals: 1 }).text}/s from Scribes</span>
                </div>
              </Tooltip>
            )}

            {clarityVisible && (
              <Tooltip content={<ClarityTip rows={clarityRows} />} side="right">
                <button type="button" className={s.clarityRow}>
                  <span className={s.ledgerName}>Clarity</span>
                  <span className={s.clarityAmt}>×{fmt(st.stats.output, { decimals: 2 }).text}</span>
                  <span className={s.ledgerSub}>Glyph multiplier</span>
                </button>
              </Tooltip>
            )}

            {extraCurrencies.map((c) => (
              <Tooltip key={c} content={<CurrencyTip currency={c} />} side="right">
                <div className={s.ledgerRow} data-compact="">
                  <span className={s.ledgerName}>
                    {glyphOf(CURRENCY[c].glyph, 12)}
                    <span>{CURRENCY[c].plural}</span>
                  </span>
                  <span className={s.ledgerAmt}>{fmt(st.wallet[c]).text}</span>
                </div>
              </Tooltip>
            ))}
          </div>
        </section>
      )}

      {roomTabs.length > 0 && (
        <nav className={s.section} aria-label="Archive rooms">
          <p className={s.sectionHead}>ROOMS</p>
          <ul className={s.roomList}>
            {roomTabs.map((item) => {
              const current = activeRoom === item.id;
              const fresh = isBeatNew(item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={s.roomBtn}
                    data-tab={item.id}
                    data-current={current ? "" : undefined}
                    data-fresh={fresh ? "" : undefined}
                    onClick={() => selectRoom(item.id)}
                  >
                    <span className={s.roomIcon} aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className={s.roomLabel}>{item.label}</span>
                    {item.exCmd && (
                      <span className={s.roomCmd} aria-hidden="true">
                        {item.exCmd}
                      </span>
                    )}
                    {fresh ? (
                      <span className={s.newTag}>NEW</span>
                    ) : (item.count ?? 0) > 0 ? (
                      <span className={s.roomCount}>{item.count}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      <div className={s.wingFoot}>
        <div className={s.utilRow}>
          <Button variant="ghost" onClick={onHelp}>
            ? Help
          </Button>
          <Button variant="ghost" onClick={onSettings}>
            Settings
          </Button>
        </div>
        {showVeteranSwitch && (
          <button
            type="button"
            className={s.veteranLink}
            onClick={() => {
              store.getState().settings.change({ veteranMode: true, welcomed: true });
              store.getState().vim.advanceOnboarding(5);
              window.setTimeout(() => window.dispatchEvent(new Event(FOCUS_BUFFER_EVENT)), 30);
            }}
          >
            Already know Vim? Unlock all keys →
          </button>
        )}
      </div>
    </div>
  );

  const rightContent = scribesOpen ? (
    <div className={s.wingInner}>
      {humming && (
        <section className={s.section} aria-label="Active blessings">
          <p className={s.sectionHead}>BLESSINGS</p>
          <BoostChip />
        </section>
      )}

      {bindRevealed && (
        <section className={s.section} aria-label="Bind Volume">
          <p className={s.sectionHead}>BIND VOLUME (:w)</p>
          <div className={s.bindBox} data-ready={bindReady ? "" : undefined}>
            <p className={s.bindLine}>
              <span className={s.bindCmd}>:w</span>{" "}
              {bindReady
                ? `+${fmt(writeGain).text} Seals ready`
                : `${fmt(writeGain, { decimals: 2 }).text} / 1 Seal`}
            </p>
            <p className={s.bindHint}>
              {bindReady
                ? "Type :w or open Volumes to prestige for permanent Seals. Vim keys stay forever."
                : "Rescue 50K+ Glyphs this run to bind a Volume into permanent Seals."}
            </p>
          </div>
        </section>
      )}

      <ErrataSlip />

      <section className={s.section} aria-label="Margin desk scribes">
        <div className={s.scribeBar}>
          <p className={s.sectionHead}>SCRIBES</p>
          {scribesOwned > 0 && (
            <BuyAmount
              options={BUY_MODES}
              value={buyMode}
              onChange={setBuyMode}
              label="How many Scribes to buy"
            />
          )}
        </div>
        <GeneratorList mode={buyMode} />
      </section>
    </div>
  ) : null;

  const RoomScreen = openRoom?.Screen;

  return (
    <div className={s.workstation} data-zen={zenMode ? "" : undefined}>
      {/* Compact mobile-only TUI top strip (< 1060px) */}
      <div className={s.mobileBar}>
        <span className={s.mobileTitle}>{NAME}</span>
        {ledgerOpen && (
          <span className={s.mobileBalance}>
            {glyphOf(CURRENCY.glyphs.glyph, 12)} {fmt(st.wallet.glyphs).text}
          </span>
        )}
        <div className={s.mobileActions}>
          <Button variant="ghost" onClick={onHelp}>
            ?
          </Button>
          <Button variant="ghost" onClick={onSettings}>
            ⚙
          </Button>
        </div>
      </div>

      {/* The 3-zone split-pane grid: fixed hairline wings, center Vim buffer never shifts off-center */}
      <div className={s.grid}>
        <aside className={s.leftWing} aria-label="Archive ledger and rooms">
          {leftContent}
        </aside>

        <main className={s.centerStage} aria-label="The buffer" data-tab="make">
          {zenMode && (
            <div className={s.zenBar}>
              <span className={s.zenStat} data-primary="">
                {glyphOf(CURRENCY.glyphs.glyph, 12)}
                <span className={s.zenAmt}>{fmt(st.wallet.glyphs).text}</span>
                <span>Glyphs</span>
              </span>
              {showFlow && (
                <span className={s.zenStat}>
                  <span className={s.zenLabel}>FLOW</span>
                  <span className={s.zenAmt}>×{fmt(flowMult, { decimals: 2 }).text}</span>
                </span>
              )}
              <Button variant="ghost" onClick={exitZen}>
                Exit Zen (:zen)
              </Button>
            </div>
          )}
          <div className={s.terminal}>
            <header className={s.termBar}>
              <span className={s.termLeft}>
                <span className={s.termFolio}>Folio {st.vim.folioSerial}</span>
                <span className={s.termAct}>
                  ACT {act?.numeral ?? "I"} · {(act?.title ?? "Footwork").toUpperCase()}
                </span>
                {trial && (
                  <span className={s.termTrial}>
                    TRIAL · {trial.name}
                    <VisuallyHidden> under way</VisuallyHidden>
                  </span>
                )}
              </span>

              {showFlow && (
                <Tooltip
                  content="Flow stacks rise when you fix glitches cleanly, multiplying Glyphs and Scribe output. Decays slowly when idle."
                  side="bottom"
                >
                  <span className={s.termFlow} data-live={st.vim.flow > 0 ? "" : undefined}>
                    <span className={s.termFlowLabel}>FLOW</span>
                    <span className={s.termFlowMult}>×{fmt(flowMult, { decimals: 2 }).text}</span>
                    <span className={s.termFlowBar} aria-hidden="true">
                      {flowBar}
                    </span>
                    <VisuallyHidden>
                      {st.vim.flow} of {st.vim.flowCap} Flow stacks
                    </VisuallyHidden>
                  </span>
                </Tooltip>
              )}
            </header>

            <CoachBar />
            <BufferEditor className={s.bufferPlate} />
            <ExLine />
            <Chalkboard />
            <TildeBar />
          </div>
        </main>

        <aside
          className={s.rightWing}
          aria-label="Margin desk: Scribes and blessings"
          aria-hidden={!scribesOpen || undefined}
        >
          {rightContent}
        </aside>
      </div>

      {/* Compact mobile-only bottom drawer switches (< 1060px) */}
      {(ledgerOpen || scribesOpen) && (
        <div className={s.mobileFoot}>
          <button
            type="button"
            className={s.mobileTab}
            data-active={mobileDrawer === "ledger" ? "" : undefined}
            onClick={() => setMobileDrawer((d) => (d === "ledger" ? "none" : "ledger"))}
          >
            Ledger &amp; Rooms{roomTabs.length > 0 ? ` (${roomTabs.length})` : ""}
          </button>
          {scribesOpen && (
            <button
              type="button"
              className={s.mobileTab}
              data-active={mobileDrawer === "scribes" ? "" : undefined}
              onClick={() => setMobileDrawer((d) => (d === "scribes" ? "none" : "scribes"))}
            >
              Scribes{scribesOwned === 0 ? " · NEW" : ` (${scribesOwned})`}
            </button>
          )}
        </div>
      )}

      {/* Mobile drawer overlay */}
      {mobileDrawer !== "none" && (
        <div
          className={s.roomScrim}
          role="dialog"
          aria-modal="true"
          aria-label={mobileDrawer === "ledger" ? "Ledger and Rooms" : "Scribes"}
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileDrawer("none");
          }}
        >
          <div className={s.mobileDrawerPane}>
            <div className={s.roomTop}>
              <Button variant="ghost" onClick={() => setMobileDrawer("none")}>
                ← Buffer
              </Button>
              <span className={s.roomTitle}>
                {mobileDrawer === "ledger" ? "Ledger & Rooms" : "Margin Desk · Scribes"}
              </span>
            </div>
            <div className={s.roomBody}>{mobileDrawer === "ledger" ? leftContent : rightContent}</div>
          </div>
        </div>
      )}

      {/* Secondary archive room overlay pane (Codex, Expeditions, Mosaic, Volumes, Trials, Marginalia) */}
      {openRoom && RoomScreen && (
        <div
          className={s.roomScrim}
          role="dialog"
          aria-modal="true"
          aria-label={openRoom.label}
          data-tab={openRoom.id}
          onClick={(e) => {
            if (e.target === e.currentTarget) selectRoom("make");
          }}
        >
          <div className={s.roomPane}>
            <div className={s.roomTop}>
              <Button variant="ghost" onClick={() => selectRoom("make")}>
                ← Back to Buffer · Esc
              </Button>
              <span className={s.roomBalances}>
                <span className={s.roomBal}>
                  {glyphOf(CURRENCY.glyphs.glyph, 12)} {fmt(st.wallet.glyphs).text} Glyphs
                </span>
                {inkVisible && (
                  <span className={s.roomBal}>
                    {glyphOf(CURRENCY.ink.glyph, 12)} {fmt(st.wallet.ink).text} Ink
                  </span>
                )}
                {st.wallet.shards.gt(0) && (
                  <span className={s.roomBal}>
                    {glyphOf(CURRENCY.shards.glyph, 12)} {fmt(st.wallet.shards).text} Shards
                  </span>
                )}
                {st.wallet.seals.gt(0) && (
                  <span className={s.roomBal}>
                    {glyphOf(CURRENCY.seals.glyph, 12)} {fmt(st.wallet.seals).text} Seals
                  </span>
                )}
                {st.wallet.codices.gt(0) && (
                  <span className={s.roomBal}>
                    {glyphOf(CURRENCY.codices.glyph, 12)} {fmt(st.wallet.codices).text} Codices
                  </span>
                )}
              </span>
            </div>
            <div className={s.roomBody}>
              <RoomScreen />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
