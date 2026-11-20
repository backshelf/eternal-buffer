import { useMemo } from "react";
import { type Decimal, type Effect, fmt, fmtTimes } from "watchpot/core";
import { Tabs } from "watchpot/ui";
import { useGameState } from "../app/hooks";
import { glyphOf } from "../app/icons";
import { playActUnlock, playBuy } from "../app/sound";
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
  const unlock = (family: KeyFamilyDef) => {
    if (st.vim.unlockFamily(family.id)) playActUnlock();
  };
  return (
    <>
      <p className={`small ${s.muted}`}>
        {bound} of {KEY_FAMILIES.length} families bound. A family is bought once and never lost: no :w and no
        :wq takes a keycap back.
      </p>
      {ACTS.map((act) => {
        const families = familiesOfAct(act.id);
        const mine = families.filter((family) => st.vim.unlockedFamilies[family.id] === true).length;
        return (
          <Panel
            key={act.id}
            heading={`${act.numeral} · ${act.title}`}
            aside={`${mine}/${families.length} bound · ${act.window}`}
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
                            ? `Rite passed ×${family.riteBonus}`
                            : isBound
                              ? "Rite owed"
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
                          ? `Needs ${missing.join(", ")}`
                          : isBound
                            ? "Bound to the archive"
                            : !affordable
                              ? "Not enough yet"
                              : family.requires.length > 0
                                ? "Its prerequisites are met"
                                : "From the first night"}
                      </span>
                      {isBound ? (
                        <span className={s.bound}>Bound</span>
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
    if (ok) playBuy();
  };
  const lit = (rows: readonly NodeRow[]) => rows.filter((row) => row.rank > 0).length;
  return (
    <>
      <Panel heading="The Run's Tree" aside={`${lit(run)} / ${RUN_NODES.length} lit`}>
        <p className={`small ${s.muted}`}>
          Fourteen nodes bought with the run's own Glyphs. Every :w clears them, and every one of them pays
          Clarity, Flow Tempo, Ink or Seal Yield while it stands.
        </p>
        <ul className={s.cards}>
          {run.map((row) => (
            <NodeCard key={row.node.id} row={row} onBuy={() => buy("run", row.node.id)} />
          ))}
        </ul>
      </Panel>
      <Panel heading="The Seal Shelf" aside={`${lit(shelf)} / ${SEAL_NODES.length} lit`}>
        <p className={`small ${s.muted}`}>
          Ten nodes paid for with Seals and Codices. They survive :w and are cleared only by a :wq, so the
          shelf you build is the shelf you keep.
        </p>
        <ul className={s.cards}>
          {shelf.map((row) => (
            <NodeCard key={row.node.id} row={row} onBuy={() => buy("shelf", row.node.id)} />
          ))}
        </ul>
      </Panel>
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

/** The Codex: keycaps, the two trees, the Grammar Codex and the .vimrc Forge, one page at a time. */
export function UpgradesScreen() {
  const st = useGameState((x) => x);
  return (
    <div className={s.screen}>
      <Title>{TAB_NAMES.tree}</Title>
      <Tabs.Root defaultValue="keycaps" activation="manual" controls="selected" className={s.pages}>
        <Tabs.List className={s.subTabs} aria-label="The Codex's pages">
          <Tabs.Tab value="keycaps" className={s.subTab}>
            Keycaps · 7 Acts
          </Tabs.Tab>
          <Tabs.Tab value="tree" className={s.subTab}>
            Codex Tree
          </Tabs.Tab>
          <Tabs.Tab value="grammar" className={s.subTab}>
            Grammar Codex
          </Tabs.Tab>
          <Tabs.Tab value="vimrc" className={s.subTab}>
            .vimrc Forge
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="keycaps" className={s.page}>
          <Keycaps st={st} />
        </Tabs.Panel>
        <Tabs.Panel value="tree" className={s.page}>
          <CodexTree st={st} />
        </Tabs.Panel>
        <Tabs.Panel value="grammar" className={s.page}>
          <GrammarPage st={st} />
        </Tabs.Panel>
        <Tabs.Panel value="vimrc" className={s.page}>
          <VimrcForge st={st} />
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  );
}
