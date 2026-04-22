// ============================================================
//  CR7 RONALDO THE GOAT — TurboWarp / Scratch 3.0 Extension
//  Version 4.0.0
//
//  HOW TO LOAD:
//    1. Open turbowarp.org
//    2. Click the puzzle-piece icon (bottom-left)
//    3. Choose "Custom Extension" → "Load from file"
//    4. Select this file
//
//  SECTIONS IN THIS EXTENSION:
//    1.  Quick Start        — one-block setup for beginners
//    2.  Physics Engine     — ball & player movement math
//    3.  AI Opponents       — smart defenders & goalkeeper
//    4.  Card Collection    — own, view, equip, trade cards
//    5.  Upgrade Lab        — level up, fuse, prestige cards
//    6.  Evolution Paths    — evolve cards along special paths
//    7.  Card Races         — race your card against AI cards
//    8.  Tournaments        — bracket-style competitions
//    9.  Daily Challenges   — refresh every day for bonus XP
//   10.  Morale & Fitness   — player energy and confidence
//   11.  Stadium & Weather  — pitch conditions that affect stats
//   12.  Transfer Market    — buy & sell cards for coins
//   13.  Score & Combos     — goals, streaks, bonus scoring
//   14.  Achievements       — 40 unlockable achievements
//   15.  Save & Load        — 3 save slots with timestamps
//   16.  HUD & Display      — card info strings for on-screen text
//   17.  Debug & Utility    — reset, inspect, test tools
// ============================================================

