// The Living Folio's raw material: manuscript templates, corruption tokens, the anomaly rule table,
// and the 21 hand-authored Practice Rites. Pure data plus one small materialiser; the generator and
// evaluator live in `src/vim/folio.ts`.
import type { AnomalyKind } from "../vim/folio";

/** The six archival genres a procedural folio is drawn from. */
export type Genre =
  | "astral-ledger"
  | "broken-incantation"
  | "mainframe-memo"
  | "shelf-manifest"
  | "nocturne-verse"
  | "margin-script";

/** One clean manuscript page. The generator corrupts it; it is never shown as-is. */
export interface FolioTemplate {
  id: string;
  genre: Genre;
  title: string;
  lines: readonly string[];
}

/**
 * Eighteen clean pages, three per genre, every one 10–14 lines. Lines run long on purpose: a long
 * line is what makes a char snipe worth three keystrokes instead of twenty-five.
 */
export const FOLIO_TEMPLATES: readonly FolioTemplate[] = [
  {
    id: "astral-ledger-1",
    genre: "astral-ledger",
    title: "Ledger of the Ninth Star",
    lines: [
      "Entry 1041: the ninth star drifted west by four degrees overnight and left a scorch on the vellum.",
      "Entry 1042: three comets signed the guest book; none of them left a forwarding address.",
      "Entry 1043: the observatory dome refused to open until someone read it a passage of Pliny.",
      'Entry 1044: we logged the nebula as "amber and unresolved", which the catalogue accepted without complaint.',
      "Entry 1045: a moth got into the light well and edited the constellation map with its wings.",
      "Entry 1046: the telescope was returned to the shelf; its lens still hums at two in the morning.",
      "Entry 1047: the archivist counted the stars twice and got two different numbers, both plausible.",
      "Entry 1048: frost on the west pane spells a word we have agreed not to translate.",
      "Entry 1049: the ledger spine cracked; we bound it again with thread from a broken quill.",
      "Entry 1050: closing entry. The sky is where we left it. The ink is not.",
    ],
  },
  {
    id: "astral-ledger-2",
    genre: "astral-ledger",
    title: "Catalogue of Falling Things",
    lines: [
      "The catalogue of falling things, volume nine, revised by the night shift.",
      "Item 1: one lantern, still lit, no owner recorded.",
      "Item 2: a page of scripture, dropped from a height we could not measure.",
      "Item 3: the same page again, which is why we count them twice.",
      "Item 4: a paper moon, creased along the meridian, held together with wax.",
      "Item 5: a cough, caught in a jar, labelled do not open indoors.",
      "Item 6: a shadow, three sizes too small for whoever cast it.",
      "Item 7: a key with no lock, or a lock with no door, depending on the reader.",
      "Item 8: nothing, which took a full page to describe accurately.",
      "Item 9: the night shift, filed under incoming rather than outgoing.",
      "Filed, stamped and shelved by the ninth hour. Do not reorder.",
    ],
  },
  {
    id: "astral-ledger-3",
    genre: "astral-ledger",
    title: "Errata for the Winter Chart",
    lines: [
      "Errata for the winter chart, as agreed by the two archivists who still speak.",
      'Aries is "three letters short" and has been for eleven years.',
      "Cassiopeia has been reclassified as a corridor for tax purposes.",
      "Draco is intact, which is the only good news on this page.",
      "Lyra disagrees with itself in the lower register and refuses to be corrected.",
      "Orion has lost the belt and filed a complaint with the shelf.",
      "Perseus is spelled four different ways and each spelling has a defender.",
      "Sagittarius is a rumour, dated, initialled and left in pencil.",
      "The winter chart will be reissued when the sky apologises.",
      "Until then, read every star as a suggestion and every line as a dare.",
    ],
  },
  {
    id: "broken-incantation-1",
    genre: "broken-incantation",
    title: "The Lesser Binding",
    lines: [
      "Speak the lesser binding only when the candle has guttered twice.",
      "Hold the sigil in the left hand and the ledger in the right, and do not mix them.",
      "Three words open the door: amber, vellum, and the one we do not write down.",
      "If the wick sputters, stop. If it merely leans, continue and pretend you did not notice.",
      "The binding holds for nine heartbeats, or until the archivist sneezes.",
      "Afterwards, wipe the circle with the cloth kept for that purpose and no other.",
      "Never speak the lesser binding indoors; the ceiling remembers what it hears.",
      "Seal the page, initial the corner, and return the candle to the north shelf.",
      'The one we do not write down is not a secret. It is "a spelling we lost".',
      "The binding is not broken. It is simply waiting for a better reader.",
    ],
  },
  {
    id: "broken-incantation-2",
    genre: "broken-incantation",
    title: "Rite of the Split Window",
    lines: [
      "Open the rite by dividing the page into two panes, left and right.",
      "Into the left pane copy the opening clause; into the right, the closing clause.",
      'Say aloud: "both must agree before the seal is set".',
      "Cross the divide with the window keys until the cursor is where it is wanted.",
      "Change one word in the left pane and watch the right pane refuse to follow.",
      "Change the same word in both, and the seal takes hold without complaint.",
      "Read the left pane aloud; the right pane should be saying it half a beat behind.",
      "If the two panes disagree on a single letter, the rite has failed quietly.",
      "Close the right pane, then the left; the order matters more than it should.",
      "Record the split in the margin, in pencil, and do not sign it.",
    ],
  },
  {
    id: "broken-incantation-3",
    genre: "broken-incantation",
    title: "Words That Undo Themselves",
    lines: [
      "An unravelling is described as a sentence that forgets its own subject.",
      "Begin at the end and read backwards until a word repeats.",
      "The repeated word is the knot; everything before it is the thread.",
      "Pull the thread gently. The sentence will object. Let it.",
      "If the sentence dissolves entirely, start again with a shorter one.",
      "If it holds, copy it into the ledger in the same hand you wrote it.",
      "Do not correct the spelling; corruption is part of the weave.",
      "The final line is always the same, and it is not to be translated.",
      "Sign with the date and a single mark, never your name.",
      "Shelve the finished unravelling beside the ones that refused to unravel.",
    ],
  },
  {
    id: "mainframe-memo-1",
    genre: "mainframe-memo",
    title: "Nightly Maintenance Memo",
    lines: [
      "MEMO: nightly maintenance, terminal seven, issued by the night archivist.",
      "Replacing the phosphor on the west tube; expect the corridor to glow until dawn.",
      "set backup = on",
      "set swapfile = off",
      "set backupdir = /var/ledger/.attic",
      "set directory = /var/tmp/.attic",
      "set undolevels = 900",
      "set relativenumber = on",
      'Do not "restart the daemon" while the ledger is being written; it will forget a century.',
      "If the terminal hangs, hold the power key for nine seconds and apologise afterwards.",
      "Report any green text to the duty officer; green text is not in the schedule.",
      "End of memo.",
    ],
  },
  {
    id: "mainframe-memo-2",
    genre: "mainframe-memo",
    title: "Incident Report 0044",
    lines: [
      "INCIDENT 0044: the buffer grew a second cursor at 03:12 and would not explain itself.",
      "The second cursor moved only when no one looked, editing punctuation we had signed off on.",
      "We isolated it by closing the terminal and opening a different terminal.",
      "INCIDENT 0045: the same cursor returned under the name of a file deleted in march.",
      "Root cause: a stale swap file named after a directory that no longer exists.",
      "Mitigation: purge the swap directory nightly and never name a file after a ghost.",
      "INCIDENT 0046: the archivist deleted the swap file and the archive went with it.",
      'Recommendation: require "two signatures" before any command beginning with rm.',
      "The signatures were collected; one of them was written by the second cursor.",
      "Case closed pending a second opinion from someone not in the building.",
    ],
  },
  {
    id: "mainframe-memo-3",
    genre: "mainframe-memo",
    title: "Reading Room Configuration",
    lines: [
      "# configuration of the reading room, as of the last audit",
      "set tabstop = 4",
      "set shiftwidth = 4",
      "set expandtab = on",
      "set number = on",
      "set nowrap = off",
      "set hlsearch = on",
      "# the audit found four settings out of place and one it could not name",
      "set ignorecase = on",
      "set smartcase = on",
      "# do not edit below this line; the archivist is superstitious",
    ],
  },
  {
    id: "shelf-manifest-1",
    genre: "shelf-manifest",
    title: "Shelf 14: Bound Volumes",
    lines: [
      "Shelf 14 holds the bound volumes that refused the rebinding of the ninth year.",
      'Volume i: "Meditations on Rot", spine cracked, pages intact, do not repair.',
      "Volume ii: The Amber Index, watermark throughout, legible if read at an angle.",
      "Volume iii: A Concordance of Doors, missing its final signature.",
      "Volume iv: Notes Toward a Better Candle, annotated by three separate hands.",
      "Volume v: The Margin Almanac, which argues with Volume ii in the margins.",
      "Volume vi: unlabelled, warm to the touch, shelved face down at the binder request.",
      "Loose items on the shelf: one brass key, one pressed moth, one unsigned letter.",
      "The letter was opened by mistake in the fifth year and has been left open since.",
      "Shelf 14 is dusted with the soft brush only; the hard brush takes the gilt off.",
    ],
  },
  {
    id: "shelf-manifest-2",
    genre: "shelf-manifest",
    title: "Shelf 3: Duplicates",
    lines: [
      "Shelf 3 is the shelf of duplicates, kept in case the originals are eaten.",
      "Copy a: The Eternal Buffer, first printing, misbound, text block reversed.",
      "Copy b: The Eternal Buffer, second printing, correct, unloved.",
      'Copy c: "The Eternal Buffer", third printing, identical to copy b except for the smell.',
      "If two copies disagree, the older copy is right and the prettier copy is wrong.",
      "Duplicates are not to be sold; they are to be lent and forgotten.",
      "The lending ledger is kept inside one of the duplicates, which one is not recorded.",
      "Audit every solstice: count the shelf, count it again, accept the average.",
      "Any volume that answers to its own title is to be labelled and left alone.",
      "The shelf is warm in winter, which no one has agreed to notice.",
    ],
  },
  {
    id: "shelf-manifest-3",
    genre: "shelf-manifest",
    title: "Acquisitions, Quarter Four",
    lines: [
      "Acquired this quarter: forty-one pamphlets, nine codices and one very large box.",
      "The box contained a lamp, a small ladder and a manuscript written entirely in arrows.",
      'The arrows have been transcribed; the transcription sits on the shelf marked "pending".',
      "Pamphlets have been sorted by temper, then by length, then by the librarian mood.",
      "Nine codices were catalogued as seven; the missing two were recovered by the cat.",
      "The ladder is back in the reading room; the lamp is still in the box.",
      "Pending items are not shelved until a second archivist signs the slip.",
      "The slip is in the box. The box is sealed. The seal is a thumbprint.",
      "Next quarter we expect a dictionary, a complaint and the return of the ladder.",
      "Cataloguing resumes at the ninth hour, after the lamps have been trimmed.",
    ],
  },
  {
    id: "nocturne-verse-1",
    genre: "nocturne-verse",
    title: "Nocturne for a Guttering Lamp",
    lines: [
      "The lantern does not mind the dark; it minds the waiting.",
      "Down the corridor the lamps go out in the order they were lit.",
      'Someone is reading the walls aloud, very quietly, in "a language of hinges".',
      "I have been told the night is patient. The night has told me nothing.",
      "A page turns somewhere it should not be turning.",
      "The moth on the ceiling has opinions about the ninth shelf.",
      "I keep the ledger open so the room believes I am still awake.",
      "At the tenth hour the ink goes pale and the mountains come indoors.",
      "Nothing here is broken; everything here is being mended.",
      "Leave the lantern lit, leave the lantern lit, leave the lantern lit.",
    ],
  },
  {
    id: "nocturne-verse-2",
    genre: "nocturne-verse",
    title: "The Habit of Returning",
    lines: [
      "Not every archive is a building; some are only the habit of returning.",
      "I return. The shelves have rearranged themselves into a sentence.",
      'The sentence says: "you left the window open" and the winter read everything.',
      "I close the window. The winter keeps reading in the margin.",
      "There is a chair here that remembers a different archivist.",
      "There is a lamp that prefers her.",
      "I do not argue with furniture; it has better records than mine.",
      "At dawn the shelves will rearrange themselves into an apology.",
      "I will shelve the apology under fiction and go home.",
      "The habit of returning is the archive, and the archive is the habit.",
    ],
  },
  {
    id: "nocturne-verse-3",
    genre: "nocturne-verse",
    title: "The Cat Has Taken the Warmest Page",
    lines: [
      "The cat has taken the warmest page and will not be moved.",
      "I have tried negotiation, treats and a very firm whisper.",
      "The cat has tried ignoring me, which is more effective.",
      "Between us we have written three lines and deleted eight.",
      "The lantern gutters; the cat is unbothered; the ledger goes on without us.",
      "At some hour the ink decides it has done enough.",
      "The cat stretches, which in cat is a complete argument.",
      "I concede the page, the warmth and the point.",
      "Tomorrow I will write standing up and the cat will find a new warm page.",
      "The cycle is stable. The archive grows. The cat is fed.",
    ],
  },
  {
    id: "margin-script-1",
    genre: "margin-script",
    title: "Three Hands in the Margin",
    lines: [
      "A hand in the margin, small and hurried: this line is a lie, ask the binder.",
      "Another hand, neater: the binder is dead; ask the shelf.",
      'A third hand, in pencil, very faint: "both of you are wrong".',
      "The main text continues without acknowledging any of them.",
      "The main text is a receipt for candles, dated the fifth year, in duplicate.",
      "In the left margin: a drawing of a moth, six legs, five wings.",
      "In the right margin: the same moth, corrected, with a note reading six.",
      "Along the bottom edge: eleven tally marks and one word repeated nine times.",
      "The gutter holds a pressed leaf and the ghost of a pressed leaf.",
      "The margin ends with a question mark and no question.",
    ],
  },
  {
    id: "margin-script-2",
    genre: "margin-script",
    title: "Written Between the Columns",
    lines: [
      "Written between the columns, in a script that leans left when it lies.",
      "The reader own note appears here, in a hand we cannot identify.",
      "It says: I have been in this folio four hours and the folio has not noticed.",
      'Below that, in different ink: "it noticed, it is being polite".',
      "The page is warm to the touch at the paragraph about the door.",
      "The paragraph about the door has been underlined twice, by two different hands.",
      "Someone has drawn an arrow from the door to the margin and written no.",
      "The arrow has been erased and redrawn at a slightly better angle.",
      "In the corner, a pawprint, small, deliberate and unsigned.",
      "The folio is closed here, but the margin continues on the flyleaf.",
    ],
  },
  {
    id: "margin-script-3",
    genre: "margin-script",
    title: "Marginalia, Gathered",
    lines: [
      "Marginalia, gathered: everything written in the margins of everything else.",
      'Item: "see page 9", written on page 9, in the same hand.',
      "Item: the ninth star is not a star, written beside a star chart.",
      "Item: a small map of the reading room, accurate except for the corridor.",
      "Item: do not translate this, written in the language it warns about.",
      "Item: a receipt for one candle, one treat and one apology.",
      "Item: one word written forty times, each one smaller than the last.",
      "Item: a correction to the correction of the previous item.",
      "Item: a pawprint, matched to the flyleaf of the folio on shelf 14.",
      "The list is not finished. The list will not be finished.",
    ],
  },
];

