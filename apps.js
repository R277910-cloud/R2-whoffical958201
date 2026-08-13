/* =========================================================
   R2 FOOTBALL GAMES
   app.js
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
    playerTwoChoice: null,
    roundFinished: false
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
   SHORTCUTS
   ========================================================= */

const DATA = window.R2_DATA;

const PLAYERS = DATA.players;
const POSITIONS = DATA.positions;
const FORMATIONS = DATA.formations;
const HELPERS = DATA.helpers;


/* =========================================================
   DOM HELPERS
   ========================================================= */

function $(selector) {
  return document.querySelector(selector);
}


function $all(selector) {
  return [...document.querySelectorAll(selector)];
}


function createElement(tag, className = "", text = "") {

  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text) {
    element.textContent = text;
  }

  return element;
}


function clearElement(element) {

  if (!element) return;

  element.innerHTML = "";

}


/* =========================================================
   SAFE LOCAL STORAGE
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

    } catch {

      console.warn("LocalStorage unavailable.");

    }

  },


  remove(key) {

    try {
      localStorage.removeItem(key);
    } catch {}

  }

};


/* =========================================================
   RANDOM
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


/* =========================================================
   MONEY
   ========================================================= */

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

  let box = $(".r2-toast");

  if (!box) {

    box = createElement(
      "div",
      "r2-toast"
    );

    document.body.appendChild(box);

  }

  box.textContent = message;

  box.dataset.type = type;

  box.classList.add("show");

  clearTimeout(box._timer);

  box._timer = setTimeout(() => {

    box.classList.remove("show");

  }, 2500);

}


/* =========================================================
   SCREEN MANAGEMENT
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

  R2.screen = "home";
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

  const rating = createElement(
    "strong",
    "player-rating",
    String(player.overall)
  );

  const position = createElement(
    "span",
    "player-position",
    player.position
  );

  top.appendChild(rating);
  top.appendChild(position);

  const name = createElement(
    "div",
    "player-name",
    player.name
  );

  const posName = createElement(
    "small",
    "player-position-name",
    POSITIONS[player.position] || ""
  );

  card.appendChild(top);
  card.appendChild(name);
  card.appendChild(posName);

  if (options.price !== undefined) {

    const price = createElement(
      "div",
      "player-price",
      formatMoney(options.price)
    );

    card.appendChild(price);

  }

  if (options.captain) {

    card.classList.add("captain-card");

  }

  return card;

}


/* =========================================================
   NAME SETUP
   ========================================================= */

function setupNames() {

  const p1 = $("#playerOneName");
  const p2 = $("#playerTwoName");

  if (p1) {

    p1.addEventListener("input", event => {

      R2.players.one.name =
        event.target.value.trim();

    });

  }

  if (p2) {

    p2.addEventListener("input", event => {

      R2.players.two.name =
        event.target.value.trim();

    });

  }

}


/* =========================================================
   START GAME
   ========================================================= */

function startGame(mode) {

  R2.mode = mode;

  R2.players.one.squad = [];
  R2.players.two.squad = [];

  R2.players.one.budget = 2000;
  R2.players.two.budget = 2000;

  R2.players.one.wildCardUsed = false;
  R2.players.two.wildCardUsed = false;

  R2.players.one.captain = null;
  R2.players.two.captain = null;

  R2.match = {
    scoreOne: 0,
    scoreTwo: 0,
    events: [],
    playerOfMatch: null,
    winner: null,
    finished: false
  };

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

}


/* =========================================================
   AUCTION
   ========================================================= */

function startAuction(mode) {

  const formation =
    mode === "pro-max"
      ? FORMATIONS.proMax
      : FORMATIONS.fiveAside;

  R2.auction = {

    pool: HELPERS.createAuctionPool(
      formation,
      []
    ),

    index: 0,
    currentPlayer: null,
    currentBid: DATA.config.auction.start,
    highestBidder: null,
    finished: false

  };

  showScreen("auction");

  renderAuction();

}


/* =========================================================
   CURRENT AUCTION PLAYER
   ========================================================= */

function getAuctionItem() {

  return R2.auction.pool[
    R2.auction.index
  ];

}


function getAuctionPlayer() {

  const item = getAuctionItem();

  return item ? item.player : null;

}


/* =========================================================
   RENDER AUCTION
   ========================================================= */

