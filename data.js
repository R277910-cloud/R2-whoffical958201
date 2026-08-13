/* =========================================================
   R2 FOOTBALL GAMES
   data.js
   ========================================================= */

"use strict";

/* =========================================================
   GAME CONFIG
   ========================================================= */

const R2_CONFIG = {
  appName: "R2 Football Games",
  version: "2.0",

  auction: {
    startPrice: 5,
    minBid: 1,
    bigBidStep: 5,
    maxBudget: 2000
  },

  fiveAside: {
    startPrice: 5,
    maxBudget: 2000
  },

  dealOrNoDeal: {
    boxesPerPosition: 4,
    attemptsPerPlayer: 2,
    boxesToOpenPerPosition: 2
  },

  onlineRoom: {
    codeLength: 6
  },

  friendId: {
    length: 16
  }
};


/* =========================================================
   POSITIONS
   ========================================================= */

const R2_POSITIONS = {
  GK: "حارس",
  LB: "ظهير أيسر",
  CB: "قلب دفاع",
  RB: "ظهير أيمن",
  CM: "وسط",
  CAM: "وسط مهاجم",
  RW: "جناح أيمن",
  LW: "جناح أيسر",
  ST: "مهاجم"
};


/* =========================================================
   PRO MAX 11 FORMATION
   ========================================================= */

const PRO_MAX_FORMATION = [
  "GK",
  "LB",
  "CB",
  "CB",
  "RB",
  "CM",
  "CM",
  "CAM",
  "RW",
  "LW",
  "ST"
];


/* =========================================================
   FIVE A SIDE FORMATION
   ========================================================= */

const FIVE_A_SIDE_FORMATION = [
  "GK",
  "CB",
  "CM",
  "CAM",
  "ST"
];


/* =========================================================
   PLAYERS DATABASE
   ========================================================= */

