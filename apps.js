/* =========================================================
   R2 FOOTBALL GAMES
   app.js — FIXED
   ========================================================= */

"use strict";

/* =========================================================
   GLOBAL STATE
   ========================================================= */

const R2 = {
  screen: "home",
  mode: null,

  players: {
    one: {
      name: "",
      budget: 2000,
      squad: [],
      wildCardUsed: false,
      captain: null
    },

    two: {
      name: "",
      budget: 2000,
      squad: [],
      wildCardUsed: false,
      captain: null
    }
  },

  auction: {
    pool: [],
    index: 0,
    currentPlayer: null,
    currentBid: 5,
    highestBidder: null,
    finished: false
  },

  deal: {
    positionIndex: 0,
    boxes: [],
    opened: [],
    attempts: 1,
    playerOneChoice: null,
    playerTwoChoice: null
  },

  match: {
    scoreOne: 0,
    scoreTwo: 0,
    events: [],
    playerOfMatch: null,
    winner: null,
    finished: false
  },

  online: {
    roomCode: null,
    connected: false,
    host: false
  }
};

/* =========================================================
   DATA
   ========================================================= */

const DATA = window.R2_DATA || {};

const PLAYERS = DATA.players || [];
const POSITIONS = DATA.positions || {};
const FORMATIONS = DATA.formations || {};
const HELPERS = DATA.helpers || {};

const CONFIG = DATA.config || {
  auction: {
    startPrice: 5,
    minBid: 1,
    bigBidStep: 5,
    maxBudget: 2000
  },

  onlineRoom: {
    codeLength: 6
  },

  friendId: {
    length: 16
  }
};

/* =========================================================
   DOM
   ========================================================= */

function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return [...document.querySelectorAll(selector)];
}

function createElement(tag, className = "", text = "") {
  const el = document.createElement(tag);

  if (className) {
    el.className = className;
  }

  if (text !== "") {
    el.textContent = text;
  }

  return el;
}

function clearElement(el) {
  if (el) {
    el.innerHTML = "";
  }
}

/* =========================================================
   STORAGE
   ========================================================= */

const Storage = {

  get(key, fallback = null) {
    try {
      const value = localStorage.getItem(key);

      if (value === null) {
        return fallback;
      }

      return JSON.parse(value);

    } catch {
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(
        key,
        JSON.stringify(value)
      );
    } catch {}
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {}
  }

};

/* =========================================================
   UTILITIES
   ========================================================= */

function random(min, max) {
  return Math.floor(
    Math.random() * (max - min + 1)
  ) + min;
}

function chance(percent) {
  return Math.random() * 100 < percent;
}

function shuffle(array) {
  return [...array].sort(
    () => Math.random() - 0.5
  );
}

function formatMoney(value) {
  const number = Number(value || 0);

  if (number >= 1000) {
    return (
      (number / 1000)
        .toFixed(number % 1000 === 0 ? 0 : 1)
      + " مليار"
    );
  }

  return `${number} مليون`;
}

/* =========================================================
   NOTIFICATION
   ========================================================= */