/** Thematic corruptions. Never appear in a clean template. */
export const ROT_TOKENS: readonly string[] = [
  "##ROT##",
  "~BLIGHT~",
  "ERR_NULL",
  "§STATIC§",
  "XX_GLITCH_XX",
  "???",
  "░FADE░",
  "⟨VOID⟩",
];

/** Single-character rots, for the one-keystroke `r` repairs. */
export const ROT_CHARS: readonly string[] = ["Ø", "ϟ", "◈", "▚", "☓"];

/** Clean words that replace a rot. Short enough to type, strange enough to be archival. */
export const CLEAN_WORDS: readonly string[] = [
  "amber",
  "vellum",
  "signal",
  "lantern",
  "cipher",
  "tilde",
  "nocturne",
  "margin",
  "colophon",
  "candle",
];

/** What one anomaly kind is called, what it pays, and which Vim family the player needs first. */
export interface AnomalySpec {
  kind: AnomalyKind;
  label: string;
  weight: number;
  minAct: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  families: readonly string[];
  insertRequired: boolean;
  hintId: string;
}

/**
 * The rule table. `families` must all be unlocked before a kind can be injected; the mega kinds
 * (a whole column, a sacred table, a global purge) pay double.
 */
export const ANOMALY_SPECS: readonly AnomalySpec[] = [
  {
    kind: "stray-rot",
    label: "ROT",
    weight: 1,
    minAct: 1,
    families: [],
    insertRequired: false,
    hintId: "stray-rot-rx",
  },
  {
    kind: "missing-rune",
    label: "RUNE",
    weight: 1,
    minAct: 1,
    families: [],
    insertRequired: true,
    hintId: "missing-rune-cw",
  },
  {
    kind: "summit-abyss",
    label: "SUMMIT",
    weight: 1.2,
    minAct: 2,
    families: ["file-jump"],
    insertRequired: false,
    hintId: "summit-abyss-gg",
  },
  {
    kind: "margin-snipe",
    label: "SNIPE",
    weight: 1.3,
    minAct: 2,
    families: ["char-snipe"],
    insertRequired: false,
    hintId: "margin-snipe-fx",
  },
  {
    kind: "rotten-word",
    label: "WORD",
    weight: 1,
    minAct: 3,
    families: ["op-delete"],
    insertRequired: true,
    hintId: "rotten-word-cw",
  },
  {
    kind: "blighted-verse",
    label: "BLIGHT",
    weight: 1,
    minAct: 3,
    families: ["op-delete"],
    insertRequired: false,
    hintId: "blighted-verse-dd",
  },
  {
    kind: "broken-refrain",
    label: "REFRAIN",
    weight: 1.5,
    minAct: 3,
    families: ["op-yank"],
    insertRequired: false,
    hintId: "broken-refrain-yyp",
  },
  {
    kind: "case-typo",
    label: "CASE",
    weight: 1,
    minAct: 3,
    families: ["line-craft"],
    insertRequired: false,
    hintId: "case-typo-rx",
  },
  {
    kind: "quoted-curse",
    label: "QUOTE",
    weight: 1,
    minAct: 4,
    families: ["text-objects"],
    insertRequired: true,
    hintId: "quoted-curse-ciq",
  },
  {
    kind: "column-rot",
    label: "COLUMN",
    weight: 1.8,
    minAct: 4,
    families: ["visual-modes"],
    insertRequired: false,
    hintId: "column-rot-ctrlv",
  },
  {
    kind: "indent-block",
    label: "INDENT",
    weight: 1,
    minAct: 4,
    families: ["bracket-indent"],
    insertRequired: false,
    hintId: "indent-block-shift",
  },
  {
    kind: "scattered-sigil",
    label: "SIGIL",
    weight: 2.5,
    minAct: 5,
    families: ["substitute"],
    insertRequired: false,
    hintId: "scattered-sigil-subs",
  },
  {
    kind: "echo-hunt",
    label: "ECHO",
    weight: 1.4,
    minAct: 5,
    families: ["search-jump"],
    insertRequired: false,
    hintId: "echo-hunt-star",
  },
  {
    kind: "ritual-table",
    label: "RITUAL",
    weight: 2.4,
    minAct: 6,
    families: ["macros"],
    insertRequired: false,
    hintId: "ritual-table-macro",
  },
  {
    kind: "register-splice",
    label: "SPLICE",
    weight: 1.9,
    minAct: 6,
    families: ["registers"],
    insertRequired: false,
    hintId: "register-splice-yank",
  },
  {
    kind: "sorted-canon",
    label: "CANON",
    weight: 2,
    minAct: 7,
    families: ["ex-power"],
    insertRequired: false,
    hintId: "sorted-canon-sort",
  },
  {
    kind: "global-purge",
    label: "PURGE",
    weight: 2.2,
    minAct: 7,
    families: ["ex-power"],
    insertRequired: false,
    hintId: "global-purge-gdelete",
  },
  {
    kind: "pawprint",
    label: "PAWPRINT",
    weight: 1,
    minAct: 1,
    families: [],
    insertRequired: false,
    hintId: "pawprint-dd",
  },
];

