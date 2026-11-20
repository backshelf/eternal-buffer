import { useMemo } from "react";
import { type Decimal, type Effect, fmt, fmtTimes } from "watchpot/core";
import { Tabs } from "watchpot/ui";
import { useGameState } from "../app/hooks";
import { glyphOf } from "../app/icons";
import { playActUnlock, playBuy } from "../app/sound";
import { FOCUS_BUFFER_EVENT, NAV_EVENT } from "../components/BufferEditor";
import { NODES, RUN_NODES, SEAL_NODES, type UpgradeNode } from "../content/tree";
import {
  ACTS,
  FAMILY_BY_ID,
  familiesOfAct,
  GRAMMAR_CODEX,
  type GrammarCategory,
  KEY_FAMILIES,
  type KeyFamilyDef,
  VIMRC_RULES,
} from "../content/vimActs";
import { CURRENCY, type Currency, STAT, type StatId, TAB_NAMES } from "../content/words";
import type { GameState } from "../game/game";
import { sealUpgrades, upgrades } from "../game/tree";
import { wallet } from "../game/wallet";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { Title } from "../ui/Title";
import s from "./screens.module.css";

/** One line of a node's price. */
interface PriceLine {
  currency: Currency;
  amount: Decimal;
}

/** What a rank of an effect does, in the stat's own name. */
const effectText = (e: Effect) => {
  const name = STAT[e.stat as StatId];
  return e.mul !== undefined
    ? `${name} ×${e.mul} a rank`
    : `${name} +${Math.round(Number(e.add ?? 0) * 100)}% a rank`;
};

/** A node's name by id, for a requirement the player has not met yet. */
const NODE_NAME = new Map<string, string>(NODES.map((node): [string, string] => [node.id, node.name]));

/** The `.vimrc` slots the Forge opens with (`src/game/vim.ts` keeps the same five). */
const VIMRC_SLOTS = 5;

/** Everything a node's card reads, worked out once per render from the feature's own `select`. */
interface NodeRow {
  node: UpgradeNode;
  rank: number;
  prices: readonly PriceLine[];
  /** `select.check` is null: the buy would go through. */
  buyable: boolean;
  /** The nodes this one still waits on, by name. */
  missing: readonly string[];
}

/**
 * The cards of one half of the codex. `reads` is the feature's own `select`, handed in as plain functions so the run's
 * tree and the seal shelf share one renderer without either type leaking into it.
 */
function rowsOf(
  nodes: readonly UpgradeNode[],
  reads: {
    ranks: Readonly<Record<string, number>>;
    rank(id: string): number;
    prices(node: UpgradeNode, rank: number): readonly PriceLine[] | null;
    buyable(id: string): boolean;
  },
): NodeRow[] {
  return nodes.map((node) => {
    const rank = reads.rank(node.id);
    return {
      node,
      rank,
      prices: reads.prices(node, rank) ?? [],
      buyable: reads.buyable(node.id),
      missing: node.requires
        .filter((id) => (reads.ranks[id] ?? 0) === 0)
        .map((id) => NODE_NAME.get(id) ?? id),
    };
  });
}

/** One node: its name, rank, what a rank gives, what it still wants, and the buy. */
function NodeCard({ row, onBuy }: { row: NodeRow; onBuy: () => void }) {
  const { node, rank, prices, buyable, missing } = row;
  const price = prices[0];
  const maxed = rank >= node.maxLevel;
  const state = maxed ? "maxed" : missing.length > 0 ? "locked" : buyable ? "open" : "short";
  return (
    <li className={s.card} data-state={state}>
      <div className={s.cardHead}>
        <span className={s.cardName}>{node.name}</span>
        <span className={s.tag}>
          {rank} / {node.maxLevel}
        </span>
      </div>
      <p className="small">{node.line}</p>
      <p className={`small ${s.effects}`}>{node.effects.map(effectText).join(" · ")}</p>
      <div className={s.cardFoot}>
        <span className={`small ${s.muted}`}>
          {missing.length > 0
            ? `Needs ${missing.join(", ")}`
            : maxed
              ? "Fully raised"
              : `${node.maxLevel - rank} rank${node.maxLevel - rank === 1 ? "" : "s"} left`}
        </span>
        <Button
          variant={buyable ? "primary" : "secondary"}
          disabled={!buyable}
          cost={price ? fmt(price.amount).text : undefined}
          glyph={price ? glyphOf(CURRENCY[price.currency].glyph) : undefined}
          unit={price ? CURRENCY[price.currency].plural.toLowerCase() : undefined}
          onClick={onBuy}
        >
          {maxed ? "Max" : "Raise"}
        </Button>
      </div>
    </li>
  );
}