function notify(message, type = "info") {

  let toast = $(".r2-toast");

  if (!toast) {
    toast = createElement(
      "div",
      "r2-toast"
    );

    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.dataset.type = type;

  toast.classList.add("show");

  clearTimeout(toast._timer);

  toast._timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

/* =========================================================
   SCREEN SYSTEM
   ========================================================= */

function showScreen(screenName) {

  R2.screen = screenName;

  $all("[data-screen]").forEach(screen => {

    screen.classList.toggle(
      "active",
      screen.dataset.screen === screenName
    );

  });

  window.scrollTo({
    top: 0,
    behavior: "instant"
  });
}

function goHome() {
  R2.mode = null;
  showScreen("home");
}

/* =========================================================
   PLAYER CARD
   ========================================================= */

function createPlayerCard(player, options = {}) {

  if (!player) {
    return createElement(
      "div",
      "player-card empty",
      "لا يوجد لاعب"
    );
  }

  const card = createElement(
    "div",
    "player-card"
  );

  card.dataset.playerId = player.id;

  const top = createElement(
    "div",
    "player-card-top"
  );

  top.appendChild(
    createElement(
      "strong",
      "player-rating",
      String(player.overall)
    )
  );

  top.appendChild(
    createElement(
      "span",
      "player-position",
      player.position
    )
  );

  card.appendChild(top);

  card.appendChild(
    createElement(
      "div",
      "player-name",
      player.name
    )
  );

  card.appendChild(
    createElement(
      "small",
      "player-position-name",
      POSITIONS[player.position] || ""
    )
  );

  if (options.price !== undefined) {
    card.appendChild(
      createElement(
        "div",
        "player-price",
        formatMoney(options.price)
      )
    );
  }

  if (options.captain) {
    card.classList.add("captain-card");
  }

  return card;
}

/* =========================================================
   PLAYER LOOKUP
   ========================================================= */

function findPlayer(id) {

  return PLAYERS.find(
    player => player.id === id
  ) || null;

}

/* =========================================================
   NAME SETUP
   ========================================================= */

function setupNames() {

  const p1 = $("#playerOneName");
  const p2 = $("#playerTwoName");

  if (p1) {

    p1.addEventListener(
      "input",
      event => {

        R2.players.one.name =
          event.target.value.trim();

      }
    );

  }

  if (p2) {

    p2.addEventListener(
      "input",
      event => {

        R2.players.two.name =
          event.target.value.trim();

      }
    );

  }

}

/* =========================================================
   RESET GAME
   ========================================================= */

function resetGame() {

  R2.players.one = {
    name: R2.players.one.name,
    budget: 2000,
    squad: [],
    wildCardUsed: false,
    captain: null
  };

  R2.players.two = {
    name: R2.players.two.name,
    budget: 2000,
    squad: [],
    wildCardUsed: false,
    captain: null
  };

  R2.match = {
    scoreOne: 0,
    scoreTwo: 0,
    events: [],
    playerOfMatch: null,
    winner: null,
    finished: false
  };

}

/* =========================================================
   START GAME
   ========================================================= */

function startGame(mode) {

  resetGame();

  R2.mode = mode;

  if (
    mode === "pro-max" ||
    mode === "five-aside"
  ) {

    startAuction(mode);
    return;

  }

  if (mode === "deal") {

    startDeal();
    return;

  }

  notify(
    "وضع اللعب غير معروف",
    "error"
  );

}

/* =========================================================
   AUCTION
   ========================================================= */

function startAuction(mode) {

  const formation =
    mode === "pro-max"
      ? FORMATIONS.proMax
      : FORMATIONS.fiveAside;

  if (!formation || !HELPERS.createAuctionPool) {

    notify(
      "بيانات التشكيلة غير موجودة",
      "error"
    );

    return;
  }

  R2.auction = {

    pool:
      HELPERS.createAuctionPool(
        formation,
        []
      ),

    index: 0,
    currentPlayer: null,
    currentBid:
      CONFIG.auction.startPrice || 5,

    highestBidder: null,
    finished: false

  };

  showScreen("auction");

  renderAuction();
}

/* =========================================================
   AUCTION CURRENT PLAYER
   ========================================================= */

function getAuctionItem() {

  return R2.auction.pool[
    R2.auction.index
  ];

}

function getAuctionPlayer() {

  const item =
    getAuctionItem();

  return item
    ? item.player
    : null;
}

/* =========================================================
   RENDER AUCTION
   ========================================================= */

function renderAuction() {

  const item =
    getAuctionItem();

  if (!item || !item.player) {

    finishAuction();
    return;

  }

  R2.auction.currentPlayer =
    item.player;

  R2.auction.currentBid =
    CONFIG.auction.startPrice || 5;

  R2.auction.highestBidder =
    null;

  const container =
    $("#auctionPlayer");

  if (container) {

    clearElement(container);

    container.appendChild(
      createPlayerCard(
        item.player,
        {
          price:
            R2.auction.currentBid
        }
      )
    );

  }

  updateAuctionUI();
}

/* =========================================================
   AUCTION UI
   ========================================================= */

function updateAuctionUI() {

  const p1Budget =
    $("#playerOneBudget");

  const p2Budget =
    $("#playerTwoBudget");

  if (p1Budget) {

    p1Budget.textContent =
      formatMoney(
        R2.players.one.budget
      );

  }

  if (p2Budget) {

    p2Budget.textContent =
      formatMoney(
        R2.players.two.budget
      );

  }

  const currentBid =
    $("#auctionCurrentBid");

  if (currentBid) {

    currentBid.textContent =
      formatMoney(
        R2.auction.currentBid
      );

  }

  const position =
    $("#auctionPosition");

  const item =
    getAuctionItem();

  if (position && item) {

    position.textContent =
      `${POSITIONS[item.position] || item.position} — لاعب ${item.slot}`;

  }

  renderCurrentAuctionPrice();
}

/* =========================================================
   BID
   ========================================================= */

function addBid(playerNumber, amount) {

  const player =
    R2.players[playerNumber];

  if (!player) return;

  const current =
    Number(R2.auction.currentBid);

  const newBid =
    current + Number(amount);

  if (newBid > player.budget) {

    notify(
      "المبلغ أكبر من ميزانيتك",
      "error"
    );

    return;
  }

  R2.auction.currentBid =
    newBid;

  R2.auction.highestBidder =
    playerNumber;

  updateAuctionUI();

  notify(
    `${player.name || "اللاعب"} رفع المزايدة إلى ${formatMoney(newBid)}`,
    "success"
  );

}

/* =========================================================
   CUSTOM BID
   ========================================================= */

function submitCustomBid(playerNumber) {

  const input =
    $("#auctionCustomBid");

  if (!input) return;

  const amount =
    Number(
      String(input.value)
        .replace(/[^\d.]/g, "")
    );

  if (!amount) {

    notify(
      "اكتب مبلغًا صحيحًا",
      "error"
    );

    return;
  }

  const current =
    Number(R2.auction.currentBid);

  const player =
    R2.players[playerNumber];

  if (!player) return;

  if (amount <= current) {

    notify(
      "لازم تقدم مبلغ أعلى من السعر الحالي",
      "error"
    );

    return;
  }

  if (amount > player.budget) {

    notify(
      "المبلغ أكبر من ميزانيتك",
      "error"
    );

    return;
  }

  R2.auction.currentBid =
    amount;

  R2.auction.highestBidder =
    playerNumber;

  input.value = "";

  updateAuctionUI();
}

/* =========================================================
   RENDER PRICE
   ========================================================= */

function renderCurrentAuctionPrice() {

  const container =
    $("#auctionPlayer");

  const player =
    getAuctionPlayer();

  if (!container || !player) {
    return;
  }

  clearElement(container);

  container.appendChild(
    createPlayerCard(
      player,
      {
        price:
          R2.auction.currentBid
      }
    )
  );
}

/* =========================================================
   AUCTION PASS
   ========================================================= */

function passAuction() {

  const player =
    getAuctionPlayer();

  if (!player) return;

  const bidder =
    R2.auction.highestBidder;

  if (!bidder) {

    notify(
      "لم يقم أي لاعب بالمزايدة",
      "error"
    );

    return;
  }

  const buyer =
    R2.players[bidder];

  const price =
    R2.auction.currentBid;

  if (price > buyer.budget) {

    notify(
      "الميزانية غير كافية",
      "error"
    );

    return;
  }

  buyer.budget -= price;

  buyer.squad.push(player);

  notify(
    `${buyer.name || "اللاعب"} حصل على ${player.name}`,
    "success"
  );

  nextAuctionPlayer();
}

/* =========================================================
   DIRECT GIVE
   ========================================================= */

function givePlayerToOpponent(playerNumber) {

  const player =
    getAuctionPlayer();

  if (!player) return;

  const receiver =
    R2.players[playerNumber];

  if (!receiver) return;

  const price =
    R2.auction.currentBid;

  if (receiver.budget < price) {

    notify(
      "الميزانية غير كافية",
      "error"
    );

    return;
  }

  receiver.budget -= price;

  receiver.squad.push(player);

  nextAuctionPlayer();
}

/* =========================================================
   NEXT AUCTION
   ========================================================= */

function nextAuctionPlayer() {

  R2.auction.index++;

  if (
    R2.auction.index >=
    R2.auction.pool.length
  ) {

    finishAuction();
    return;

  }

  renderAuction();
}

/* =========================================================
   FINISH AUCTION
   ========================================================= */

function finishAuction() {

  R2.auction.finished =
    true;

  renderWildcardScreen();

  showScreen("wildcard");
}

/* =========================================================
   WILDCARD
   ========================================================= */

function renderWildcardScreen() {

  const p1 =
    $("#wildcardPlayerOne");

  const p2 =
    $("#wildcardPlayerTwo");

  if (p1) {

    p1.textContent =
      R2.players.one.name ||
      "اللاعب 1";

  }

  if (p2) {

    p2.textContent =
      R2.players.two.name ||
      "اللاعب 2";

  }

}

/* =========================================================
   USE WILDCARD
   ========================================================= */

function useWildcard(playerNumber, playerId) {

  const team =
    R2.players[playerNumber];

  if (!team) return;

  if (team.wildCardUsed) {

    notify(
      "لقد استخدمت الـ Wild Card بالفعل",
      "error"
    );

    return;
  }

  const index =
    team.squad.findIndex(
      player =>
        player &&
        player.id === playerId
    );

  if (index === -1) {

    notify(
      "اللاعب غير موجود",
      "error"
    );

    return;
  }

  team.wildCardUsed =
    true;

  notify(
    "تم استخدام الـ Wild Card",
    "success"
  );
}

/* =========================================================
   CAPTAIN
   ========================================================= */

function renderCaptainSelection() {

  showScreen("captain");

  renderCaptainTeam(
    "one",
    $("#captainTeamOne")
  );

  renderCaptainTeam(
    "two",
    $("#captainTeamTwo")
  );
}

function renderCaptainTeam(
  playerNumber,
  container
) {

  if (!container) return;

  clearElement(container);

  const team =
    R2.players[playerNumber];

  team.squad.forEach(player => {

    const card =
      createPlayerCard(
        player,
        {
          captain:
            team.captain &&
            team.captain.id === player.id
        }
      );

    card.addEventListener(
      "click",
      () =>
        chooseCaptain(
          playerNumber,
          player
        )
    );

    container.appendChild(card);

  });
}

function chooseCaptain(
  playerNumber,
  player
) {

  if (!player) return;

  R2.players[playerNumber].captain =
    player;

  notify(
    `${player.name} أصبح الكابتن`,
    "success"
  );

  renderCaptainSelection();

  if (
    R2.players.one.captain &&
    R2.players.two.captain
  ) {

    setTimeout(
      simulateMatch,
      400
    );

  }
}

/* =========================================================
   DEAL OR NO DEAL
   ========================================================= */

const DEAL_POSITIONS = [
  "GK",
  "CB",
  "CM",
  "CAM",
  "ST"
];

function startDeal() {

  R2.deal = {

    positionIndex: 0,
    boxes: [],
    opened: [],
    attempts: 1,
    playerOneChoice: null,
    playerTwoChoice: null

  };

  R2.players.one.squad = [];
  R2.players.two.squad = [];

  startDealRound();
}

function startDealRound() {

  const position =
    DEAL_POSITIONS[
      R2.deal.positionIndex
    ];

  if (!position) {

    finishDeal();
    return;
  }

  const usedIds = [

    ...R2.players.one.squad,
    ...R2.players.two.squad

  ]
    .filter(Boolean)
    .map(player => player.id);

  R2.deal.boxes =
    HELPERS.createDealBoxes
      ? HELPERS.createDealBoxes(
          position,
          usedIds
        )
      : [];

  R2.deal.opened = [];

  showScreen("deal");

  renderDealRound();
}

function renderDealRound() {

  const position =
    DEAL_POSITIONS[
      R2.deal.positionIndex
    ];

  const title =
    $("#dealPosition");

  if (title) {

    title.textContent =
      `${POSITIONS[position] || position}`;

  }

  const container =
    $("#dealBoxes");

  if (!container) return;

  clearElement(container);

  R2.deal.boxes.forEach(box => {

    const button =
      createElement(
        "button",
        "deal-box",
        `BOX ${box.boxNumber}`
      );

    button.addEventListener(
      "click",
      () =>
        openDealBox(
          box.boxNumber
        )
    );

    container.appendChild(button);

  });
}

function openDealBox(boxNumber) {

  if (
    R2.deal.opened.length >= 2
  ) {

    notify(
      "مسموح بفتح بوكسين فقط",
      "error"
    );

    return;
  }

  if (
    R2.deal.opened.includes(
      boxNumber
    )
  ) {
    return;
  }

  const box =
    R2.deal.boxes.find(
      item =>
        item.boxNumber === boxNumber
    );

  if (!box) return;

  box.opened = true;

  R2.deal.opened.push(
    boxNumber
  );

  renderDealRound();

  R2.deal.opened.forEach(number => {

    const opened =
      R2.deal.boxes.find(
        box =>
          box.boxNumber === number
      );

    if (!opened) return;

    const button =
      document.querySelector(
        `.deal-box:nth-child(${number})`
      );

    if (!button) return;

    button.classList.add("opened");

    clearElement(button);

    button.appendChild(
      createPlayerCard(
        opened.player
      )
    );

  });
}

/* =========================================================
   DEAL CHOICE
   ========================================================= */

function getLastOpenedPlayer() {

  const last =
    R2.deal.opened[
      R2.deal.opened.length - 1
    ];

  const box =
    R2.deal.boxes.find(
      item =>
        item.boxNumber === last
    );

  return box
    ? box.player
    : null;
}

function dealChoice(
  playerNumber,
  choice
) {

  if (
    R2.deal.opened.length < 2
  ) {

    notify(
      "افتح بوكسين أولًا",
      "error"
    );

    return;
  }

  const player =
    getLastOpenedPlayer();

  if (!player) return;

  if (choice === "DEAL") {

    R2.players[playerNumber].squad.push(
      player
    );

    if (playerNumber === "one") {

      R2.deal.playerOneChoice =
        player;

    } else {

      R2.deal.playerTwoChoice =
        player;

    }

    notify(
      `${player.name} انضم إلى التشكيلة`,
      "success"
    );

    return;
  }

  if (choice === "NO DEAL") {

    if (
      R2.deal.attempts >= 2
    ) {

      notify(
        "هذه آخر محاولة",
        "error"
      );

      return;
    }

    R2.deal.attempts++;

    startDealRound();
  }
}

/* =========================================================
   FINISH DEAL
   ========================================================= */

function finishDeal() {

  renderWildcardScreen();

  showScreen("wildcard");
}

/* =========================================================
   AI
   ========================================================= */

const AI_LEVELS = {

  beginner: {
    name: "مبتدئ",
    accuracy: 0.45,
    aggression: 0.35
  },

  amateur: {
    name: "هاوي",
    accuracy: 0.55,
    aggression: 0.45
  },

  semiPro: {
    name: "نصف محترف",
    accuracy: 0.65,
    aggression: 0.55
  },

  professional: {
    name: "محترف",
    accuracy: 0.75,
    aggression: 0.65
  },

  worldClass: {
    name: "عالمي",
    accuracy: 0.85,
    aggression: 0.78
  },

  legendary: {
    name: "أسطوري",
    accuracy: 0.94,
    aggression: 0.90
  }

};

/* =========================================================
   TEAM STRENGTH
   ========================================================= */

function teamStrength(team) {

  const players =
    (team || []).filter(Boolean);

  if (!players.length) {
    return 0;
  }

  const total =
    players.reduce(
      (sum, player) =>
        sum +
        Number(
          player.overall || 0
        ),
      0
    );

  return total / players.length;
}

function captainBonus(
  team,
  captain
) {

  if (!captain) return 0;

  const base =
    teamStrength(team);

  if (!base) return 0;

  return (
    Number(captain.overall || 0)
    - base
  ) * 0.05;
}

/* =========================================================
   MATCH
   ========================================================= */

function simulateMatch() {

  const strengthOne =
    teamStrength(
      R2.players.one.squad
    ) +
    captainBonus(
      R2.players.one.squad,
      R2.players.one.captain
    );

  const strengthTwo =
    teamStrength(
      R2.players.two.squad
    ) +
    captainBonus(
      R2.players.two.squad,
      R2.players.two.captain
    );

  let scoreOne =
    random(0, 3);

  let scoreTwo =
    random(0, 3);

  const difference =
    strengthOne - strengthTwo;

  if (difference > 8) {

    scoreOne =
      Math.max(
        scoreOne,
        scoreTwo +
        (chance(65) ? 1 : 0)
      );

  }

  if (difference < -8) {

    scoreTwo =
      Math.max(
        scoreTwo,
        scoreOne +
        (chance(65) ? 1 : 0)
      );

  }

  if (
    scoreOne === scoreTwo &&
    Math.abs(difference) >= 15
  ) {

    if (difference > 0) {
      scoreOne++;
    } else {
      scoreTwo++;
    }

  }

  R2.match.scoreOne =
    scoreOne;

  R2.match.scoreTwo =
    scoreTwo;

  R2.match.events =
    generateMatchEvents(
      scoreOne,
      scoreTwo
    );

  R2.match.playerOfMatch =
    calculatePlayerOfMatch();

  if (scoreOne > scoreTwo) {

    R2.match.winner =
      R2.players.one.name ||
      "اللاعب 1";

  } else if (scoreTwo > scoreOne) {

    R2.match.winner =
      R2.players.two.name ||
      "اللاعب 2";

  } else {

    R2.match.winner =
      "تعادل";
  }

  R2.match.finished =
    true;

  renderMatchResult();
}

/* =========================================================
   MATCH EVENTS
   ========================================================= */

function getAttackingPlayers(team) {

  return (team || []).filter(
    player =>
      player &&
      [
        "CAM",
        "RW",
        "LW",
        "ST",
        "CM"
      ].includes(
        player.position
      )
  );
}

function pickRandomPlayer(team) {

  if (!team.length) {
    return null;
  }

  return team[
    random(
      0,
      team.length - 1
    )
  ];
}

function generateMatchEvents(
  scoreOne,
  scoreTwo
) {

  const events = [];

  const totalGoals =
    scoreOne + scoreTwo;

  const attackOne =
    getAttackingPlayers(
      R2.players.one.squad
    );

  const attackTwo =
    getAttackingPlayers(
      R2.players.two.squad
    );

  for (
    let i = 0;
    i < totalGoals;
    i++
  ) {

    const team =
      i < scoreOne
        ? "one"
        : "two";

    const attackers =
      team === "one"
        ? attackOne
        : attackTwo;

    const scorer =
      pickRandomPlayer(
        attackers
      );

    const allPlayers =
      team === "one"
        ? R2.players.one.squad
        : R2.players.two.squad;

    const assistCandidates =
      allPlayers.filter(
        player =>
          player &&
          (!scorer ||
            player.id !== scorer.id) &&
          [
            "CAM",
            "RW",
            "LW",
            "CM"
          ].includes(
            player.position
          )
      );

    const assist =
      chance(75)
        ? pickRandomPlayer(
            assistCandidates
          )
        : null;

    events.push({

      minute:
        random(3, 90),

      team,

      scorer:
        scorer
          ? scorer.name
          : "هدف",

      scorerId:
        scorer
          ? scorer.id
          : null,

      assist:
        assist
          ? assist.name
          : null,

      assistId:
        assist
          ? assist.id
          : null

    });

  }

  return events.sort(
    (a, b) =>
      a.minute - b.minute
  );
}

/* =========================================================
   PLAYER OF MATCH
   ========================================================= */

function calculatePlayerOfMatch() {

  const players = [

    ...R2.players.one.squad,
    ...R2.players.two.squad

  ].filter(Boolean);

  if (!players.length) {
    return null;
  }

  let best =
    players[0];

  let bestScore =
    Number(
      best.overall || 0
    );

  R2.match.events.forEach(event => {

    if (!event.scorerId) {
      return;
    }

    const player =
      players.find(
        item =>
          item.id ===
          event.scorerId
      );

    if (!player) {
      return;
    }

    const score =
      Number(
        player.overall || 0
      ) + 6;

    if (score > bestScore) {

      best = player;
      bestScore = score;

    }

  });

  return best;
}

/* =========================================================
   MATCH RESULT
   ========================================================= */

function renderMatchResult() {

  showScreen("result");

  const score =
    $("#matchScore");

  if (score) {

    score.textContent =
      `${R2.match.scoreOne} - ${R2.match.scoreTwo}`;

  }

  const winner =
    $("#matchWinner");

  if (winner) {

    winner.textContent =
      R2.match.winner;

  }

  renderMatchStatistics();
}

function renderMatchStatistics() {

  const container =
    $("#matchStatistics");

  if (!container) return;

  clearElement(container);

  container.appendChild(
    createElement(
      "h3",
      "",
      "إحصائيات المباراة"
    )
  );

  if (!R2.match.events.length) {

    container.appendChild(
      createElement(
        "p",
        "",
        "لم يتم تسجيل أهداف."
      )
    );

  }

  R2.match.events.forEach(event => {

    let text =
      `${event.minute}' ⚽ ${event.scorer}`;

    if (event.assist) {

      text +=
        ` — صناعة ${event.assist}`;

    }

    container.appendChild(
      createElement(
        "div",
        "match-event",
        text
      )
    );

  });

  if (R2.match.playerOfMatch) {

    container.appendChild(
      createElement(
        "div",
        "player-of-match",
        `⭐ رجل المباراة: ${R2.match.playerOfMatch.name}`
      )
    );

  }
}

/* =========================================================
   SHARE
   ========================================================= */

function shareResult() {

  const text = `
R2 Football Games
${R2.players.one.name || "اللاعب 1"} ${R2.match.scoreOne} - ${R2.match.scoreTwo} ${R2.players.two.name || "اللاعب 2"}
الفائز: ${R2.match.winner}
`;

  if (navigator.share) {

    navigator.share({
      title:
        "R2 Football Games",
      text
    }).catch(() => {});

    return;
  }

  if (navigator.clipboard) {

    navigator.clipboard.writeText(text);

    notify(
      "تم نسخ النتيجة",
      "success"
    );

  }
}

/* =========================================================
   ONLINE
   ========================================================= */

function generateRoomCode() {

  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  const length =
    CONFIG.onlineRoom.codeLength || 6;

  let code = "";

  for (
    let i = 0;
    i < length;
    i++
  ) {

    code +=
      chars[
        random(
          0,
          chars.length - 1
        )
      ];

  }

  return code;
}

function createOnlineRoom() {

  const code =
    generateRoomCode();

  R2.online.roomCode =
    code;

  R2.online.host =
    true;

  R2.online.connected =
    true;

  Storage.set(
    "r2-online-room",
    code
  );

  if (
    window.R2_ONLINE &&
    typeof window.R2_ONLINE.createRoom ===
      "function"
  ) {

    window.R2_ONLINE.createRoom(
      code
    );

  }

  const field =
    $("#roomCode");

  if (field) {
    field.value = code;
  }

  notify(
    `تم إنشاء الغرفة ${code}`,
    "success"
  );
}

function joinOnlineRoom(code) {

  const clean =
    String(code || "")
      .trim()
      .toUpperCase();

  const length =
    CONFIG.onlineRoom.codeLength || 6;

  if (clean.length !== length) {

    notify(
      "كود الغرفة غير صحيح",
      "error"
    );

    return;
  }

  R2.online.roomCode =
    clean;

  R2.online.host =
    false;

  R2.online.connected =
    true;

  if (
    window.R2_ONLINE &&
    typeof window.R2_ONLINE.joinRoom ===
      "function"
  ) {

    window.R2_ONLINE.joinRoom(
      clean
    );

  }

  notify(
    `تم الانضمام إلى الغرفة ${clean}`,
    "success"
  );
}

/* =========================================================
   ONLINE MESSAGE BRIDGE
   ========================================================= */

function sendOnlineMessage(
  type,
  data = {}
) {

  if (
    window.R2_ONLINE &&
    typeof window.R2_ONLINE.send ===
      "function"
  ) {

    window.R2_ONLINE.send({
      type,
      data
    });

    return true;
  }

  return false;
}

window.addEventListener(
  "r2-online-message",
  event => {

    const message =
      event.detail;

    if (!message) return;

    handleOnlineMessage(
      message
    );

  }
);

function handleOnlineMessage(
  message
) {

  if (!message.type) {
    return;
  }

  if (
    message.type ===
    "room-created"
  ) {

    R2.online.connected =
      true;

  }

  if (
    message.type ===
    "room-joined"
  ) {

    R2.online.connected =
      true;

  }

  if (
    message.type ===
    "player-name"
  ) {

    if (message.data?.name) {

      R2.players.two.name =
        message.data.name;

    }

  }

  if (
    message.type ===
    "ping"
  ) {

    sendOnlineMessage(
      "pong"
    );

  }

}

/* =========================================================
   FRIEND SYSTEM
   ========================================================= */

function generateFriendId() {

  const length =
    CONFIG.friendId.length || 16;

  let id = "";

  while (
    id.length < length
  ) {

    id +=
      Math.floor(
        Math.random() * 10
      );

  }

  return id;
}

function getMyFriendId() {

  let id =
    Storage.get(
      "r2-friend-id"
    );

  if (!id) {

    id =
      generateFriendId();

    Storage.set(
      "r2-friend-id",
      id
    );

  }

  return id;
}

function sendFriendRequest(
  friendId
) {

  const clean =
    String(friendId || "")
      .replace(/\D/g, "");

  const length =
    CONFIG.friendId.length || 16;

  if (clean.length !== length) {

    notify(
      `معرف الصديق يجب أن يكون ${length} رقم`,
      "error"
    );

    return;
  }

  notify(
    "تم إرسال طلب الصداقة",
    "success"
  );
}

/* =========================================================
   SETTINGS
   ========================================================= */

const SETTINGS = {

  volume:
    Storage.get(
      "r2-volume",
      70
    ),

  difficulty:
    Storage.get(
      "r2-difficulty",
      "professional"
    )

};

function setVolume(value) {

  SETTINGS.volume =
    Number(value);

  Storage.set(
    "r2-volume",
    SETTINGS.volume
  );
}

function setDifficulty(value) {

  if (!AI_LEVELS[value]) {
    return;
  }

  SETTINGS.difficulty =
    value;

  Storage.set(
    "r2-difficulty",
    value
  );

  notify(
    `تم اختيار مستوى ${AI_LEVELS[value].name}`,
    "success"
  );
}

/* =========================================================
   EVENTS
   ========================================================= */

function renderEvents() {

  const container =
    $("#eventsList");

  if (!container) return;

  clearElement(container);

  const event =
    DATA.events?.spanishLeague;

  if (!event) {

    container.appendChild(
      createElement(
        "p",
        "",
        "لا توجد أحداث حاليًا."
      )
    );

    return;
  }

  container.appendChild(
    createElement(
      "h2",
      "",
      event.title
    )
  );

  event.weeks.forEach(week => {

    const item =
      createElement(
        "div",
        "event-week"
      );

    item.appendChild(
      createElement(
        "h3",
        "",
        `${week.title} — ${week.status}`
      )
    );

    if (week.active) {

      const button =
        createElement(
          "button",
          "event-button",
          "دخول الأسبوع"
        );

      button.addEventListener(
        "click",
        () =>
          openEventWeek(
            week.week
          )
      );

      item.appendChild(button);
    }

    container.appendChild(item);

  });
}

function openEventWeek(
  weekNumber
) {

  const week =
    HELPERS.getEventWeek
      ? HELPERS.getEventWeek(
          weekNumber
        )
      : null;

  if (!week || !week.active) {

    notify(
      "هذا الأسبوع غير متاح",
      "error"
    );

    return;
  }

  showScreen(
    "event-week"
  );

  const container =
    $("#eventPlayers");

  if (!container) return;

  clearElement(container);

  week.players.forEach(
    player => {

      container.appendChild(
        createPlayerCard(
          player
        )
      );

    }
  );
}

/* =========================================================
   BUTTON BINDING
   ========================================================= */

function bindButtons() {

  $all(
    "[data-start-game]"
  ).forEach(button => {

    button.addEventListener(
      "click",
      () =>
        startGame(
          button.dataset.startGame
        )
    );

  });

  $all(
    "[data-home]"
  ).forEach(button => {

    button.addEventListener(
      "click",
      goHome
    );

  });

  const bidOne =
    $("#bidOneMillion");

  if (bidOne) {

    bidOne.addEventListener(
      "click",
      () =>
        addBid(
          "one",
          1
        )
    );

  }

  const bidFive =
    $("#bidFiveMillion");

  if (bidFive) {

    bidFive.addEventListener(
      "click",
      () =>
        addBid(
          "one",
          5
        )
    );

  }

  const custom =
    $("#submitCustomBid");

  if (custom) {

    custom.addEventListener(
      "click",
      () =>
        submitCustomBid(
          "one"
        )
    );

  }

  const pass =
    $("#passAuction");

  if (pass) {

    pass.addEventListener(
      "click",
      passAuction
    );

  }

  const share =
    $("#shareResult");

  if (share) {

    share.addEventListener(
      "click",
      shareResult
    );

  }

  const createRoom =
    $("#createRoom");

  if (createRoom) {

    createRoom.addEventListener(
      "click",
      createOnlineRoom
    );

  }

  const joinRoom =
    $("#joinRoom");

  if (joinRoom) {

    joinRoom.addEventListener(
      "click",
      () => {

        const input =
          $("#roomCodeInput");

        joinOnlineRoom(
          input
            ? input.value
            : ""
        );

      }
    );

  }

  const friendButton =
    $("#sendFriendRequest");

  if (friendButton) {

    friendButton.addEventListener(
      "click",
      () => {

        const input =
          $("#friendIdInput");

        sendFriendRequest(
          input
            ? input.value
            : ""
        );

      }
    );

  }

  const volume =
    $("#siteVolume");

  if (volume) {

    volume.value =
      SETTINGS.volume;

    volume.addEventListener(
      "input",
      event =>
        setVolume(
          event.target.value
        )
    );

  }

  const difficulty =
    $("#difficultySelect");

  if (difficulty) {

    difficulty.value =
      SETTINGS.difficulty;

    difficulty.addEventListener(
      "change",
      event =>
        setDifficulty(
          event.target.value
        )
    );

  }

  const events =
    $("#eventsButton");

  if (events) {

    events.addEventListener(
      "click",
      () => {

        showScreen(
          "events"
        );

        renderEvents();

      }
    );

  }

  const friends =
    $("#friendsButton");

  if (friends) {

    friends.addEventListener(
      "click",
      () =>
        showScreen(
          "friends"
        )
    );

  }

  const settings =
    $("#settingsButton");

  if (settings) {

    settings.addEventListener(
      "click",
      () =>
        showScreen(
          "settings"
        )
    );

  }

  const online =
    $("#onlineButton");

  if (online) {

    online.addEventListener(
      "click",
      () =>
        showScreen(
          "online"
        )
    );

  }

  const captain =
    $("#continueCaptain");

  if (captain) {

    captain.addEventListener(
      "click",
      renderCaptainSelection
    );

  }

  const deal =
    $("#dealButton");

  if (deal) {

    deal.addEventListener(
      "click",
      () =>
        dealChoice(
          "one",
          "DEAL"
        )
    );

  }

  const noDeal =
    $("#noDealButton");

  if (noDeal) {

    noDeal.addEventListener(
      "click",
      () =>
        dealChoice(
          "one",
          "NO DEAL"
        )
    );

  }

  const finishDeal =
    $("#finishDealRound");

  if (finishDeal) {

    finishDeal.addEventListener(
      "click",
      () => {

        R2.deal.positionIndex++;
        R2.deal.attempts = 1;

        startDealRound();

      }
    );

  }

}

/* =========================================================
   INITIALIZE
   ========================================================= */

function initializeApp() {

  console.log(
    "⚽ R2 Football Games — App initialized"
  );

  console.log(
    `Players loaded: ${PLAYERS.length}`
  );

  setupNames();

  bindButtons();

  const friendId =
    $("#myFriendId");

  if (friendId) {

    friendId.textContent =
      getMyFriendId();

  }

  showScreen("home");
}

/* =========================================================
   DOM READY
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initializeApp
  );

} else {

  initializeApp();

}

/* =========================================================
   GLOBAL API
   ========================================================= */

window.R2_APP = {

  state: R2,

  startGame,
  resetGame,

  startAuction,
  addBid,
  submitCustomBid,
  passAuction,
  givePlayerToOpponent,

  startDeal,
  openDealBox,
  dealChoice,

  useWildcard,
  chooseCaptain,

  simulateMatch,
  shareResult,

  createOnlineRoom,
  joinOnlineRoom,
  sendOnlineMessage,

  getMyFriendId,
  sendFriendRequest,

  setVolume,
  setDifficulty,

  renderEvents,
  openEventWeek,

  showScreen,
  goHome

};

/* =========================================================
   FINAL CHECK
   ========================================================= */

console.log(
  `R2 APP READY — ${PLAYERS.length} players available`
);