/** The same table keyed by kind, for a single lookup on the hot path. */
export const ANOMALY_SPEC = Object.fromEntries(ANOMALY_SPECS.map((s) => [s.kind, s])) as Readonly<
  Record<AnomalyKind, AnomalySpec>
>;

/** The line Tilde leaves behind. The whole line is deletable with `dd`, which is the joke. */
export const PAWPRINT_LINE = "~ pawprints: asdf;;jkl~ // Tilde walked here";

/**
 * One authored anomaly inside a Practice Rite.
 *
 * `clean` is an exact substring of that rite's clean line; `corrupt` is what stands there in the
 * folio the player is handed. `also` repeats the same `clean` → `corrupt` swap on further lines,
 * which is how a scattered sigil or a ritual table is authored.
 */
export interface RiteAnomaly {
  kind: AnomalyKind;
  line: number;
  clean?: string;
  corrupt?: string;
  also?: readonly number[];
  swapWith?: number;
  parKeys: number;
  optimalHint: string;
}

/** A hand-authored one-page lesson for a single keycap family. */
export interface PracticeRiteDef {
  family: string;
  actTier: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  title: string;
  banner: string;
  lines: readonly string[];
  anomalies: readonly RiteAnomaly[];
}

/**
 * One rite per unlockable family. The banner names the keys; the anomalies can only be cleared by
 * using them (or, honestly, by brute force — the evaluator matches content, not keystrokes).
 */