const PLAYERS = [

  /* =======================================================
     GK
     ======================================================= */

  {
    id: "gk-001",
    name: "ليف ياشين",
    position: "GK",
    overall: 99
  },
  {
    id: "gk-002",
    name: "جانلويجي بوفون",
    position: "GK",
    overall: 99
  },
  {
    id: "gk-003",
    name: "إيكر كاسياس",
    position: "GK",
    overall: 99
  },
  {
    id: "gk-004",
    name: "بيتر تشيك",
    position: "GK",
    overall: 98
  },
  {
    id: "gk-005",
    name: "بيتر شمايكل",
    position: "GK",
    overall: 98
  },
  {
    id: "gk-006",
    name: "إدوين فان دير سار",
    position: "GK",
    overall: 98
  },
  {
    id: "gk-007",
    name: "ديفيد دي خيا",
    position: "GK",
    overall: 98
  },
  {
    id: "gk-008",
    name: "تيبو كورتوا",
    position: "GK",
    overall: 98
  },
  {
    id: "gk-009",
    name: "أليسون بيكر",
    position: "GK",
    overall: 97
  },
  {
    id: "gk-010",
    name: "ديدا",
    position: "GK",
    overall: 97
  },
  {
    id: "gk-011",
    name: "إيدرسون",
    position: "GK",
    overall: 95
  },
  {
    id: "gk-012",
    name: "جانلويجي دوناروما",
    position: "GK",
    overall: 94
  },
  {
    id: "gk-013",
    name: "ديفيد رايا",
    position: "GK",
    overall: 94
  },
  {
    id: "gk-014",
    name: "عصام الحضري",
    position: "GK",
    overall: 93
  },
  {
    id: "gk-015",
    name: "محمد الشناوي",
    position: "GK",
    overall: 89
  },
  {
    id: "gk-016",
    name: "مصطفى شوبير",
    position: "GK",
    overall: 87
  },
  {
    id: "gk-017",
    name: "أحمد الشناوي",
    position: "GK",
    overall: 82
  },
  {
    id: "gk-018",
    name: "أندريه أونانا",
    position: "GK",
    overall: 79
  },


  /* =======================================================
     LB
     ======================================================= */

  {
    id: "lb-001",
    name: "روبيرتو كارلوس",
    position: "LB",
    overall: 99
  },
  {
    id: "lb-002",
    name: "مارسيلو",
    position: "LB",
    overall: 99
  },
  {
    id: "lb-003",
    name: "فيليب لام",
    position: "LB",
    overall: 99
  },
  {
    id: "lb-004",
    name: "زامبروتا",
    position: "LB",
    overall: 98
  },
  {
    id: "lb-005",
    name: "نونو مينديش",
    position: "LB",
    overall: 95
  },
  {
    id: "lb-006",
    name: "مارك كوكوريّا",
    position: "LB",
    overall: 95
  },
  {
    id: "lb-007",
    name: "أحمد فتوح",
    position: "LB",
    overall: 83
  },
  {
    id: "lb-008",
    name: "هاتو",
    position: "LB",
    overall: 78
  },


  /* =======================================================
     CB
     ======================================================= */

  {
    id: "cb-001",
    name: "باولو مالديني",
    position: "CB",
    overall: 99
  },
  {
    id: "cb-002",
    name: "فيرجيل فان دايك",
    position: "CB",
    overall: 99
  },
  {
    id: "cb-003",
    name: "فرانز بيكنباور",
    position: "CB",
    overall: 99
  },
  {
    id: "cb-004",
    name: "فرانكو باريزي",
    position: "CB",
    overall: 99
  },
  {
    id: "cb-005",
    name: "فابيو كانافارو",
    position: "CB",
    overall: 99
  },
  {
    id: "cb-006",
    name: "كيليني",
    position: "CB",
    overall: 99
  },
  {
    id: "cb-007",
    name: "بوبي مور",
    position: "CB",
    overall: 99
  },
  {
    id: "cb-008",
    name: "ريو فيرديناند",
    position: "CB",
    overall: 99
  },
  {
    id: "cb-009",
    name: "جون تيري",
    position: "CB",
    overall: 98
  },
  {
    id: "cb-010",
    name: "جابريال ماجاليس",
    position: "CB",
    overall: 95
  },
  {
    id: "cb-011",
    name: "ويليام ساليبا",
    position: "CB",
    overall: 94
  },
  {
    id: "cb-012",
    name: "دين هاوسين",
    position: "CB",
    overall: 93
  },
  {
    id: "cb-013",
    name: "إبراهيما كوناتي",
    position: "CB",
    overall: 92
  },
  {
    id: "cb-014",
    name: "ماركينيوس",
    position: "CB",
    overall: 93
  },
  {
    id: "cb-015",
    name: "وائل جمعة",
    position: "CB",
    overall: 93
  },
  {
    id: "cb-016",
    name: "إبراهيم حسن",
    position: "CB",
    overall: 93
  },
  {
    id: "cb-017",
    name: "ياسر إبراهيم",
    position: "CB",
    overall: 84
  },
  {
    id: "cb-018",
    name: "رامي ربيعة",
    position: "CB",
    overall: 83
  },
  {
    id: "cb-019",
    name: "إريك داير",
    position: "CB",
    overall: 80
  },
  {
    id: "cb-020",
    name: "هاري ماجواير",
    position: "CB",
    overall: 78
  },


  /* =======================================================
     RB
     ======================================================= */

  {
    id: "rb-001",
    name: "كافو",
    position: "RB",
    overall: 99
  },
  {
    id: "rb-002",
    name: "زانيتي",
    position: "RB",
    overall: 99
  },
  {
    id: "rb-003",
    name: "داني كارفاخال",
    position: "RB",
    overall: 99
  },
  {
    id: "rb-004",
    name: "داني ألفيس",
    position: "RB",
    overall: 99
  },
  {
    id: "rb-005",
    name: "أرنولد",
    position: "RB",
    overall: 95
  },
  {
    id: "rb-006",
    name: "نصير مزراوي",
    position: "RB",
    overall: 85
  },
  {
    id: "rb-007",
    name: "محمد هاني",
    position: "RB",
    overall: 83
  },
  {
    id: "rb-008",
    name: "ديوغو دالوت",
    position: "RB",
    overall: 80
  },


  /* =======================================================
     CM
     ======================================================= */

  {
    id: "cm-001",
    name: "زين الدين زيدان",
    position: "CM",
    overall: 99
  },
  {
    id: "cm-002",
    name: "رود خوليت",
    position: "CM",
    overall: 99
  },
  {
    id: "cm-003",
    name: "لوثار ماتيوس",
    position: "CM",
    overall: 99
  },
  {
    id: "cm-004",
    name: "باتريك فييرا",
    position: "CM",
    overall: 99
  },
  {
    id: "cm-005",
    name: "توني كروس",
    position: "CM",
    overall: 99
  },
  {
    id: "cm-006",
    name: "أندريس إنييستا",
    position: "CM",
    overall: 99
  },
  {
    id: "cm-007",
    name: "لوكا مودريتش",
    position: "CM",
    overall: 99
  },
  {
    id: "cm-008",
    name: "تشافي هيرنانديز",
    position: "CM",
    overall: 99
  },
  {
    id: "cm-009",
    name: "تشابي ألونسو",
    position: "CM",
    overall: 99
  },
  {
    id: "cm-010",
    name: "مايكل بالاك",
    position: "CM",
    overall: 98
  },
  {
    id: "cm-011",
    name: "كلارنس سيدورف",
    position: "CM",
    overall: 98
  },
  {
    id: "cm-012",
    name: "جود بيلينجهام",
    position: "CM",
    overall: 96
  },
  {
    id: "cm-013",
    name: "بيدري",
    position: "CM",
    overall: 96
  },
  {
    id: "cm-014",
    name: "برناردو سيلفا",
    position: "CM",
    overall: 94
  },
  {
    id: "cm-015",
    name: "جافي",
    position: "CM",
    overall: 92
  },
  {
    id: "cm-016",
    name: "الخطيب",
    position: "CM",
    overall: 94
  },
  {
    id: "cm-017",
    name: "إمام عاشور",
    position: "CM",
    overall: 87
  },
  {
    id: "cm-018",
    name: "فرانك ريكارد",
    position: "CM",
    overall: 98
  },


  /* =======================================================
     CAM
     ======================================================= */

  {
    id: "cam-001",
    name: "يوهان كرويف",
    position: "CAM",
    overall: 99
  },
  {
    id: "cam-002",
    name: "كاكا",
    position: "CAM",
    overall: 99
  },
  {
    id: "cam-003",
    name: "دييغو مارادونا",
    position: "CAM",
    overall: 99
  },
  {
    id: "cam-004",
    name: "زيكو",
    position: "CAM",
    overall: 99
  },
  {
    id: "cam-005",
    name: "روبرتو باجيو",
    position: "CAM",
    overall: 99
  },
  {
    id: "cam-006",
    name: "ميشيل بلاتيني",
    position: "CAM",
    overall: 99
  },
  {
    id: "cam-007",
    name: "جورجي هاجي",
    position: "CAM",
    overall: 97
  },
  {
    id: "cam-008",
    name: "كيفين دي بروين",
    position: "CAM",
    overall: 97
  },
  {
    id: "cam-009",
    name: "فلوريان فيرتز",
    position: "CAM",
    overall: 95
  },
  {
    id: "cam-010",
    name: "جود بيلينجهام",
    position: "CAM",
    overall: 95
  },
  {
    id: "cam-011",
    name: "جمال موسيالا",
    position: "CAM",
    overall: 94
  },
  {
    id: "cam-012",
    name: "إيسكو",
    position: "CAM",
    overall: 91
  },
  {
    id: "cam-013",
    name: "فيليبي كوتينيو",
    position: "CAM",
    overall: 90
  },
  {
    id: "cam-014",
    name: "ديلي آلي",
    position: "CAM",
    overall: 81
  },
  {
    id: "cam-015",
    name: "لينغارد",
    position: "CAM",
    overall: 79
  },


  /* =======================================================
     RW
     ======================================================= */

  {
    id: "rw-001",
    name: "ليونيل ميسي",
    position: "RW",
    overall: 99
  },
  {
    id: "rw-002",
    name: "لويس فيجو",
    position: "RW",
    overall: 99
  },
  {
    id: "rw-003",
    name: "جورج بست",
    position: "RW",
    overall: 99
  },
  {
    id: "rw-004",
    name: "محمد صلاح",
    position: "RW",
    overall: 99
  },
  {
    id: "rw-005",
    name: "جارينشيا",
    position: "RW",
    overall: 99
  },
  {
    id: "rw-006",
    name: "جارزينيو",
    position: "RW",
    overall: 99
  },
  {
    id: "rw-007",
    name: "بوكايو ساكا",
    position: "RW",
    overall: 85
  },
  {
    id: "rw-008",
    name: "لامين يامال",
    position: "RW",
    overall: 87
  },
  {
    id: "rw-009",
    name: "عثمان ديمبيلي",
    position: "RW",
    overall: 87
  },
  {
    id: "rw-010",
    name: "مايكل أوليسي",
    position: "RW",
    overall: 87
  },
  {
    id: "rw-011",
    name: "أنتوني",
    position: "RW",
    overall: 83
  },
  {
    id: "rw-012",
    name: "سيرج غنابري",
    position: "RW",
    overall: 82
  },
  {
    id: "rw-013",
    name: "سانشو",
    position: "RW",
    overall: 80
  },


  /* =======================================================
     LW
     ======================================================= */

  {
    id: "lw-001",
    name: "كريستيانو رونالدو",
    position: "LW",
    overall: 99
  },
  {
    id: "lw-002",
    name: "نيمار",
    position: "LW",
    overall: 99
  },
  {
    id: "lw-003",
    name: "رونالدينيو",
    position: "LW",
    overall: 99
  },
  {
    id: "lw-004",
    name: "ريفالدو",
    position: "LW",
    overall: 99
  },
  {
    id: "lw-005",
    name: "هازارد",
    position: "LW",
    overall: 99
  },
  {
    id: "lw-006",
    name: "كفاراتسخيليا",
    position: "LW",
    overall: 96
  },
  {
    id: "lw-007",
    name: "فينيسيوس جونيور",
    position: "LW",
    overall: 96
  },
  {
    id: "lw-008",
    name: "ماركوس راشفورد",
    position: "LW",
    overall: 82
  },
  {
    id: "lw-009",
    name: "أنسو فاتي",
    position: "LW",
    overall: 80
  },
  {
    id: "lw-010",
    name: "رحيم ستيرلينغ",
    position: "LW",
    overall: 80
  },


  /* =======================================================
     ST
     ======================================================= */

  {
    id: "st-001",
    name: "رونالدو الظاهرة",
    position: "ST",
    overall: 99
  },
  {
    id: "st-002",
    name: "فان باستن",
    position: "ST",
    overall: 99
  },
  {
    id: "st-003",
    name: "غيرد مولر",
    position: "ST",
    overall: 99
  },
  {
    id: "st-004",
    name: "أوزيبيو",
    position: "ST",
    overall: 99
  },
  {
    id: "st-005",
    name: "تييري هنري",
    position: "ST",
    overall: 99
  },
  {
    id: "st-006",
    name: "كريم بنزيما",
    position: "ST",
    overall: 99
  },
  {
    id: "st-007",
    name: "زلاتان إبراهيموفيتش",
    position: "ST",
    overall: 99
  },
  {
    id: "st-008",
    name: "كيليان مبابي",
    position: "ST",
    overall: 98
  },
  {
    id: "st-009",
    name: "هاري كين",
    position: "ST",
    overall: 97
  },
  {
    id: "st-010",
    name: "فيكتور جيوكيريس",
    position: "ST",
    overall: 95
  },
  {
    id: "st-011",
    name: "لوكاكو",
    position: "ST",
    overall: 84
  },
  {
    id: "st-012",
    name: "ألفارو موراتا",
    position: "ST",
    overall: 82
  }

];