/** The 23 Keycap Families, Act by Act: what each claims, what it costs, and whether it may be bought. */
function Keycaps({ st }: { st: GameState }) {
  const bound = KEY_FAMILIES.filter((family) => st.vim.unlockedFamilies[family.id] === true).length;
  const goPractice = () => {
    window.dispatchEvent(new CustomEvent(NAV_EVENT, { detail: { target: "make" } }));
    window.setTimeout(() => window.dispatchEvent(new Event(FOCUS_BUFFER_EVENT)), 40);
  };
  const unlock = (family: KeyFamilyDef) => {
    if (!st.vim.unlockFamily(family.id)) return;
    playActUnlock();
    if (st.vim.seenBeats.codex !== true) st.vim.completeBeat("codex");
    // In guided mode, jump straight into the family's interactive Practice Rite lesson.
    if (!st.settings.veteranMode && family.cost.amount > 0) goPractice();
  };
  const visibleActs = ACTS.filter((act) => st.settings.veteranMode || act.id <= st.vim.highestAct + 1);
  const hiddenActs = ACTS.length - visibleActs.length;
  return (
    <>
      <p className={`small ${s.muted}`}>
        {bound} of {KEY_FAMILIES.length} Vim key families unlocked. Keys are permanent forever — neither :w
        nor :wq ever takes a key back.
      </p>
      {visibleActs.map((act) => {
        const families = familiesOfAct(act.id);
        const mine = families.filter((family) => st.vim.unlockedFamilies[family.id] === true).length;
        return (
          <Panel
            key={act.id}
            heading={`Act ${act.numeral} · ${act.title}`}
            aside={`${mine}/${families.length} unlocked`}
          >
            <p className={`small ${s.muted}`}>{act.subtitle}</p>
            <ul className={s.cards}>
              {families.map((family) => {
                const isBound = st.vim.unlockedFamilies[family.id] === true;
                const rite = st.vim.completedRites[family.id] === true;
                const missing = family.requires
                  .filter((id) => st.vim.unlockedFamilies[id] !== true)
                  .map((id) => FAMILY_BY_ID[id].name);
                const ready = missing.length === 0;
                const words = CURRENCY[family.cost.currency];
                const priced = family.cost.amount > 0;
                const affordable = wallet.select.canAfford(st, family.cost.currency, family.cost.amount);
                const state = isBound ? "bound" : ready ? "open" : "locked";
                return (
                  <li key={family.id} className={s.card} data-state={state}>
                    <div className={s.cardHead}>
                      <span className={s.cardName}>{family.name}</span>
                      <span className={s.tag}>
                        {!priced
                          ? "Core"
                          : rite
                            ? `Lesson mastered ×${family.riteBonus}`
                            : isBound
                              ? "Lesson ready"
                              : `Act ${act.numeral}`}
                      </span>
                    </div>
                    <ul className={s.keys} aria-label={`Keys of ${family.name}`}>
                      {family.keys.map((key) => (
                        <li key={key} className={s.keycap}>
                          {key}
                        </li>
                      ))}
                    </ul>
                    <p className={`small ${s.muted}`}>{family.chalkSummary}</p>
                    <div className={s.cardFoot}>
                      <span className={`small ${s.muted}`}>
                        {missing.length > 0
                          ? `Unlock ${missing.join(", ")} first`
                          : isBound
                            ? "Unlocked permanently"
                            : !affordable
                              ? "Not enough yet"
                              : family.requires.length > 0
                                ? "Ready to unlock"
                                : "Starter keys"}
                      </span>
                      {isBound ? (
                        priced && !rite && st.vim.pendingRiteFamily === family.id ? (
                          <Button variant="primary" onClick={goPractice}>
                            Practice →
                          </Button>
                        ) : (
                          <span className={s.bound}>Unlocked</span>
                        )
                      ) : (
                        <Button
                          variant={ready && affordable ? "primary" : "secondary"}
                          disabled={!ready || !affordable}
                          cost={priced ? fmt(family.cost.amount).text : undefined}
                          glyph={priced ? glyphOf(words.glyph) : undefined}
                          unit={priced ? words.plural.toLowerCase() : undefined}
                          onClick={() => unlock(family)}
                        >
                          {priced ? "Unlock" : "Free"}
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        );
      })}
      {hiddenActs > 0 && (
        <p className={`small ${s.muted}`}>
          +{hiddenActs} deeper {hiddenActs === 1 ? "Act" : "Acts"} sealed ahead — unlock Act{" "}
          {ACTS[visibleActs.length - 1]?.numeral ?? "II"} keys to reveal more of the Vim curriculum.
        </p>
      )}
    </>
  );
}

/** The two halves of the codex: the run's glyph tree, and the shelf that outlives the run. */
function CodexTree({ st }: { st: GameState }) {
  const run = rowsOf(RUN_NODES, {
    ranks: upgrades.select.ranks(st),
    rank: (id) => upgrades.select.rank(st, id),
    prices: (node, rank) => upgrades.def.tree.price(node, rank),
    buyable: (id) => upgrades.select.check(st, id) === null,
  });
  const shelf = rowsOf(SEAL_NODES, {
    ranks: sealUpgrades.select.ranks(st),
    rank: (id) => sealUpgrades.select.rank(st, id),
    prices: (node, rank) => sealUpgrades.def.tree.price(node, rank),
    buyable: (id) => sealUpgrades.select.check(st, id) === null,
  });
  const buy = (half: "run" | "shelf", id: string) => {
    const ok = half === "run" ? st.upgrades.buy(id).ok : st.sealUpgrades.buy(id).ok;
    if (ok) {
      playBuy();
      if (st.vim.seenBeats.codex !== true) st.vim.completeBeat("codex");
    }
  };
  const lit = (rows: readonly NodeRow[]) => rows.filter((row) => row.rank > 0).length;
  const showShelf = st.settings.veteranMode || st.wallet.sealsEver.gte(1) || st.wallet.earned.gte(15_000);
  const visibleRun = st.settings.veteranMode
    ? run
    : run.filter((row) => row.rank > 0 || row.missing.length === 0);
  return (
    <>
      <Panel heading="Run Upgrades (Glyphs)" aside={`${lit(run)} / ${RUN_NODES.length} raised`}>
        <p className={`small ${s.muted}`}>
          Spend Glyphs on multipliers for Clarity (Glyph payout), Flow Tempo, Ink Flow, and offline Night
          Watch. More upgrades reveal as you raise each branch.
        </p>
        <ul className={s.cards}>
          {visibleRun.map((row) => (
            <NodeCard key={row.node.id} row={row} onBuy={() => buy("run", row.node.id)} />
          ))}
        </ul>
      </Panel>
      {showShelf && (
        <Panel heading="Permanent Seal Shelf" aside={`${lit(shelf)} / ${SEAL_NODES.length} raised`}>
          <p className={`small ${s.muted}`}>
            Bought with Seals and Codices. Survives :w Volume Binds permanently.
          </p>
          <ul className={s.cards}>
            {shelf.map((row) => (
              <NodeCard key={row.node.id} row={row} onBuy={() => buy("shelf", row.node.id)} />
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}

/** The Codex's own order, with a heading for each shelf of pairs. */
const CATEGORIES: readonly { id: GrammarCategory; title: string }[] = [
  { id: "operator", title: "Operators" },
  { id: "motion", title: "Operators · Motions" },
  { id: "object", title: "Text Objects" },
  { id: "visual", title: "Visual" },
  { id: "search", title: "Search" },
  { id: "macro", title: "Macro · Echo" },
  { id: "ex", title: "Ex Console" },
];

/** The 45 pairs as a discovery matrix: the ones spoken in real play lit, the rest left blank. */
function GrammarPage({ st }: { st: GameState }) {
  const found = Object.keys(st.vim.discoveredPairs).length;
  const groups = useMemo(
    () =>
      CATEGORIES.map((group) => ({
        ...group,
        pairs: GRAMMAR_CODEX.filter((pair) => pair.category === group.id),
      })),
    [],
  );
  return (
    <Panel heading="Grammar Codex" aside={`${found} / ${GRAMMAR_CODEX.length} pairs`}>
      <p className={`small ${s.muted}`}>
        Every pair you speak is logged for good, and each one multiplies Clarity by a little more. Live:
        Clarity {fmtTimes(st.vim.codexPairMult)} from the pairs alone.
      </p>
      {groups.map((group) => (
        <section key={group.id} className={s.group}>
          <h3 className={s.groupTitle}>{group.title}</h3>
          <ul className={s.matrix}>
            {group.pairs.map((pair) => {
              const met = st.vim.discoveredPairs[pair.id] === true;
              return (
                <li key={pair.id} className={s.pair} data-found={met ? "" : undefined}>
                  <span className={s.pairKeys}>{pair.keys}</span>
                  <span className={s.pairName}>{met ? pair.name : "???"}</span>
                  {met ? (
                    <span className={s.pairLine}>{pair.line}</span>
                  ) : (
                    <span className={s.blank} aria-hidden="true" />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </Panel>
  );
}

/** Act VII's `.vimrc`: the eight archive rules, toggled inside the Forge's slot budget. */
function VimrcForge({ st }: { st: GameState }) {
  const open = st.vim.actTier === 7;
  const maxSlots = st.vim.vimrcSlots ?? VIMRC_SLOTS;
  const used = VIMRC_RULES.reduce(
    (slots, rule) => slots + (st.vim.vimrcRules[rule.id] === true ? rule.slotCost : 0),
    0,
  );
  const toggle = (id: string) => {
    const was = st.vim.vimrcRules[id] === true;
    if (st.vim.toggleVimrcRule(id) !== was) playBuy();
  };
  return (
    <Panel heading=".vimrc Forge" aside={`${used} / ${maxSlots} slots`}>
      <p className={`small ${s.muted}`}>
        {open
          ? `Your own rules, written into the wall. Each one spends slots, and the Forge holds ${maxSlots} of them.`
          : "The Forge opens with Act VII, once the Ex Console is yours. Until then these rules are brass plates on a shut door."}
      </p>
      <div className={s.slots} aria-hidden="true">
        {Array.from({ length: maxSlots }, (_, slot) => (
          <span key={slot} className={s.slotPip} data-lit={slot < used ? "" : undefined} />
        ))}
      </div>
      <ul className={s.cards}>
        {VIMRC_RULES.map((rule) => {
          const on = st.vim.vimrcRules[rule.id] === true;
          const room = on || used + rule.slotCost <= maxSlots;
          return (
            <li key={rule.id} className={s.card} data-state={on ? "bound" : open && room ? "open" : "locked"}>
              <div className={s.cardHead}>
                <span className={s.cardName}>{rule.name}</span>
                <span className={s.tag}>
                  {rule.slotCost} slot{rule.slotCost === 1 ? "" : "s"}
                </span>
              </div>
              <p className={s.ruleLine}>{rule.line}</p>
              <p className={`small ${s.muted}`}>{rule.effect}</p>
              <div className={s.cardFoot}>
                <span className={`small ${s.muted}`}>
                  {on
                    ? "Written into the wall"
                    : open
                      ? room
                        ? "A slot is free"
                        : "No slots left"
                      : "Act VII"}
                </span>
                <Button
                  variant={on ? "primary" : "secondary"}
                  disabled={!open || !room}
                  onClick={() => toggle(rule.id)}
                >
                  {on ? "Installed" : "Install"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/** The Codex: Run Upgrades and Vim Keys first, revealing Grammar Codex (Act III) & .vimrc Forge (Act VI+) as earned. */
export function UpgradesScreen() {
  const st = useGameState((x) => x);
  const showGrammar =
    st.settings.veteranMode || st.vim.highestAct >= 3 || Object.keys(st.vim.discoveredPairs).length > 0;
  const showVimrc = st.settings.veteranMode || st.vim.highestAct >= 6 || st.wallet.codicesEver.gte(1);
  const introBeat = !st.settings.veteranMode && st.vim.seenBeats.codex !== true;

  return (
    <div className={s.screen}>
      <Title>{TAB_NAMES.tree}</Title>
      {introBeat && (
        <Panel heading="New · The Codex" tone="surface">
          <p className="small">
            Spend Glyphs here on <strong>Run Upgrades</strong> (boosts your Glyph payout &amp; Flow) or unlock
            new <strong>Vim Key Families</strong> — every new key opens with a short hands-on interactive
            lesson and stays unlocked forever.
          </p>
        </Panel>
      )}
      <Tabs.Root defaultValue="tree" activation="manual" controls="selected" className={s.pages}>
        <Tabs.List className={s.subTabs} aria-label="The Codex's pages">
          <Tabs.Tab value="tree" className={s.subTab}>
            Upgrades
          </Tabs.Tab>
          <Tabs.Tab value="keycaps" className={s.subTab}>
            Vim Keys
          </Tabs.Tab>
          {showGrammar && (
            <Tabs.Tab value="grammar" className={s.subTab}>
              Grammar Codex
            </Tabs.Tab>
          )}
          {showVimrc && (
            <Tabs.Tab value="vimrc" className={s.subTab}>
              .vimrc Forge
            </Tabs.Tab>
          )}
        </Tabs.List>
        <Tabs.Panel value="tree" className={s.page}>
          <CodexTree st={st} />
        </Tabs.Panel>
        <Tabs.Panel value="keycaps" className={s.page}>
          <Keycaps st={st} />
        </Tabs.Panel>
        {showGrammar && (
          <Tabs.Panel value="grammar" className={s.page}>
            <GrammarPage st={st} />
          </Tabs.Panel>
        )}
        {showVimrc && (
          <Tabs.Panel value="vimrc" className={s.page}>
            <VimrcForge st={st} />
          </Tabs.Panel>
        )}
      </Tabs.Root>
    </div>
  );
}