export const PRACTICE_RITES: readonly PracticeRiteDef[] = [
  {
    family: "word-stride",
    actTier: 2,
    title: "Rite of the Long Corridor",
    banner: "Stride a word at a time: w forward, b back, e to the end. Never letter by letter.",
    lines: [
      "the archivist walks the corridor one lantern at a time",
      "each lantern marks a word the reader has not yet mended",
      "stride to the rot with w and land on it with e",
      "the shelf beside the corridor holds a manifest of pages",
      "mend what the ledger names and the corridor stays lit",
      "walk on to the last lantern and the folio closes itself",
    ],
    anomalies: [
      {
        kind: "stray-rot",
        line: 1,
        clean: "lantern",
        corrupt: "lanϟern",
        parKeys: 5,
        optimalHint: "w fϟ rl",
      },
      {
        kind: "stray-rot",
        line: 3,
        clean: "manifest",
        corrupt: "mani▚est",
        parKeys: 5,
        optimalHint: "w f▚ fa",
      },
    ],
  },
  {
    family: "line-edge",
    actTier: 2,
    title: "Rite of Two Edges",
    banner: "0 goes to the first column, $ to the last, ^ to the first word.",
    lines: [
      "amber light at the far end of the reading room",
      "the shelf list ends here and the shelf itself does not",
      "vellum folds better along the grain than across it",
      "a cipher written backwards is still a cipher",
      "the last word of every folio is the one that closes it",
      "read the edge before you read the middle",
    ],
    anomalies: [
      { kind: "stray-rot", line: 0, clean: "amber", corrupt: "Ømber", parKeys: 5, optimalHint: "0 fØ ra" },
      { kind: "stray-rot", line: 4, clean: "closes", corrupt: "clos◈s", parKeys: 5, optimalHint: "$ F◈ ro" },
    ],
  },
  {
    family: "char-snipe",
    actTier: 2,
    title: "Rite of the Long Snipe",
    banner: "f leaps to a character, ; repeats the leap. One snipe beats twenty l.",
    lines: [
      "the ninth catalogue drawer holds a receipt for a candle that was never delivered and never refunded",
      "someone signed for it in a hand that leans left and used the archivist seal without permission",
      "the drawer also holds a pressed moth and a note reading ask the shelf, not the binder",
      "every long line in this folio hides exactly one wrong character and waits for you to find it",
      "f finds the wrong one, semicolon widens the hunt, and a single r puts the letter back",
      "walk the long lines with snipes and the corridor will feel short",
    ],
    anomalies: [
      {
        kind: "stray-rot",
        line: 0,
        clean: "delivered",
        corrupt: "delivϟred",
        parKeys: 4,
        optimalHint: "fϟ re",
      },
      {
        kind: "stray-rot",
        line: 3,
        clean: "exactly",
        corrupt: "exact▚y",
        parKeys: 5,
        optimalHint: "f▚ ; rl",
      },
    ],
  },
  {
    family: "file-jump",
    actTier: 2,
    title: "Rite of Summit and Abyss",
    banner: "gg drops you at the summit, G at the abyss. Cross a whole folio in two keys.",
    lines: [
      "the summit of the folio is a scorched line the archivist will not read aloud",
      "below it, nine shelves of ordinary manifest, sorted by nothing in particular",
      "the middle of the page is where the reader usually gives up and starts walking",
      "there is no shortcut in the middle; there is only the long way and the count",
      "the abyss of the folio is a line that has been corrected so often it is now blank",
      "gg for the summit, G for the abyss, and neither of them costs a single j",
    ],
    anomalies: [
      {
        kind: "summit-abyss",
        line: 0,
        clean: "scorched",
        corrupt: "scorØhed",
        parKeys: 6,
        optimalHint: "gg fØ rc",
      },
      { kind: "summit-abyss", line: 5, clean: "abyss", corrupt: "ab◈ss", parKeys: 6, optimalHint: "G f◈ ry" },
    ],
  },
  {
    family: "counts",
    actTier: 2,
    title: "Rite of Numbered Steps",
    banner: "A count before a motion repeats it. 4j falls four lines in one breath.",
    lines: [
      "line one is clean and wants to stay that way",
      "line two is clean as well, which is unusual here",
      "line three holds a receipt nobody asked for",
      "line four holds a rot the count will carry you to",
      "line five is clean and slightly smug about it",
      "line six holds another rot, further down the page",
      "line seven is clean, and the seventh line always is",
      "line eight closes the folio with a number and a bow",
    ],
    anomalies: [
      { kind: "stray-rot", line: 3, clean: "carry", corrupt: "caϟry", parKeys: 6, optimalHint: "3j fϟ rr" },
      {
        kind: "stray-rot",
        line: 5,
        clean: "further",
        corrupt: "fur▚her",
        parKeys: 6,
        optimalHint: "2j f▚ rt",
      },
    ],
  },
  {
    family: "op-delete",
    actTier: 3,
    title: "Rite of Severing",
    banner: "dd severs a whole line, D severs the tail. Nothing soft about it.",
    lines: [
      "the archivist keeps three registers and deletes none of them lightly",
      "this line is blighted end to end and must not survive the reading",
      "a ledger without a spine is a stack of paper with ambitions",
      "this line is blighted as well, and the shelf will not miss it",
      "delete the blight, keep the manifest, and the folio still balances",
      "nothing here needs writing; two lines need removing",
    ],
    anomalies: [
      {
        kind: "blighted-verse",
        line: 1,
        clean: "this line is blighted end to end and must not survive the reading",
        corrupt: "~BLIGHT~ this line is blighted end to end and must not survive the reading",
        parKeys: 3,
        optimalHint: "dd",
      },
      {
        kind: "blighted-verse",
        line: 3,
        clean: "this line is blighted as well, and the shelf will not miss it",
        corrupt: "~BLIGHT~ this line is blighted as well, and the shelf will not miss it",
        parKeys: 4,
        optimalHint: "2j dd",
      },
    ],
  },
  {
    family: "op-change",
    actTier: 3,
    title: "Rite of Repair",
    banner: "c changes instead of deleting: cw repairs a word, c$ repairs the tail of a line.",
    lines: [
      "the repair desk takes one word at a time and charges by the letter",
      "this lantern is broken here: amber burns without a wick",
      "a good repair leaves the rest of the line exactly where it was",
      "the tail of this line is a rumour and should be replaced: vellum",
      "change only what is wrong and the folio will forgive the rest",
      "two repairs, one folio, and the reading room stays open",
    ],
    anomalies: [
      {
        kind: "rotten-word",
        line: 1,
        clean: "amber",
        corrupt: "##ROT##",
        parKeys: 9,
        optimalHint: "cw amber Esc",
      },
      {
        kind: "rotten-word",
        line: 3,
        clean: "vellum",
        corrupt: "~BLIGHT~",
        parKeys: 12,
        optimalHint: "f~ c$ vellum Esc",
      },
    ],
  },
  {
    family: "op-yank",
    actTier: 3,
    title: "Rite of the Echoing Stanza",
    banner: "yy lifts a line, p sets it down. A refrain is a yank you did not waste.",
    lines: [
      "the stanza below is sung twice and the second singing is missing",
      "leave the lantern lit, leave the lantern lit, leave the lantern lit",
      "the moth on the ceiling has opinions about the ninth shelf",
      "every refrain in this folio is a duplicate somebody forgot to copy",
      "yank the line, put it back beneath itself, and the stanza closes",
      "two edits remain: one echo and one rotten word",
    ],
    anomalies: [
      {
        kind: "broken-refrain",
        line: 1,
        clean: "leave the lantern lit, leave the lantern lit, leave the lantern lit",
        parKeys: 4,
        optimalHint: "yy p",
      },
      {
        kind: "rotten-word",
        line: 2,
        clean: "opinions",
        corrupt: "##ROT##",
        parKeys: 12,
        optimalHint: "cw opinions Esc",
      },
    ],
  },
  {
    family: "line-craft",
    actTier: 3,
    title: "Rite of Small Brews",
    banner: "r replaces one character, ~ flips its case, J joins the line below.",
    lines: [
      "the Candle Index is misfiled under c and nobody has noticed",
      "a single letter in the wrong case is the whole of this lesson",
      "the ledger clerk writes in capitals when the lamps are low",
      "read the small brews first: one character, one case, one line",
      "join what belongs together and the folio reads like a sentence",
      "two lines, two letters, and the reading room is quiet again",
    ],
    anomalies: [
      { kind: "case-typo", line: 0, clean: "Candle", corrupt: "CAndle", parKeys: 4, optimalHint: "fA ra" },
      { kind: "case-typo", line: 2, clean: "ledger", corrupt: "Ledger", parKeys: 4, optimalHint: "w fL ~" },
    ],
  },
  {
    family: "text-objects",
    actTier: 4,
    title: "Rite of Quoted Curses",
    banner: 'ci" changes what is inside the quotes and nothing else. ci( does the same for brackets.',
    lines: [
      'the binder left a note on the bench: "do not trust the third signature"',
      "the third signature is on the shelf list, appended in a different hand",
      "the shelf list is filed under (misdemeanours and other small debts)",
      "every quotation in this folio is a curse with a clean centre",
      "change the centre, keep the case, and the quotation still holds",
      "two objects, two changes, and nothing else on the line moves",
    ],
    anomalies: [
      {
        kind: "quoted-curse",
        line: 0,
        clean: "do not trust the third signature",
        corrupt: "##ROT##",
        parKeys: 35,
        optimalHint: 'ci" do not trust the third signature Esc',
      },
      {
        kind: "quoted-curse",
        line: 2,
        clean: "misdemeanours and other small debts",
        corrupt: "⟨VOID⟩",
        parKeys: 37,
        optimalHint: "ci( misdemeanours and other small debts Esc",
      },
    ],
  },
  {
    family: "visual-modes",
    actTier: 4,
    title: "Rite of the Block",
    banner: "Ctrl-v selects a rectangle. One delete clears a whole column of rot.",
    lines: [
      "star  amber   magnitude four",
      "star  vellum  magnitude two",
      "star  cipher  magnitude nine",
      "star  lantern magnitude six",
      "the column of rot sits in the same place on every row",
      "one rectangle, one delete, and the table squares up",
    ],
    anomalies: [
      {
        kind: "column-rot",
        line: 0,
        clean: "star  ",
        corrupt: "star  §STATIC§",
        also: [1, 2, 3],
        parKeys: 8,
        optimalHint: "6l Ctrl-v 4j d",
      },
      {
        kind: "rotten-word",
        line: 5,
        clean: "squares",
        corrupt: "◈uare◈",
        parKeys: 13,
        optimalHint: "viw c squares Esc",
      },
    ],
  },
  {
    family: "bracket-indent",
    actTier: 4,
    title: "Rite of the Leaning Block",
    banner: ">> leans a line right, << leans it back. Keep the block square.",
    lines: [
      "the reading room is indented by habit and by nothing else",
      "  this line leans one level too far to the right",
      "  and this one leans with it, which is how blocks fall over",
      "  shift the leaning lines back until the block is square",
      "the archivist measures indentation with two fingers and a sigh",
      "leave the rest of the page exactly as you found it",
    ],
    anomalies: [
      {
        kind: "indent-block",
        line: 1,
        clean: "  this line leans one level too far to the right",
        corrupt: "    this line leans one level too far to the right",
        parKeys: 4,
        optimalHint: "<<",
      },
      {
        kind: "indent-block",
        line: 2,
        clean: "  and this one leans with it, which is how blocks fall over",
        corrupt: "    and this one leans with it, which is how blocks fall over",
        parKeys: 5,
        optimalHint: "j <<",
      },
    ],
  },
  {
    family: "search-jump",
    actTier: 5,
    title: "Rite of the Echoing Name",
    banner: "* finds the word under the cursor, n finds it again. Hunt every echo.",
    lines: [
      "the cipher appears twice in this folio and one of them is wrong",
      "the first cipher is honest and stands where the index says it stands",
      "the middle of the page is ordinary manifest and needs nothing",
      "the second cipher has been bitten through by something with teeth",
      "star the good word, n to the bad one, and change it back",
      "two echoes, one command, and the index agrees with the shelf",
    ],
    anomalies: [
      {
        kind: "echo-hunt",
        line: 0,
        clean: "cipher",
        corrupt: "##ROT##",
        also: [3],
        parKeys: 13,
        optimalHint: "* n cw cipher Esc",
      },
      {
        kind: "stray-rot",
        line: 5,
        clean: "agrees",
        corrupt: "agreϟs",
        parKeys: 5,
        optimalHint: "/agre fϟ re",
      },
    ],
  },
  {
    family: "para-marks",
    actTier: 5,
    title: "Rite of Paragraph Marks",
    banner: "{ and } leap whole paragraphs; m and ' leave a bookmark you can come back to.",
    lines: [
      "the first paragraph is a receipt for candles, dated and countersigned",
      "the second paragraph is a complaint about the candles",
      "the third paragraph opens with a rot and closes with an apology",
      "the fourth paragraph is the apology, filed under fiction",
      "mark a line before you leave it; the folio is longer than it looks",
      "paragraph by paragraph, the page reads itself out",
    ],
    anomalies: [
      { kind: "stray-rot", line: 2, clean: "opens", corrupt: "Øpens", parKeys: 6, optimalHint: "} fØ ro" },
      {
        kind: "stray-rot",
        line: 3,
        clean: "apology",
        corrupt: "apolo◈y",
        parKeys: 6,
        optimalHint: "} f◈ rg",
      },
    ],
  },
  {
    family: "substitute",
    actTier: 5,
    title: "Rite of the Scattered Sigil",
    banner: ":%s/old/new/g rewrites every instance in one breath. Five sigils, one command.",
    lines: [
      "the sigil amber was stamped on five separate manifests",
      "the first manifest is a shelf list for the west corridor",
      "the second manifest is a receipt with amber where a price should be",
      "the third manifest is a letter about amber in the second manifest",
      "the fourth manifest is an amber that has been amended twice",
      "the fifth manifest is the amendment, filed under amber",
      "one substitution clears all five and the corridor stays open",
      "the archivist counts to five and presses the key that ends it",
    ],
    anomalies: [
      {
        kind: "scattered-sigil",
        line: 0,
        clean: "amber",
        corrupt: "##ROT##",
        also: [2, 3, 4, 5],
        parKeys: 20,
        optimalHint: ":%s/##ROT##/amber/g",
      },
      {
        kind: "case-typo",
        line: 7,
        clean: "archivist",
        corrupt: "Archivist",
        parKeys: 4,
        optimalHint: "fA ~",
      },
    ],
  },
  {
    family: "dot-echo",
    actTier: 6,
    title: "Rite of the Repeating Table",
    banner: "Fix the first row, then . repeats the whole edit down the column.",
    lines: [
      "mend the ledger and seal it",
      "mend the ledger and stamp it",
      "mend the ledger and shelve it",
      "mend the ledger and sign it",
      "mend the ledger and date it",
      "mend the ledger and forget it",
      "six identical repairs, one command and five full stops",
      "the table is only a table if every row agrees",
    ],
    anomalies: [
      {
        kind: "ritual-table",
        line: 0,
        clean: "mend",
        corrupt: "ERR_NULL",
        also: [1, 2, 3, 4, 5],
        parKeys: 18,
        optimalHint: "cw mend Esc 5j . . . . .",
      },
      { kind: "case-typo", line: 7, clean: "agrees", corrupt: "Agrees", parKeys: 4, optimalHint: "fA ~" },
    ],
  },
  {
    family: "registers",
    actTier: 6,
    title: "Rite of Two Registers",
    banner: '"a dd cuts into register a, "b dd cuts into b, "ap puts a back. Swap two clauses.',
    lines: [
      "the ledger entry reads keep the lantern lit and the reading room warm",
      "the folio has swapped two clauses and the sentence now argues with itself",
      "burn the vellum whole and do not enter this in the index",
      "register a and register b are the only hands that can untangle it",
      "cut both clauses into named registers, then put them back in order",
      "the sentence will agree with itself once the clauses are home",
    ],
    anomalies: [
      {
        kind: "register-splice",
        line: 0,
        clean: "the ledger entry reads keep the lantern lit and the reading room warm",
        swapWith: 2,
        parKeys: 14,
        optimalHint: '"a dd "b dd "ap',
      },
      {
        kind: "case-typo",
        line: 5,
        clean: "sentence",
        corrupt: "sEntence",
        parKeys: 4,
        optimalHint: "fE ~",
      },
    ],
  },
  {
    family: "macros",
    actTier: 6,
    title: "Rite of the Recorded Hand",
    banner: "qa starts a recording, q stops it, 5@a plays it five times.",
    lines: [
      "wax the ledger and seal it",
      "wax the ledger and stamp it",
      "wax the ledger and shelve it",
      "wax the ledger and sign it",
      "wax the ledger and date it",
      "wax the ledger and forget it",
      "record the repair once and let the register do the rest",
      "the folio does not care which hand holds the pen",
    ],
    anomalies: [
      {
        kind: "ritual-table",
        line: 0,
        clean: "wax",
        corrupt: "XX_GLITCH_XX",
        also: [1, 2, 3, 4, 5],
        parKeys: 15,
        optimalHint: "qa cw wax Esc j q 5@a",
      },
      { kind: "stray-rot", line: 7, clean: "which", corrupt: "whiϟh", parKeys: 4, optimalHint: "fϟ rc" },
    ],
  },
  {
    family: "ex-power",
    actTier: 7,
    title: "Rite of Canon and Purge",
    banner: ":sort orders a block; :g/pattern/d burns every blighted line at once.",
    lines: [
      "alpha is the first canon entry and the shelf agrees",
      "beta is the second canon entry and the shelf agrees",
      "delta is the fourth canon entry and the shelf agrees",
      "gamma is the third canon entry and the shelf does not agree",
      "the canon is out of order and the shelf has filed a complaint",
      "blight is blight wherever it stands and the purge does not argue",
      "one command sorts the canon, one command clears the blight",
      "the archivist files the complaint under resolved",
    ],
    anomalies: [
      { kind: "sorted-canon", line: 0, clean: "", also: [1, 2, 3], parKeys: 7, optimalHint: ":sort" },
      {
        kind: "global-purge",
        line: 5,
        clean: "",
        corrupt: "§STATIC§",
        also: [6],
        parKeys: 14,
        optimalHint: ":g/§STATIC§/d",
      },
    ],
  },
  {
    family: "dual-split",
    actTier: 7,
    title: "Rite of the Split Window",
    banner: ":vsplit opens a second pane; Ctrl-w w crosses between them. Mend both sides.",
    lines: [
      'the left pane holds the opening clause: "the lantern is lit at both ends"',
      'the right pane holds the closing clause: "and neither end goes out"',
      "the two panes must agree on the letter and on the case",
      "cross with Ctrl-w w and change each pane in turn",
      "a split folio that agrees with itself is worth two folios",
      "close the right pane first, then the left, and sign nothing",
    ],
    anomalies: [
      {
        kind: "quoted-curse",
        line: 0,
        clean: "the lantern is lit at both ends",
        corrupt: "##ROT##",
        parKeys: 34,
        optimalHint: 'ci" the lantern is lit at both ends Esc',
      },
      {
        kind: "quoted-curse",
        line: 1,
        clean: "and neither end goes out",
        corrupt: "⟨VOID⟩",
        parKeys: 30,
        optimalHint: 'Ctrl-w w ci" and neither end goes out Esc',
      },
    ],
  },
  {
    family: "vimrc-forge",
    actTier: 7,
    title: "Rite of the Forged Config",
    banner: "Your .vimrc is the last key: bind a rule, then let it work for you.",
    lines: [
      "the config file is short and every line in it has been argued over",
      "set the ledger amber and the shelf will follow",
      "set the shelf amber and the corridor will follow",
      "the last rule is the one nobody remembers writing",
      "  a rule that leans too far right is a rule nobody reads",
      "name the rule, bind the rule, and the editor does the walking",
      "the forged config is a promise the reader makes to the page",
    ],
    anomalies: [
      {
        kind: "scattered-sigil",
        line: 1,
        clean: "amber",
        corrupt: "##ROT##",
        also: [2],
        parKeys: 20,
        optimalHint: ":%s/##ROT##/amber/g",
      },
      { kind: "case-typo", line: 5, clean: "editor", corrupt: "Editor", parKeys: 4, optimalHint: "fE ~" },
      {
        kind: "indent-block",
        line: 4,
        clean: "  a rule that leans too far right is a rule nobody reads",
        corrupt: "    a rule that leans too far right is a rule nobody reads",
        parKeys: 4,
        optimalHint: "<<",
      },
    ],
  },
];