/* =========================================================
   SPANISH LEAGUE EVENT
   ========================================================= */

const EVENTS = {
  spanishLeague: {
    id: "spanish-league",
    title: "حدث الدوري الإسباني",
    country: "🇪🇸 SPAIN",

    weeks: [
      {
        week: 1,
        active: true,
        title: "الأسبوع 1",
        status: "فعال الآن",

        players: [
          {
            id: "event-001",
            name: "ديفيد بيكهام",
            position: "CM",
            overall: 101,
            eventOnly: true
          },
          {
            id: "event-002",
            name: "رافينيا",
            position: "RW",
            overall: 100,
            eventOnly: true
          },
          {
            id: "event-003",
            name: "فينيسيوس",
            position: "LW",
            overall: 100,
            eventOnly: true
          },
          {
            id: "event-004",
            name: "مايكل لاودروب",
            position: "CAM",
            overall: 101,
            eventOnly: true
          }
        ]
      },

      {
        week: 2,
        active: false,
        title: "الأسبوع 2",
        status: "قريبًا",
        players: []
      },

      {
        week: 3,
        active: false,
        title: "الأسبوع 3",
        status: "قريبًا",
        players: []
      },

      {
        week: 4,
        active: false,
        title: "الأسبوع 4",
        status: "قريبًا",
        players: []
      }
    ]
  }
};