function renderAuction() {

  const item = getAuctionItem();

  if (!item || !item.player) {

    finishAuction();

    return;

  }

  R2.auction.currentPlayer =
    item.player;

  R2.auction.currentBid = 5;
  R2.auction.highestBidder = null;

  const player = item.player;

  const cardContainer =
    $("#auctionPlayer");

  if (cardContainer) {

    clearElement(cardContainer);

    cardContainer.appendChild(
      createPlayerCard(player, {
        price: R2.auction.currentBid
      })
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

  const bid =
    $("#auctionCurrentBid");

  if (bid) {

    bid.textContent =
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
      `${item.position} — لاعب ${item.slot}`;

  }

}


/* =========================================================
   ADD BID
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
      "المبلغ أكبر من الميزانية المتاحة",
      "error"
    );

    return;

  }

  R2.auction.currentBid = newBid;

  R2.auction.highestBidder =
    playerNumber;

  updateAuctionUI();

  renderCurrentAuctionPrice();

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

  if (!amount || amount < 6) {

    notify(
      "اكتب مبلغ أكبر من 5 مليون",
      "error"
    );

    return;

  }

  const current =
    Number(R2.auction.currentBid);

  const player =
    R2.players[playerNumber];

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

  renderCurrentAuctionPrice();

}


/* =========================================================
   CURRENT PRICE
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
   GIVE PLAYER TO OPPONENT
   ========================================================= */

function givePlayerToOpponent(playerNumber) {

  const player =
    getAuctionPlayer();

  if (!player) return;

  const opponent =
    playerNumber === "one"
      ? "two"
      : "one";

  const bidder =
    R2.players[playerNumber];

  const receiver =
    R2.players[opponent];

  const price =
    R2.auction.currentBid;

  if (bidder.budget >= price) {

    bidder.budget -= price;

  }

  receiver.squad.push(player);

  notify(
    `${receiver.name || "الخصم"} حصل على ${player.name}`,
    "success"
  );

  nextAuctionPlayer();

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
      "لا يوجد لاعب قام بالمزايدة",
      "error"
    );

    return;

  }

  const opponent =
    bidder === "one"
      ? "two"
      : "one";

  R2.players[bidder].budget -=
    R2.auction.currentBid;

  R2.players[bidder].squad.push(
    player
  );

  notify(
    `${R2.players[bidder].name || "اللاعب"} حصل على ${player.name}`,
    "success"
  );

  nextAuctionPlayer();

}


/* =========================================================
   NEXT AUCTION PLAYER
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

  R2.auction.finished = true;

  showScreen("wildcard");

  renderWildcardScreen();

}


/* =========================================================
   WILD CARD
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
   APPLY WILD CARD
   ========================================================= */

function useWildcard(playerNumber, playerId) {

  const player =
    R2.players[playerNumber];

  if (!player) return;

  if (player.wildCardUsed) {

    notify(
      "لقد استخدمت الـ Wild Card بالفعل",
      "error"
    );

    return;

  }

  const index =
    player.squad.findIndex(
      item => item && item.id === playerId
    );

  if (index === -1) {

    notify(
      "هذا اللاعب غير موجود في التشكيلة",
      "error"
    );

    return;

  }

  player.wildCardUsed = true;

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

  const one =
    $("#captainTeamOne");

  const two =
    $("#captainTeamTwo");

  if (one) {

    clearElement(one);

    R2.players.one.squad.forEach(player => {

      const card =
        createPlayerCard(player);

      card.addEventListener(
        "click",
        () => chooseCaptain("one", player)
      );

      one.appendChild(card);

    });

  }

  if (two) {

    clearElement(two);

    R2.players.two.squad.forEach(player => {

      const card =
        createPlayerCard(player);

      card.addEventListener(
        "click",
        () => chooseCaptain("two", player)
      );

      two.appendChild(card);

    });

  }

}