(function (Scratch) {
  "use strict";

  // ===========================================================
  // ░░  GLOBAL STATE — everything the extension tracks  ░░
  // ===========================================================
  const STATE = {
    // ── Ball / Player physics ──────────────────────────────
    velocityX: 0,
    velocityY: 0,
    ballSpin:  0,
    stamina:   100,
    maxStamina: 100,
    power:     0,
    combo:     0,
    comboTimer: 0,       // frames before combo resets
    score:     0,
    goalCount: 0,
    matchTime: 0,
    currentMode: "MENU",
    difficulty:  "NORMAL",

    // ── Card ownership (parallel arrays — same index = same card) ──
    ownedCards:            [],   // card ID numbers
    cardLevels:            [],   // 1–25
    cardXP:                [],   // current XP
    cardPrestige:          [],   // 0–5 prestige stars
    cardUpgradePoints:     [],   // spendable upgrade points
    cardStatBoosts:        [],   // object {pace,shooting,dribbling,defense,physical}
    chosenPath:            [],   // which evolution path (or null)
    evolutionStage:        [],   // 0 = base, 1/2/3 = evolved
    evolutionShards:       [],   // shards needed to evolve
    pathChallengeProgress: [],
    goalsWithCard:         [],
    racesWonWithCard:      [],
    cardFavorite:          [],   // boolean — starred by player
    cardNickname:          [],   // custom string nickname

    // ── Equipped & selected ────────────────────────────────
    equippedCards: [null, null, null],  // up to 3 slots
    selectedCard:  0,

    // ── Economy ────────────────────────────────────────────
    coins:          500,   // starting coins
    gems:           10,    // premium currency
    marketListings: [],    // { cardId, price, seller:"player"/"AI" }

    // ── Morale & Fitness ───────────────────────────────────
    morale:      75,    // 0–100, affects shooting accuracy
    fitness:     100,   // 0–100, affects stamina drain rate
    confidence:  50,    // 0–100, affects combo chance

    // ── Stadium & Weather ──────────────────────────────────
    stadium:     "Bernabeu",
    weather:     "Clear",
    pitchCondition: "Perfect",   // affects pace stat

    // ── Tournaments ────────────────────────────────────────
    tournamentActive:  false,
    tournamentRound:   0,
    tournamentWins:    0,
    tournamentLosses:  0,
    tournamentBracket: [],

    // ── Daily Challenges ───────────────────────────────────
    dailyChallengeType:    "Score 3 goals",
    dailyChallengeTarget:  3,
    dailyChallengeProgress: 0,
    dailyChallengeComplete: false,
    lastDailyReset:        0,    // timestamp

    // ── Leaderboard ────────────────────────────────────────
    leaderboard: [],   // top 10 race times

    // ── Achievements (40 slots, 1=unlocked 0=locked) ───────
    achievements: new Array(40).fill(0),
    achievementNames: [
      // Scoring
      "First Goal",        "Hat Trick",         "5 Goal Haul",
      "10 Goals Total",    "50 Goals Total",     "100 Goals Total",
      // Combos
      "2x Combo",          "5x Combo",           "10x Combo MAX",
      // Cards
      "First Card",        "10 Cards Owned",     "25 Cards Owned",
      "All Commons",       "First Mythic",       "All 70 Cards",
      // Evolution
      "First Evolution",   "Stage 2 Evolution",  "Stage 3 Evolution",
      "All Paths Used",    "Fully Evolved Card",
      // Racing
      "First Race Win",    "5 Race Wins",        "10 Race Wins",
      "Beat Legend AI",    "Race Leaderboard",
      // Upgrades
      "Level 5 Card",      "Level 25 Card",      "First Prestige",
      "Prestige 5",        "Card Fusion",
      // Tournaments
      "First Tournament",  "Tournament Winner",  "3 Tournaments Won",
      // Daily
      "First Daily Done",  "7 Day Streak",       "30 Day Streak",
      // Economy
      "First Purchase",    "Rich (1000 coins)",  "Market Trade",
      // Special
      "SIUUU Master",      "True GOAT",
    ],

    // ── Misc tracking ──────────────────────────────────────
    totalRaceWins:    0,
    dailyStreak:      0,
    tournamentsWon:   0,
    cardsCollected:   0,
    lastSavedSlot:    0,
  };

  // ===========================================================
  // ░░  CARD DATABASE — 70 CR7 trading cards  ░░
  //
  //  Format: [id, name, era, pace, shooting, dribbling, defense, physical, rarity, baseValue]
  //  Rarity tiers: Common < Rare < Epic < Legend < Mythic
  // ===========================================================
  const CARD_DB = [
    // id   name                  era                  pac  sho  dri  def  phy  rarity     value
    [0,  "Young CR7",          "Manchester 2003",   82,  75,  84,  40,  65,  "Common",   50],
    [1,  "UCL Winner CR7",     "Manchester 2008",   88,  86,  89,  45,  75,  "Rare",    120],
    [2,  "Ballon d'Or 08",     "Manchester 2008",   90,  88,  91,  46,  78,  "Epic",    250],
    [3,  "Real Madrid CR7",    "Madrid 2009",       91,  89,  90,  48,  79,  "Rare",    130],
    [4,  "HatTrick Hero",      "Madrid 2011",       92,  93,  91,  47,  80,  "Epic",    260],
    [5,  "Prime CR7",          "Madrid 2014",       93,  94,  92,  49,  83,  "Legend",  500],
    [6,  "UCL Madrid",         "Madrid 2016",       92,  95,  91,  50,  84,  "Legend",  520],
    [7,  "Champions 2017",     "Madrid 2017",       90,  96,  90,  51,  85,  "Legend",  540],
    [8,  "Juventus CR7",       "Juventus 2018",     87,  93,  88,  52,  86,  "Rare",    140],
    [9,  "Serie A King",       "Juventus 2020",     86,  94,  87,  53,  87,  "Epic",    270],
    [10, "Portugal NT",        "Euro 2016",         89,  88,  90,  54,  82,  "Epic",    255],
    [11, "World Cup CR7",      "WC 2022",           86,  87,  88,  55,  81,  "Rare",    135],
    [12, "Al-Nassr CR7",       "Al-Nassr 2023",     84,  91,  86,  56,  83,  "Rare",    145],
    [13, "Saudi Legend",       "Al-Nassr 2024",     83,  92,  85,  57,  84,  "Epic",    280],
    [14, "SIUUU CR7",          "Iconic 2020",       95,  99,  95,  60,  90,  "Mythic",  900],
    [15, "Free Kick God",      "Madrid 2011",       88,  97,  89,  46,  78,  "Legend",  510],
    [16, "Header Master",      "Madrid 2013",       89,  95,  88,  47,  82,  "Epic",    265],
    [17, "Bicycle Kick",       "Juventus 2018",     87,  98,  87,  48,  80,  "Mythic",  850],
    [18, "El Clasico CR7",     "Madrid 2012",       93,  96,  92,  50,  83,  "Legend",  530],
    [19, "Champion 2014",      "Madrid 2014",       92,  94,  91,  51,  84,  "Legend",  515],
    [20, "EURO King",          "Portugal 2016",     90,  89,  91,  52,  82,  "Epic",    258],
    [21, "Nations League",     "Portugal 2019",     88,  88,  90,  53,  81,  "Rare",    138],
    [22, "Debut CR7",          "Sporting 2002",     78,  70,  80,  38,  60,  "Common",   45],
    [23, "Teen Phenom",        "Manchester 2004",   80,  72,  82,  39,  62,  "Common",   48],
    [24, "FA Cup Winner",      "Manchester 2004",   81,  73,  83,  40,  64,  "Common",   52],
    [25, "PL Champion 06",     "Manchester 2006",   85,  80,  86,  42,  68,  "Rare",    115],
    [26, "PL Champion 07",     "Manchester 2007",   87,  83,  88,  44,  72,  "Rare",    125],
    [27, "Liga Winner 12",     "Madrid 2012",       91,  91,  90,  49,  81,  "Legend",  505],
    [28, "Liga Winner 17",     "Madrid 2017",       90,  93,  89,  51,  83,  "Legend",  518],
    [29, "UCL Final 09",       "Madrid 2009",       90,  87,  89,  47,  78,  "Epic",    252],
    [30, "UCL Final 16",       "Madrid 2016",       91,  94,  90,  50,  83,  "Legend",  508],
    [31, "UCL Final 17",       "Madrid 2017",       90,  95,  90,  51,  84,  "Legend",  525],
    [32, "UCL Final 18",       "Madrid 2018",       89,  94,  89,  52,  83,  "Legend",  512],
    [33, "Puskas 2009",        "Real Madrid 2009",  91,  96,  90,  48,  79,  "Epic",    275],
    [34, "Puskas 2011",        "Real Madrid 2011",  90,  97,  89,  47,  80,  "Mythic",  840],
    [35, "Ballon 2013",        "Madrid 2013",       92,  95,  91,  49,  82,  "Legend",  522],
    [36, "Ballon 2014",        "Madrid 2014",       93,  94,  92,  50,  83,  "Legend",  535],
    [37, "Ballon 2016",        "Madrid 2016",       92,  95,  91,  51,  84,  "Legend",  538],
    [38, "Ballon 2017",        "Madrid 2017",       91,  96,  90,  52,  85,  "Legend",  545],
    [39, "CR7 Icons",          "All Eras",          94,  97,  93,  55,  87,  "Mythic",  870],
    [40, "Gold Edition",       "Special 2021",      95,  98,  94,  56,  88,  "Mythic",  880],
    [41, "Platinum CR7",       "Special 2022",      96,  99,  95,  57,  89,  "Mythic",  910],
    [42, "Diamond CR7",        "Special 2023",      97,  99,  96,  58,  90,  "Mythic",  950],
    [43, "Rookie Ronaldo",     "Sporting 2001",     75,  65,  78,  35,  58,  "Common",   40],
    [44, "Academy CR7",        "Sporting 2000",     72,  60,  75,  33,  55,  "Common",   35],
    [45, "Speedy Winger",      "Manchester 2005",   86,  79,  87,  41,  67,  "Rare",    118],
    [46, "Dribble King",       "Madrid 2010",       92,  87,  93,  48,  78,  "Epic",    268],
    [47, "Power Shot",         "Madrid 2015",       88,  96,  87,  49,  82,  "Epic",    272],
    [48, "Curve Master",       "Madrid 2013",       87,  95,  88,  48,  80,  "Epic",    263],
    [49, "Long Range God",     "Juventus 2019",     85,  97,  86,  51,  84,  "Legend",  506],
    [50, "Sprint King",        "Manchester 2007",   94,  84,  89,  43,  71,  "Rare",    132],
    [51, "Physical Beast",     "Juventus 2020",     84,  90,  85,  54,  90,  "Epic",    262],
    [52, "Captain CR7",        "Portugal 2018",     87,  88,  89,  56,  83,  "Rare",    142],
    [53, "Record Breaker",     "All Time",          93,  96,  92,  55,  86,  "Mythic",  860],
    [54, "Goal Machine",       "Madrid 2011",       91,  97,  90,  48,  81,  "Legend",  516],
    [55, "Derby Hero",         "Manchester 2007",   88,  85,  88,  44,  72,  "Rare",    128],
    [56, "CL Topscorer",       "All UCL",           92,  98,  91,  50,  84,  "Mythic",  890],
    [57, "International",      "Portugal 2008",     89,  86,  90,  53,  80,  "Rare",    136],
    [58, "Hat Trick Hero",     "Madrid 2015",       90,  96,  89,  49,  82,  "Epic",    260],
    [59, "Comeback King",      "Juventus 2021",     85,  91,  86,  53,  85,  "Rare",    148],
    [60, "5th Ballon",         "Madrid 2017",       91,  96,  90,  52,  85,  "Legend",  542],
    [61, "Penalty King",       "All Eras",          85,  99,  85,  50,  82,  "Legend",  548],
    [62, "Corner Flag CR7",    "Iconic Moment",     88,  87,  89,  48,  78,  "Rare",    133],
    [63, "Tunnel Vision",      "Manchester 2006",   87,  82,  88,  42,  70,  "Common",   55],
    [64, "Night Game CR7",     "Madrid 2016",       91,  94,  90,  51,  83,  "Epic",    266],
    [65, "El Rey CR7",         "Madrid Legend",     93,  96,  92,  53,  86,  "Mythic",  895],
    [66, "Juventus Legend",    "Juventus Legend",   86,  93,  87,  54,  88,  "Epic",    278],
    [67, "Al-Nassr King",      "Saudi Pro 2024",    82,  93,  84,  57,  85,  "Epic",    282],
    [68, "Euros Golden Boot",  "Portugal 2004",     83,  78,  85,  45,  70,  "Rare",    122],
    [69, "MYTHIC SIUUU",       "ULTIMATE FORM",     99,  99,  99,  65,  95,  "Mythic", 9999],
  ];

  // ===========================================================
  // ░░  STAT COLUMN LOOKUP — card array positions  ░░
  // ===========================================================
  //   CARD_DB[id] = [id, name, era, pace, shooting, dribbling, defense, physical, rarity, value]
  //   index:         0    1     2    3      4          5           6        7         8      9
  const STAT_COL = { pace:3, shooting:4, dribbling:5, defense:6, physical:7 };

  // ===========================================================
  // ░░  EVOLUTION PATHS — 4 paths, 3 stages each  ░░
  // ===========================================================
  const EVOLUTION_PATHS = {

    "Speed Demon Path": {
      description: "Maximise pace for racing. Best for race-focused players.",
      stages:        ["Fleet Foot",       "Lightning Ronaldo",  "Hypersonic CR7"],
      shardCost:     [5,   12,  25],
      minLevel:      [5,   12,  20],
      minPrestige:   [0,    1,   2],
      challengeType: "races_won",
      challengeCount:[3,    7,  15],
      statMultiplier:[1.15, 1.35, 1.60],   // all stats multiplied
      paceBonus:     [1.25, 1.50, 2.00],   // extra pace bonus on top
      ability:       ["Sprint Burst", "Warp Dribble", "Sonic Siuuu"],
      abilityDesc:   [
        "Sprint Burst: +25% race speed for 3 seconds",
        "Warp Dribble: dribble past 1 defender automatically",
        "Sonic Siuuu: become unbeatable in next race",
      ],
      xpBonus:       200,
      coinBonus:     50,
    },

    "Goal Machine Path": {
      description: "Boost shooting for maximum goals. Best for match-focused players.",
      stages:        ["Sharp Shooter",    "Finisher CR7",       "GOD OF GOALS"],
      shardCost:     [5,   12,  25],
      minLevel:      [5,   12,  20],
      minPrestige:   [0,    1,   2],
      challengeType: "goals_with_card",
      challengeCount:[5,   12,  25],
      statMultiplier:[1.0,  1.0,  1.0],
      shootBonus:    [1.20, 1.45, 1.80],   // extra shooting multiplier
      ability:       ["Curve Shot Boost", "Auto-Goal Chance", "Perfect Hat Trick"],
      abilityDesc:   [
        "Curve Shot Boost: +20% shooting power on free kicks",
        "Auto-Goal Chance: 15% chance next shot is automatic goal",
        "Perfect Hat Trick: score 3 goals = instant 1000 bonus points",
      ],
      xpBonus:       200,
      coinBonus:     75,
    },

    "Defensive Legend Path": {
      description: "Become a tactical all-rounder. Balanced defence and attack.",
      stages:        ["Iron Ronaldo",     "Tactical CR7",       "Total Football CR7"],
      shardCost:     [5,   12,  25],
      minLevel:      [5,   12,  20],
      minPrestige:   [0,    1,   2],
      challengeType: "races_won",
      challengeCount:[2,    5,  10],
      statMultiplier:[1.10, 1.30, 1.50],
      defBonus:      [1.30, 1.60, 2.00],   // extra defense multiplier
      ability:       ["Tackle Boost", "Intercept Master", "Unbreakable Wall"],
      abilityDesc:   [
        "Tackle Boost: defenders miss 30% more often",
        "Intercept Master: auto-intercept 1 pass per match",
        "Unbreakable Wall: goalkeeper saves guaranteed for 10 seconds",
      ],
      xpBonus:       200,
      coinBonus:     60,
    },

    "Ultimate Siuuu Path": {
      description: "The hardest path. Massive rewards. Requires Prestige 1+.",
      stages:        ["SIUUU Rising",     "MEGA SIUUU",         "MYTHIC SIUUU FORM"],
      shardCost:     [10,  20,  40],
      minLevel:      [10,  18,  25],
      minPrestige:   [1,    3,   5],
      challengeType: "goals_with_card",
      challengeCount:[10,  20,  35],
      statMultiplier:[1.25, 1.55, 2.00],
      ability:       ["Crowd Eruption", "Siuuu Dash", "OMNIPOTENT CR7"],
      abilityDesc:   [
        "Crowd Eruption: next goal worth 3x points",
        "Siuuu Dash: instantly win next race",
        "OMNIPOTENT CR7: all stats become 99 for 30 seconds",
      ],
      xpBonus:       500,
      coinBonus:     200,
    },
  };

  // ===========================================================
  // ░░  DAILY CHALLENGE POOL — randomly picked each day  ░░
  // ===========================================================
  const DAILY_CHALLENGE_POOL = [
    { type: "goals",       text: "Score 3 goals today",           target: 3,  rewardXP: 150, rewardCoins: 50  },
    { type: "goals",       text: "Score 5 goals today",           target: 5,  rewardXP: 300, rewardCoins: 100 },
    { type: "races_won",   text: "Win 2 card races today",        target: 2,  rewardXP: 200, rewardCoins: 75  },
    { type: "races_won",   text: "Win 5 card races today",        target: 5,  rewardXP: 400, rewardCoins: 150 },
    { type: "combo",       text: "Reach a 5x goal combo",         target: 5,  rewardXP: 250, rewardCoins: 80  },
    { type: "pack_open",   text: "Open 3 card packs today",       target: 3,  rewardXP: 180, rewardCoins: 60  },
    { type: "evolve",      text: "Evolve any card today",         target: 1,  rewardXP: 350, rewardCoins: 120 },
    { type: "prestige",    text: "Prestige any card today",       target: 1,  rewardXP: 500, rewardCoins: 200 },
    { type: "tournament",  text: "Win a tournament match today",  target: 1,  rewardXP: 280, rewardCoins: 90  },
  ];

  // ===========================================================
  // ░░  STADIUM DATABASE  ░░
  // ===========================================================
  const STADIUMS = {
    "Bernabeu":        { paceMod: 1.0,  shootMod: 1.05, crowdBoost: 1.2  },
    "Old Trafford":    { paceMod: 1.0,  shootMod: 1.0,  crowdBoost: 1.15 },
    "Allianz Arena":   { paceMod: 0.95, shootMod: 1.0,  crowdBoost: 1.1  },
    "Camp Nou":        { paceMod: 1.0,  shootMod: 0.95, crowdBoost: 1.05 },
    "Juventus Arena":  { paceMod: 0.98, shootMod: 1.02, crowdBoost: 1.1  },
    "Al-Nassr Arena":  { paceMod: 1.05, shootMod: 1.0,  crowdBoost: 1.0  },
  };

  // ===========================================================
  // ░░  WEATHER DATABASE  ░░
  // ===========================================================
  const WEATHER_DB = {
    "Clear":  { paceMod: 1.0,  shootMod: 1.0,  spinMod: 1.0  },
    "Rain":   { paceMod: 0.85, shootMod: 0.90, spinMod: 1.3  },
    "Wind":   { paceMod: 0.95, shootMod: 0.85, spinMod: 1.5  },
    "Snow":   { paceMod: 0.75, shootMod: 0.80, spinMod: 0.8  },
    "Night":  { paceMod: 0.98, shootMod: 1.0,  spinMod: 1.0  },
    "Storm":  { paceMod: 0.70, shootMod: 0.75, spinMod: 1.8  },
  };

  // ===========================================================
  // ░░  HELPER: Unicode-safe btoa for SVG icons  ░░
  // ===========================================================
  function safeBtoa(str) {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      )
    );
  }

  // ===========================================================
  // ░░  HELPER: Get card array index from card ID  ░░
  //     Returns -1 if the player doesn't own the card.
  // ===========================================================
  function cardIdx(id) {
    return STATE.ownedCards.indexOf(Number(id));
  }

  // ===========================================================
  // ░░  HELPER: Remove a card (and all its data) by index  ░░
  // ===========================================================
  function spliceCard(idx) {
    const LISTS = [
      "ownedCards","cardLevels","cardXP","cardPrestige","cardUpgradePoints",
      "cardStatBoosts","chosenPath","evolutionStage","evolutionShards",
      "pathChallengeProgress","goalsWithCard","racesWonWithCard",
      "cardFavorite","cardNickname"
    ];
    LISTS.forEach(k => STATE[k].splice(idx, 1));
  }

  // ===========================================================
  // ░░  HELPER: Add a card to the player's collection  ░░
  // ===========================================================
  function giveCard(id) {
    id = Number(id);
    if (STATE.ownedCards.includes(id)) return;  // already owned
    STATE.ownedCards.push(id);
    STATE.cardLevels.push(1);
    STATE.cardXP.push(0);
    STATE.cardPrestige.push(0);
    STATE.cardUpgradePoints.push(0);
    STATE.cardStatBoosts.push({ pace:0, shooting:0, dribbling:0, defense:0, physical:0 });
    STATE.chosenPath.push(null);
    STATE.evolutionStage.push(0);
    STATE.evolutionShards.push(0);
    STATE.pathChallengeProgress.push(0);
    STATE.goalsWithCard.push(0);
    STATE.racesWonWithCard.push(0);
    STATE.cardFavorite.push(false);
    STATE.cardNickname.push("");
    STATE.cardsCollected = STATE.ownedCards.length;
  }

  // ===========================================================
  // ░░  HELPER: Get the evolution stat multiplier for a card  ░░
  // ===========================================================
  function evoMult(id) {
    const i = cardIdx(id);
    if (i === -1) return 1.0;
    const path  = STATE.chosenPath[i];
    const stage = STATE.evolutionStage[i] ?? 0;
    if (stage === 0 || !path) return 1.0;
    return EVOLUTION_PATHS[path]?.statMultiplier[stage - 1] ?? 1.0;
  }

  // ===========================================================
  // ░░  HELPER: Get a final computed stat for a card  ░░
  //     Applies: base stat + upgrades + evolution + weather + stadium
  // ===========================================================
  function computeStat(id, stat) {
    const card = CARD_DB[Number(id)];
    if (!card) return 0;
    const i      = cardIdx(id);
    const base   = card[STAT_COL[stat]] ?? 0;
    const boost  = i !== -1 ? (STATE.cardStatBoosts[i]?.[stat] ?? 0) : 0;
    const lvl    = i !== -1 ? (STATE.cardLevels[i] ?? 1) : 1;
    const prest  = i !== -1 ? (STATE.cardPrestige[i] ?? 0) : 0;
    const mult   = evoMult(id);
    const stadM  = STADIUMS[STATE.stadium]?.[stat === "pace" ? "paceMod" : stat === "shooting" ? "shootMod" : 1] ?? 1;
    const weatherM = WEATHER_DB[STATE.weather]?.[stat === "pace" ? "paceMod" : stat === "shooting" ? "shootMod" : 1] ?? 1;
    const raw    = (base + boost) * mult * (1 + lvl * 0.04 + prest * 0.08);
    return Math.round(Math.min(99, raw * (typeof stadM === "number" ? stadM : 1) * (typeof weatherM === "number" ? weatherM : 1)));
  }

  // ===========================================================
  // ░░  HELPER: Award an achievement by index (1-based)  ░░
  // ===========================================================
  function unlockAch(n) {
    if (n >= 1 && n <= 40) STATE.achievements[n - 1] = 1;
  }

  // ===========================================================
  // ░░  HELPER: Check various auto-achievements  ░░
  // ===========================================================
  function checkAutoAchievements() {
    if (STATE.goalCount >= 1)   unlockAch(1);
    if (STATE.goalCount >= 3)   unlockAch(2);
    if (STATE.goalCount >= 5)   unlockAch(3);
    if (STATE.goalCount >= 10)  unlockAch(4);
    if (STATE.goalCount >= 50)  unlockAch(5);
    if (STATE.goalCount >= 100) unlockAch(6);
    if (STATE.combo >= 2)       unlockAch(7);
    if (STATE.combo >= 5)       unlockAch(8);
    if (STATE.combo >= 10)      unlockAch(9);
    if (STATE.ownedCards.length >= 1)  unlockAch(10);
    if (STATE.ownedCards.length >= 10) unlockAch(11);
    if (STATE.ownedCards.length >= 25) unlockAch(12);
    if (STATE.ownedCards.length >= 70) unlockAch(15);
    if (STATE.tournamentsWon >= 1)  unlockAch(32);
    if (STATE.tournamentsWon >= 3)  unlockAch(33);
    if (STATE.totalRaceWins >= 1)   unlockAch(21);
    if (STATE.totalRaceWins >= 5)   unlockAch(22);
    if (STATE.totalRaceWins >= 10)  unlockAch(23);
    if (STATE.coins >= 1000)        unlockAch(38);
    if (STATE.dailyStreak >= 7)     unlockAch(35);
    if (STATE.dailyStreak >= 30)    unlockAch(36);
    // "True GOAT" — own all mythic cards, 100 goals, prestige 5 at least 1 card
    const hasMythic  = STATE.ownedCards.some(id => CARD_DB[id]?.[8] === "Mythic");
    const hasP5      = STATE.cardPrestige.some(p => p >= 5);
    if (hasMythic && hasP5 && STATE.goalCount >= 100) unlockAch(40);
  }

  // ===========================================================
  // ░░  THE EXTENSION CLASS  ░░
  // ===========================================================
  class CR7RonaldoGOATExtension {

    getInfo() {
      return {
        id:    "cr7ronaldogoat",
        name:  "Ronaldo The GOAT",
        color1: "#d4a017",   // gold
        color2: "#8B0000",   // dark red
        color3: "#1a1a1a",   // near-black
        menuIconURI:  this._menuIcon(),
        blockIconURI: this._blockIcon(),

        blocks: [

          // ╔══════════════════════════════════════════════════╗
          // ║  SECTION 1 — QUICK START                        ║
          // ║  Run these once at the start of your project.   ║
          // ╚══════════════════════════════════════════════════╝
          { blockType: Scratch.BlockType.LABEL, text: "── QUICK START ──" },

          {
            opcode: "quickStartEverything",
            blockType: Scratch.BlockType.COMMAND,
            text: "QUICK START — set up entire CR7 game",
            // Sets up physics, gives starter cards, picks daily challenge.
            // Just run this one block when your project starts!
          },
          {
            opcode: "quickStartBeginner",
            blockType: Scratch.BlockType.COMMAND,
            text: "BEGINNER START — easy mode, all common cards given",
          },
          {
            opcode: "isGameReady",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "game is set up and ready to play?",
          },
          {
            opcode: "getStartTip",
            blockType: Scratch.BlockType.REPORTER,
            text: "tip for new players (tip number [N])",
            arguments: { N: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } },
          },

          // ╔══════════════════════════════════════════════════╗
          // ║  SECTION 2 — PHYSICS ENGINE                     ║
          // ║  Controls how the ball and Ronaldo move.        ║
          // ╚══════════════════════════════════════════════════╝
          { blockType: Scratch.BlockType.LABEL, text: "── PHYSICS ENGINE ──" },

          {
            opcode: "initPhysics",
            blockType: Scratch.BlockType.COMMAND,
            text: "reset ball physics (velocity, spin, stamina)",
          },
          {
            opcode: "moveRonaldo",
            blockType: Scratch.BlockType.COMMAND,
            text: "move Ronaldo — speed X [VX] Y [VY] with friction [FRIC]",
            arguments: {
              VX:   { type: Scratch.ArgumentType.NUMBER, defaultValue: 3    },
              VY:   { type: Scratch.ArgumentType.NUMBER, defaultValue: 0    },
              FRIC: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0.85 },
            },
          },
          {
            opcode: "applyGravity",
            blockType: Scratch.BlockType.COMMAND,
            text: "apply gravity [G] and ball spin [SPIN] this frame",
            arguments: {
              G:    { type: Scratch.ArgumentType.NUMBER, defaultValue: -0.7 },
              SPIN: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0    },
            },
          },
          {
            opcode: "computeCurveShot",
            blockType: Scratch.BlockType.REPORTER,
            text: "curve shot speed — power [PWR]  angle [ANG]  spin [SPIN]",
            arguments: {
              PWR:  { type: Scratch.ArgumentType.NUMBER, defaultValue: 80 },
              ANG:  { type: Scratch.ArgumentType.NUMBER, defaultValue: 45 },
              SPIN: { type: Scratch.ArgumentType.NUMBER, defaultValue: 15 },
            },
          },
          {
            opcode: "computeFreekickTrajectory",
            blockType: Scratch.BlockType.REPORTER,
            text: "free kick Y position after [FRAMES] frames — power [PWR] angle [ANG]",
            arguments: {
              FRAMES: { type: Scratch.ArgumentType.NUMBER, defaultValue: 20 },
              PWR:    { type: Scratch.ArgumentType.NUMBER, defaultValue: 80 },
              ANG:    { type: Scratch.ArgumentType.NUMBER, defaultValue: 25 },
            },
          },
          {
            opcode: "isGoal",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "ball X [X] Y [Y] is inside the goal?",
            arguments: {
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 220 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0   },
            },
          },
          {
            opcode: "isPenaltyGoal",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "penalty kick at X [X] Y [Y] is a goal? (keeper dives [DIR])",
            arguments: {
              X:   { type: Scratch.ArgumentType.NUMBER, defaultValue: 0  },
              Y:   { type: Scratch.ArgumentType.NUMBER, defaultValue: 0  },
              DIR: { type: Scratch.ArgumentType.STRING, menu: "diveMenu", defaultValue: "Left" },
            },
          },
          {
            opcode: "drainStamina",
            blockType: Scratch.BlockType.COMMAND,
            text: "drain stamina by [AMT] — is sprinting? [SPRINT]",
            arguments: {
              AMT:    { type: Scratch.ArgumentType.NUMBER,  defaultValue: 1 },
              SPRINT: { type: Scratch.ArgumentType.BOOLEAN                  },
            },
          },
          {
            opcode: "recoverStamina",
            blockType: Scratch.BlockType.COMMAND,
            text: "recover stamina by [AMT] (max 100)",
            arguments: { AMT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 2 } },
          },
          { opcode: "getStaminaPercent", blockType: Scratch.BlockType.REPORTER, text: "Ronaldo stamina %" },
          { opcode: "getVelocityX",      blockType: Scratch.BlockType.REPORTER, text: "ball velocity X"   },
          { opcode: "getVelocityY",      blockType: Scratch.BlockType.REPORTER, text: "ball velocity Y"   },
          { opcode: "getBallSpin",       blockType: Scratch.BlockType.REPORTER, text: "ball spin amount"  },
          {
            opcode: "getWeatherSpeedPenalty",
            blockType: Scratch.BlockType.REPORTER,
            text: "weather speed penalty % in [WEATHER]",
            arguments: { WEATHER: { type: Scratch.ArgumentType.STRING, menu: "weatherMenu", defaultValue: "Clear" } },
          },

          // ╔══════════════════════════════════════════════════╗
          // ║  SECTION 3 — AI OPPONENTS                       ║
          // ║  Smart defenders and goalkeeper logic.          ║
          // ╚══════════════════════════════════════════════════╝
          { blockType: Scratch.BlockType.LABEL, text: "── AI OPPONENTS ──" },

          {
            opcode: "moveDefender",
            blockType: Scratch.BlockType.COMMAND,
            text: "move defender [ID] toward ball at X [BX] Y [BY] at speed [SPD]",
            arguments: {
              ID:  { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              BX:  { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              BY:  { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              SPD: { type: Scratch.ArgumentType.NUMBER, defaultValue: 3 },
            },
          },
          {
            opcode: "defenderTackle",
            blockType: Scratch.BlockType.COMMAND,
            text: "defender [ID] attempt tackle on Ronaldo (difficulty [DIFF])",
            arguments: {
              ID:   { type: Scratch.ArgumentType.NUMBER, defaultValue: 1      },
              DIFF: { type: Scratch.ArgumentType.STRING, menu: "diffMenu", defaultValue: "NORMAL" },
            },
          },
          {
            opcode: "defenderCanReach",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "defender [ID] is within [R] pixels of the ball?",
            arguments: {
              ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1  },
              R:  { type: Scratch.ArgumentType.NUMBER, defaultValue: 30 },
            },
          },
          {
            opcode: "goalkeeperDecide",
            blockType: Scratch.BlockType.COMMAND,
            text: "goalkeeper decides to save — ball X [BX]  shot power [PWR]",
            arguments: {
              BX:  { type: Scratch.ArgumentType.NUMBER, defaultValue: 0  },
              PWR: { type: Scratch.ArgumentType.NUMBER, defaultValue: 50 },
            },
          },
          {
            opcode: "didGoalkeeperSave",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "goalkeeper saved the last shot?",
          },
          {
            opcode: "getGoalkeeperDiveDirection",
            blockType: Scratch.BlockType.REPORTER,
            text: "direction goalkeeper dived (Left or Right)",
          },
          {
            opcode: "getDefenderX",
            blockType: Scratch.BlockType.REPORTER,
            text: "defender [ID] X position",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } },
          },
          {
            opcode: "getDefenderY",
            blockType: Scratch.BlockType.REPORTER,
            text: "defender [ID] Y position",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } },
          },
          {
            opcode: "resetAllDefenders",
            blockType: Scratch.BlockType.COMMAND,
            text: "reset all defenders to starting positions",
          },
          {
            opcode: "getAIDifficultyMultiplier",
            blockType: Scratch.BlockType.REPORTER,
            text: "AI difficulty speed multiplier",
          },

          // ╔══════════════════════════════════════════════════╗
          // ║  SECTION 4 — CARD COLLECTION                    ║
          // ║  Own, view, equip, trade, and open packs.       ║
          // ╚══════════════════════════════════════════════════╝
          { blockType: Scratch.BlockType.LABEL, text: "── CARD COLLECTION ──" },

          {
            opcode: "initCardSystem",
            blockType: Scratch.BlockType.COMMAND,
            text: "set up card system — give starter cards",
          },
          {
            opcode: "giveCardToPlayer",
            blockType: Scratch.BlockType.COMMAND,
            text: "give the player card number [ID]",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "openCardPack",
            blockType: Scratch.BlockType.REPORTER,
            text: "open a [TYPE] card pack — returns card ID",
            arguments: { TYPE: { type: Scratch.ArgumentType.STRING, menu: "packMenu", defaultValue: "Standard" } },
          },
          {
            opcode: "isCardOwned",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "player owns card [ID]?",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "equipCard",
            blockType: Scratch.BlockType.COMMAND,
            text: "equip card [ID] to slot [SLOT] (slots: 1 2 3)",
            arguments: {
              ID:   { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              SLOT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },
          {
            opcode: "unequipSlot",
            blockType: Scratch.BlockType.COMMAND,
            text: "unequip card from slot [SLOT]",
            arguments: { SLOT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } },
          },
          {
            opcode: "getEquippedCard",
            blockType: Scratch.BlockType.REPORTER,
            text: "which card ID is in slot [SLOT]?",
            arguments: { SLOT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } },
          },
          {
            opcode: "tradeWithAI",
            blockType: Scratch.BlockType.COMMAND,
            text: "trade MY card [MY_ID] to AI for their card [AI_ID]",
            arguments: {
              MY_ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              AI_ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },
          {
            opcode: "setCardFavorite",
            blockType: Scratch.BlockType.COMMAND,
            text: "set card [ID] as favorite [ON]",
            arguments: {
              ID: { type: Scratch.ArgumentType.NUMBER,  defaultValue: 0    },
              ON: { type: Scratch.ArgumentType.BOOLEAN                     },
            },
          },
          {
            opcode: "setCardNickname",
            blockType: Scratch.BlockType.COMMAND,
            text: "give card [ID] the nickname [NAME]",
            arguments: {
              ID:   { type: Scratch.ArgumentType.NUMBER, defaultValue: 0     },
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "Ace" },
            },
          },
          {
            opcode: "getCardNickname",
            blockType: Scratch.BlockType.REPORTER,
            text: "nickname of card [ID]",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "getCardName",
            blockType: Scratch.BlockType.REPORTER,
            text: "official name of card [ID]",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "getCardEra",
            blockType: Scratch.BlockType.REPORTER,
            text: "era / club of card [ID]",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "getCardRarity",
            blockType: Scratch.BlockType.REPORTER,
            text: "rarity of card [ID]",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "getCardBaseValue",
            blockType: Scratch.BlockType.REPORTER,
            text: "base coin value of card [ID]",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "getCardStat",
            blockType: Scratch.BlockType.REPORTER,
            text: "card [ID] — [STAT] stat (with upgrades + evolution)",
            arguments: {
              ID:   { type: Scratch.ArgumentType.NUMBER, defaultValue: 0     },
              STAT: { type: Scratch.ArgumentType.STRING, menu: "statMenu", defaultValue: "pace" },
            },
          },
          {
            opcode: "getCardRawStat",
            blockType: Scratch.BlockType.REPORTER,
            text: "card [ID] — [STAT] base stat (no bonuses)",
            arguments: {
              ID:   { type: Scratch.ArgumentType.NUMBER, defaultValue: 0    },
              STAT: { type: Scratch.ArgumentType.STRING, menu: "statMenu", defaultValue: "pace" },
            },
          },
          {
            opcode: "applyEquippedBoost",
            blockType: Scratch.BlockType.REPORTER,
            text: "apply equipped card boost to [STAT]  base value [BASE]",
            arguments: {
              STAT: { type: Scratch.ArgumentType.STRING, menu: "statMenu", defaultValue: "pace" },
              BASE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 80 },
            },
          },
          {
            opcode: "getCardOverall",
            blockType: Scratch.BlockType.REPORTER,
            text: "overall rating of card [ID] (average all stats)",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "isRarityAtLeast",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "card [ID] is at least [RARITY] rarity?",
            arguments: {
              ID:     { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              RARITY: { type: Scratch.ArgumentType.STRING, menu: "rarityMenu", defaultValue: "Rare" },
            },
          },
          {
            opcode: "countOwnedByRarity",
            blockType: Scratch.BlockType.REPORTER,
            text: "how many [RARITY] cards does the player own?",
            arguments: { RARITY: { type: Scratch.ArgumentType.STRING, menu: "rarityMenu", defaultValue: "Common" } },
          },
          { opcode: "totalOwnedCards",  blockType: Scratch.BlockType.REPORTER, text: "total cards owned by player" },
          { opcode: "totalCardsInGame", blockType: Scratch.BlockType.REPORTER, text: "total cards in the game (70)" },
          {
            opcode: "collectionPercent",
            blockType: Scratch.BlockType.REPORTER,
            text: "collection completion % (0-100)",
          },
          {
            opcode: "randomCardFromRarity",
            blockType: Scratch.BlockType.REPORTER,
            text: "random card ID of rarity [R]",
            arguments: { R: { type: Scratch.ArgumentType.STRING, menu: "rarityMenu", defaultValue: "Rare" } },
          },

          // ╔══════════════════════════════════════════════════╗
          // ║  SECTION 5 — UPGRADE LAB                        ║
          // ║  Spend XP to level up cards, fuse, prestige.    ║
          // ╚══════════════════════════════════════════════════╝
          { blockType: Scratch.BlockType.LABEL, text: "── UPGRADE LAB ──" },

          {
            opcode: "awardXP",
            blockType: Scratch.BlockType.COMMAND,
            text: "give card [ID] — [XP] XP points",
            arguments: {
              ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0  },
              XP: { type: Scratch.ArgumentType.NUMBER, defaultValue: 50 },
            },
          },
          {
            opcode: "upgradeLevel",
            blockType: Scratch.BlockType.COMMAND,
            text: "upgrade card [ID] level (costs current_level x 100 XP)",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "canUpgrade",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "card [ID] has enough XP to level up?",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "allocateStatBoost",
            blockType: Scratch.BlockType.COMMAND,
            text: "spend [PTS] upgrade points on card [ID] — boost [STAT]",
            arguments: {
              PTS:  { type: Scratch.ArgumentType.NUMBER, defaultValue: 1      },
              ID:   { type: Scratch.ArgumentType.NUMBER, defaultValue: 0      },
              STAT: { type: Scratch.ArgumentType.STRING, menu: "statMenu", defaultValue: "pace" },
            },
          },
          {
            opcode: "fuseThreeCards",
            blockType: Scratch.BlockType.REPORTER,
            text: "fuse cards [A] + [B] + [C] (same rarity) — returns new card ID",
            arguments: {
              A: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              B: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              C: { type: Scratch.ArgumentType.NUMBER, defaultValue: 2 },
            },
          },
          {
            opcode: "canFuse",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "cards [A] [B] [C] can be fused? (same rarity check)",
            arguments: {
              A: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              B: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              C: { type: Scratch.ArgumentType.NUMBER, defaultValue: 2 },
            },
          },
          {
            opcode: "prestigeCard",
            blockType: Scratch.BlockType.COMMAND,
            text: "prestige card [ID] — must be level 25 (resets to level 1 with bonuses)",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "canPrestige",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "card [ID] is ready to prestige? (level 25 and prestige under 5)",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "upgradeSuccessCheck",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "upgrade attempt succeeds? prestige [P] level [L]",
            arguments: {
              P: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              L: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },
          {
            opcode: "getCardLevel",
            blockType: Scratch.BlockType.REPORTER,
            text: "card [ID] level (1-25)",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "getCardXP",
            blockType: Scratch.BlockType.REPORTER,
            text: "card [ID] current XP",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "getXPNeeded",
            blockType: Scratch.BlockType.REPORTER,
            text: "card [ID] XP needed for next level",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "getCardPrestige",
            blockType: Scratch.BlockType.REPORTER,
            text: "card [ID] prestige stars (0-5)",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "getUpgradePoints",
            blockType: Scratch.BlockType.REPORTER,
            text: "card [ID] available upgrade points",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "getStatBoost",
            blockType: Scratch.BlockType.REPORTER,
            text: "card [ID] total [STAT] boost from upgrades",
            arguments: {
              ID:   { type: Scratch.ArgumentType.NUMBER, defaultValue: 0    },
              STAT: { type: Scratch.ArgumentType.STRING, menu: "statMenu", defaultValue: "pace" },
            },
          },

          // ╔══════════════════════════════════════════════════╗
          // ║  SECTION 6 — EVOLUTION PATHS                    ║
          // ║  Unlock powerful forms for your cards.          ║
          // ╚══════════════════════════════════════════════════╝
          { blockType: Scratch.BlockType.LABEL, text: "── EVOLUTION PATHS ──" },

          {
            opcode: "choosePath",
            blockType: Scratch.BlockType.COMMAND,
            text: "card [ID] — choose evolution path [PATH]",
            arguments: {
              ID:   { type: Scratch.ArgumentType.NUMBER, defaultValue: 0                },
              PATH: { type: Scratch.ArgumentType.STRING, menu: "pathMenu", defaultValue: "Speed Demon Path" },
            },
          },
          {
            opcode: "awardShards",
            blockType: Scratch.BlockType.COMMAND,
            text: "give card [ID] — [SHARDS] evolution shards",
            arguments: {
              ID:     { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              SHARDS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 3 },
            },
          },
          {
            opcode: "evolveCard",
            blockType: Scratch.BlockType.COMMAND,
            text: "evolve card [ID] to next stage (checks requirements first)",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "meetsEvoRequirements",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "card [ID] meets requirements for evolution stage [STG]?",
            arguments: {
              ID:  { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              STG: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },
          {
            opcode: "evoWillFail",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "evolution attempt will FAIL? (prestige [P] stage [STG])",
            arguments: {
              P:   { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              STG: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },
          {
            opcode: "pathChallengeComplete",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "card [ID] completed the path challenge for stage [STG]?",
            arguments: {
              ID:  { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              STG: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },
          {
            opcode: "updatePathProgress",
            blockType: Scratch.BlockType.COMMAND,
            text: "add [AMT] to card [ID] path challenge — type [TYPE]",
            arguments: {
              AMT:  { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              ID:   { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              TYPE: { type: Scratch.ArgumentType.STRING, menu: "challengeMenu", defaultValue: "goals_with_card" },
            },
          },
          {
            opcode: "isFullyEvolved",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "card [ID] is fully evolved (reached stage 3)?",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "getEvoStage",
            blockType: Scratch.BlockType.REPORTER,
            text: "card [ID] evolution stage (0 = base, 3 = max)",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "getEvoStageName",
            blockType: Scratch.BlockType.REPORTER,
            text: "card [ID] evolution stage name",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "getChosenPath",
            blockType: Scratch.BlockType.REPORTER,
            text: "card [ID] chosen evolution path",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "getPathDescription",
            blockType: Scratch.BlockType.REPORTER,
            text: "description of path [PATH]",
            arguments: { PATH: { type: Scratch.ArgumentType.STRING, menu: "pathMenu", defaultValue: "Speed Demon Path" } },
          },
          {
            opcode: "getShards",
            blockType: Scratch.BlockType.REPORTER,
            text: "card [ID] evolution shards",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "getShardsNeeded",
            blockType: Scratch.BlockType.REPORTER,
            text: "shards needed for card [ID] next evolution",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "getPathAbility",
            blockType: Scratch.BlockType.REPORTER,
            text: "current ability of card [ID]",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "getAbilityDescription",
            blockType: Scratch.BlockType.REPORTER,
            text: "description of card [ID] current ability",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "getEvoStatMult",
            blockType: Scratch.BlockType.REPORTER,
            text: "stat multiplier of card [ID] at current evolution stage",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "getPathProgress",
            blockType: Scratch.BlockType.REPORTER,
            text: "card [ID] path challenge — current / target",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },

          // ╔══════════════════════════════════════════════════╗
          // ║  SECTION 7 — CARD RACES                         ║
          // ║  Race your cards against AI for shards & XP.   ║
          // ╚══════════════════════════════════════════════════╝
          { blockType: Scratch.BlockType.LABEL, text: "── CARD RACES ──" },

          {
            opcode: "getRaceSpeed",
            blockType: Scratch.BlockType.REPORTER,
            text: "race speed of card [ID] (pace + upgrades + evolution)",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "runRace",
            blockType: Scratch.BlockType.COMMAND,
            text: "run race — my card [PID] vs AI card [AID] on track [TRACK]",
            arguments: {
              PID:   { type: Scratch.ArgumentType.NUMBER, defaultValue: 0              },
              AID:   { type: Scratch.ArgumentType.NUMBER, defaultValue: 5              },
              TRACK: { type: Scratch.ArgumentType.STRING, menu: "trackMenu", defaultValue: "Classic Sprint" },
            },
          },
          {
            opcode: "getLastRaceResult",
            blockType: Scratch.BlockType.REPORTER,
            text: "last race result (WIN / LOSE / DRAW)",
          },
          {
            opcode: "getLastRaceTime",
            blockType: Scratch.BlockType.REPORTER,
            text: "last race time in seconds",
          },
          {
            opcode: "getLastRaceMargin",
            blockType: Scratch.BlockType.REPORTER,
            text: "last race — time gap between player and AI",
          },
          {
            opcode: "addToLeaderboard",
            blockType: Scratch.BlockType.COMMAND,
            text: "add time [T] with card [ID] to the race leaderboard",
            arguments: {
              T:  { type: Scratch.ArgumentType.NUMBER, defaultValue: 10 },
              ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0  },
            },
          },
          {
            opcode: "getLeaderboardEntry",
            blockType: Scratch.BlockType.REPORTER,
            text: "leaderboard position [N] entry text",
            arguments: { N: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } },
          },
          {
            opcode: "getLeaderboardSize",
            blockType: Scratch.BlockType.REPORTER,
            text: "how many entries are on the leaderboard?",
          },
          {
            opcode: "clearLeaderboard",
            blockType: Scratch.BlockType.COMMAND,
            text: "clear the race leaderboard",
          },

          // ╔══════════════════════════════════════════════════╗
          // ║  SECTION 8 — TOURNAMENTS                        ║
          // ║  Bracket competitions for big rewards.          ║
          // ╚══════════════════════════════════════════════════╝
          { blockType: Scratch.BlockType.LABEL, text: "── TOURNAMENTS ──" },

          {
            opcode: "startTournament",
            blockType: Scratch.BlockType.COMMAND,
            text: "start a new tournament with [ROUNDS] rounds",
            arguments: { ROUNDS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 4 } },
          },
          {
            opcode: "playTournamentMatch",
            blockType: Scratch.BlockType.COMMAND,
            text: "play tournament match — my card [PID] vs [AID]",
            arguments: {
              PID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              AID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 5 },
            },
          },
          {
            opcode: "getTournamentResult",
            blockType: Scratch.BlockType.REPORTER,
            text: "last tournament match result (WIN / LOSE)",
          },
          {
            opcode: "isTournamentActive",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "tournament is currently active?",
          },
          {
            opcode: "getTournamentRound",
            blockType: Scratch.BlockType.REPORTER,
            text: "current tournament round number",
          },
          {
            opcode: "getTournamentWins",
            blockType: Scratch.BlockType.REPORTER,
            text: "wins in current tournament",
          },
          {
            opcode: "getTournamentReward",
            blockType: Scratch.BlockType.REPORTER,
            text: "coins reward for winning tournament round [R]",
            arguments: { R: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } },
          },
          {
            opcode: "endTournament",
            blockType: Scratch.BlockType.COMMAND,
            text: "end current tournament and collect rewards",
          },
          {
            opcode: "totalTournamentsWon",
            blockType: Scratch.BlockType.REPORTER,
            text: "total tournaments ever won",
          },

          // ╔══════════════════════════════════════════════════╗
          // ║  SECTION 9 — DAILY CHALLENGES                   ║
          // ║  New task every day, earns bonus XP & coins.    ║
          // ╚══════════════════════════════════════════════════╝
          { blockType: Scratch.BlockType.LABEL, text: "── DAILY CHALLENGES ──" },

          {
            opcode: "initDailyChallenge",
            blockType: Scratch.BlockType.COMMAND,
            text: "set up today's daily challenge",
          },
          {
            opcode: "addDailyChallengeProgress",
            blockType: Scratch.BlockType.COMMAND,
            text: "add [AMT] progress to today's daily challenge",
            arguments: { AMT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } },
          },
          {
            opcode: "isDailyChallengeComplete",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "today's daily challenge is complete?",
          },
          {
            opcode: "claimDailyReward",
            blockType: Scratch.BlockType.COMMAND,
            text: "claim daily challenge reward (only once per day)",
          },
          {
            opcode: "getDailyChallengeText",
            blockType: Scratch.BlockType.REPORTER,
            text: "today's daily challenge description",
          },
          {
            opcode: "getDailyChallengeProgress",
            blockType: Scratch.BlockType.REPORTER,
            text: "daily challenge — current progress / target",
          },
          {
            opcode: "getDailyStreak",
            blockType: Scratch.BlockType.REPORTER,
            text: "current daily streak (days in a row)",
          },
          {
            opcode: "getDailyRewardXP",
            blockType: Scratch.BlockType.REPORTER,
            text: "XP reward for today's daily challenge",
          },
          {
            opcode: "getDailyRewardCoins",
            blockType: Scratch.BlockType.REPORTER,
            text: "coin reward for today's daily challenge",
          },

          // ╔══════════════════════════════════════════════════╗
          // ║  SECTION 10 — MORALE & FITNESS                  ║
          // ║  Affects shooting, stamina, and combos.         ║
          // ╚══════════════════════════════════════════════════╝
          { blockType: Scratch.BlockType.LABEL, text: "── MORALE & FITNESS ──" },

          {
            opcode: "changeMorale",
            blockType: Scratch.BlockType.COMMAND,
            text: "change morale by [AMT] (positive = boost, negative = drop)",
            arguments: { AMT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 10 } },
          },
          {
            opcode: "changeFitness",
            blockType: Scratch.BlockType.COMMAND,
            text: "change fitness by [AMT]",
            arguments: { AMT: { type: Scratch.ArgumentType.NUMBER, defaultValue: -5 } },
          },
          {
            opcode: "changeConfidence",
            blockType: Scratch.BlockType.COMMAND,
            text: "change confidence by [AMT]",
            arguments: { AMT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 5 } },
          },
          {
            opcode: "getMorale",
            blockType: Scratch.BlockType.REPORTER,
            text: "Ronaldo morale (0-100)",
          },
          {
            opcode: "getFitness",
            blockType: Scratch.BlockType.REPORTER,
            text: "Ronaldo fitness (0-100)",
          },
          {
            opcode: "getConfidence",
            blockType: Scratch.BlockType.REPORTER,
            text: "Ronaldo confidence (0-100)",
          },
          {
            opcode: "getMoraleBonus",
            blockType: Scratch.BlockType.REPORTER,
            text: "shooting bonus % from current morale",
          },
          {
            opcode: "getMoraleTier",
            blockType: Scratch.BlockType.REPORTER,
            text: "morale tier (Terrible / Low / OK / High / Peak)",
          },
          {
            opcode: "restRonaldo",
            blockType: Scratch.BlockType.COMMAND,
            text: "rest Ronaldo — restore fitness and morale",
          },

          // ╔══════════════════════════════════════════════════╗
          // ║  SECTION 11 — STADIUM & WEATHER                 ║
          // ║  Different conditions change your card stats.   ║
          // ╚══════════════════════════════════════════════════╝
          { blockType: Scratch.BlockType.LABEL, text: "── STADIUM & WEATHER ──" },

          {
            opcode: "setStadium",
            blockType: Scratch.BlockType.COMMAND,
            text: "set stadium to [STADIUM]",
            arguments: { STADIUM: { type: Scratch.ArgumentType.STRING, menu: "stadiumMenu", defaultValue: "Bernabeu" } },
          },
          {
            opcode: "setWeather",
            blockType: Scratch.BlockType.COMMAND,
            text: "set weather to [WEATHER]",
            arguments: { WEATHER: { type: Scratch.ArgumentType.STRING, menu: "weatherMenu", defaultValue: "Clear" } },
          },
          {
            opcode: "getStadium",
            blockType: Scratch.BlockType.REPORTER,
            text: "current stadium name",
          },
          {
            opcode: "getWeather",
            blockType: Scratch.BlockType.REPORTER,
            text: "current weather",
          },
          {
            opcode: "getStadiumPaceModifier",
            blockType: Scratch.BlockType.REPORTER,
            text: "pace modifier at current stadium (e.g. 1.05 = +5%)",
          },
          {
            opcode: "getWeatherShootModifier",
            blockType: Scratch.BlockType.REPORTER,
            text: "shooting modifier in current weather",
          },
          {
            opcode: "isBadWeather",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "weather is bad (Rain, Wind, Snow, or Storm)?",
          },
          {
            opcode: "randomiseWeather",
            blockType: Scratch.BlockType.COMMAND,
            text: "randomise weather for next match",
          },
          {
            opcode: "randomiseStadium",
            blockType: Scratch.BlockType.COMMAND,
            text: "randomise stadium for next match",
          },

          // ╔══════════════════════════════════════════════════╗
          // ║  SECTION 12 — TRANSFER MARKET                   ║
          // ║  Buy and sell cards using coins.                ║
          // ╚══════════════════════════════════════════════════╝
          { blockType: Scratch.BlockType.LABEL, text: "── TRANSFER MARKET ──" },

          {
            opcode: "getCoins",
            blockType: Scratch.BlockType.REPORTER,
            text: "player coins",
          },
          {
            opcode: "getGems",
            blockType: Scratch.BlockType.REPORTER,
            text: "player gems (premium currency)",
          },
          {
            opcode: "addCoins",
            blockType: Scratch.BlockType.COMMAND,
            text: "add [AMT] coins to player",
            arguments: { AMT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 } },
          },
          {
            opcode: "spendCoins",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "spend [AMT] coins — returns true if player had enough",
            arguments: { AMT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 } },
          },
          {
            opcode: "buyCard",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "buy card [ID] from market (costs base value) — returns true if successful",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "sellCard",
            blockType: Scratch.BlockType.COMMAND,
            text: "sell card [ID] — earn coins based on level and rarity",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "getSellValue",
            blockType: Scratch.BlockType.REPORTER,
            text: "how many coins will player earn selling card [ID]?",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "listCardOnMarket",
            blockType: Scratch.BlockType.COMMAND,
            text: "list card [ID] on market for [PRICE] coins",
            arguments: {
              ID:    { type: Scratch.ArgumentType.NUMBER, defaultValue: 0   },
              PRICE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 200 },
            },
          },
          {
            opcode: "getMarketListingCount",
            blockType: Scratch.BlockType.REPORTER,
            text: "number of cards currently listed on market",
          },
          {
            opcode: "getMarketListingInfo",
            blockType: Scratch.BlockType.REPORTER,
            text: "market listing [N] — card name and price",
            arguments: { N: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } },
          },

          // ╔══════════════════════════════════════════════════╗
          // ║  SECTION 13 — SCORE & COMBOS                    ║
          // ║  Goals, streak bonuses, match results.          ║
          // ╚══════════════════════════════════════════════════╝
          { blockType: Scratch.BlockType.LABEL, text: "── SCORE & COMBOS ──" },

          {
            opcode: "scoreGoal",
            blockType: Scratch.BlockType.COMMAND,
            text: "score a goal with card [ID] — combo [COMBO]",
            arguments: {
              ID:    { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              COMBO: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },
          {
            opcode: "resetCombo",
            blockType: Scratch.BlockType.COMMAND,
            text: "reset goal combo to 0",
          },
          {
            opcode: "tickComboTimer",
            blockType: Scratch.BlockType.COMMAND,
            text: "tick combo timer — combo resets if time runs out",
          },
          {
            opcode: "getScore",
            blockType: Scratch.BlockType.REPORTER,
            text: "current match score (points)",
          },
          {
            opcode: "getGoalCount",
            blockType: Scratch.BlockType.REPORTER,
            text: "total goals scored this session",
          },
          {
            opcode: "getCombo",
            blockType: Scratch.BlockType.REPORTER,
            text: "current goal combo (resets on miss/time)",
          },
          {
            opcode: "getComboTimer",
            blockType: Scratch.BlockType.REPORTER,
            text: "frames left before combo resets",
          },
          {
            opcode: "getPointsForGoal",
            blockType: Scratch.BlockType.REPORTER,
            text: "points earned for a goal at combo [C]",
            arguments: { C: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } },
          },
          {
            opcode: "getCrowdChantLevel",
            blockType: Scratch.BlockType.REPORTER,
            text: "crowd excitement level (0-10) based on score",
          },
          {
            opcode: "getMatchRating",
            blockType: Scratch.BlockType.REPORTER,
            text: "Ronaldo match rating (1-10 stars based on goals & combos)",
          },

          // ╔══════════════════════════════════════════════════╗
          // ║  SECTION 14 — ACHIEVEMENTS                      ║
          // ║  40 unlockable achievements to collect.         ║
          // ╚══════════════════════════════════════════════════╝
          { blockType: Scratch.BlockType.LABEL, text: "── ACHIEVEMENTS ──" },

          {
            opcode: "unlockAchievement",
            blockType: Scratch.BlockType.COMMAND,
            text: "unlock achievement number [N]",
            arguments: { N: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } },
          },
          {
            opcode: "checkAchievement",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "achievement [N] is unlocked?",
            arguments: { N: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } },
          },
          {
            opcode: "getAchievementName",
            blockType: Scratch.BlockType.REPORTER,
            text: "name of achievement [N]",
            arguments: { N: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } },
          },
          {
            opcode: "totalAchievementsUnlocked",
            blockType: Scratch.BlockType.REPORTER,
            text: "total achievements unlocked (out of 40)",
          },
          {
            opcode: "achievementPercent",
            blockType: Scratch.BlockType.REPORTER,
            text: "achievement completion % (0-100)",
          },
          {
            opcode: "autoCheckAchievements",
            blockType: Scratch.BlockType.COMMAND,
            text: "auto-check and unlock any earned achievements",
          },
          {
            opcode: "getNewestAchievement",
            blockType: Scratch.BlockType.REPORTER,
            text: "name of the most recently unlocked achievement",
          },

          // ╔══════════════════════════════════════════════════╗
          // ║  SECTION 15 — SAVE & LOAD                       ║
          // ║  3 save slots with timestamps.                  ║
          // ╚══════════════════════════════════════════════════╝
          { blockType: Scratch.BlockType.LABEL, text: "── SAVE & LOAD ──" },

          {
            opcode: "saveGame",
            blockType: Scratch.BlockType.COMMAND,
            text: "save game to slot [SLOT]",
            arguments: { SLOT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } },
          },
          {
            opcode: "loadGame",
            blockType: Scratch.BlockType.COMMAND,
            text: "load game from slot [SLOT]",
            arguments: { SLOT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } },
          },
          {
            opcode: "deleteSave",
            blockType: Scratch.BlockType.COMMAND,
            text: "delete save slot [SLOT]",
            arguments: { SLOT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } },
          },
          {
            opcode: "isSaveSlotUsed",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "save slot [SLOT] has data?",
            arguments: { SLOT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } },
          },
          {
            opcode: "getSaveInfo",
            blockType: Scratch.BlockType.REPORTER,
            text: "save slot [SLOT] summary text",
            arguments: { SLOT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } },
          },

          // ╔══════════════════════════════════════════════════╗
          // ║  SECTION 16 — HUD & DISPLAY                     ║
          // ║  Get display-ready strings for your project.    ║
          // ╚══════════════════════════════════════════════════╝
          { blockType: Scratch.BlockType.LABEL, text: "── HUD & DISPLAY ──" },

          {
            opcode: "getCardHUDString",
            blockType: Scratch.BlockType.REPORTER,
            text: "full HUD text for card [ID]",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "getCardShortLabel",
            blockType: Scratch.BlockType.REPORTER,
            text: "short label for card [ID] (name + level)",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "getStatsString",
            blockType: Scratch.BlockType.REPORTER,
            text: "stats summary for card [ID]",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "getEvoColor",
            blockType: Scratch.BlockType.REPORTER,
            text: "glow color for card [ID] evolution path (hex code)",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "getAuraIntensity",
            blockType: Scratch.BlockType.REPORTER,
            text: "card [ID] aura intensity (0-100)",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "getPrestigeStars",
            blockType: Scratch.BlockType.REPORTER,
            text: "prestige star symbols for card [ID] (e.g. ***)",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "getRarityColor",
            blockType: Scratch.BlockType.REPORTER,
            text: "color hex for rarity [R]",
            arguments: { R: { type: Scratch.ArgumentType.STRING, menu: "rarityMenu", defaultValue: "Rare" } },
          },
          {
            opcode: "getScoreboardString",
            blockType: Scratch.BlockType.REPORTER,
            text: "scoreboard line — goals [G] combo [C] score [S]",
            arguments: {
              G: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0   },
              C: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0   },
              S: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0   },
            },
          },
          {
            opcode: "getWeatherIcon",
            blockType: Scratch.BlockType.REPORTER,
            text: "icon letter for current weather (C=clear R=rain etc.)",
          },

          // ╔══════════════════════════════════════════════════╗
          // ║  SECTION 17 — DEBUG & UTILITY                   ║
          // ║  Reset, inspect, and test tools.                ║
          // ╚══════════════════════════════════════════════════╝
          { blockType: Scratch.BlockType.LABEL, text: "── DEBUG & UTILITY ──" },

          {
            opcode: "resetMatch",
            blockType: Scratch.BlockType.COMMAND,
            text: "reset match — mode [MODE]",
            arguments: { MODE: { type: Scratch.ArgumentType.STRING, menu: "modeMenu", defaultValue: "Story Mode" } },
          },
          {
            opcode: "setDifficulty",
            blockType: Scratch.BlockType.COMMAND,
            text: "set game difficulty to [DIFF]",
            arguments: { DIFF: { type: Scratch.ArgumentType.STRING, menu: "diffMenu", defaultValue: "NORMAL" } },
          },
          {
            opcode: "getDifficulty",
            blockType: Scratch.BlockType.REPORTER,
            text: "current difficulty",
          },
          {
            opcode: "debugCardDump",
            blockType: Scratch.BlockType.REPORTER,
            text: "debug: full state of card [ID] as text",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "debugStateDump",
            blockType: Scratch.BlockType.REPORTER,
            text: "debug: overall game state summary",
          },
          {
            opcode: "giveAllCards",
            blockType: Scratch.BlockType.COMMAND,
            text: "DEBUG: give player ALL 70 cards",
          },
          {
            opcode: "maxOutCard",
            blockType: Scratch.BlockType.COMMAND,
            text: "DEBUG: max out card [ID] (level 25, prestige 5, stage 3)",
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          {
            opcode: "addTestCoins",
            blockType: Scratch.BlockType.COMMAND,
            text: "DEBUG: add 9999 coins and 99 gems",
          },
        ],

        // ── MENUS ──────────────────────────────────────────────
        menus: {
          statMenu: {
            acceptReporters: true,
            items: ["pace", "shooting", "dribbling", "defense", "physical"],
          },
          packMenu: {
            acceptReporters: false,
            items: ["Standard", "Premium", "Elite", "Mythic"],
          },
          pathMenu: {
            acceptReporters: true,
            items: ["Speed Demon Path", "Goal Machine Path", "Defensive Legend Path", "Ultimate Siuuu Path"],
          },
          rarityMenu: {
            acceptReporters: true,
            items: ["Common", "Rare", "Epic", "Legend", "Mythic"],
          },
          modeMenu: {
            acceptReporters: false,
            items: [
              "Main Menu", "Tutorial", "Story Mode", "Free Kick",
              "Penalty Shootout", "Endless Survival", "Card Shop",
              "Card Race Arena", "Card Upgrade Lab", "Evolution Chamber",
              "Tournament", "Daily Challenge",
            ],
          },
          diffMenu: {
            acceptReporters: false,
            items: ["EASY", "NORMAL", "HARD", "LEGEND"],
          },
          trackMenu: {
            acceptReporters: false,
            items: ["Classic Sprint", "Stadium Loop", "Obstacle Course", "Mythic Gauntlet"],
          },
          challengeMenu: {
            acceptReporters: false,
            items: ["goals_with_card", "races_won"],
          },
          weatherMenu: {
            acceptReporters: false,
            items: ["Clear", "Rain", "Wind", "Snow", "Night", "Storm"],
          },
          stadiumMenu: {
            acceptReporters: false,
            items: ["Bernabeu", "Old Trafford", "Allianz Arena", "Camp Nou", "Juventus Arena", "Al-Nassr Arena"],
          },
          diveMenu: {
            acceptReporters: false,
            items: ["Left", "Centre", "Right"],
          },
        },
      };
    }

    // ══════════════════════════════════════════════════════════
    //  SECTION 1 — QUICK START
    // ══════════════════════════════════════════════════════════
    quickStartEverything() {
      this.initPhysics();
      this.initCardSystem();
      this.initDailyChallenge();
      STATE.coins = 500;
      STATE.gems  = 10;
      STATE.morale     = 75;
      STATE.fitness    = 100;
      STATE.confidence = 50;
      STATE.stadium = "Bernabeu";
      STATE.weather = "Clear";
      STATE._gameReady = true;
    }

    quickStartBeginner() {
      this.quickStartEverything();
      STATE.difficulty = "EASY";
      // Give all common cards so beginners have something to experiment with
      CARD_DB.filter(c => c[8] === "Common").forEach(c => giveCard(c[0]));
      STATE.coins = 1000;
    }

    isGameReady() { return !!STATE._gameReady; }

    getStartTip({ N }) {
      const TIPS = [
        "Tip 1: Run QUICK START once when your project starts.",
        "Tip 2: Equip a card before scoring goals for XP & shards.",
        "Tip 3: Race cards to earn evolution shards faster.",
        "Tip 4: Fuse 3 cards of the same rarity for a rarer card.",
        "Tip 5: Prestige a level-25 card to unlock big stat bonuses.",
        "Tip 6: Choose an evolution path early — it cannot be changed.",
        "Tip 7: Complete daily challenges to earn bonus coins and XP.",
        "Tip 8: Tournament wins give the biggest coin rewards.",
        "Tip 9: Bad weather reduces stats — check before a big match!",
        "Tip 10: MYTHIC SIUUU (card 69) has 99 in every stat!",
      ];
      return TIPS[Math.min(Number(N) - 1, TIPS.length - 1)] ?? "Explore and have fun!";
    }

    // ══════════════════════════════════════════════════════════
    //  SECTION 2 — PHYSICS ENGINE
    // ══════════════════════════════════════════════════════════
    initPhysics() {
      STATE.velocityX = 0;
      STATE.velocityY = 0;
      STATE.ballSpin  = 0;
      STATE.stamina   = 100;
      STATE.power     = 0;
      STATE.combo     = 0;
      STATE.comboTimer = 0;
    }

    moveRonaldo({ VX, VY, FRIC }) {
      STATE.velocityX = Number(VX) * Number(FRIC);
      STATE.velocityY = Number(VY) * Number(FRIC);
    }

    applyGravity({ G, SPIN }) {
      STATE.velocityY += Number(G);
      STATE.ballSpin   = Number(SPIN);
    }

    computeCurveShot({ PWR, ANG, SPIN }) {
      const rad = (Number(ANG) * Math.PI) / 180;
      const vx  = Math.cos(rad) * Number(PWR) * 0.12;
      const vy  = Math.sin(rad) * Number(PWR) * 0.12 + Number(SPIN) * 0.08;
      return Math.round(Math.sqrt(vx * vx + vy * vy) * 10) / 10;
    }

    computeFreekickTrajectory({ FRAMES, PWR, ANG }) {
      const rad = (Number(ANG) * Math.PI) / 180;
      const vy0 = Math.sin(rad) * Number(PWR) * 0.12;
      const f   = Number(FRAMES);
      return Math.round((vy0 * f + 0.5 * (-0.7) * f * f) * 10) / 10;
    }

    isGoal({ X, Y }) {
      return Math.abs(Number(X)) > 210 && Math.abs(Number(Y)) < 60;
    }

    isPenaltyGoal({ X, Y, DIR }) {
      const px = Number(X), py = Number(Y);
      const inFrame = Math.abs(px) < 80 && Math.abs(py) < 50;
      if (!inFrame) return false;
      // Goalkeeper covers one third of the goal
      if (DIR === "Left"   && px < -27) return false;
      if (DIR === "Centre" && Math.abs(px) < 27) return false;
      if (DIR === "Right"  && px > 27)  return false;
      return true;
    }

    drainStamina({ AMT, SPRINT }) {
      const fitnessRate = STATE.fitness / 100;  // lower fitness = drain faster
      const drain = (SPRINT ? Number(AMT) * 2.5 : Number(AMT)) / fitnessRate;
      STATE.stamina = Math.max(0, STATE.stamina - drain);
    }

    recoverStamina({ AMT }) {
      STATE.stamina = Math.min(STATE.maxStamina, STATE.stamina + Number(AMT));
    }

    getStaminaPercent() { return Math.round((STATE.stamina / STATE.maxStamina) * 100); }
    getVelocityX()  { return STATE.velocityX; }
    getVelocityY()  { return STATE.velocityY; }
    getBallSpin()   { return STATE.ballSpin; }

    getWeatherSpeedPenalty({ WEATHER }) {
      const mod = WEATHER_DB[WEATHER]?.paceMod ?? 1.0;
      return Math.round((1 - mod) * 100);
    }

    // ══════════════════════════════════════════════════════════
    //  SECTION 3 — AI OPPONENTS
    // ══════════════════════════════════════════════════════════
    moveDefender({ ID, BX, BY, SPD }) {
      const key = `def_${ID}`;
      if (!STATE[key]) STATE[key] = { x: 0, y: 0 };
      const dx = Number(BX) - STATE[key].x;
      const dy = Number(BY) - STATE[key].y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const spd  = Number(SPD) * this.getAIDifficultyMultiplier();
      STATE[key].x += (dx / dist) * spd;
      STATE[key].y += (dy / dist) * spd;
    }

    defenderTackle({ ID }) {
      // Chance of a successful tackle depends on difficulty and morale
      const diffMult = this.getAIDifficultyMultiplier();
      const moraleBonus = STATE.morale / 200;   // higher morale = harder to tackle
      return Math.random() < (0.3 * diffMult - moraleBonus);
    }

    defenderCanReach({ ID, R }) {
      const key = `def_${ID}`;
      if (!STATE[key]) return false;
      return Math.sqrt(STATE[key].x ** 2 + STATE[key].y ** 2) < Number(R);
    }

    goalkeeperDecide({ BX, PWR }) {
      const saveBase  = Number(PWR) > 80 ? 0.20 : Number(PWR) > 60 ? 0.45 : 0.70;
      const moraleMod = STATE.morale / 200;   // high morale = harder to save against
      STATE._gkSaved    = Math.random() < Math.max(0.05, saveBase - moraleMod);
      STATE._gkDiveDir  = Number(BX) > 20 ? "Right" : Number(BX) < -20 ? "Left" : "Centre";
    }

    didGoalkeeperSave()           { return !!STATE._gkSaved; }
    getGoalkeeperDiveDirection()  { return STATE._gkDiveDir ?? "Centre"; }

    getDefenderX({ ID }) { return STATE[`def_${ID}`]?.x ?? 0; }
    getDefenderY({ ID }) { return STATE[`def_${ID}`]?.y ?? 0; }

    resetAllDefenders() {
      for (let i = 1; i <= 5; i++) STATE[`def_${i}`] = { x: 0, y: 0 };
    }

    getAIDifficultyMultiplier() {
      return { EASY: 0.6, NORMAL: 1.0, HARD: 1.4, LEGEND: 1.9 }[STATE.difficulty] ?? 1.0;
    }

    // ══════════════════════════════════════════════════════════
    //  SECTION 4 — CARD COLLECTION
    // ══════════════════════════════════════════════════════════
    initCardSystem() {
      // Starter deck: Young CR7, UCL Winner, Prime CR7, SIUUU CR7
      [0, 1, 5, 14].forEach(id => giveCard(id));
    }

    giveCardToPlayer({ ID }) { giveCard(ID); checkAutoAchievements(); }

    openCardPack({ TYPE }) {
      const pools = {
        Standard: ["Common","Common","Rare"],
        Premium:  ["Rare","Rare","Epic"],
        Elite:    ["Epic","Epic","Legend"],
        Mythic:   ["Legend","Mythic"],
      };
      const pool   = pools[TYPE] ?? ["Common"];
      const rarity = pool[Math.floor(Math.random() * pool.length)];
      const cardId = this.randomCardFromRarity({ R: rarity });
      giveCard(cardId);
      checkAutoAchievements();
      return cardId;
    }

    isCardOwned({ ID })  { return STATE.ownedCards.includes(Number(ID)); }

    equipCard({ ID, SLOT }) {
      STATE.equippedCards[Number(SLOT) - 1] = Number(ID);
      STATE.selectedCard = Number(ID);
    }

    unequipSlot({ SLOT }) {
      STATE.equippedCards[Number(SLOT) - 1] = null;
    }

    getEquippedCard({ SLOT }) {
      return STATE.equippedCards[Number(SLOT) - 1] ?? -1;
    }

    tradeWithAI({ MY_ID, AI_ID }) {
      const idx = cardIdx(MY_ID);
      if (idx === -1) return;
      giveCard(Number(AI_ID));
      // Re-find index after giveCard (array may have grown)
      const myIdx = cardIdx(MY_ID);
      if (myIdx !== -1) spliceCard(myIdx);
      unlockAch(39);  // Market Trade achievement
    }

    setCardFavorite({ ID, ON }) {
      const i = cardIdx(ID);
      if (i !== -1) STATE.cardFavorite[i] = !!ON;
    }

    setCardNickname({ ID, NAME }) {
      const i = cardIdx(ID);
      if (i !== -1) STATE.cardNickname[i] = String(NAME);
    }

    getCardNickname({ ID }) {
      const i = cardIdx(ID);
      return i !== -1 ? (STATE.cardNickname[i] || CARD_DB[Number(ID)]?.[1] || "Unknown") : "Unknown";
    }

    getCardName({ ID })      { return CARD_DB[Number(ID)]?.[1] ?? "Unknown"; }
    getCardEra({ ID })       { return CARD_DB[Number(ID)]?.[2] ?? "Unknown"; }
    getCardRarity({ ID })    { return CARD_DB[Number(ID)]?.[8] ?? "Common";  }
    getCardBaseValue({ ID }) { return CARD_DB[Number(ID)]?.[9] ?? 50;        }

    getCardStat({ ID, STAT }) {
      return computeStat(ID, STAT);
    }

    getCardRawStat({ ID, STAT }) {
      const card = CARD_DB[Number(ID)];
      return card ? (card[STAT_COL[STAT]] ?? 0) : 0;
    }

    applyEquippedBoost({ STAT, BASE }) {
      let total = Number(BASE);
      STATE.equippedCards.forEach(cid => {
        if (cid == null) return;
        const boosted = computeStat(cid, STAT);
        const raw     = this.getCardRawStat({ ID: cid, STAT });
        total += boosted - raw;
      });
      return Math.round(total);
    }

    getCardOverall({ ID }) {
      const stats = ["pace","shooting","dribbling","defense","physical"];
      const sum   = stats.reduce((acc, s) => acc + computeStat(ID, s), 0);
      return Math.round(sum / stats.length);
    }

    isRarityAtLeast({ ID, RARITY }) {
      const ORDER = ["Common","Rare","Epic","Legend","Mythic"];
      return ORDER.indexOf(this.getCardRarity({ ID })) >= ORDER.indexOf(RARITY);
    }

    countOwnedByRarity({ RARITY }) {
      return STATE.ownedCards.filter(id => CARD_DB[id]?.[8] === RARITY).length;
    }

    totalOwnedCards()  { return STATE.ownedCards.length; }
    totalCardsInGame() { return CARD_DB.length; }

    collectionPercent() {
      return Math.round((STATE.ownedCards.length / CARD_DB.length) * 100);
    }

    randomCardFromRarity({ R }) {
      const pool = CARD_DB.filter(c => c[8] === R);
      return pool.length ? pool[Math.floor(Math.random() * pool.length)][0] : 0;
    }

    // ══════════════════════════════════════════════════════════
    //  SECTION 5 — UPGRADE LAB
    // ══════════════════════════════════════════════════════════
    awardXP({ ID, XP }) {
      const i = cardIdx(ID);
      if (i !== -1) STATE.cardXP[i] = (STATE.cardXP[i] ?? 0) + Number(XP);
    }

    upgradeLevel({ ID }) {
      const i = cardIdx(ID);
      if (i === -1) return;
      const lvl  = STATE.cardLevels[i] ?? 1;
      const cost = lvl * 100;
      if ((STATE.cardXP[i] ?? 0) >= cost && lvl < 25) {
        STATE.cardXP[i]           -= cost;
        STATE.cardLevels[i]        = lvl + 1;
        STATE.cardUpgradePoints[i] = (STATE.cardUpgradePoints[i] ?? 0) + 3;
        if (lvl + 1 >= 5)  unlockAch(26);
        if (lvl + 1 >= 25) unlockAch(27);
        checkAutoAchievements();
      }
    }

    canUpgrade({ ID }) {
      const i = cardIdx(ID);
      if (i === -1) return false;
      const lvl = STATE.cardLevels[i] ?? 1;
      return (STATE.cardXP[i] ?? 0) >= lvl * 100 && lvl < 25;
    }

    allocateStatBoost({ PTS, ID, STAT }) {
      const i = cardIdx(ID);
      if (i === -1) return;
      const pts = Number(PTS);
      if ((STATE.cardUpgradePoints[i] ?? 0) >= pts) {
        STATE.cardUpgradePoints[i] -= pts;
        if (!STATE.cardStatBoosts[i]) STATE.cardStatBoosts[i] = {};
        STATE.cardStatBoosts[i][STAT] = (STATE.cardStatBoosts[i][STAT] ?? 0) + pts;
      }
    }

    fuseThreeCards({ A, B, C }) {
      const ORDER = ["Common","Rare","Epic","Legend","Mythic"];
      const ra = this.getCardRarity({ ID: A });
      const rb = this.getCardRarity({ ID: B });
      const rc = this.getCardRarity({ ID: C });
      if (ra !== rb || rb !== rc) return -1;  // -1 = fusion failed (rarities don't match)
      const nextRarity = ORDER[Math.min(ORDER.indexOf(ra) + 1, 4)];
      const result = this.randomCardFromRarity({ R: nextRarity });
      // Remove the 3 source cards (re-find index each time as array shifts)
      [A, B, C].forEach(id => {
        const idx = cardIdx(id);
        if (idx !== -1) spliceCard(idx);
      });
      giveCard(result);
      unlockAch(30);   // Card Fusion achievement
      checkAutoAchievements();
      return result;
    }

    canFuse({ A, B, C }) {
      return this.getCardRarity({ ID: A }) === this.getCardRarity({ ID: B }) &&
             this.getCardRarity({ ID: B }) === this.getCardRarity({ ID: C }) &&
             this.isCardOwned({ ID: A }) &&
             this.isCardOwned({ ID: B }) &&
             this.isCardOwned({ ID: C });
    }

    prestigeCard({ ID }) {
      const i = cardIdx(ID);
      if (i === -1) return;
      if ((STATE.cardLevels[i] ?? 1) < 25 || (STATE.cardPrestige[i] ?? 0) >= 5) return;
      STATE.cardPrestige[i]++;
      STATE.cardLevels[i]        = 1;
      STATE.cardXP[i]            = 0;
      STATE.cardUpgradePoints[i] = (STATE.cardUpgradePoints[i] ?? 0) + 10;
      unlockAch(28);
      if (STATE.cardPrestige[i] >= 5) unlockAch(29);
      checkAutoAchievements();
    }

    canPrestige({ ID }) {
      const i = cardIdx(ID);
      return i !== -1 && (STATE.cardLevels[i] ?? 1) >= 25 && (STATE.cardPrestige[i] ?? 0) < 5;
    }

    upgradeSuccessCheck({ P, L }) {
      return Math.random() < Math.max(0.5, 0.95 - Number(L) * 0.01 + Number(P) * 0.02);
    }

    getCardLevel({ ID })    { const i = cardIdx(ID); return i !== -1 ? (STATE.cardLevels[i]        ?? 1) : 0; }
    getCardXP({ ID })       { const i = cardIdx(ID); return i !== -1 ? (STATE.cardXP[i]             ?? 0) : 0; }
    getCardPrestige({ ID }) { const i = cardIdx(ID); return i !== -1 ? (STATE.cardPrestige[i]       ?? 0) : 0; }
    getUpgradePoints({ ID }){ const i = cardIdx(ID); return i !== -1 ? (STATE.cardUpgradePoints[i]  ?? 0) : 0; }

    getXPNeeded({ ID }) {
      const i = cardIdx(ID);
      const lvl = i !== -1 ? (STATE.cardLevels[i] ?? 1) : 1;
      return lvl * 100;
    }

    getStatBoost({ ID, STAT }) {
      const i = cardIdx(ID);
      return i !== -1 ? (STATE.cardStatBoosts[i]?.[STAT] ?? 0) : 0;
    }

    // ══════════════════════════════════════════════════════════
    //  SECTION 6 — EVOLUTION PATHS
    // ══════════════════════════════════════════════════════════
    choosePath({ PATH, ID }) {
      const i = cardIdx(ID);
      if (i === -1 || STATE.chosenPath[i] !== null) return;
      STATE.chosenPath[i] = PATH;
    }

    awardShards({ ID, SHARDS }) {
      const i = cardIdx(ID);
      if (i !== -1) STATE.evolutionShards[i] = (STATE.evolutionShards[i] ?? 0) + Number(SHARDS);
    }

    evolveCard({ ID }) {
      const i = cardIdx(ID);
      if (i === -1) return;
      const cur  = STATE.evolutionStage[i] ?? 0;
      if (cur >= 3) return;
      const next = cur + 1;
      if (!this.meetsEvoRequirements({ ID, STG: next })) return;

      const path = STATE.chosenPath[i];
      const pd   = EVOLUTION_PATHS[path];
      const cost = pd?.shardCost[next - 1] ?? 5;

      // Failure risk (reduced by prestige)
      if (this.evoWillFail({ P: STATE.cardPrestige[i] ?? 0, STG: next })) {
        STATE.evolutionShards[i] = Math.max(0, (STATE.evolutionShards[i] ?? 0) - Math.ceil(cost * 0.5));
        return;
      }

      STATE.evolutionShards[i] = Math.max(0, (STATE.evolutionShards[i] ?? 0) - cost);
      STATE.evolutionStage[i]  = next;
      STATE.cardXP[i] = (STATE.cardXP[i] ?? 0) + (pd?.xpBonus ?? 100);
      this.addCoins({ AMT: pd?.coinBonus ?? 25 });

      if (next === 1) unlockAch(16);
      if (next === 2) unlockAch(17);
      if (next === 3) { unlockAch(18); unlockAch(20); }
      checkAutoAchievements();
    }

    meetsEvoRequirements({ ID, STG }) {
      const i  = cardIdx(ID);
      if (i === -1) return false;
      const path = STATE.chosenPath[i];
      const pd   = EVOLUTION_PATHS[path];
      if (!pd) return false;
      const si = Number(STG) - 1;
      return (STATE.cardLevels[i]      ?? 1) >= pd.minLevel[si]
          && (STATE.cardPrestige[i]    ?? 0) >= pd.minPrestige[si]
          && (STATE.evolutionShards[i] ?? 0) >= pd.shardCost[si]
          && this.pathChallengeComplete({ ID, STG });
    }

    evoWillFail({ P, STG }) {
      const chance = Math.max(0, 0.15 - Number(P) * 0.025) * (Number(STG) * 0.45);
      return Math.random() < chance;
    }

    pathChallengeComplete({ ID, STG }) {
      const i = cardIdx(ID);
      if (i === -1) return false;
      const path = STATE.chosenPath[i];
      const pd   = EVOLUTION_PATHS[path];
      if (!pd) return false;
      const si       = Number(STG) - 1;
      const required = pd.challengeCount[si] ?? 99;
      const progress = pd.challengeType === "goals_with_card"
        ? (STATE.goalsWithCard[i] ?? 0)
        : (STATE.racesWonWithCard[i] ?? 0);
      return progress >= required;
    }

    updatePathProgress({ AMT, ID, TYPE }) {
      const i = cardIdx(ID);
      if (i === -1) return;
      if (TYPE === "goals_with_card")
        STATE.goalsWithCard[i]   = (STATE.goalsWithCard[i]   ?? 0) + Number(AMT);
      else
        STATE.racesWonWithCard[i] = (STATE.racesWonWithCard[i] ?? 0) + Number(AMT);
      STATE.pathChallengeProgress[i] =
        (STATE.goalsWithCard[i] ?? 0) + (STATE.racesWonWithCard[i] ?? 0);
    }

    isFullyEvolved({ ID })  { return this.getEvoStage({ ID }) >= 3; }
    getEvoStage({ ID })     { const i = cardIdx(ID); return i !== -1 ? (STATE.evolutionStage[i] ?? 0)  : 0; }
    getChosenPath({ ID })   { const i = cardIdx(ID); return i !== -1 ? (STATE.chosenPath[i] ?? "None") : "None"; }
    getShards({ ID })       { const i = cardIdx(ID); return i !== -1 ? (STATE.evolutionShards[i] ?? 0) : 0; }

    getShardsNeeded({ ID }) {
      const i = cardIdx(ID);
      if (i === -1) return 999;
      const path  = STATE.chosenPath[i];
      const stage = STATE.evolutionStage[i] ?? 0;
      if (stage >= 3 || !path) return 0;
      return EVOLUTION_PATHS[path]?.shardCost[stage] ?? 999;
    }

    getEvoStageName({ ID }) {
      const i = cardIdx(ID);
      if (i === -1) return "Base Form";
      const stage = STATE.evolutionStage[i] ?? 0;
      if (stage === 0) return "Base Form";
      return EVOLUTION_PATHS[STATE.chosenPath[i]]?.stages[stage - 1] ?? "Evolved";
    }

    getPathDescription({ PATH }) {
      return EVOLUTION_PATHS[PATH]?.description ?? "Unknown path.";
    }

    getPathAbility({ ID }) {
      const i = cardIdx(ID);
      if (i === -1) return "None";
      const stage = STATE.evolutionStage[i] ?? 0;
      const path  = STATE.chosenPath[i];
      if (stage === 0 || !path) return "None";
      return EVOLUTION_PATHS[path]?.ability[stage - 1] ?? "None";
    }

    getAbilityDescription({ ID }) {
      const i = cardIdx(ID);
      if (i === -1) return "No ability.";
      const stage = STATE.evolutionStage[i] ?? 0;
      const path  = STATE.chosenPath[i];
      if (stage === 0 || !path) return "No ability unlocked yet.";
      return EVOLUTION_PATHS[path]?.abilityDesc[stage - 1] ?? "Unknown ability.";
    }

    getEvoStatMult({ ID }) {
      return evoMult(ID);
    }

    getPathProgress({ ID }) {
      const i    = cardIdx(ID);
      if (i === -1) return "0 / ?";
      const path  = STATE.chosenPath[i];
      const stage = STATE.evolutionStage[i] ?? 0;
      const pd    = EVOLUTION_PATHS[path];
      if (!pd || stage >= 3) return "COMPLETE";
      const required = pd.challengeCount[stage] ?? 99;
      const progress = pd.challengeType === "goals_with_card"
        ? (STATE.goalsWithCard[i] ?? 0)
        : (STATE.racesWonWithCard[i] ?? 0);
      return `${progress} / ${required}`;
    }

    // ══════════════════════════════════════════════════════════
    //  SECTION 7 — CARD RACES
    // ══════════════════════════════════════════════════════════
    getRaceSpeed({ ID }) {
      const card = CARD_DB[Number(ID)];
      if (!card) return 1;
      const lvl    = this.getCardLevel({ ID });
      const mult   = evoMult(ID);
      const ability = this.getPathAbility({ ID });
      const evoStage = this.getEvoStage({ ID });
      let aBonus = 1.0;
      if (["Sprint Burst","Warp Dribble","Sonic Siuuu"].includes(ability))
        aBonus = 1.1 + evoStage * 0.1;
      const weatherMod = WEATHER_DB[STATE.weather]?.paceMod ?? 1.0;
      return Math.round(card[STAT_COL.pace] * mult * (1 + lvl * 0.02) * aBonus * weatherMod * 10) / 10;
    }

    runRace({ PID, AID, TRACK }) {
      const mods = { "Classic Sprint": 1.0, "Stadium Loop": 0.9, "Obstacle Course": 0.8, "Mythic Gauntlet": 0.7 };
      const mod  = mods[TRACK] ?? 1.0;
      const pS   = this.getRaceSpeed({ ID: PID });
      const aS   = this.getRaceSpeed({ ID: AID });
      const pT   = Math.round((100 / (pS * mod)) * 10) / 10;
      const aT   = Math.round((100 / (aS * mod)) * 10) / 10;
      STATE._lastRaceResult = pT < aT ? "WIN" : pT > aT ? "LOSE" : "DRAW";
      STATE._lastRaceTime   = pT;
      STATE._lastRaceMargin = Math.abs(pT - aT);

      if (STATE._lastRaceResult === "WIN") {
        STATE.totalRaceWins++;
        const i = cardIdx(PID);
        if (i !== -1) STATE.racesWonWithCard[i] = (STATE.racesWonWithCard[i] ?? 0) + 1;
        this.awardShards({ ID: PID, SHARDS: 3 });
        this.awardXP({ ID: PID, XP: 80 });
        this.addCoins({ AMT: 30 });
        checkAutoAchievements();
      }
    }

    getLastRaceResult() { return STATE._lastRaceResult ?? "NONE"; }
    getLastRaceTime()   { return STATE._lastRaceTime   ?? 0;      }
    getLastRaceMargin() { return Math.round((STATE._lastRaceMargin ?? 0) * 10) / 10; }

    addToLeaderboard({ T, ID }) {
      STATE.leaderboard.push({
        time:    Number(T),
        name:    this.getCardName({ ID }),
        evolved: this.getEvoStage({ ID }),
        rarity:  this.getCardRarity({ ID }),
      });
      STATE.leaderboard.sort((a, b) => a.time - b.time);
      if (STATE.leaderboard.length > 10) STATE.leaderboard.pop();
      if (STATE.leaderboard.length >= 1) unlockAch(25);
    }

    getLeaderboardEntry({ N }) {
      const e = STATE.leaderboard[Number(N) - 1];
      return e ? `#${N}  ${e.name}  ${e.time}s  [${e.rarity}] Evo:${e.evolved}` : "-";
    }

    getLeaderboardSize() { return STATE.leaderboard.length; }
    clearLeaderboard()   { STATE.leaderboard = []; }

    // ══════════════════════════════════════════════════════════
    //  SECTION 8 — TOURNAMENTS
    // ══════════════════════════════════════════════════════════
    startTournament({ ROUNDS }) {
      STATE.tournamentActive  = true;
      STATE.tournamentRound   = 1;
      STATE.tournamentWins    = 0;
      STATE.tournamentLosses  = 0;
      STATE._tournamentMaxRounds = Math.max(1, Number(ROUNDS));
      unlockAch(31);
    }

    playTournamentMatch({ PID, AID }) {
      if (!STATE.tournamentActive) return;
      // Match outcome based on overall card ratings + morale
      const pRating = this.getCardOverall({ ID: PID }) + (STATE.morale / 10);
      const aRating = this.getCardOverall({ ID: AID }) * this.getAIDifficultyMultiplier();
      const pWins   = pRating + Math.random() * 20 > aRating + Math.random() * 20;
      STATE._lastTournamentResult = pWins ? "WIN" : "LOSE";
      if (pWins) {
        STATE.tournamentWins++;
        this.addCoins({ AMT: this.getTournamentReward({ R: STATE.tournamentRound }) });
        this.awardXP({ ID: PID, XP: 120 });
        STATE.tournamentRound++;
        if (STATE.tournamentRound > STATE._tournamentMaxRounds) this.endTournament();
      } else {
        STATE.tournamentLosses++;
        this.endTournament();
      }
    }

    getTournamentResult() { return STATE._lastTournamentResult ?? "NONE"; }
    isTournamentActive()  { return !!STATE.tournamentActive; }
    getTournamentRound()  { return STATE.tournamentRound ?? 0; }
    getTournamentWins()   { return STATE.tournamentWins  ?? 0; }

    getTournamentReward({ R }) {
      return [50, 100, 200, 400, 800, 1500][Math.min(Number(R) - 1, 5)] ?? 50;
    }

    endTournament() {
      if (STATE.tournamentWins >= (STATE._tournamentMaxRounds ?? 4)) {
        STATE.tournamentsWon++;
        unlockAch(32);
        if (STATE.tournamentsWon >= 3) unlockAch(33);
      }
      STATE.tournamentActive = false;
      checkAutoAchievements();
    }

    totalTournamentsWon() { return STATE.tournamentsWon; }

    // ══════════════════════════════════════════════════════════
    //  SECTION 9 — DAILY CHALLENGES
    // ══════════════════════════════════════════════════════════
    initDailyChallenge() {
      const today = Math.floor(Date.now() / 86400000);
      // Pick challenge based on day number so it changes each day
      const ch = DAILY_CHALLENGE_POOL[today % DAILY_CHALLENGE_POOL.length];
      STATE.dailyChallengeType     = ch.type;
      STATE.dailyChallengeTarget   = ch.target;
      STATE.dailyChallengeProgress = 0;
      STATE.dailyChallengeComplete = false;
      STATE._dailyText             = ch.text;
      STATE._dailyRewardXP         = ch.rewardXP;
      STATE._dailyRewardCoins      = ch.rewardCoins;
      STATE._dailyClaimed          = false;
      if (STATE.lastDailyReset !== today) {
        STATE.lastDailyReset = today;
        // Increment streak if they completed yesterday's challenge
        if (STATE._completedYesterday) STATE.dailyStreak++;
        else STATE.dailyStreak = 0;
      }
    }

    addDailyChallengeProgress({ AMT }) {
      if (STATE.dailyChallengeComplete) return;
      STATE.dailyChallengeProgress = Math.min(
        (STATE.dailyChallengeProgress ?? 0) + Number(AMT),
        STATE.dailyChallengeTarget ?? 1
      );
      if (STATE.dailyChallengeProgress >= (STATE.dailyChallengeTarget ?? 1)) {
        STATE.dailyChallengeComplete  = true;
        STATE._completedYesterday     = true;
        unlockAch(34);
        checkAutoAchievements();
      }
    }

    isDailyChallengeComplete() { return !!STATE.dailyChallengeComplete; }

    claimDailyReward() {
      if (!STATE.dailyChallengeComplete || STATE._dailyClaimed) return;
      STATE._dailyClaimed = true;
      this.addCoins({ AMT: STATE._dailyRewardCoins ?? 50 });
      // Award XP to equipped card
      const equipped = STATE.equippedCards[0];
      if (equipped != null) this.awardXP({ ID: equipped, XP: STATE._dailyRewardXP ?? 100 });
    }

    getDailyChallengeText()     { return STATE._dailyText   ?? "No challenge active"; }
    getDailyStreak()            { return STATE.dailyStreak  ?? 0; }
    getDailyRewardXP()          { return STATE._dailyRewardXP   ?? 0; }
    getDailyRewardCoins()       { return STATE._dailyRewardCoins ?? 0; }

    getDailyChallengeProgress() {
      return `${STATE.dailyChallengeProgress ?? 0} / ${STATE.dailyChallengeTarget ?? 1}`;
    }

    // ══════════════════════════════════════════════════════════
    //  SECTION 10 — MORALE & FITNESS
    // ══════════════════════════════════════════════════════════
    changeMorale({ AMT })    { STATE.morale    = Math.max(0, Math.min(100, STATE.morale    + Number(AMT))); }
    changeFitness({ AMT })   { STATE.fitness   = Math.max(0, Math.min(100, STATE.fitness   + Number(AMT))); }
    changeConfidence({ AMT }){ STATE.confidence= Math.max(0, Math.min(100, STATE.confidence+ Number(AMT))); }

    getMorale()    { return STATE.morale;     }
    getFitness()   { return STATE.fitness;    }
    getConfidence(){ return STATE.confidence; }

    getMoraleBonus() {
      // +0% at morale 50, up to +20% at morale 100, -20% at morale 0
      return Math.round((STATE.morale - 50) * 0.4);
    }

    getMoraleTier() {
      const m = STATE.morale;
      if (m >= 90) return "Peak";
      if (m >= 70) return "High";
      if (m >= 40) return "OK";
      if (m >= 20) return "Low";
      return "Terrible";
    }

    restRonaldo() {
      STATE.fitness    = Math.min(100, STATE.fitness    + 30);
      STATE.morale     = Math.min(100, STATE.morale     + 15);
      STATE.confidence = Math.min(100, STATE.confidence + 10);
      STATE.stamina    = 100;
    }

    // ══════════════════════════════════════════════════════════
    //  SECTION 11 — STADIUM & WEATHER
    // ══════════════════════════════════════════════════════════
    setStadium({ STADIUM }) { STATE.stadium = STADIUM; }
    setWeather({ WEATHER }) { STATE.weather = WEATHER; }
    getStadium()            { return STATE.stadium; }
    getWeather()            { return STATE.weather; }

    getStadiumPaceModifier() {
      return STADIUMS[STATE.stadium]?.paceMod ?? 1.0;
    }

    getWeatherShootModifier() {
      return WEATHER_DB[STATE.weather]?.shootMod ?? 1.0;
    }

    isBadWeather() {
      return ["Rain","Wind","Snow","Storm"].includes(STATE.weather);
    }

    randomiseWeather() {
      const options = Object.keys(WEATHER_DB);
      STATE.weather = options[Math.floor(Math.random() * options.length)];
    }

    randomiseStadium() {
      const options = Object.keys(STADIUMS);
      STATE.stadium = options[Math.floor(Math.random() * options.length)];
    }

    // ══════════════════════════════════════════════════════════
    //  SECTION 12 — TRANSFER MARKET
    // ══════════════════════════════════════════════════════════
    getCoins() { return STATE.coins; }
    getGems()  { return STATE.gems;  }

    addCoins({ AMT }) {
      STATE.coins = Math.max(0, STATE.coins + Number(AMT));
      checkAutoAchievements();
    }

    spendCoins({ AMT }) {
      if (STATE.coins >= Number(AMT)) {
        STATE.coins -= Number(AMT);
        unlockAch(37);
        return true;
      }
      return false;
    }

    buyCard({ ID }) {
      const cost = this.getCardBaseValue({ ID });
      if (this.spendCoins({ AMT: cost })) {
        giveCard(Number(ID));
        checkAutoAchievements();
        return true;
      }
      return false;
    }

    sellCard({ ID }) {
      const i = cardIdx(ID);
      if (i === -1) return;
      const earn = this.getSellValue({ ID });
      this.addCoins({ AMT: earn });
      spliceCard(i);
    }

    getSellValue({ ID }) {
      const base  = this.getCardBaseValue({ ID });
      const lvl   = this.getCardLevel({ ID });
      const prest = this.getCardPrestige({ ID });
      const stage = this.getEvoStage({ ID });
      return Math.round(base * (1 + lvl * 0.05 + prest * 0.2 + stage * 0.3));
    }

    listCardOnMarket({ ID, PRICE }) {
      STATE.marketListings.push({ cardId: Number(ID), price: Number(PRICE), seller: "player" });
      unlockAch(39);
    }

    getMarketListingCount() { return STATE.marketListings.length; }

    getMarketListingInfo({ N }) {
      const entry = STATE.marketListings[Number(N) - 1];
      if (!entry) return "-";
      return `${this.getCardName({ ID: entry.cardId })} — ${entry.price} coins`;
    }

    // ══════════════════════════════════════════════════════════
    //  SECTION 13 — SCORE & COMBOS
    // ══════════════════════════════════════════════════════════
    scoreGoal({ ID, COMBO }) {
      STATE.goalCount++;
      STATE.combo     = Math.min((STATE.combo ?? 0) + 1, 10);
      STATE.comboTimer = 180;   // ~3 seconds at 60fps

      const moraleBonus = 1 + (this.getMoraleBonus() / 100);
      const pts = Math.round(100 * Number(COMBO) * STATE.combo * moraleBonus);
      STATE.score = (STATE.score ?? 0) + pts;

      // Track card-specific stats
      const i = cardIdx(ID);
      if (i !== -1) STATE.goalsWithCard[i] = (STATE.goalsWithCard[i] ?? 0) + 1;

      this.awardXP({ ID, XP: 50 });
      this.awardShards({ ID, SHARDS: 2 });
      this.changeMorale({ AMT: 5 });
      this.changeConfidence({ AMT: 3 });

      // Daily challenge tracking
      if (STATE.dailyChallengeType === "goals") this.addDailyChallengeProgress({ AMT: 1 });
      if (STATE.dailyChallengeType === "combo" && STATE.combo >= STATE.dailyChallengeTarget)
        this.addDailyChallengeProgress({ AMT: 1 });

      checkAutoAchievements();
    }

    resetCombo() {
      STATE.combo      = 0;
      STATE.comboTimer = 0;
      this.changeConfidence({ AMT: -5 });
    }

    tickComboTimer() {
      if (STATE.comboTimer > 0) {
        STATE.comboTimer--;
        if (STATE.comboTimer === 0) STATE.combo = 0;
      }
    }

    getScore()      { return STATE.score     ?? 0; }
    getGoalCount()  { return STATE.goalCount ?? 0; }
    getCombo()      { return STATE.combo     ?? 0; }
    getComboTimer() { return STATE.comboTimer ?? 0; }

    getPointsForGoal({ C }) {
      return 100 * Number(C) * Number(C);
    }

    getCrowdChantLevel() {
      return Math.min(10, Math.floor((STATE.score ?? 0) / 500));
    }

    getMatchRating() {
      const goals = STATE.goalCount ?? 0;
      const maxCombo = STATE.combo  ?? 0;
      const rating = Math.min(10, Math.floor(goals * 1.2 + maxCombo * 0.5));
      return Math.max(1, rating);
    }

    // ══════════════════════════════════════════════════════════
    //  SECTION 14 — ACHIEVEMENTS
    // ══════════════════════════════════════════════════════════
    unlockAchievement({ N }) {
      unlockAch(Number(N));
      STATE._newestAchievement = STATE.achievementNames[Number(N) - 1] ?? `Achievement #${N}`;
    }

    checkAchievement({ N }) { return STATE.achievements[Number(N) - 1] === 1; }

    getAchievementName({ N }) {
      return STATE.achievementNames[Number(N) - 1] ?? `Achievement #${N}`;
    }

    totalAchievementsUnlocked() {
      return STATE.achievements.filter(a => a === 1).length;
    }

    achievementPercent() {
      return Math.round((this.totalAchievementsUnlocked() / 40) * 100);
    }

    autoCheckAchievements() { checkAutoAchievements(); }

    getNewestAchievement() {
      return STATE._newestAchievement ?? "None yet";
    }

    // ══════════════════════════════════════════════════════════
    //  SECTION 15 — SAVE & LOAD
    // ══════════════════════════════════════════════════════════
    saveGame({ SLOT }) {
      try {
        const snapshot = Object.assign({}, STATE, { _savedAt: new Date().toLocaleString() });
        localStorage.setItem(`cr7goat_save_${SLOT}`, JSON.stringify(snapshot));
        STATE.lastSavedSlot = Number(SLOT);
      } catch (e) { /* localStorage not available in all environments */ }
    }

    loadGame({ SLOT }) {
      try {
        const raw = localStorage.getItem(`cr7goat_save_${SLOT}`);
        if (raw) Object.assign(STATE, JSON.parse(raw));
      } catch (e) {}
    }

    deleteSave({ SLOT }) {
      try { localStorage.removeItem(`cr7goat_save_${SLOT}`); } catch (e) {}
    }

    isSaveSlotUsed({ SLOT }) {
      try { return !!localStorage.getItem(`cr7goat_save_${SLOT}`); } catch (e) { return false; }
    }

    getSaveInfo({ SLOT }) {
      try {
        const raw = localStorage.getItem(`cr7goat_save_${SLOT}`);
        if (raw) {
          const s = JSON.parse(raw);
          return `Slot ${SLOT}: ${s.ownedCards?.length ?? 0} cards  ${s.goalCount ?? 0} goals  ${s.coins ?? 0} coins  [${s._savedAt ?? "?"}]`;
        }
      } catch (e) {}
      return `Slot ${SLOT}: Empty`;
    }

    // ══════════════════════════════════════════════════════════
    //  SECTION 16 — HUD & DISPLAY
    // ══════════════════════════════════════════════════════════
    getCardHUDString({ ID }) {
      const card = CARD_DB[Number(ID)];
      if (!card) return "No card equipped";
      const nick  = this.getCardNickname({ ID });
      const lvl   = this.getCardLevel({ ID });
      const stage = this.getEvoStageName({ ID });
      const path  = this.getChosenPath({ ID });
      const shards= this.getShards({ ID });
      const prest = "*".repeat(this.getCardPrestige({ ID }));
      return `${nick} | Lv.${lvl}${prest} | ${stage} | ${path} | Shards:${shards}`;
    }

    getCardShortLabel({ ID }) {
      const name = this.getCardName({ ID });
      const lvl  = this.getCardLevel({ ID });
      return `${name} Lv.${lvl}`;
    }

    getStatsString({ ID }) {
      const s = stat => computeStat(ID, stat);
      return `PAC:${s("pace")} SHO:${s("shooting")} DRI:${s("dribbling")} DEF:${s("defense")} PHY:${s("physical")}`;
    }

    getEvoColor({ ID }) {
      const COLORS = {
        "Speed Demon Path":      "#00ccff",
        "Goal Machine Path":     "#ff6600",
        "Defensive Legend Path": "#00cc44",
        "Ultimate Siuuu Path":   "#ffcc00",
        "None":                  "#ffffff",
      };
      return COLORS[this.getChosenPath({ ID })] ?? "#ffffff";
    }

    getAuraIntensity({ ID }) {
      return Math.min(100, this.getEvoStage({ ID }) * 25 + this.getCardPrestige({ ID }) * 5);
    }

    getPrestigeStars({ ID }) {
      return "*".repeat(this.getCardPrestige({ ID })) || "-";
    }

    getRarityColor({ R }) {
      return { Common: "#aaaaaa", Rare: "#3399ff", Epic: "#aa44ff", Legend: "#ffaa00", Mythic: "#ff2244" }[R] ?? "#ffffff";
    }

    getScoreboardString({ G, C, S }) {
      return `Goals: ${G}  Combo: x${C}  Score: ${S}`;
    }

    getWeatherIcon() {
      return { Clear: "C", Rain: "R", Wind: "W", Snow: "S", Night: "N", Storm: "T" }[STATE.weather] ?? "?";
    }

    // ══════════════════════════════════════════════════════════
    //  SECTION 17 — DEBUG & UTILITY
    // ══════════════════════════════════════════════════════════
    resetMatch({ MODE }) {
      STATE.score     = 0;
      STATE.goalCount = 0;
      STATE.combo     = 0;
      STATE.comboTimer= 0;
      STATE.stamina   = 100;
      STATE.currentMode = MODE;
      this.initPhysics();
      this.resetAllDefenders();
    }

    setDifficulty({ DIFF }) { STATE.difficulty = DIFF; }
    getDifficulty()         { return STATE.difficulty; }

    debugCardDump({ ID }) {
      const i = cardIdx(ID);
      if (i === -1) return `Card ${ID} not in player's collection.`;
      return JSON.stringify({
        id:           ID,
        name:         this.getCardName({ ID }),
        rarity:       this.getCardRarity({ ID }),
        era:          this.getCardEra({ ID }),
        level:        STATE.cardLevels[i],
        xp:           STATE.cardXP[i],
        xpNeeded:     this.getXPNeeded({ ID }),
        prestige:     STATE.cardPrestige[i],
        upgradePoints:STATE.cardUpgradePoints[i],
        statBoosts:   STATE.cardStatBoosts[i],
        chosenPath:   STATE.chosenPath[i],
        evoStage:     STATE.evolutionStage[i],
        stageName:    this.getEvoStageName({ ID }),
        shards:       STATE.evolutionShards[i],
        ability:      this.getPathAbility({ ID }),
        goals:        STATE.goalsWithCard[i],
        racesWon:     STATE.racesWonWithCard[i],
        pathProgress: this.getPathProgress({ ID }),
        overall:      this.getCardOverall({ ID }),
        sellValue:    this.getSellValue({ ID }),
      });
    }

    debugStateDump() {
      return JSON.stringify({
        cardsOwned:    STATE.ownedCards.length,
        coins:         STATE.coins,
        gems:          STATE.gems,
        score:         STATE.score,
        goals:         STATE.goalCount,
        combo:         STATE.combo,
        morale:        STATE.morale,
        fitness:       STATE.fitness,
        confidence:    STATE.confidence,
        stadium:       STATE.stadium,
        weather:       STATE.weather,
        difficulty:    STATE.difficulty,
        dailyStreak:   STATE.dailyStreak,
        tournamentsWon:STATE.tournamentsWon,
        totalRaceWins: STATE.totalRaceWins,
        achievements:  this.totalAchievementsUnlocked() + "/40",
        collectionPct: this.collectionPercent() + "%",
      });
    }

    giveAllCards() {
      CARD_DB.forEach(c => giveCard(c[0]));
      checkAutoAchievements();
    }

    maxOutCard({ ID }) {
      giveCard(Number(ID));
      const i = cardIdx(ID);
      if (i === -1) return;
      STATE.cardLevels[i]        = 25;
      STATE.cardXP[i]            = 0;
      STATE.cardPrestige[i]      = 5;
      STATE.cardUpgradePoints[i] = 50;
      STATE.evolutionStage[i]    = 3;
      STATE.evolutionShards[i]   = 999;
      if (STATE.chosenPath[i] === null) STATE.chosenPath[i] = "Ultimate Siuuu Path";
      STATE.goalsWithCard[i]    = 99;
      STATE.racesWonWithCard[i] = 99;
      checkAutoAchievements();
    }

    addTestCoins() {
      STATE.coins += 9999;
      STATE.gems  += 99;
      checkAutoAchievements();
    }

    // ══════════════════════════════════════════════════════════
    //  SVG ICONS (Unicode-safe)
    // ══════════════════════════════════════════════════════════
    _menuIcon() {
      return "data:image/svg+xml;base64," + safeBtoa(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">` +
        `<circle cx="20" cy="20" r="19" fill="#d4a017"/>` +
        `<circle cx="20" cy="20" r="14" fill="none" stroke="#fff" stroke-width="2"/>` +
        `<text x="20" y="26" text-anchor="middle" font-size="14" fill="#fff" font-family="Arial" font-weight="bold">CR7</text>` +
        `</svg>`
      );
    }

    _blockIcon() {
      return "data:image/svg+xml;base64," + safeBtoa(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">` +
        `<rect width="40" height="40" rx="6" fill="#8B0000"/>` +
        `<text x="20" y="26" text-anchor="middle" font-size="13" fill="#d4a017" font-family="Arial" font-weight="bold">CR7</text>` +
        `</svg>`
      );
    }
  }

  // Register the extension with TurboWarp / Scratch
  Scratch.extensions.register(new CR7RonaldoGOATExtension());

})(Scratch);