/* =========================================================
   PLAYER HELPERS
   ========================================================= */

function getPlayersByPosition(position) {
  return PLAYERS.filter(player => player.position === position);
}


function getPlayerById(id) {
  return PLAYERS.find(player => player.id === id) || null;
}


function getRandomPlayer(position, excludedIds = []) {

  const available = PLAYERS.filter(player => {
    return (
      player.position === position &&
      !excludedIds.includes(player.id)
    );
  });

  if (!available.length) {
    return null;
  }

  const index = Math.floor(Math.random() * available.length);

  return available[index];
}


/* =========================================================
   DUPLICATE PROTECTION
   ========================================================= */

function getAvailablePlayers(position, usedPlayerIds = []) {

  return PLAYERS.filter(player => {
    return (
      player.position === position &&
      !usedPlayerIds.includes(player.id)
    );
  });

}


/* =========================================================
   AUCTION PLAYER POOL
   ========================================================= */

function createAuctionPool(formation, usedPlayerIds = []) {

  return formation.map((position, slotIndex) => {

    const available = getAvailablePlayers(
      position,
      usedPlayerIds
    );

    if (!available.length) {
      return {
        slot: slotIndex + 1,
        position,
        player: null
      };
    }

    const randomIndex =
      Math.floor(Math.random() * available.length);

    return {
      slot: slotIndex + 1,
      position,
      player: available[randomIndex]
    };

  });

}