function chooseCaptain(playerNumber, player) {

  R2.players[playerNumber].captain =
    player;

  notify(
    `${player.name} أصبح الكابتن`,
    "success"
  );

  if (
    R2.players.one.captain &&
    R2.players.two.captain
  ) {

    simulateMatch();

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
    playerTwoChoice: null,
    roundFinished: false

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

  const used = [
    ...R2.players.one.squad,
    ...R2.players.two.squad
  ]
    .filter(Boolean)
    .map(player => player.id);

  R2.deal.boxes =
    HELPERS.createDealBoxes(
      position,
      used
    );

  R2.deal.opened = [];

  showScreen("deal");

  renderDealRound();

}


/* =========================================================
   RENDER DEAL ROUND
   ========================================================= */

function renderDealRound() {

  const position =
    DEAL_POSITIONS[
      R2.deal.positionIndex
    ];

  const title =
    $("#dealPosition");

  if (title) {

    title.textContent =
      `${position} — ${POSITIONS[position]}`;

  }

  const boxContainer =
    $("#dealBoxes");

  if (!boxContainer) return;

  clearElement(boxContainer);

  R2.deal.boxes.forEach(box => {

    const button =
      createElement(
        "button",
        "deal-box",
        `BOX ${box.boxNumber}`
      );

    button.addEventListener(
      "click",
      () => openDealBox(box.boxNumber)
    );

    boxContainer.appendChild(button);

  });

}


/* =========================================================
   OPEN DEAL BOX
   ========================================================= */

function openDealBox(boxNumber) {

  if (R2.deal.opened.length >= 2) {

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

  renderDealOpenedBox(box);

}


function renderDealOpenedBox(box) {

  const button =
    document.querySelector(
      `.deal-box:nth-child(${box.boxNumber})`
    );

  if (!button) return;

  button.classList.add("opened");

  clearElement(button);

  button.appendChild(
    createPlayerCard(box.player)
  );

}


/* =========================================================
   DEAL / NO DEAL
   ========================================================= */

function dealChoice(playerNumber, choice) {

  const openedBoxes =
    R2.deal.opened;

  if (openedBoxes.length < 2) {

    notify(
      "افتح بوكسين أولًا",
      "error"
    );

    return;

  }

  const selected =
    R2.deal.boxes.find(
      box =>
        box.boxNumber ===
        openedBoxes[
          openedBoxes.length - 1
        ]
    );

  if (!selected) return;

  if (choice === "DEAL") {

    R2.players[playerNumber].squad.push(
      selected.player
    );

    if (playerNumber === "one") {

      R2.deal.playerOneChoice =
        selected.player;

    } else {

      R2.deal.playerTwoChoice =
        selected.player;

    }

    notify(
      `${selected.player.name} تم اختياره`,
      "success"
    );

  }

  if (choice === "NO DEAL") {

    if (R2.deal.attempts >= 2) {

      notify(
        "هذه هي المحاولة الأخيرة ولا يمكن الرفض",
        "error"
      );

      return;

    }

    R2.deal.attempts++;

    notify(
      "تم الانتقال للمحاولة الثانية",
      "info"
    );

    startDealRound();

  }

}


/* =========================================================
   FINISH DEAL
   ========================================================= */

function finishDeal() {

  showScreen("wildcard");

  renderWildcardScreen();

}


/* =========================================================
   AI DIFFICULTY
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
    aggression: 0.9
  }

};


/* =========================================================
   TEAM STRENGTH
   ========================================================= */

function teamStrength(team) {

  if (!team || !team.length) {

    return 0;

  }

  let total = 0;

  let count = 0;

  team.forEach(player => {

    if (!player) return;

    total +=
      Number(player.overall || 0);

    count++;

  });

  return count
    ? total / count
    : 0;

}


function captainBonus(team, captain) {

  if (!captain) return 0;

  const base =
    teamStrength(team);

  if (!base) return 0;

  return (
    Number(captain.overall || 0) -
    base
  ) * 0.05;

}


/* =========================================================
   MATCH SIMULATION
   ========================================================= */

function simulateMatch() {

  const teamOne =
    teamStrength(
      R2.players.one.squad
    ) +
    captainBonus(
      R2.players.one.squad,
      R2.players.one.captain
    );

  const teamTwo =
    teamStrength(
      R2.players.two.squad
    ) +
    captainBonus(
      R2.players.two.squad,
      R2.players.two.captain
    );

  const difference =
    teamOne - teamTwo;

  let scoreOne =
    random(0, 3);

  let scoreTwo =
    random(0, 3);

  const advantage =
    Math.max(
      -2,
      Math.min(2, difference / 5)
    );

  if (advantage > 0) {

    scoreOne =
      Math.max(
        scoreOne,
        scoreTwo +
        (chance(65) ? 1 : 0)
      );

  }

  if (advantage < 0) {

    scoreTwo =
      Math.max(
        scoreTwo,
        scoreOne +
        (chance(65) ? 1 : 0)
      );

  }

  if (
    scoreOne === scoreTwo &&
    Math.abs(difference) >= 8
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

  R2.match.finished = true;

  renderMatchResult();

}


/* =========================================================
   MATCH EVENTS
   ========================================================= */

function getAttackingPlayers(team) {

  return team.filter(player => {

    if (!player) return false;

    return [
      "CAM",
      "RW",
      "LW",
      "ST",
      "CM"
    ].includes(
      player.position
    );

  });

}


function pickRandomPlayer(team) {

  if (!team.length) {

    return null;

  }

  return team[
    random(0, team.length - 1)
  ];

}


function generateMatchEvents(
  scoreOne,
  scoreTwo
) {

  const events = [];

  const totalGoals =
    scoreOne + scoreTwo;

  const teamOneAttack =
    getAttackingPlayers(
      R2.players.one.squad
    );

  const teamTwoAttack =
    getAttackingPlayers(
      R2.players.two.squad
    );

  for (
    let i = 0;
    i < totalGoals;
    i++
  ) {

    const minute =
      random(3, 90);

    const team =
      i < scoreOne
        ? "one"
        : "two";

    const attackers =
      team === "one"
        ? teamOneAttack
        : teamTwoAttack;

    const player =
      pickRandomPlayer(
        attackers
      );

    const teamAll =
      team === "one"
        ? R2.players.one.squad
        : R2.players.two.squad;

    const possibleAssists =
      teamAll.filter(
        p =>
          p &&
          p.id !==
          player?.id &&
          [
            "CAM",
            "RW",
            "LW",
            "CM"
          ].includes(
            p.position
          )
      );

    const assist =
      chance(75)
        ? pickRandomPlayer(
            possibleAssists
          )
        : null;

    events.push({

      minute,

      team,

      scorer:
        player
          ? player.name
          : "هدف عشوائي",

      scorerId:
        player
          ? player.id
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

  const candidates = [

    ...R2.players.one.squad,
    ...R2.players.two.squad

  ].filter(Boolean);

  if (!candidates.length) {

    return null;

  }

  let best =
    candidates[0];

  let bestScore =
    Number(best.overall || 0);

  R2.match.events.forEach(event => {

    const player =
      candidates.find(
        p =>
          p.id ===
          event.scorerId
      );

    if (player) {

      const score =
        Number(player.overall || 0)
        + 6;

      if (score > bestScore) {

        best = player;

        bestScore = score;

      }

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


/* =========================================================
   MATCH STATISTICS
   ========================================================= */

function renderMatchStatistics() {

  const container =
    $("#matchStatistics");

  if (!container) return;

  clearElement(container);

  const title =
    createElement(
      "h3",
      "",
      "إحصائيات المباراة"
    );

  container.appendChild(title);

  if (
    !R2.match.events.length
  ) {

    container.appendChild(
      createElement(
        "p",
        "",
        "لم يتم تسجيل أهداف في المباراة."
      )
    );

  }

  R2.match.events.forEach(event => {

    const row =
      createElement(
        "div",
        "match-event"
      );

    let text =
      `${event.minute}' ⚽ ${event.scorer}`;

    if (event.assist) {

      text +=
        ` — صناعة ${event.assist}`;

    }

    row.textContent =
      text;

    container.appendChild(row);

  });

  if (
    R2.match.playerOfMatch
  ) {

    const motm =
      createElement(
        "div",
        "player-of-match",
        `⭐ رجل المباراة: ${R2.match.playerOfMatch.name}`
      );

    container.appendChild(motm);

  }

}


/* =========================================================
   SHARE RESULT
   ========================================================= */

function shareResult() {

  const text =
    `نتيجة مباراة R2 Football Games: ` +
    `${R2.match.scoreOne} - ${R2.match.scoreTwo}\n` +
    `الفائز: ${R2.match.winner}`;

  if (
    navigator.share
  ) {

    navigator.share({
      title:
        "R2 Football Games",
      text
    }).catch(() => {});

    return;

  }

  if (
    navigator.clipboard
  ) {

    navigator.clipboard.writeText(
      text
    );

    notify(
      "تم نسخ النتيجة للمشاركة",
      "success"
    );

  }

}


/* =========================================================
   ONLINE ROOM
   ========================================================= */

function generateRoomCode() {

  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  for (
    let i = 0;
    i < DATA.config.onlineRoom.codeLength;
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

  R2.online.connected =
    true;

  R2.online.host =
    true;

  Storage.set(
    "r2-online-room",
    code
  );

  notify(
    `تم إنشاء الغرفة: ${code}`,
    "success"
  );

  const field =
    $("#roomCode");

  if (field) {

    field.value =
      code;

  }

}


function joinOnlineRoom(code) {

  const clean =
    String(code || "")
      .trim()
      .toUpperCase();

  if (
    clean.length !==
    DATA.config.onlineRoom.codeLength
  ) {

    notify(
      "كود الغرفة غير صحيح",
      "error"
    );

    return;

  }

  R2.online.roomCode =
    clean;

  R2.online.connected =
    true;

  R2.online.host =
    false;

  notify(
    `تم الانضمام إلى الغرفة ${clean}`,
    "success"
  );

}


/* =========================================================
   FRIEND SYSTEM
   ========================================================= */

function generateFriendId() {

  let id = "";

  while (
    id.length <
    DATA.config.friendId.length
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


function sendFriendRequest(friendId) {

  const clean =
    String(friendId || "")
      .replace(/\D/g, "");

  if (
    clean.length !==
    DATA.config.friendId.length
  ) {

    notify(
      "معرف الصديق يجب أن يكون 16 رقم",
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

  volume: Storage.get(
    "r2-volume",
    70
  ),

  difficulty: Storage.get(
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

  const audio =
    $("#siteVolume");

  if (audio) {

    audio.value =
      SETTINGS.volume;

  }

}


function setDifficulty(value) {

  if (
    !AI_LEVELS[value]
  ) {

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
   EVENT SYSTEM
   ========================================================= */

function renderEvents() {

  const container =
    $("#eventsList");

  if (!container) return;

  clearElement(container);

  const event =
    DATA.events.spanishLeague;

  const title =
    createElement(
      "h2",
      "",
      event.title
    );

  container.appendChild(title);

  event.weeks.forEach(week => {

    const item =
      createElement(
        "div",
        "event-week"
      );

    const heading =
      createElement(
        "h3",
        "",
        `${week.title} — ${week.status}`
      );

    item.appendChild(heading);

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


function openEventWeek(weekNumber) {

  const week =
    HELPERS.getEventWeek(
      weekNumber
    );

  if (
    !week ||
    !week.active
  ) {

    notify(
      "هذا الأسبوع غير متاح حاليًا",
      "error"
    );

    return;

  }

  showScreen("event-week");

  const container =
    $("#eventPlayers");

  if (!container) return;

  clearElement(container);

  week.players.forEach(player => {

    container.appendChild(
      createPlayerCard(player)
    );

  });

}


/* =========================================================
   HOME BUTTONS
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


  const resultShare =
    $("#shareResult");

  if (resultShare) {

    resultShare.addEventListener(
      "click",
      shareResult
    );

  }


  const roomCreate =
    $("#createRoom");

  if (roomCreate) {

    roomCreate.addEventListener(
      "click",
      createOnlineRoom
    );

  }


  const roomJoin =
    $("#joinRoom");

  if (roomJoin) {

    roomJoin.addEventListener(
      "click",
      () => {

        const code =
          $("#roomCodeInput");

        joinOnlineRoom(
          code
            ? code.value
            : ""
        );

      }
    );

  }


  const friendSend =
    $("#sendFriendRequest");

  if (friendSend) {

    friendSend.addEventListener(
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

        showScreen("events");

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
        showScreen("friends")
    );

  }


  const settings =
    $("#settingsButton");

  if (settings) {

    settings.addEventListener(
      "click",
      () =>
        showScreen("settings")
    );

  }


  const online =
    $("#onlineButton");

  if (online) {

    online.addEventListener(
      "click",
      () =>
        showScreen("online")
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


  const dealButton =
    $("#dealButton");

  if (dealButton) {

    dealButton.addEventListener(
      "click",
      () =>
        dealChoice(
          "one",
          "DEAL"
        )
    );

  }


  const noDealButton =
    $("#noDealButton");

  if (noDealButton) {

    noDealButton.addEventListener(
      "click",
      () =>
        dealChoice(
          "one",
          "NO DEAL"
        )
    );

  }


  const finishRound =
    $("#finishDealRound");

  if (finishRound) {

    finishRound.addEventListener(
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
   INITIALIZATION
   ========================================================= */

function initializeApp() {

  console.log(
    "R2 Football Games — App initialized"
  );

  console.log(
    `Players loaded: ${PLAYERS.length}`
  );

  console.log(
    "Pro Max:",
    FORMATIONS.proMax
  );

  console.log(
    "Five Aside:",
    FORMATIONS.fiveAside
  );

  const friendId =
    $("#myFriendId");

  if (friendId) {

    friendId.textContent =
      getMyFriendId();

  }

  setupNames();

  bindButtons();

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

  startAuction,

  startDeal,

  addBid,

  submitCustomBid,

  passAuction,

  givePlayerToOpponent,

  useWildcard,

  chooseCaptain,

  simulateMatch,

  shareResult,

  createOnlineRoom,

  joinOnlineRoom,

  getMyFriendId,

  sendFriendRequest,

  setVolume,

  setDifficulty,

  renderEvents,

  openEventWeek,

  goHome

};