/** One fully materialised rite: the corrupted page plus the anomaly drafts it was built from. */
export interface RiteDocument {
  lines: string[];
  anomalies: readonly RiteAnomalyDraft[];
}

/** A rite anomaly with its columns resolved against the clean line. Mirrors `FolioAnomaly` minus id. */
export interface RiteAnomalyDraft {
  kind: AnomalyKind;
  line: number;
  colStart: number;
  colEnd: number;
  targetText: string;
  expectedLine: string | null;
  parKeys: number;
  optimalHint: string;
}

/** Split a rite's authored anomalies into the corrupted page it is read from. */
export function practiceRiteDocument(rite: PracticeRiteDef): RiteDocument {
  const lines = [...rite.lines];
  const anomalies: RiteAnomalyDraft[] = [];

  for (const edit of rite.anomalies) {
    const cleanLine = rite.lines[edit.line];
    if (cleanLine === undefined) continue;

    if (edit.kind === "sorted-canon") {
      const block = [edit.line, ...(edit.also ?? [])].filter((i) => rite.lines[i] !== undefined);
      const order = [...block].reverse();
      order.forEach((from, i) => {
        lines[block[i] ?? 0] = rite.lines[from] ?? "";
      });
      anomalies.push({
        kind: edit.kind,
        line: edit.line,
        colStart: 0,
        colEnd: cleanLine.length,
        targetText: order.map((i) => rite.lines[i] ?? "").join("\n"),
        expectedLine: cleanLine,
        parKeys: edit.parKeys,
        optimalHint: edit.optimalHint,
      });
      continue;
    }

    if (edit.kind === "register-splice") {
      const other = edit.swapWith ?? edit.line + 1;
      const otherLine = rite.lines[other];
      if (otherLine === undefined) continue;
      lines[edit.line] = otherLine;
      lines[other] = cleanLine;
      anomalies.push({
        kind: edit.kind,
        line: edit.line,
        colStart: 0,
        colEnd: cleanLine.length,
        targetText: `${otherLine}\n${cleanLine}`,
        expectedLine: cleanLine,
        parKeys: edit.parKeys,
        optimalHint: edit.optimalHint,
      });
      continue;
    }

    if (edit.kind === "global-purge") {
      const marker = edit.corrupt ?? "";
      for (const i of [edit.line, ...(edit.also ?? [])]) {
        const base = rite.lines[i];
        if (base === undefined) continue;
        lines[i] = `${marker} ${base}`;
      }
      anomalies.push({
        kind: edit.kind,
        line: edit.line,
        colStart: 0,
        colEnd: cleanLine.length,
        targetText: marker,
        expectedLine: null,
        parKeys: edit.parKeys,
        optimalHint: edit.optimalHint,
      });
      continue;
    }

    const clean = edit.clean ?? "";
    const corrupt = edit.corrupt ?? clean;
    const colStart = cleanLine.indexOf(clean);
    if (colStart < 0) continue;
    lines[edit.line] = cleanLine.slice(0, colStart) + corrupt + cleanLine.slice(colStart + clean.length);
    for (const i of edit.also ?? []) {
      const base = rite.lines[i];
      if (base === undefined) continue;
      const at = base.indexOf(clean);
      if (at < 0) continue;
      lines[i] = base.slice(0, at) + corrupt + base.slice(at + clean.length);
    }
    anomalies.push({
      kind: edit.kind,
      line: edit.line,
      colStart,
      colEnd: colStart + clean.length,
      targetText: corrupt,
      expectedLine: cleanLine,
      parKeys: edit.parKeys,
      optimalHint: edit.optimalHint,
    });
  }

  return { lines, anomalies };
}

/** The rite for a family, if one exists. Used by the generator and by the tests. */
export function practiceRite(family: string): PracticeRiteDef | undefined {
  return PRACTICE_RITES.find((rite) => rite.family === family);
}