/* =========================================================
   DEAL OR NO DEAL POOLS
   ========================================================= */

function createDealBoxes(position, excludedIds = []) {

  const available = PLAYERS.filter(player => {
    return (
      player.position === position &&
      !excludedIds.includes(player.id)
    );
  });

  const shuffled = [...available].sort(
    () => Math.random() - 0.5
  );

  return shuffled
    .slice(
      0,
      Math.min(
        R2_CONFIG.dealOrNoDeal.boxesPerPosition,
        shuffled.length
      )
    )
    .map((player, index) => ({
      boxNumber: index + 1,
      opened: false,
      player
    }));

}


/* =========================================================
   EVENT HELPERS
   ========================================================= */

function getEventWeek(weekNumber) {

  return EVENTS.spanishLeague.weeks.find(
    week => week.week === weekNumber
  ) || null;

}


function getActiveEventPlayers() {

  const week = EVENTS.spanishLeague.weeks.find(
    item => item.active
  );

  return week ? week.players : [];

}


/* =========================================================
   RANDOM UTILITY
   ========================================================= */

function shuffleArray(array) {

  return [...array].sort(
    () => Math.random() - 0.5
  );

}


/* =========================================================
   TEAM RATING
   ========================================================= */

function calculateTeamRating(team = []) {

  const players = team.filter(Boolean);

  if (!players.length) {
    return 0;
  }

  const total = players.reduce(
    (sum, player) => sum + Number(player.overall || 0),
    0
  );

  return Math.round(
    total / players.length
  );

}


/* =========================================================
   EXPORT GLOBAL DATA
   ========================================================= */

window.R2_DATA = {
  config: R2_CONFIG,
  positions: R2_POSITIONS,

  formations: {
    proMax: PRO_MAX_FORMATION,
    fiveAside: FIVE_A_SIDE_FORMATION
  },

  players: PLAYERS,
  events: EVENTS,

  helpers: {
    getPlayersByPosition,
    getPlayerById,
    getRandomPlayer,
    getAvailablePlayers,
    createAuctionPool,
    createDealBoxes,
    getEventWeek,
    getActiveEventPlayers,
    shuffleArray,
    calculateTeamRating
  }
};


/* =========================================================
   CONSOLE CHECK
   ========================================================= */

console.log(
  `R2 DATA LOADED — ${PLAYERS.length} players`
);
