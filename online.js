/* =========================================================
   R2 FOOTBALL GAMES
   online.js
   =========================================================

   ONLINE SYSTEM
   ---------------------------------------------------------
   يحتوي هذا الملف على نظام الاتصال بين لاعبين:

   Player 1  <---- WebSocket ---->  Server
   Player 2  <---- WebSocket ---->  Server

   الوظائف الأساسية:
   - إنشاء غرفة
   - الانضمام لغرفة
   - لاعب 1 / لاعب 2
   - مزامنة حالة الغرفة
   - إرسال الأحداث بين اللاعبين
   - إعادة الاتصال
   - منع اللاعب الثالث
   - Ping / Pong
   - التعامل مع انقطاع الاتصال

   ملاحظة:
   هذا الملف لا يحتوي على قاعدة بيانات اللاعبين.
   بيانات اللاعبين موجودة في data.js.

   ========================================================= */

"use strict";


/* =========================================================
   GLOBAL CONFIG
   ========================================================= */

const R2_ONLINE_CONFIG = {

  appName: "R2 Football Games",

  version: "1.0.0",

  roomCodeLength: 6,

  maxPlayersPerRoom: 2,

  reconnectAttempts: 10,

  reconnectDelay: 1500,

  heartbeatInterval: 15000,

  connectionTimeout: 10000,

  maxMessageSize: 256 * 1024,

  protocol: "r2-football-v1"

};


/* =========================================================
   CONNECTION STATES
   ========================================================= */

const ONLINE_STATE = {

  DISCONNECTED: "disconnected",

  CONNECTING: "connecting",

  CONNECTED: "connected",

  RECONNECTING: "reconnecting",

  ERROR: "error"

};


/* =========================================================
   PLAYER ROLES
   ========================================================= */

const ONLINE_ROLES = {

  PLAYER_1: "player1",

  PLAYER_2: "player2"

};


/* =========================================================
   MESSAGE TYPES
   ========================================================= */

const ONLINE_MESSAGE_TYPES = {

  PING: "ping",

  PONG: "pong",

  CREATE_ROOM: "create_room",

  JOIN_ROOM: "join_room",

  LEAVE_ROOM: "leave_room",

  ROOM_CREATED: "room_created",

  ROOM_JOINED: "room_joined",

  ROOM_STATE: "room_state",

  PLAYER_JOINED: "player_joined",

  PLAYER_LEFT: "player_left",

  PLAYER_READY: "player_ready",

  GAME_START: "game_start",

  GAME_ACTION: "game_action",

  AUCTION_BID: "auction_bid",

  AUCTION_PASS: "auction_pass",

  AUCTION_PLAYER_WON: "auction_player_won",

  WILD_CARD: "wild_card",

  CAPTAIN_SELECTED: "captain_selected",

  MATCH_RESULT: "match_result",

  MATCH_STATS: "match_stats",

  ERROR: "error",

  SERVER_MESSAGE: "server_message"

};


/* =========================================================
   UTILITY
   ========================================================= */

/**
 * إنشاء رقم عشوائي.
 */
function randomNumber(min, max) {

  return Math.floor(
    Math.random() * (max - min + 1)
  ) + min;

}


/**
 * إنشاء كود غرفة مكون من 6 أرقام.
 *
 * مثال:
 * 482193
 */
function generateRoomCode() {

  let code = "";

  for (let i = 0; i < R2_ONLINE_CONFIG.roomCodeLength; i++) {

    code += randomNumber(0, 9);

  }

  return code;

}


/**
 * إنشاء معرف مؤقت للاعب داخل الاتصال.
 */
function generateClientId() {

  return (

    "client_" +

    Date.now().toString(36) +

    "_" +

    Math.random()
      .toString(36)
      .substring(2, 10)

  );

}


/**
 * التأكد أن القيمة نص.
 */
function isString(value) {

  return typeof value === "string";

}


/**
 * تنظيف كود الغرفة.
 */
function normalizeRoomCode(code) {

  if (!isString(code)) {
    return "";
  }

  return code
    .trim()
    .replace(/\D/g, "")
    .slice(
      0,
      R2_ONLINE_CONFIG.roomCodeLength
    );

}


/**
 * تنظيف اسم اللاعب.
 */
function normalizePlayerName(name) {

  if (!isString(name)) {
    return "لاعب";
  }

  const cleanName = name
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 30);

  return cleanName || "لاعب";

}


/* =========================================================
   SAFE JSON
   ========================================================= */

/**
 * تحويل البيانات إلى JSON بأمان.
 */
function safeStringify(data) {

  try {

    return JSON.stringify(data);

  } catch (error) {

    console.error(
      "[R2 ONLINE] JSON stringify error:",
      error
    );

    return null;

  }

}


/**
 * قراءة JSON بأمان.
 */
function safeParse(data) {

  try {

    if (!data) {
      return null;
    }

    return JSON.parse(data);

  } catch (error) {

    console.error(
      "[R2 ONLINE] JSON parse error:",
      error
    );

    return null;

  }

}


/* =========================================================
   CLIENT ONLINE CLASS
   ========================================================= */

class R2OnlineClient {

  constructor(options = {}) {

    this.serverUrl =
      options.serverUrl || null;

    this.socket = null;

    this.clientId = null;

    this.roomCode = null;

    this.playerRole = null;

    this.playerName = null;

    this.connectionState =
      ONLINE_STATE.DISCONNECTED;

    this.reconnectCount = 0;

    this.reconnectTimer = null;

    this.heartbeatTimer = null;

    this.connectionTimer = null;

    this.listeners = {};

    this.intentionalDisconnect = false;

  }


  /* =======================================================
     EVENT SYSTEM
     ======================================================= */

  on(eventName, callback) {

    if (
      !this.listeners[eventName]
    ) {

      this.listeners[eventName] = [];

    }

    this.listeners[eventName].push(
      callback
    );

    return () => {

      this.off(
        eventName,
        callback
      );

    };

  }


  off(eventName, callback) {

    if (
      !this.listeners[eventName]
    ) {

      return;

    }

    this.listeners[eventName] =
      this.listeners[eventName]
        .filter(
          fn => fn !== callback
        );

  }


  emit(eventName, data) {

    const callbacks =
      this.listeners[eventName] || [];

    callbacks.forEach(callback => {

      try {

        callback(data);

      } catch (error) {

        console.error(
          "[R2 ONLINE] Listener error:",
          error
        );

      }

    });

  }


  /* =======================================================
     CONNECT
     ======================================================= */

  connect(serverUrl = null) {

    if (serverUrl) {

      this.serverUrl =
        serverUrl;

    }

    if (!this.serverUrl) {

      this.setState(
        ONLINE_STATE.ERROR
      );

      this.emit(
        "error",
        {
          code: "NO_SERVER_URL",
          message:
            "لم يتم تحديد عنوان سيرفر الأونلاين."
        }
      );

      return false;

    }

    if (
      this.socket &&
      (
        this.socket.readyState ===
        WebSocket.OPEN ||

        this.socket.readyState ===
        WebSocket.CONNECTING
      )
    ) {

      return true;

    }

    this.intentionalDisconnect = false;

    this.setState(
      ONLINE_STATE.CONNECTING
    );

    try {

      this.socket =
        new WebSocket(
          this.serverUrl
        );

    } catch (error) {

      this.handleConnectionError(
        error
      );

      return false;

    }


    /* -----------------------------------------------------
       OPEN
       ----------------------------------------------------- */

    this.socket.onopen = () => {

      this.clearConnectionTimeout();

      this.reconnectCount = 0;

      this.setState(
        ONLINE_STATE.CONNECTED
      );

      this.startHeartbeat();

      this.emit(
        "connected"
      );

    };


    /* -----------------------------------------------------
       MESSAGE
       ----------------------------------------------------- */

    this.socket.onmessage = event => {

      this.handleMessage(
        event.data
      );

    };


    /* -----------------------------------------------------
       ERROR
       ----------------------------------------------------- */

    this.socket.onerror = error => {

      this.handleConnectionError(
        error
      );

    };


    /* -----------------------------------------------------
       CLOSE
       ----------------------------------------------------- */

    this.socket.onclose = event => {

      this.stopHeartbeat();

      this.clearConnectionTimeout();

      this.emit(
        "disconnected",
        event
      );

      if (
        !this.intentionalDisconnect
      ) {

        this.startReconnect();

      } else {

        this.setState(
          ONLINE_STATE.DISCONNECTED
        );

      }

    };


    this.connectionTimer =
      setTimeout(
        () => {

          if (
            this.connectionState ===
            ONLINE_STATE.CONNECTING
          ) {

            try {

              this.socket.close();

            } catch (_) {}

            this.handleConnectionError(
              new Error(
                "Connection timeout"
              )
            );

          }

        },
        R2_ONLINE_CONFIG.connectionTimeout
      );


    return true;

  }


  /* =======================================================
     DISCONNECT
     ======================================================= */

  disconnect() {

    this.intentionalDisconnect =
      true;

    this.stopHeartbeat();

    this.clearConnectionTimeout();

    this.clearReconnectTimer();

    if (this.socket) {

      try {

        this.socket.close();

      } catch (_) {}

    }

    this.socket = null;

    this.roomCode = null;

    this.playerRole = null;

    this.setState(
      ONLINE_STATE.DISCONNECTED
    );

  }


  /* =======================================================
     CONNECTION STATE
     ======================================================= */

  setState(state) {

    this.connectionState = state;

    this.emit(
      "state_change",
      state
    );

  }


  /* =======================================================
     SEND
     ======================================================= */

  send(type, payload = {}) {

    if (
      !this.socket ||
      this.socket.readyState !==
      WebSocket.OPEN
    ) {

      return false;

    }

    const message = {

      protocol:
        R2_ONLINE_CONFIG.protocol,

      type,

      clientId:
        this.clientId,

      roomCode:
        this.roomCode,

      timestamp:
        Date.now(),

      payload

    };

    const json =
      safeStringify(message);

    if (!json) {

      return false;

    }

    if (
      json.length >
      R2_ONLINE_CONFIG.maxMessageSize
    ) {

      this.emit(
        "error",
        {
          code:
            "MESSAGE_TOO_LARGE",

          message:
            "الرسالة أكبر من الحجم المسموح."
        }
      );

      return false;

    }

    try {

      this.socket.send(
        json
      );

      return true;

    } catch (error) {

      this.emit(
        "error",
        {
          code:
            "SEND_FAILED",

          error
        }
      );

      return false;

    }

  }


  /* =======================================================
     CREATE ROOM
     ======================================================= */

  createRoom(playerName) {

    this.playerName =
      normalizePlayerName(
        playerName
      );

    return this.send(
      ONLINE_MESSAGE_TYPES.CREATE_ROOM,
      {
        playerName:
          this.playerName
      }
    );

  }


  /* =======================================================
     JOIN ROOM
     ======================================================= */

  joinRoom(roomCode, playerName) {

    const cleanCode =
      normalizeRoomCode(
        roomCode
      );

    if (
      cleanCode.length !==
      R2_ONLINE_CONFIG.roomCodeLength
    ) {

      this.emit(
        "error",
        {
          code:
            "INVALID_ROOM_CODE",

          message:
            "كود الغرفة غير صحيح."
        }
      );

      return false;

    }

    this.playerName =
      normalizePlayerName(
        playerName
      );

    return this.send(
      ONLINE_MESSAGE_TYPES.JOIN_ROOM,
      {
        roomCode:
          cleanCode,

        playerName:
          this.playerName
      }
    );

  }


  /* =======================================================
     READY
     ======================================================= */

  setReady(ready = true) {

    return this.send(
      ONLINE_MESSAGE_TYPES.PLAYER_READY,
      {
        ready:
          Boolean(ready)
      }
    );

  }


  /* =======================================================
     GAME ACTION
     ======================================================= */

  sendGameAction(action, data = {}) {

    return this.send(
      ONLINE_MESSAGE_TYPES.GAME_ACTION,
      {
        action,
        data
      }
    );

  }


  /* =======================================================
     AUCTION BID
     ======================================================= */

  sendBid(amount) {

    const bid =
      Number(amount);

    if (
      !Number.isFinite(bid) ||
      bid < 0
    ) {

      return false;

    }

    return this.send(
      ONLINE_MESSAGE_TYPES.AUCTION_BID,
      {
        amount:
          bid
      }
    );

  }


  /* =======================================================
     AUCTION PASS
     ======================================================= */

  passAuction() {

    return this.send(
      ONLINE_MESSAGE_TYPES.AUCTION_PASS
    );

  }


  /* =======================================================
     WILD CARD
     ======================================================= */

  useWildCard(playerId) {

    return this.send(
      ONLINE_MESSAGE_TYPES.WILD_CARD,
      {
        playerId
      }
    );

  }


  /* =======================================================
     CAPTAIN
     ======================================================= */

  selectCaptain(playerId) {

    return this.send(
      ONLINE_MESSAGE_TYPES.CAPTAIN_SELECTED,
      {
        playerId
      }
    );

  }


  /* =======================================================
     LEAVE ROOM
     ======================================================= */

  leaveRoom() {

    return this.send(
      ONLINE_MESSAGE_TYPES.LEAVE_ROOM
    );

  }


  /* =======================================================
     HANDLE MESSAGE
     ======================================================= */

  handleMessage(rawData) {

    if (
      typeof rawData !==
      "string"
    ) {

      return;

    }

    if (
      rawData.length >
      R2_ONLINE_CONFIG.maxMessageSize
    ) {

      this.emit(
        "error",
        {
          code:
            "SERVER_MESSAGE_TOO_LARGE"
        }
      );

      return;

    }

    const message =
      safeParse(rawData);

    if (!message) {

      return;

    }

    if (
      message.protocol !==
      R2_ONLINE_CONFIG.protocol
    ) {

      return;

    }

    if (
      message.clientId &&
      !this.clientId
    ) {

      this.clientId =
        message.clientId;

    }

    this.routeMessage(
      message
    );

  }


  /* =======================================================
     ROUTER
     ======================================================= */

  routeMessage(message) {

    switch (
      message.type
    ) {

      case ONLINE_MESSAGE_TYPES.PONG:

        this.emit(
          "pong",
          message
        );

        break;


      case ONLINE_MESSAGE_TYPES.ROOM_CREATED:

        this.roomCode =
          message.payload.roomCode;

        this.playerRole =
          ONLINE_ROLES.PLAYER_1;

        this.emit(
          "room_created",
          message.payload
        );

        break;


      case ONLINE_MESSAGE_TYPES.ROOM_JOINED:

        this.roomCode =
          message.payload.roomCode;

        this.playerRole =
          message.payload.role;

        this.emit(
          "room_joined",
          message.payload
        );

        break;


      case ONLINE_MESSAGE_TYPES.ROOM_STATE:

        this.emit(
          "room_state",
          message.payload
        );

        break;


      case ONLINE_MESSAGE_TYPES.PLAYER_JOINED:

        this.emit(
          "player_joined",
          message.payload
        );

        break;


      case ONLINE_MESSAGE_TYPES.PLAYER_LEFT:

        this.emit(
          "player_left",
          message.payload
        );

        break;


      case ONLINE_MESSAGE_TYPES.GAME_START:

        this.emit(
          "game_start",
          message.payload
        );

        break;


      case ONLINE_MESSAGE_TYPES.GAME_ACTION:

        this.emit(
          "game_action",
          message.payload
        );

        break;


      case ONLINE_MESSAGE_TYPES.AUCTION_BID:

        this.emit(
          "auction_bid",
          message.payload
        );

        break;


      case ONLINE_MESSAGE_TYPES.AUCTION_PASS:

        this.emit(
          "auction_pass",
          message.payload
        );

        break;


      case ONLINE_MESSAGE_TYPES.WILD_CARD:

        this.emit(
          "wild_card",
          message.payload
        );

        break;


      case ONLINE_MESSAGE_TYPES.CAPTAIN_SELECTED:

        this.emit(
          "captain_selected",
          message.payload
        );

        break;


      case ONLINE_MESSAGE_TYPES.MATCH_RESULT:

        this.emit(
          "match_result",
          message.payload
        );

        break;


      case ONLINE_MESSAGE_TYPES.MATCH_STATS:

        this.emit(
          "match_stats",
          message.payload
        );

        break;


      case ONLINE_MESSAGE_TYPES.ERROR:

        this.emit(
          "server_error",
          message.payload
        );

        break;


      default:

        this.emit(
          "unknown_message",
          message
        );

    }

  }


  /* =======================================================
     RECONNECT
     ======================================================= */

  startReconnect() {

    if (
      this.intentionalDisconnect
    ) {

      return;

    }

    if (
      this.reconnectCount >=
      R2_ONLINE_CONFIG.reconnectAttempts
    ) {

      this.setState(
        ONLINE_STATE.ERROR
      );

      this.emit(
        "error",
        {
          code:
            "RECONNECT_FAILED",

          message:
            "فشل إعادة الاتصال بالسيرفر."
        }
      );

      return;

    }

    this.setState(
      ONLINE_STATE.RECONNECTING
    );

    this.clearReconnectTimer();

    const attempt =
      this.reconnectCount + 1;

    const delay =
      R2_ONLINE_CONFIG.reconnectDelay *
      Math.min(
        attempt,
        5
      );

    this.reconnectTimer =
      setTimeout(
        () => {

          this.reconnectCount++;

          this.connect(
            this.serverUrl
          );

        },
        delay
      );

  }


  clearReconnectTimer() {

    if (
      this.reconnectTimer
    ) {

      clearTimeout(
        this.reconnectTimer
      );

      this.reconnectTimer =
        null;

    }

  }


  /* =======================================================
     HEARTBEAT
     ======================================================= */

  startHeartbeat() {

    this.stopHeartbeat();

    this.heartbeatTimer =
      setInterval(
        () => {

          this.send(
            ONLINE_MESSAGE_TYPES.PING
          );

        },
        R2_ONLINE_CONFIG.heartbeatInterval
      );

  }


  stopHeartbeat() {

    if (
      this.heartbeatTimer
    ) {

      clearInterval(
        this.heartbeatTimer
      );

      this.heartbeatTimer =
        null;

    }

  }


  /* =======================================================
     TIMEOUT
     ======================================================= */

  clearConnectionTimeout() {

    if (
      this.connectionTimer
    ) {

      clearTimeout(
        this.connectionTimer
      );

      this.connectionTimer =
        null;

    }

  }


  /* =======================================================
     ERROR
     ======================================================= */

  handleConnectionError(error) {

    this.setState(
      ONLINE_STATE.ERROR
    );

    this.emit(
      "error",
      {
        code:
          "CONNECTION_ERROR",

        error
      }
    );

  }

}


/* =========================================================
   EXPORT CLIENT
   ========================================================= */

if (
  typeof window !==
  "undefined"
) {

  window.R2OnlineClient =
    R2OnlineClient;

  window.R2OnlineConfig =
    R2_ONLINE_CONFIG;

  window.R2OnlineMessageTypes =
    ONLINE_MESSAGE_TYPES;

  console.log(
    "R2 ONLINE CLIENT LOADED"
    /* =========================================================
   R2 FOOTBALL GAMES
   online.js — PART 2/6
   ONLINE ROOM STATE + PLAYER CONNECTIONS
   ========================================================= */

"use strict";


/* =========================================================
   ONLINE CONSTANTS
   ========================================================= */

const R2_ONLINE = {

  roomCodeLength: 6,

  maxPlayers: 2,

  reconnectTime: 15000,

  heartbeatInterval: 10000,

  auctionTimeout: 30000,

  maxMessageSize: 64 * 1024

};


/* =========================================================
   CONNECTION STATES
   ========================================================= */

const CONNECTION_STATE = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  RECONNECTING: "reconnecting",
  ERROR: "error"
};


/* =========================================================
   ROOM STATES
   ========================================================= */

const ROOM_STATE = {

  WAITING: "waiting",

  STARTING: "starting",

  AUCTION: "auction",

  TEAM_BUILDING: "team_building",

  WILDCARD: "wildcard",

  CAPTAIN: "captain",

  MATCH: "match",

  RESULT: "result",

  FINISHED: "finished",

  CLOSED: "closed"

};


/* =========================================================
   ONLINE GAME TYPES
   ========================================================= */

const ONLINE_GAME_TYPES = {

  PRO_MAX: "pro_max",

  FIVE_A_SIDE: "five_a_side",

  DEAL_OR_NO_DEAL: "deal_or_no_deal"

};


/* =========================================================
   LOCAL ONLINE STATE
   ========================================================= */

const onlineState = {

  socket: null,

  connection: CONNECTION_STATE.DISCONNECTED,

  roomCode: null,

  playerId: null,

  playerName: null,

  opponentId: null,

  opponentName: null,

  gameType: null,

  roomState: ROOM_STATE.WAITING,

  isHost: false,

  reconnectAttempts: 0,

  lastPing: 0,

  connectedAt: null,

  room: null

};


/* =========================================================
   ROOM FACTORY
   ========================================================= */

function createOnlineRoom(gameType, hostName) {

  const room = {

    id: generateRoomCode(),

    gameType: gameType,

    state: ROOM_STATE.WAITING,

    createdAt: Date.now(),

    updatedAt: Date.now(),

    host: {

      id: generatePlayerId(),

      name: sanitizePlayerName(hostName),

      connected: true,

      ready: false,

      budget: 2000,

      team: [],

      wildcardUsed: false,

      captain: null

    },

    guest: null,

    currentAuction: null,

    usedPlayerIds: [],

    winner: null,

    result: null

  };

  return room;

}


/* =========================================================
   CREATE PLAYER
   ========================================================= */

function createOnlinePlayer(name) {

  return {

    id: generatePlayerId(),

    name: sanitizePlayerName(name),

    connected: true,

    ready: false,

    budget: 2000,

    team: [],

    wildcardUsed: false,

    captain: null

  };

}


/* =========================================================
   PLAYER ID
   ========================================================= */

function generatePlayerId() {

  const randomPart =
    Math.random()
      .toString(36)
      .substring(2, 10);

  const timePart =
    Date.now()
      .toString(36);

  return `p_${timePart}_${randomPart}`;

}


/* =========================================================
   ROOM CODE
   ========================================================= */

function generateRoomCode() {

  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  for (let i = 0; i < R2_ONLINE.roomCodeLength; i++) {

    const index =
      Math.floor(
        Math.random() * chars.length
      );

    code += chars[index];

  }

  return code;

}


/* =========================================================
   NAME SANITIZER
   ========================================================= */

function sanitizePlayerName(name) {

  if (typeof name !== "string") {
    return "لاعب";
  }

  return name
    .trim()
    .replace(/[<>]/g, "")
    .substring(0, 24) || "لاعب";

}


/* =========================================================
   ROOM VALIDATION
   ========================================================= */

function validateGameType(gameType) {

  return Object.values(ONLINE_GAME_TYPES)
    .includes(gameType);

}


/* =========================================================
   CHECK ROOM
   ========================================================= */

function isValidRoom(room) {

  if (!room) {
    return false;
  }

  if (!room.id) {
    return false;
  }

  if (!validateGameType(room.gameType)) {
    return false;
  }

  if (!room.host) {
    return false;
  }

  return true;

}


/* =========================================================
   CHECK ROOM FULL
   ========================================================= */

function isRoomFull(room) {

  return Boolean(
    room &&
    room.host &&
    room.guest
  );

}


/* =========================================================
   ADD GUEST
   ========================================================= */

function addGuestToRoom(room, playerName) {

  if (!isValidRoom(room)) {

    return {
      success: false,
      error: "الغرفة غير صالحة"
    };

  }

  if (isRoomFull(room)) {

    return {
      success: false,
      error: "الغرفة ممتلئة"
    };

  }

  const guest =
    createOnlinePlayer(playerName);

  room.guest = guest;

  room.updatedAt = Date.now();

  return {
    success: true,
    player: guest,
    room
  };

}


/* =========================================================
   GET OPPONENT
   ========================================================= */

function getOpponentFromRoom(room, playerId) {

  if (!room || !playerId) {
    return null;
  }

  if (
    room.host &&
    room.host.id !== playerId &&
    room.host.connected
  ) {

    return room.host;

  }

  if (
    room.guest &&
    room.guest.id !== playerId &&
    room.guest.connected
  ) {

    return room.guest;

  }

  return null;

}


/* =========================================================
   GET CURRENT PLAYER
   ========================================================= */

function getCurrentPlayerFromRoom(room, playerId) {

  if (!room || !playerId) {
    return null;
  }

  if (
    room.host &&
    room.host.id === playerId
  ) {

    return room.host;

  }

  if (
    room.guest &&
    room.guest.id === playerId
  ) {

    return room.guest;

  }

  return null;

}


/* =========================================================
   PLAYER READY
   ========================================================= */

function setPlayerReady(room, playerId, ready = true) {

  const player =
    getCurrentPlayerFromRoom(
      room,
      playerId
    );

  if (!player) {

    return {
      success: false,
      error: "اللاعب غير موجود"
    };

  }

  player.ready = Boolean(ready);

  room.updatedAt = Date.now();

  return {
    success: true,
    bothReady: areBothPlayersReady(room)
  };

}


/* =========================================================
   BOTH PLAYERS READY
   ========================================================= */

function areBothPlayersReady(room) {

  if (!room || !room.host || !room.guest) {
    return false;
  }

  return (
    room.host.connected &&
    room.guest.connected &&
    room.host.ready === true &&
    room.guest.ready === true
  );

}


/* =========================================================
   START ROOM
   ========================================================= */

function startOnlineRoom(room) {

  if (!isValidRoom(room)) {

    return {
      success: false,
      error: "الغرفة غير صالحة"
    };

  }

  if (!areBothPlayersReady(room)) {

    return {
      success: false,
      error: "يجب أن يكون اللاعبان جاهزين"
    };

  }

  room.state = ROOM_STATE.STARTING;

  room.updatedAt = Date.now();

  return {
    success: true,
    state: room.state
  };

}


/* =========================================================
   MOVE ROOM TO AUCTION
   ========================================================= */

function startOnlineAuction(room) {

  if (!room) {
    return false;
  }

  room.state = ROOM_STATE.AUCTION;

  room.currentAuction = {

    player: null,

    position: null,

    currentBid: 5,

    highestBidder: null,

    startedAt: Date.now(),

    expiresAt:
      Date.now() +
      R2_ONLINE.auctionTimeout

  };

  room.updatedAt = Date.now();

  return true;

}


/* =========================================================
   SET CONNECTION
   ========================================================= */

function setPlayerConnection(
  room,
  playerId,
  connected
) {

  const player =
    getCurrentPlayerFromRoom(
      room,
      playerId
    );

  if (!player) {
    return false;
  }

  player.connected = Boolean(connected);

  room.updatedAt = Date.now();

  return true;

}


/* =========================================================
   REMOVE PLAYER SAFELY
   ========================================================= */

function disconnectOnlinePlayer(
  room,
  playerId
) {

  const player =
    getCurrentPlayerFromRoom(
      room,
      playerId
    );

  if (!player) {
    return false;
  }

  player.connected = false;

  room.updatedAt = Date.now();

  return true;

}


/* =========================================================
   ROOM SNAPSHOT
   ========================================================= */

function createRoomSnapshot(
  room,
  viewerId
) {

  if (!room) {
    return null;
  }

  const currentPlayer =
    getCurrentPlayerFromRoom(
      room,
      viewerId
    );

  const opponent =
    getOpponentFromRoom(
      room,
      viewerId
    );

  return {

    roomId: room.id,

    gameType: room.gameType,

    state: room.state,

    currentPlayer: currentPlayer
      ? {
          id: currentPlayer.id,
          name: currentPlayer.name,
          connected: currentPlayer.connected,
          ready: currentPlayer.ready,
          budget: currentPlayer.budget,
          team: currentPlayer.team,
          wildcardUsed:
            currentPlayer.wildcardUsed,
          captain:
            currentPlayer.captain
        }
      : null,

    opponent: opponent
      ? {
          id: opponent.id,
          name: opponent.name,
          connected: opponent.connected,
          ready: opponent.ready,
          budget: opponent.budget,
          team: opponent.team,
          wildcardUsed:
            opponent.wildcardUsed,
          captain:
            opponent.captain
        }
      : null,

    auction: room.currentAuction
      ? {
          position:
            room.currentAuction.position,

          currentBid:
            room.currentAuction.currentBid,

          highestBidder:
            room.currentAuction.highestBidder
        }
      : null

  };

}


/* =========================================================
   LOCAL ROOM SAVE
   ========================================================= */

function saveLocalOnlineState() {

  try {

    localStorage.setItem(
      "r2_online_state",
      JSON.stringify({
        roomCode:
          onlineState.roomCode,

        playerId:
          onlineState.playerId,

        playerName:
          onlineState.playerName,

        gameType:
          onlineState.gameType
      })
    );

  } catch (error) {

    console.warn(
      "R2: unable to save online state",
      error
    );

  }

}


/* =========================================================
   LOCAL ROOM LOAD
   ========================================================= */

function loadLocalOnlineState() {

  try {

    const saved =
      localStorage.getItem(
        "r2_online_state"
      );

    if (!saved) {
      return null;
    }

    return JSON.parse(saved);

  } catch (error) {

    console.warn(
      "R2: invalid online state",
      error
    );

    return null;

  }

}


/* =========================================================
   CLEAR LOCAL ONLINE STATE
   ========================================================= */

function clearLocalOnlineState() {

  try {

    localStorage.removeItem(
      "r2_online_state"
    );

  } catch (error) {

    console.warn(
      "R2: unable to clear online state",
      error
    );

  }

}


/* =========================================================
   ONLINE STATE EXPORT
   ========================================================= */

window.R2_ONLINE_DATA = {

  config: R2_ONLINE,

  connectionState:
    CONNECTION_STATE,

  roomState:
    ROOM_STATE,

  gameTypes:
    ONLINE_GAME_TYPES,

  state:
    onlineState,

  createOnlineRoom,

  createOnlinePlayer,

  generatePlayerId,

  generateRoomCode,

  sanitizePlayerName,

  validateGameType,

  isValidRoom,

  isRoomFull,

  addGuestToRoom,

  getOpponentFromRoom,

  getCurrentPlayerFromRoom,

  setPlayerReady,

  areBothPlayersReady,

  startOnlineRoom,

  startOnlineAuction,

  setPlayerConnection,

  disconnectOnlinePlayer,

  createRoomSnapshot,

  saveLocalOnlineState,

  loadLocalOnlineState,

  clearLocalOnlineState

};


/* =========================================================
   PART 2 CHECK
   ========================================================= */

console.log(
  "R2 ONLINE — PART 2/6 LOADED"
);
    
  );

  }
/* =========================================================
   R2 FOOTBALL GAMES
   online.js — PART 3/6
   WEBSOCKET CLIENT + MESSAGE SYSTEM
   ========================================================= */

"use strict";


/* =========================================================
   WEBSOCKET CONFIG
   ========================================================= */

const R2_WS_CONFIG = {

  /*
   مهم:
   في التطوير المحلي:
   ws://localhost:8080

   لما ترفع الموقع HTTPS:
   wss://YOUR-DOMAIN/ws
  */

  developmentURL: "ws://localhost:8080",

  productionURL:
    window.location.protocol === "https:"
      ? `wss://${window.location.host}`
      : "ws://localhost:8080",

  reconnectDelay: 1500,

  maxReconnectDelay: 10000,

  reconnectMultiplier: 1.7,

  maxReconnectAttempts: 20,

  pingInterval: 10000,

  connectionTimeout: 8000

};


/* =========================================================
   MESSAGE TYPES
   ========================================================= */

const R2_MESSAGE_TYPES = {

  /* Connection */

  CONNECT: "connect",

  CONNECTED: "connected",

  DISCONNECT: "disconnect",

  RECONNECT: "reconnect",

  PING: "ping",

  PONG: "pong",


  /* Room */

  CREATE_ROOM: "create_room",

  JOIN_ROOM: "join_room",

  LEAVE_ROOM: "leave_room",

  ROOM_CREATED: "room_created",

  ROOM_JOINED: "room_joined",

  ROOM_UPDATED: "room_updated",

  ROOM_ERROR: "room_error",

  ROOM_CLOSED: "room_closed",


  /* Players */

  PLAYER_JOINED: "player_joined",

  PLAYER_LEFT: "player_left",

  PLAYER_READY: "player_ready",

  PLAYER_UNREADY: "player_unready",


  /* Game */

  GAME_START: "game_start",

  GAME_STARTED: "game_started",

  GAME_STATE: "game_state",

  GAME_ACTION: "game_action",

  GAME_ERROR: "game_error",


  /* Auction */

  AUCTION_START: "auction_start",

  AUCTION_BID: "auction_bid",

  AUCTION_PASS: "auction_pass",

  AUCTION_SURRENDER: "auction_surrender",

  AUCTION_UPDATE: "auction_update",

  AUCTION_FINISHED: "auction_finished",


  /* Team */

  TEAM_UPDATE: "team_update",

  WILDCARD: "wildcard",

  CAPTAIN_SELECT: "captain_select",


  /* Match */

  MATCH_START: "match_start",

  MATCH_RESULT: "match_result",


  /* General */

  ERROR: "error"

};


/* =========================================================
   MESSAGE ID
   ========================================================= */

function createMessageId() {

  return (
    "msg_" +
    Date.now().toString(36) +
    "_" +
    Math.random()
      .toString(36)
      .substring(2, 9)
  );

}


/* =========================================================
   CREATE MESSAGE
   ========================================================= */

function createOnlineMessage(
  type,
  payload = {}
) {

  return {

    id: createMessageId(),

    type,

    timestamp: Date.now(),

    roomCode:
      onlineState.roomCode,

    playerId:
      onlineState.playerId,

    payload

  };

}


/* =========================================================
   MESSAGE VALIDATION
   ========================================================= */

function validateOnlineMessage(message) {

  if (!message) {
    return false;
  }

  if (
    typeof message !== "object"
  ) {

    return false;

  }

  if (
    typeof message.type !== "string"
  ) {

    return false;

  }

  if (
    message.type.length > 64
  ) {

    return false;

  }

  return true;

}


/* =========================================================
   WEBSOCKET URL
   ========================================================= */

function getWebSocketURL() {

  /*
   لو حددت URL بنفسك:
   window.R2_WEBSOCKET_URL = "ws://localhost:8080";
  */

  if (
    typeof window.R2_WEBSOCKET_URL === "string" &&
    window.R2_WEBSOCKET_URL.trim()
  ) {

    return window.R2_WEBSOCKET_URL.trim();

  }


  /*
   Local development
  */

  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {

    return R2_WS_CONFIG.developmentURL;

  }


  /*
   Production
  */

  return R2_WS_CONFIG.productionURL;

}


/* =========================================================
   SOCKET EVENT HANDLERS
   ========================================================= */

const socketHandlers = {

  open: [],

  message: [],

  close: [],

  error: []

};


/* =========================================================
   ADD SOCKET HANDLER
   ========================================================= */

function addSocketHandler(
  event,
  callback
) {

  if (
    !socketHandlers[event] ||
    typeof callback !== "function"
  ) {

    return false;

  }

  socketHandlers[event].push(
    callback
  );

  return true;

}


/* =========================================================
   REMOVE SOCKET HANDLER
   ========================================================= */

function removeSocketHandler(
  event,
  callback
) {

  if (!socketHandlers[event]) {
    return false;
  }

  socketHandlers[event] =
    socketHandlers[event].filter(
      handler => handler !== callback
    );

  return true;

}


/* =========================================================
   RUN SOCKET HANDLERS
   ========================================================= */

function runSocketHandlers(
  event,
  data
) {

  if (!socketHandlers[event]) {
    return;
  }

  socketHandlers[event]
    .forEach(handler => {

      try {

        handler(data);

      } catch (error) {

        console.error(
          "R2 socket handler error:",
          error
        );

      }

    });

}


/* =========================================================
   CONNECT WEBSOCKET
   ========================================================= */

function connectWebSocket() {

  /*
   لو فيه Socket مفتوح بالفعل
  */

  if (
    onlineState.socket &&
    (
      onlineState.socket.readyState ===
      WebSocket.OPEN ||

      onlineState.socket.readyState ===
      WebSocket.CONNECTING
    )
  ) {

    return onlineState.socket;

  }


  /*
   WebSocket غير مدعوم
  */

  if (
    typeof WebSocket === "undefined"
  ) {

    onlineState.connection =
      CONNECTION_STATE.ERROR;

    console.error(
      "R2: WebSocket is not supported."
    );

    return null;

  }


  const url =
    getWebSocketURL();


  onlineState.connection =
    CONNECTION_STATE.CONNECTING;


  let socket;

  try {

    socket =
      new WebSocket(url);

  } catch (error) {

    onlineState.connection =
      CONNECTION_STATE.ERROR;

    console.error(
      "R2: WebSocket connection failed",
      error
    );

    scheduleReconnect();

    return null;

  }


  onlineState.socket = socket;


  /* =======================================================
     OPEN
     ======================================================= */

  socket.addEventListener(
    "open",
    () => {

      onlineState.connection =
        CONNECTION_STATE.CONNECTED;

      onlineState.connectedAt =
        Date.now();

      onlineState.reconnectAttempts =
        0;

      onlineState.lastPing =
        Date.now();

      console.log(
        "R2: WebSocket connected"
      );


      sendOnlineMessage(
        R2_MESSAGE_TYPES.CONNECT,
        {

          roomCode:
            onlineState.roomCode,

          playerId:
            onlineState.playerId,

          playerName:
            onlineState.playerName

        }
      );


      startHeartbeat();


      runSocketHandlers(
        "open",
        socket
      );

    }
  );


  /* =======================================================
     MESSAGE
     ======================================================= */

  socket.addEventListener(
    "message",
    event => {

      handleSocketMessage(
        event.data
      );

    }
  );


  /* =======================================================
     CLOSE
     ======================================================= */

  socket.addEventListener(
    "close",
    event => {

      onlineState.connection =
        CONNECTION_STATE.DISCONNECTED;

      onlineState.socket =
        null;

      stopHeartbeat();


      console.warn(
        "R2: WebSocket disconnected",
        event.code
      );


      runSocketHandlers(
        "close",
        event
      );


      /*
       محاولة إعادة الاتصال
      */

      if (
        onlineState.roomCode &&
        onlineState.playerId
      ) {

        scheduleReconnect();

      }

    }
  );


  /* =======================================================
     ERROR
     ======================================================= */

  socket.addEventListener(
    "error",
    error => {

      onlineState.connection =
        CONNECTION_STATE.ERROR;

      console.error(
        "R2: WebSocket error",
        error
      );


      runSocketHandlers(
        "error",
        error
      );

    }
  );


  return socket;

}


/* =========================================================
   HANDLE SOCKET MESSAGE
   ========================================================= */

function handleSocketMessage(rawData) {

  let message;

  try {

    /*
     حماية من البيانات الضخمة
    */

    if (
      typeof rawData === "string" &&
      rawData.length >
        R2_CONFIG.config?.maxMessageSize ||
      typeof rawData === "string" &&
      rawData.length >
        R2_WS_CONFIG.maxMessageSize
    ) {

      console.warn(
        "R2: message rejected — too large"
      );

      return;

    }


    message =
      typeof rawData === "string"
        ? JSON.parse(rawData)
        : rawData;

  } catch (error) {

    console.error(
      "R2: invalid WebSocket message",
      error
    );

    return;

  }


  if (
    !validateOnlineMessage(message)
  ) {

    console.warn(
      "R2: invalid message structure"
    );

    return;

  }


  runSocketHandlers(
    "message",
    message
  );


  routeOnlineMessage(
    message
  );

}


/* =========================================================
   ROUTE ONLINE MESSAGE
   ========================================================= */

function routeOnlineMessage(message) {

  switch (message.type) {


    /* =====================================================
       CONNECTED
       ===================================================== */

    case R2_MESSAGE_TYPES.CONNECTED:

      onlineState.connection =
        CONNECTION_STATE.CONNECTED;

      if (
        message.payload
      ) {

        if (
          message.payload.room
        ) {

          onlineState.room =
            message.payload.room;

        }

      }

      dispatchOnlineEvent(
        "r2:connected",
        message
      );

      break;


    /* =====================================================
       ROOM CREATED
       ===================================================== */

    case R2_MESSAGE_TYPES.ROOM_CREATED:

      if (
        message.payload
      ) {

        onlineState.roomCode =
          message.payload.roomCode ||
          onlineState.roomCode;

        onlineState.playerId =
          message.payload.playerId ||
          onlineState.playerId;

        onlineState.room =
          message.payload.room ||
          onlineState.room;

        onlineState.isHost = true;

      }

      saveLocalOnlineState();

      dispatchOnlineEvent(
        "r2:room-created",
        message
      );

      break;


    /* =====================================================
       ROOM JOINED
       ===================================================== */

    case R2_MESSAGE_TYPES.ROOM_JOINED:

      if (
        message.payload
      ) {

        onlineState.roomCode =
          message.payload.roomCode ||
          onlineState.roomCode;

        onlineState.playerId =
          message.payload.playerId ||
          onlineState.playerId;

        onlineState.room =
          message.payload.room ||
          onlineState.room;

        onlineState.isHost = false;

      }

      saveLocalOnlineState();

      dispatchOnlineEvent(
        "r2:room-joined",
        message
      );

      break;


    /* =====================================================
       ROOM UPDATED
       ===================================================== */

    case R2_MESSAGE_TYPES.ROOM_UPDATED:

      if (
        message.payload &&
        message.payload.room
      ) {

        onlineState.room =
          message.payload.room;

      }

      dispatchOnlineEvent(
        "r2:room-updated",
        message
      );

      break;


    /* =====================================================
       PLAYER JOINED
       ===================================================== */

    case R2_MESSAGE_TYPES.PLAYER_JOINED:

      if (
        message.payload &&
        message.payload.room
      ) {

        onlineState.room =
          message.payload.room;

      }

      dispatchOnlineEvent(
        "r2:player-joined",
        message
      );

      break;


    /* =====================================================
       PLAYER LEFT
       ===================================================== */

    case R2_MESSAGE_TYPES.PLAYER_LEFT:

      if (
        message.payload &&
        message.payload.room
      ) {

        onlineState.room =
          message.payload.room;

      }

      dispatchOnlineEvent(
        "r2:player-left",
        message
      );

      break;


    /* =====================================================
       READY
       ===================================================== */

    case R2_MESSAGE_TYPES.PLAYER_READY:

      dispatchOnlineEvent(
        "r2:player-ready",
        message
      );

      break;


    /* =====================================================
       GAME START
       ===================================================== */

    case R2_MESSAGE_TYPES.GAME_STARTED:

      onlineState.roomState =
        ROOM_STATE.AUCTION;

      dispatchOnlineEvent(
        "r2:game-started",
        message
      );

      break;


    /* =====================================================
       GAME STATE
       ===================================================== */

    case R2_MESSAGE_TYPES.GAME_STATE:

      if (
        message.payload &&
        message.payload.room
      ) {

        onlineState.room =
          message.payload.room;

      }

      dispatchOnlineEvent(
        "r2:game-state",
        message
      );

      break;


    /* =====================================================
       AUCTION
       ===================================================== */

    case R2_MESSAGE_TYPES.AUCTION_UPDATE:

      if (
        message.payload &&
        message.payload.auction
      ) {

        if (
          onlineState.room
        ) {

          onlineState.room.currentAuction =
            message.payload.auction;

        }

      }

      dispatchOnlineEvent(
        "r2:auction-update",
        message
      );

      break;


    /* =====================================================
       AUCTION FINISHED
       ===================================================== */

    case R2_MESSAGE_TYPES.AUCTION_FINISHED:

      dispatchOnlineEvent(
        "r2:auction-finished",
        message
      );

      break;


    /* =====================================================
       MATCH RESULT
       ===================================================== */

    case R2_MESSAGE_TYPES.MATCH_RESULT:

      onlineState.roomState =
        ROOM_STATE.RESULT;

      dispatchOnlineEvent(
        "r2:match-result",
        message
      );

      break;


    /* =====================================================
       PONG
       ===================================================== */

    case R2_MESSAGE_TYPES.PONG:

      onlineState.lastPing =
        Date.now();

      break;


    /* =====================================================
       ERROR
       ===================================================== */

    case R2_MESSAGE_TYPES.ERROR:

    case R2_MESSAGE_TYPES.ROOM_ERROR:

    case R2_MESSAGE_TYPES.GAME_ERROR:

      console.error(
        "R2 Online Error:",
        message.payload
      );

      dispatchOnlineEvent(
        "r2:error",
        message
      );

      break;


    default:

      console.log(
        "R2: unknown message type:",
        message.type
      );

  }

}


/* =========================================================
   SEND MESSAGE
   ========================================================= */

function sendOnlineMessage(
  type,
  payload = {}
) {

  if (
    !onlineState.socket
  ) {

    console.warn(
      "R2: socket does not exist"
    );

    return false;

  }


  if (
    onlineState.socket.readyState !==
    WebSocket.OPEN
  ) {

    console.warn(
      "R2: socket is not open"
    );

    return false;

  }


  const message =
    createOnlineMessage(
      type,
      payload
    );


  try {

    const serialized =
      JSON.stringify(message);


    if (
      serialized.length >
      R2_WS_CONFIG.maxMessageSize
    ) {

      console.warn(
        "R2: message is too large"
      );

      return false;

    }


    onlineState.socket.send(
      serialized
    );

    return true;

  } catch (error) {

    console.error(
      "R2: unable to send message",
      error
    );

    return false;

  }

}


/* =========================================================
   CREATE ROOM REQUEST
   ========================================================= */

function requestCreateRoom(
  gameType,
  playerName
) {

  if (
    !validateGameType(gameType)
  ) {

    return false;

  }


  onlineState.playerName =
    sanitizePlayerName(playerName);

  onlineState.gameType =
    gameType;


  if (
    !onlineState.playerId
  ) {

    onlineState.playerId =
      generatePlayerId();

  }


  connectWebSocket();


  return sendOnlineMessage(
    R2_MESSAGE_TYPES.CREATE_ROOM,
    {

      gameType,

      playerName:
        onlineState.playerName,

      playerId:
        onlineState.playerId

    }
  );

}


/* =========================================================
   JOIN ROOM REQUEST
   ========================================================= */

function requestJoinRoom(
  roomCode,
  playerName
) {

  if (
    typeof roomCode !== "string"
  ) {

    return false;

  }


  const normalizedCode =
    roomCode
      .trim()
      .toUpperCase();


  if (
    normalizedCode.length !==
    R2_ONLINE.roomCodeLength
  ) {

    return false;

  }


  onlineState.roomCode =
    normalizedCode;

  onlineState.playerName =
    sanitizePlayerName(playerName);


  if (
    !onlineState.playerId
  ) {

    onlineState.playerId =
      generatePlayerId();

  }


  connectWebSocket();


  return sendOnlineMessage(
    R2_MESSAGE_TYPES.JOIN_ROOM,
    {

      roomCode:
        normalizedCode,

      playerName:
        onlineState.playerName,

      playerId:
        onlineState.playerId

    }
  );

}


/* =========================================================
   LEAVE ROOM
   ========================================================= */

function leaveOnlineRoom() {

  if (
    onlineState.socket &&
    onlineState.socket.readyState ===
    WebSocket.OPEN
  ) {

    sendOnlineMessage(
      R2_MESSAGE_TYPES.LEAVE_ROOM,
      {

        roomCode:
          onlineState.roomCode,

        playerId:
          onlineState.playerId

      }
    );

  }


  stopHeartbeat();


  onlineState.roomCode =
    null;

  onlineState.room =
    null;

  onlineState.opponentId =
    null;

  onlineState.opponentName =
    null;

  onlineState.roomState =
    ROOM_STATE.WAITING;

  onlineState.isHost =
    false;


  clearLocalOnlineState();

}


/* =========================================================
   RECONNECT SYSTEM
   ========================================================= */

let reconnectTimer = null;

let heartbeatTimer = null;


function scheduleReconnect() {

  if (
    reconnectTimer
  ) {

    return;

  }


  if (
    onlineState.reconnectAttempts >=
    R2_WS_CONFIG.maxReconnectAttempts
  ) {

    console.warn(
      "R2: maximum reconnect attempts reached"
    );

    return;

  }


  onlineState.connection =
    CONNECTION_STATE.RECONNECTING;


  onlineState.reconnectAttempts++;


  const delay =
    Math.min(

      R2_WS_CONFIG.maxReconnectDelay,

      R2_WS_CONFIG.reconnectDelay *
      Math.pow(
        R2_WS_CONFIG.reconnectMultiplier,
        onlineState.reconnectAttempts - 1
      )

    );


  reconnectTimer =
    setTimeout(
      () => {

        reconnectTimer =
          null;

        reconnectWebSocket();

      },
      delay
    );

}


/* =========================================================
   RECONNECT
   ========================================================= */

function reconnectWebSocket() {

  if (
    !onlineState.roomCode ||
    !onlineState.playerId
  ) {

    return;

  }


  console.log(
    "R2: attempting reconnect..."
  );


  const socket =
    connectWebSocket();


  if (!socket) {
    scheduleReconnect();
    return;
  }


  addSocketHandler(
    "open",
    function reconnectHandshake() {

      sendOnlineMessage(
        R2_MESSAGE_TYPES.RECONNECT,
        {

          roomCode:
            onlineState.roomCode,

          playerId:
            onlineState.playerId,

          playerName:
            onlineState.playerName

        }
      );


      removeSocketHandler(
        "open",
        reconnectHandshake
      );

    }
  );

}


/* =========================================================
   HEARTBEAT
   ========================================================= */

function startHeartbeat() {

  stopHeartbeat();


  heartbeatTimer =
    setInterval(
      () => {

        if (
          !onlineState.socket ||
          onlineState.socket.readyState !==
          WebSocket.OPEN
        ) {

          return;

        }


        sendOnlineMessage(
          R2_MESSAGE_TYPES.PING,
          {

            timestamp:
              Date.now()

          }
        );

      },
      R2_WS_CONFIG.pingInterval
    );

}


/* =========================================================
   STOP HEARTBEAT
   ========================================================= */

function stopHeartbeat() {

  if (
    heartbeatTimer
  ) {

    clearInterval(
      heartbeatTimer
    );

    heartbeatTimer =
      null;

  }

}


/* =========================================================
   BROWSER EVENT SYSTEM
   ========================================================= */

function dispatchOnlineEvent(
  eventName,
  detail
) {

  try {

    window.dispatchEvent(
      new CustomEvent(
        eventName,
        {
          detail
        }
      )
    );

  } catch (error) {

    console.warn(
      "R2: unable to dispatch event",
      eventName,
      error
    );

  }

}


/* =========================================================
   ONLINE API
   ========================================================= */

window.R2_ONLINE_WS = {

  config:
    R2_WS_CONFIG,

  messageTypes:
    R2_MESSAGE_TYPES,

  connect:
    connectWebSocket,

  disconnect:
    leaveOnlineRoom,

  send:
    sendOnlineMessage,

  createRoom:
    requestCreateRoom,

  joinRoom:
    requestJoinRoom,

  reconnect:
    reconnectWebSocket,

  addHandler:
    addSocketHandler,

  removeHandler:
    removeSocketHandler,

  getURL:
    getWebSocketURL

};


/* =========================================================
   PART 3 CHECK
   ========================================================= */

console.log(
  "R2 ONLINE — PART 3/6 LOADED"
);
/* =========================================================
   R2 FOOTBALL GAMES
   ONLINE.JS
   PART 4 / 6
   ROOM GAME STATE + PLAYER CONNECTIONS
   ========================================================= */

"use strict";


/* =========================================================
   ROOM STATE HELPERS
   ========================================================= */

/*
  كل غرفة فيها:

  room.players[0] = Player 1
  room.players[1] = Player 2

  وكل لاعب له:
  id
  name
  socket
  connected
  ready
  budget
  team
  wildcard
  captain
*/

function createPlayerState(playerId, name, socketId) {

  return {
    id: playerId,

    name: String(name || "لاعب"),

    socketId: socketId || null,

    connected: true,

    ready: false,

    budget: 2000,

    spent: 0,

    team: [],

    wildcard: {
      available: true,
      used: false,
      playerId: null
    },

    captain: null,

    currentPosition: null,

    currentPlayer: null,

    lastBid: 0,

    passed: false
  };

}


/* =========================================================
   CREATE ROOM GAME STATE
   ========================================================= */

function createRoomGameState(roomCode, gameType) {

  return {

    roomCode,

    gameType,

    status: "waiting",

    createdAt: Date.now(),

    players: [
      null,
      null
    ],

    currentTurn: 0,

    currentPlayerIndex: 0,

    auction: {

      active: false,

      position: null,

      slot: 0,

      player: null,

      currentBid: 5,

      highestBidder: null,

      lastBidder: null,

      passedPlayers: [],

      startedAt: null,

      finished: false

    },

    deal: {

      active: false,

      position: null,

      round: 1,

      boxes: {

        player1: [],

        player2: []

      },

      openedBoxes: {

        player1: [],

        player2: []

      },

      selectedPlayers: {

        player1: [],

        player2: []

      }

    },

    wildcard: {

      player1Used: false,

      player2Used: false,

      player1PlayerId: null,

      player2PlayerId: null

    },

    captains: {

      player1: null,

      player2: null

    },

    match: {

      started: false,

      finished: false,

      score: {

        player1: 0,

        player2: 0

      },

      events: [],

      manOfTheMatch: null,

      possession: {

        player1: 50,

        player2: 50

      },

      shots: {

        player1: 0,

        player2: 0

      },

      shotsOnTarget: {

        player1: 0,

        player2: 0

      },

      corners: {

        player1: 0,

        player2: 0

      },

      fouls: {

        player1: 0,

        player2: 0

      }

    }

  };

}


/* =========================================================
   ADD PLAYER TO ROOM
   ========================================================= */

function addPlayerToRoom(room, name, socketId) {

  if (!room) {

    return {
      success: false,
      error: "ROOM_NOT_FOUND"
    };

  }


  if (room.players[0] && room.players[1]) {

    return {
      success: false,
      error: "ROOM_FULL"
    };

  }


  const playerIndex =
    room.players[0] === null ? 0 : 1;


  const playerId =
    playerIndex === 0
      ? "player1"
      : "player2";


  room.players[playerIndex] =
    createPlayerState(
      playerId,
      name,
      socketId
    );


  if (
    room.players[0] &&
    room.players[1]
  ) {

    room.status = "ready";

  }


  return {
    success: true,

    playerIndex,

    playerId,

    player: room.players[playerIndex],

    roomStatus: room.status

  };

}


/* =========================================================
   REMOVE PLAYER FROM ROOM
   ========================================================= */

function removePlayerFromRoom(room, socketId) {

  if (!room) {
    return false;
  }


  let removed = false;


  room.players =
    room.players.map(player => {

      if (
        player &&
        player.socketId === socketId
      ) {

        removed = true;

        return null;

      }

      return player;

    });


  if (removed) {

    room.status = "waiting";

  }


  return removed;

}


/* =========================================================
   FIND PLAYER BY SOCKET
   ========================================================= */

function getPlayerBySocket(room, socketId) {

  if (!room) {
    return null;
  }


  return room.players.find(
    player =>
      player &&
      player.socketId === socketId
  ) || null;

}


/* =========================================================
   FIND PLAYER INDEX
   ========================================================= */

function getPlayerIndexBySocket(room, socketId) {

  if (!room) {
    return -1;
  }


  return room.players.findIndex(
    player =>
      player &&
      player.socketId === socketId
  );

}


/* =========================================================
   GET OPPONENT
   ========================================================= */

function getOpponent(room, socketId) {

  if (!room) {
    return null;
  }


  const index =
    getPlayerIndexBySocket(
      room,
      socketId
    );


  if (index === -1) {
    return null;
  }


  const opponentIndex =
    index === 0 ? 1 : 0;


  return room.players[opponentIndex] || null;

}


/* =========================================================
   READY SYSTEM
   ========================================================= */

function setPlayerReady(room, socketId, ready) {

  const player =
    getPlayerBySocket(
      room,
      socketId
    );


  if (!player) {

    return {
      success: false,
      error: "PLAYER_NOT_FOUND"
    };

  }


  player.ready = Boolean(ready);


  const bothReady =
    room.players[0] &&
    room.players[1] &&
    room.players[0].ready &&
    room.players[1].ready;


  if (bothReady) {

    room.status = "starting";

  }


  return {
    success: true,
    bothReady,
    status: room.status
  };

}


/* =========================================================
   SAFE ROOM SNAPSHOT
   ========================================================= */

/*
  مهم جداً:

  ممنوع نبعت socket أو بيانات داخلية
  للخصم.

  الدالة دي بتحول بيانات الغرفة
  إلى بيانات آمنة للإرسال.
*/

function getSafePlayerData(player) {

  if (!player) {
    return null;
  }


  return {

    id: player.id,

    name: player.name,

    connected: player.connected,

    ready: player.ready,

    budget: player.budget,

    spent: player.spent,

    team: player.team,

    wildcard: {

      available: player.wildcard.available,

      used: player.wildcard.used,

      playerId: player.wildcard.playerId

    },

    captain: player.captain,

    currentPosition: player.currentPosition,

    lastBid: player.lastBid

  };

}


function getSafeRoomState(room) {

  if (!room) {
    return null;
  }


  return {

    roomCode: room.roomCode,

    gameType: room.gameType,

    status: room.status,

    players: [

      getSafePlayerData(
        room.players[0]
      ),

      getSafePlayerData(
        room.players[1]
      )

    ],

    currentTurn: room.currentTurn,

    currentPlayerIndex:
      room.currentPlayerIndex,

    auction: {

      active: room.auction.active,

      position: room.auction.position,

      slot: room.auction.slot,

      player: room.auction.player,

      currentBid: room.auction.currentBid,

      highestBidder:
        room.auction.highestBidder,

      finished:
        room.auction.finished

    },

    wildcard: {

      player1Used:
        room.wildcard.player1Used,

      player2Used:
        room.wildcard.player2Used

    },

    captains: {

      player1:
        room.captains.player1,

      player2:
        room.captains.player2

    },

    match: {

      started:
        room.match.started,

      finished:
        room.match.finished,

      score:
        room.match.score,

      events:
        room.match.events,

      manOfTheMatch:
        room.match.manOfTheMatch

    }

  };

}


/* =========================================================
   ROOM VALIDATION
   ========================================================= */

function validateRoomPlayers(room) {

  if (!room) {

    return {
      valid: false,
      error: "ROOM_NOT_FOUND"
    };

  }


  if (!room.players[0]) {

    return {
      valid: false,
      error: "PLAYER_1_MISSING"
    };

  }


  if (!room.players[1]) {

    return {
      valid: false,
      error: "PLAYER_2_MISSING"
    };

  }


  return {
    valid: true
  };

}


/* =========================================================
   CHECK DUPLICATE PLAYER
   ========================================================= */

/*
  اللاعب الذي أخذه Player 1
  لا يمكن أن يظهر لـ Player 2.

  ونفس الكلام العكس.

  دي الحماية الأساسية من تكرار
  نفس اللاعب بين الخصمين.
*/

function isPlayerAlreadyOwned(room, playerId) {

  if (!room || !playerId) {
    return false;
  }


  return room.players.some(
    player => {

      if (!player) {
        return false;
      }


      return player.team.some(
        teamPlayer =>
          teamPlayer &&
          teamPlayer.id === playerId
      );

    }
  );

}


/* =========================================================
   ADD PLAYER TO TEAM
   ========================================================= */

function addPlayerToTeam(
  room,
  socketId,
  player
) {

  const playerState =
    getPlayerBySocket(
      room,
      socketId
    );


  if (!playerState) {

    return {
      success: false,
      error: "PLAYER_NOT_FOUND"
    };

  }


  if (!player) {

    return {
      success: false,
      error: "INVALID_PLAYER"
    };

  }


  if (
    isPlayerAlreadyOwned(
      room,
      player.id
    )
  ) {

    return {
      success: false,
      error: "PLAYER_ALREADY_OWNED"
    };

  }


  playerState.team.push(player);


  return {
    success: true,

    teamSize:
      playerState.team.length,

    player

  };

}


/* =========================================================
   UPDATE CONNECTION STATUS
   ========================================================= */

function updateConnectionStatus(
  room,
  socketId,
  connected
) {

  const player =
    getPlayerBySocket(
      room,
      socketId
    );


  if (!player) {
    return false;
  }


  player.connected =
    Boolean(connected);


  return true;

}


/* =========================================================
   ONLINE DEBUG
   ========================================================= */

function printRoomState(room) {

  if (!room) {
    console.log(
      "[ONLINE] Room not found"
    );

    return;
  }


  console.log(
    "\n=============================="
  );

  console.log(
    "[ONLINE] ROOM:",
    room.roomCode
  );

  console.log(
    "[ONLINE] GAME:",
    room.gameType
  );

  console.log(
    "[ONLINE] STATUS:",
    room.status
  );

  console.log(
    "[ONLINE] PLAYER 1:",
    room.players[0]
      ? room.players[0].name
      : "EMPTY"
  );

  console.log(
    "[ONLINE] PLAYER 2:",
    room.players[1]
      ? room.players[1].name
      : "EMPTY"
  );

  console.log(
    "==============================\n"
  );

}


/* =========================================================
   EXPORT PART 4
   ========================================================= */

if (typeof module !== "undefined") {

  module.exports = {

    createPlayerState,

    createRoomGameState,

    addPlayerToRoom,

    removePlayerFromRoom,

    getPlayerBySocket,

    getPlayerIndexBySocket,

    getOpponent,

    setPlayerReady,

    getSafePlayerData,

    getSafeRoomState,

    validateRoomPlayers,

    isPlayerAlreadyOwned,

    addPlayerToTeam,

    updateConnectionStatus,

    printRoomState

  };

      }
/* =========================================================
   R2 FOOTBALL GAMES
   ONLINE.JS
   PART 5 / 6
   ONLINE AUCTION + BIDDING ENGINE
   ========================================================= */

"use strict";


/* =========================================================
   START AUCTION
   ========================================================= */

function startOnlineAuction(
  room,
  position,
  player,
  slotIndex = 1
) {

  const validation =
    validateRoomPlayers(room);

  if (!validation.valid) {

    return {
      success: false,
      error: validation.error
    };

  }


  if (!position) {

    return {
      success: false,
      error: "POSITION_REQUIRED"
    };

  }


  if (!player) {

    return {
      success: false,
      error: "PLAYER_REQUIRED"
    };

  }


  /*
    منع ظهور لاعب تم أخذه قبل كده
    عند أي من الخصمين.
  */

  if (
    isPlayerAlreadyOwned(
      room,
      player.id
    )
  ) {

    return {
      success: false,
      error: "PLAYER_ALREADY_OWNED"
    };

  }


  room.auction.active = true;

  room.auction.position =
    position;

  room.auction.slot =
    slotIndex;

  room.auction.player =
    player;

  room.auction.currentBid =
    Number(
      R2_CONFIG.auction.startPrice
    );

  room.auction.highestBidder =
    null;

  room.auction.lastBidder =
    null;

  room.auction.passedPlayers =
    [];

  room.auction.startedAt =
    Date.now();

  room.auction.finished =
    false;


  room.currentTurn = 0;

  room.currentPlayerIndex = 0;

  room.players[0].passed = false;
  room.players[1].passed = false;


  room.status = "auction";


  return {

    success: true,

    auction:
      room.auction

  };

}


/* =========================================================
   GET CURRENT AUCTION PLAYER
   ========================================================= */

function getCurrentAuctionPlayer(room) {

  if (
    !room ||
    !room.auction ||
    !room.auction.active
  ) {

    return null;

  }


  return room.auction.player || null;

}


/* =========================================================
   GET CURRENT BID
   ========================================================= */

function getCurrentBid(room) {

  if (!room || !room.auction) {
    return 0;
  }


  return Number(
    room.auction.currentBid || 0
  );

}


/* =========================================================
   CHECK BUDGET
   ========================================================= */

function canAffordBid(
  player,
  amount
) {

  if (!player) {
    return false;
  }


  const bid =
    Number(amount);


  if (!Number.isFinite(bid)) {
    return false;
  }


  if (bid <= 0) {
    return false;
  }


  return (
    player.budget >= bid
  );

}


/* =========================================================
   VALIDATE BID
   ========================================================= */

function validateBid(
  room,
  socketId,
  amount
) {

  const player =
    getPlayerBySocket(
      room,
      socketId
    );


  if (!player) {

    return {
      valid: false,
      error: "PLAYER_NOT_FOUND"
    };

  }


  if (
    !room.auction.active
  ) {

    return {
      valid: false,
      error: "AUCTION_NOT_ACTIVE"
    };

  }


  if (
    room.auction.finished
  ) {

    return {
      valid: false,
      error: "AUCTION_FINISHED"
    };

  }


  const bid =
    Number(amount);


  if (
    !Number.isFinite(bid)
  ) {

    return {
      valid: false,
      error: "INVALID_BID"
    };

  }


  if (bid <= room.auction.currentBid) {

    return {
      valid: false,
      error: "BID_MUST_BE_HIGHER"
    };

  }


  if (
    !canAffordBid(
      player,
      bid
    )
  ) {

    return {
      valid: false,
      error: "INSUFFICIENT_FUNDS"
    };

  }


  return {
    valid: true,
    player,
    bid
  };

}


/* =========================================================
   PLACE BID
   ========================================================= */

function placeOnlineBid(
  room,
  socketId,
  amount
) {

  const validation =
    validateBid(
      room,
      socketId,
      amount
    );


  if (!validation.valid) {

    return {
      success: false,
      error: validation.error
    };

  }


  const player =
    validation.player;

  const bid =
    validation.bid;


  /*
    اللاعب الذي قدم العرض
    يصبح صاحب أعلى مزايدة.
  */

  room.auction.currentBid =
    bid;

  room.auction.highestBidder =
    player.id;

  room.auction.lastBidder =
    player.id;


  player.lastBid =
    bid;

  player.passed =
    false;


  /*
    تغيير الدور للخصم.
  */

  const playerIndex =
    getPlayerIndexBySocket(
      room,
      socketId
    );


  room.currentPlayerIndex =
    playerIndex === 0 ? 1 : 0;

  room.currentTurn =
    room.currentPlayerIndex;


  return {

    success: true,

    playerId:
      player.id,

    playerName:
      player.name,

    amount: bid,

    nextPlayer:
      room.players[
        room.currentPlayerIndex
      ]
        ? room.players[
            room.currentPlayerIndex
          ].id
        : null,

    auction:
      room.auction

  };

}


/* =========================================================
   ADD 1 MILLION
   ========================================================= */

function increaseBidByOne(
  room,
  socketId
) {

  const current =
    getCurrentBid(room);


  const newAmount =
    current +
    Number(
      R2_CONFIG.auction.minBid
    );


  return placeOnlineBid(
    room,
    socketId,
    newAmount
  );

}


/* =========================================================
   ADD 5 MILLION
   ========================================================= */

function increaseBidByFive(
  room,
  socketId
) {

  const current =
    getCurrentBid(room);


  const newAmount =
    current +
    Number(
      R2_CONFIG.auction.bigBidStep
    );


  return placeOnlineBid(
    room,
    socketId,
    newAmount
  );

}


/* =========================================================
   CUSTOM BID
   ========================================================= */

function placeCustomBid(
  room,
  socketId,
  amount
) {

  let value =
    String(amount)
      .replace(/,/g, "")
      .trim();


  /*
    السماح بكتابة:
    10
    10.5
    100
    1,000
  */

  value =
    Number(value);


  if (
    !Number.isFinite(value)
  ) {

    return {
      success: false,
      error: "INVALID_CUSTOM_AMOUNT"
    };

  }


  return placeOnlineBid(
    room,
    socketId,
    value
  );

}


/* =========================================================
   PASS / GIVE TO OPPONENT
   ========================================================= */

/*
  لو اللاعب مش عايز يكمل المزايدة
  يضغط تسليم للخصم.

  لو الخصم قادر يدفع:
  يأخذ اللاعب بالمبلغ الحالي.

  اللاعب الذي سلّم لا يحصل
  على اللاعب ولا يتم خصم أي مبلغ منه.
*/

function passAuction(
  room,
  socketId
) {

  const player =
    getPlayerBySocket(
      room,
      socketId
    );


  if (!player) {

    return {
      success: false,
      error: "PLAYER_NOT_FOUND"
    };

  }


  if (
    !room.auction.active
  ) {

    return {
      success: false,
      error: "AUCTION_NOT_ACTIVE"
    };

  }


  player.passed = true;


  if (
    room.auction.highestBidder &&
    room.auction.highestBidder !==
      player.id
  ) {

    /*
      يوجد بالفعل خصم صاحب أعلى عرض.

      نعطي اللاعب للخصم
      بالسعر الحالي.
    */

    const winner =
      room.players.find(
        item =>
          item &&
          item.id ===
            room.auction.highestBidder
      );


    if (!winner) {

      return {
        success: false,
        error: "WINNER_NOT_FOUND"
      };

    }


    return finalizeAuction(
      room,
      winner.id
    );

  }


  /*
    لو مفيش حد قدم عرض
    نعتبر اللاعب تم التخلي عنه.
  */

  const opponent =
    getOpponent(
      room,
      socketId
    );


  if (
    opponent &&
    canAffordBid(
      opponent,
      room.auction.currentBid
    )
  ) {

    return finalizeAuction(
      room,
      opponent.id
    );

  }


  /*
    لو الخصم لا يستطيع الدفع
    نغلق المزاد بدون لاعب.
  */

  room.auction.active =
    false;

  room.auction.finished =
    true;

  room.status =
    "auction_finished";


  return {

    success: true,

    result: "NO_WINNER",

    message:
      "لا يوجد لاعب قادر على إكمال المزايدة"

  };

}


/* =========================================================
   FINALIZE AUCTION
   ========================================================= */

function finalizeAuction(
  room,
  winnerId
) {

  if (
    !room ||
    !room.auction.active
  ) {

    return {
      success: false,
      error: "AUCTION_NOT_ACTIVE"
    };

  }


  const winner =
    room.players.find(
      player =>
        player &&
        player.id ===
          winnerId
    );


  if (!winner) {

    return {
      success: false,
      error: "WINNER_NOT_FOUND"
    };

  }


  const player =
    room.auction.player;


  if (!player) {

    return {
      success: false,
      error: "AUCTION_PLAYER_NOT_FOUND"
    };

  }


  const price =
    Number(
      room.auction.currentBid
    );


  if (
    !canAffordBid(
      winner,
      price
    )
  ) {

    return {
      success: false,
      error: "WINNER_CANNOT_AFFORD"
    };

  }


  /*
    خصم المبلغ من ميزانية الفائز.
  */

  winner.budget -= price;

  winner.spent += price;


  /*
    إضافة اللاعب للفريق.
  */

  const addResult =
    addPlayerToTeam(
      room,
      winner.socketId,
      player
    );


  if (!addResult.success) {

    /*
      Rollback للفلوس لو حصل خطأ.
    */

    winner.budget += price;

    winner.spent -= price;


    return {
      success: false,
      error: addResult.error
    };

  }


  winner.lastBid =
    price;


  /*
    إنهاء المزاد الحالي.
  */

  room.auction.active =
    false;

  room.auction.finished =
    true;

  room.status =
    "auction_finished";


  const result = {

    success: true,

    winner: {

      id: winner.id,

      name: winner.name

    },

    player: {

      id: player.id,

      name: player.name,

      position: player.position,

      overall: player.overall

    },

    price,

    remainingBudget:
      winner.budget

  };


  /*
    نجهز الجولة القادمة.
  */

  room.auction.lastBidder =
    winner.id;


  return result;

}


/* =========================================================
   NEXT AUCTION SLOT
   ========================================================= */

function prepareNextAuction(
  room,
  nextPosition,
  nextPlayer,
  nextSlot
) {

  if (!room) {

    return {
      success: false,
      error: "ROOM_NOT_FOUND"
    };

  }


  if (!nextPosition) {

    return {
      success: false,
      error: "POSITION_REQUIRED"
    };

  }


  if (!nextPlayer) {

    return {
      success: false,
      error: "PLAYER_REQUIRED"
    };

  }


  return startOnlineAuction(
    room,
    nextPosition,
    nextPlayer,
    nextSlot
  );

}


/* =========================================================
   CHECK AUCTION COMPLETE
   ========================================================= */

function isAuctionComplete(
  room,
  requiredPlayers
) {

  if (!room) {
    return false;
  }


  const required =
    Number(
      requiredPlayers || 11
    );


  const player1Count =
    room.players[0]
      ? room.players[0].team.length
      : 0;


  const player2Count =
    room.players[1]
      ? room.players[1].team.length
      : 0;


  return (
    player1Count >= required &&
    player2Count >= required
  );

}


/* =========================================================
   AUCTION SUMMARY
   ========================================================= */

function getAuctionSummary(room) {

  if (!room) {
    return null;
  }


  return {

    active:
      room.auction.active,

    position:
      room.auction.position,

    slot:
      room.auction.slot,

    player:
      room.auction.player,

    currentBid:
      room.auction.currentBid,

    highestBidder:
      room.auction.highestBidder,

    player1Budget:
      room.players[0]
        ? room.players[0].budget
        : 0,

    player2Budget:
      room.players[1]
        ? room.players[1].budget
        : 0,

    player1TeamSize:
      room.players[0]
        ? room.players[0].team.length
        : 0,

    player2TeamSize:
      room.players[1]
        ? room.players[1].team.length
        : 0

  };

}


/* =========================================================
   ONLINE ERROR MESSAGES
   ========================================================= */

const ONLINE_ERRORS = {

  ROOM_NOT_FOUND:
    "الغرفة غير موجودة",

  ROOM_FULL:
    "الغرفة ممتلئة",

  PLAYER_NOT_FOUND:
    "اللاعب غير موجود",

  PLAYER_REQUIRED:
    "لم يتم تحديد اللاعب",

  POSITION_REQUIRED:
    "لم يتم تحديد المركز",

  AUCTION_NOT_ACTIVE:
    "المزاد غير نشط حاليا",

  AUCTION_FINISHED:
    "المزاد انتهى",

  INVALID_BID:
    "المبلغ غير صحيح",

  INVALID_CUSTOM_AMOUNT:
    "المبلغ المكتوب غير صحيح",

  BID_MUST_BE_HIGHER:
    "يجب أن يكون العرض أعلى من السعر الحالي",

  INSUFFICIENT_FUNDS:
    "رصيدك لا يكفي لهذا العرض",

  WINNER_NOT_FOUND:
    "لم يتم العثور على الفائز",

  WINNER_CANNOT_AFFORD:
    "الفائز لا يستطيع دفع المبلغ",

  AUCTION_PLAYER_NOT_FOUND:
    "لاعب المزاد غير موجود",

  PLAYER_ALREADY_OWNED:
    "هذا اللاعب موجود بالفعل مع أحد الخصمين"

};


/* =========================================================
   EXPORT PART 5
   ========================================================= */

if (typeof module !== "undefined") {

  module.exports = {

    startOnlineAuction,

    getCurrentAuctionPlayer,

    getCurrentBid,

    canAffordBid,

    validateBid,

    placeOnlineBid,

    increaseBidByOne,

    increaseBidByFive,

    placeCustomBid,

    passAuction,

    finalizeAuction,

    prepareNextAuction,

    isAuctionComplete,

    getAuctionSummary,

    ONLINE_ERRORS

  };

    }
/* =========================================================
   R2 FOOTBALL GAMES
   ONLINE.JS
   PART 6 / 6 — FINAL
   WEBSOCKET SERVER + ROOMS + REALTIME SYNC
   ========================================================= */

"use strict";


/* =========================================================
   DEPENDENCIES
   ========================================================= */

const http = require("http");
const WebSocket = require("ws");


/* =========================================================
   SERVER CONFIG
   ========================================================= */

const ONLINE_SERVER_CONFIG = {

  host: "0.0.0.0",

  port:
    Number(
      process.env.PORT || 8080
    ),

  pingInterval: 15000,

  maxRooms: 10000,

  roomCodeLength:
    R2_CONFIG.onlineRoom.codeLength

};


/* =========================================================
   GLOBAL SERVER STATE
   ========================================================= */

const ONLINE_STATE = {

  rooms: new Map(),

  clients: new Map(),

  startedAt: Date.now(),

  totalConnections: 0,

  totalRoomsCreated: 0

};


/* =========================================================
   ROOM CODE GENERATOR
   ========================================================= */

function generateRoomCode() {

  const characters =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


  let code = "";


  do {

    code = "";

    for (
      let i = 0;
      i < ONLINE_SERVER_CONFIG.roomCodeLength;
      i++
    ) {

      const index =
        Math.floor(
          Math.random() *
          characters.length
        );

      code += characters[index];

    }

  } while (
    ONLINE_STATE.rooms.has(code)
  );


  return code;

}


/* =========================================================
   FIND ROOM
   ========================================================= */

function getRoom(roomCode) {

  if (!roomCode) {
    return null;
  }


  return ONLINE_STATE.rooms.get(
    String(roomCode).toUpperCase()
  ) || null;

}


/* =========================================================
   CREATE ROOM
   ========================================================= */

function createOnlineRoom(
  gameType = "proMax"
) {

  if (
    ONLINE_STATE.rooms.size >=
    ONLINE_SERVER_CONFIG.maxRooms
  ) {

    return {
      success: false,
      error: "SERVER_ROOM_LIMIT"
    };

  }


  let roomCode =
    generateRoomCode();


  const room =
    createRoomGameState(
      roomCode,
      gameType
    );


  ONLINE_STATE.rooms.set(
    roomCode,
    room
  );


  ONLINE_STATE.totalRoomsCreated++;


  return {

    success: true,

    roomCode,

    room

  };

}


/* =========================================================
   SEND JSON MESSAGE
   ========================================================= */

function sendMessage(
  socket,
  type,
  data = {}
) {

  if (
    !socket ||
    socket.readyState !==
      WebSocket.OPEN
  ) {

    return false;

  }


  try {

    socket.send(
      JSON.stringify({

        type,

        data,

        timestamp:
          Date.now()

      })
    );


    return true;

  } catch (error) {

    console.error(
      "[ONLINE] SEND ERROR:",
      error.message
    );

    return false;

  }

}


/* =========================================================
   BROADCAST TO ROOM
   ========================================================= */

function broadcastRoom(
  room,
  type,
  data = {},
  exceptSocketId = null
) {

  if (!room) {
    return;
  }


  room.players.forEach(
    player => {

      if (!player) {
        return;
      }


      if (
        exceptSocketId &&
        player.socketId ===
          exceptSocketId
      ) {

        return;

      }


      const client =
        ONLINE_STATE.clients.get(
          player.socketId
        );


      if (!client) {
        return;
      }


      sendMessage(
        client.socket,
        type,
        data
      );

    }
  );

}


/* =========================================================
   BROADCAST COMPLETE ROOM STATE
   ========================================================= */

function broadcastRoomState(room) {

  if (!room) {
    return;
  }


  const safeState =
    getSafeRoomState(room);


  broadcastRoom(
    room,
    "ROOM_STATE",
    safeState
  );

}


/* =========================================================
   SEND ERROR
   ========================================================= */

function sendError(
  socket,
  code,
  extra = {}
) {

  sendMessage(
    socket,
    "ERROR",
    {

      code,

      message:
        ONLINE_ERRORS[code] ||
        code,

      ...extra

    }
  );

}


/* =========================================================
   CREATE CLIENT STATE
   ========================================================= */

function createClientState(socket) {

  const clientId =
    "client-" +
    Date.now() +
    "-" +
    Math.random()
      .toString(36)
      .slice(2, 10);


  return {

    id: clientId,

    socket,

    roomCode: null,

    socketPlayerId: null,

    connectedAt: Date.now(),

    lastPing: Date.now()

  };

}


/* =========================================================
   JOIN ROOM
   ========================================================= */

function joinRoom(
  client,
  roomCode,
  playerName
) {

  const room =
    getRoom(roomCode);


  if (!room) {

    return {
      success: false,
      error: "ROOM_NOT_FOUND"
    };

  }


  if (
    room.players[0] &&
    room.players[1]
  ) {

    return {
      success: false,
      error: "ROOM_FULL"
    };

  }


  const result =
    addPlayerToRoom(
      room,
      playerName,
      client.id
    );


  if (!result.success) {

    return result;

  }


  client.roomCode =
    room.roomCode;

  client.socketPlayerId =
    result.playerId;


  return {

    success: true,

    roomCode:
      room.roomCode,

    playerId:
      result.playerId,

    playerIndex:
      result.playerIndex,

    player:
      result.player,

    roomState:
      getSafeRoomState(room)

  };

}


/* =========================================================
   LEAVE ROOM
   ========================================================= */

function leaveRoom(client) {

  if (!client.roomCode) {
    return;
  }


  const room =
    getRoom(
      client.roomCode
    );


  if (!room) {

    client.roomCode = null;

    return;

  }


  const player =
    getPlayerBySocket(
      room,
      client.id
    );


  if (player) {

    player.connected = false;

  }


  /*
    لا نحذف الغرفة فوراً.
    نتركها فترة قصيرة حتى يستطيع
    اللاعب إعادة الاتصال.
  */

  broadcastRoom(
    room,
    "PLAYER_DISCONNECTED",
    {

      playerId:
        client.socketPlayerId,

      playerName:
        player
          ? player.name
          : null

    },
    client.id
  );


  client.roomCode = null;

  client.socketPlayerId = null;


  /*
    لو الغرفة فارغة تماماً
    نحذفها.
  */

  const connectedPlayers =
    room.players.filter(
      player =>
        player &&
        player.connected
    );


  if (
    connectedPlayers.length === 0
  ) {

    ONLINE_STATE.rooms.delete(
      room.roomCode
    );

  }

}


/* =========================================================
   HANDLE READY
   ========================================================= */

function handleReady(
  client,
  message
) {

  const room =
    getRoom(
      client.roomCode
    );


  if (!room) {

    sendError(
      client.socket,
      "ROOM_NOT_FOUND"
    );

    return;

  }


  const ready =
    Boolean(
      message.data &&
      message.data.ready
    );


  const result =
    setPlayerReady(
      room,
      client.id,
      ready
    );


  if (!result.success) {

    sendError(
      client.socket,
      result.error
    );

    return;

  }


  broadcastRoomState(room);


  if (result.bothReady) {

    broadcastRoom(
      room,
      "GAME_STARTING",
      {

        gameType:
          room.gameType,

        countdown:
          3

      }
    );


    setTimeout(
      () => {

        if (
          ONLINE_STATE.rooms.has(
            room.roomCode
          )
        ) {

          room.status =
            "playing";

          broadcastRoomState(
            room
          );

        }

      },
      3000
    );

  }

}


/* =========================================================
   HANDLE AUCTION BID
   ========================================================= */

function handleBid(
  client,
  message
) {

  const room =
    getRoom(
      client.roomCode
    );


  if (!room) {

    sendError(
      client.socket,
      "ROOM_NOT_FOUND"
    );

    return;

  }


  const amount =
    message.data
      ? message.data.amount
      : null;


  const result =
    placeCustomBid(
      room,
      client.id,
      amount
    );


  if (!result.success) {

    sendError(
      client.socket,
      result.error
    );

    return;

  }


  broadcastRoom(
    room,
    "BID_PLACED",
    {

      playerId:
        result.playerId,

      playerName:
        result.playerName,

      amount:
        result.amount,

      nextPlayer:
        result.nextPlayer,

      auction:
        getAuctionSummary(room)

    }
  );

}


/* =========================================================
   HANDLE +1 BID
   ========================================================= */

function handleBidOne(
  client
) {

  const room =
    getRoom(
      client.roomCode
    );


  if (!room) {

    sendError(
      client.socket,
      "ROOM_NOT_FOUND"
    );

    return;

  }


  const result =
    increaseBidByOne(
      room,
      client.id
    );


  if (!result.success) {

    sendError(
      client.socket,
      result.error
    );

    return;

  }


  broadcastRoom(
    room,
    "BID_PLACED",
    {

      playerId:
        result.playerId,

      playerName:
        result.playerName,

      amount:
        result.amount,

      nextPlayer:
        result.nextPlayer,

      auction:
        getAuctionSummary(room)

    }
  );

}


/* =========================================================
   HANDLE +5 BID
   ========================================================= */

function handleBidFive(
  client
) {

  const room =
    getRoom(
      client.roomCode
    );


  if (!room) {

    sendError(
      client.socket,
      "ROOM_NOT_FOUND"
    );

    return;

  }


  const result =
    increaseBidByFive(
      room,
      client.id
    );


  if (!result.success) {

    sendError(
      client.socket,
      result.error
    );

    return;

  }


  broadcastRoom(
    room,
    "BID_PLACED",
    {

      playerId:
        result.playerId,

      playerName:
        result.playerName,

      amount:
        result.amount,

      nextPlayer:
        result.nextPlayer,

      auction:
        getAuctionSummary(room)

    }
  );

}


/* =========================================================
   HANDLE PASS
   ========================================================= */

function handlePass(
  client
) {

  const room =
    getRoom(
      client.roomCode
    );


  if (!room) {

    sendError(
      client.socket,
      "ROOM_NOT_FOUND"
    );

    return;

  }


  const result =
    passAuction(
      room,
      client.id
    );


  if (!result.success) {

    sendError(
      client.socket,
      result.error
    );

    return;

  }


  broadcastRoom(
    room,
    "AUCTION_RESULT",
    result
  );


  broadcastRoomState(
    room
  );

}


/* =========================================================
   START NEXT AUCTION
   ========================================================= */

function handleNextAuction(
  client,
  message
) {

  const room =
    getRoom(
      client.roomCode
    );


  if (!room) {

    sendError(
      client.socket,
      "ROOM_NOT_FOUND"
    );

    return;

  }


  const position =
    message.data
      ? message.data.position
      : null;


  const player =
    message.data
      ? message.data.player
      : null;


  const slot =
    message.data
      ? message.data.slot
      : 1;


  const result =
    prepareNextAuction(
      room,
      position,
      player,
      slot
    );


  if (!result.success) {

    sendError(
      client.socket,
      result.error
    );

    return;

  }


  broadcastRoom(
    room,
    "AUCTION_STARTED",
    {

      auction:
        room.auction

    }
  );


  broadcastRoomState(
    room
  );

}


/* =========================================================
   HANDLE CHAT
   ========================================================= */

function handleChat(
  client,
  message
) {

  const room =
    getRoom(
      client.roomCode
    );


  if (!room) {
    return;
  }


  const text =
    message.data &&
    typeof message.data.text ===
      "string"
      ? message.data.text.trim()
      : "";


  if (!text) {
    return;
  }


  if (text.length > 500) {
    return;
  }


  const player =
    getPlayerBySocket(
      room,
      client.id
    );


  if (!player) {
    return;
  }


  broadcastRoom(
    room,
    "CHAT_MESSAGE",
    {

      playerId:
        player.id,

      playerName:
        player.name,

      text

    }
  );

}


/* =========================================================
   HANDLE PING
   ========================================================= */

function handlePing(
  client
) {

  client.lastPing =
    Date.now();


  sendMessage(
    client.socket,
    "PONG",
    {

      serverTime:
        Date.now()

    }
  );

}


/* =========================================================
   MESSAGE ROUTER
   ========================================================= */

function handleMessage(
  client,
  rawMessage
) {

  let message;


  try {

    message =
      typeof rawMessage === "string"
        ? JSON.parse(rawMessage)
        : rawMessage;

  } catch (error) {

    sendError(
      client.socket,
      "INVALID_MESSAGE"
    );

    return;

  }


  if (
    !message ||
    typeof message.type !==
      "string"
  ) {

    sendError(
      client.socket,
      "INVALID_MESSAGE"
    );

    return;

  }


  switch (
    message.type.toUpperCase()
  ) {

    /* -----------------------------------
       CREATE ROOM
       ----------------------------------- */

    case "CREATE_ROOM": {

      const gameType =
        message.data &&
        message.data.gameType
          ? message.data.gameType
          : "proMax";


      const result =
        createOnlineRoom(
          gameType
        );


      if (!result.success) {

        sendError(
          client.socket,
          result.error
        );

        return;

      }


      sendMessage(
        client.socket,
        "ROOM_CREATED",
        {

          roomCode:
            result.roomCode,

          gameType

        }
      );


      break;

    }


    /* -----------------------------------
       JOIN ROOM
       ----------------------------------- */

    case "JOIN_ROOM": {

      const roomCode =
        message.data &&
        message.data.roomCode
          ? message.data.roomCode
          : null;


      const playerName =
        message.data &&
        message.data.playerName
          ? message.data.playerName
          : "لاعب";


      const result =
        joinRoom(
          client,
          roomCode,
          playerName
        );


      if (!result.success) {

        sendError(
          client.socket,
          result.error
        );

        return;

      }


      sendMessage(
        client.socket,
        "ROOM_JOINED",
        {

          roomCode:
            result.roomCode,

          playerId:
            result.playerId,

          playerIndex:
            result.playerIndex,

          player:
            getSafePlayerData(
              result.player
            ),

          roomState:
            result.roomState

        }
      );


      broadcastRoom(
        getRoom(
          result.roomCode
        ),
        "PLAYER_JOINED",
        {

          playerId:
            result.playerId,

          playerIndex:
            result.playerIndex,

          player:
            getSafePlayerData(
              result.player
            )

        },
        client.id
      );


      break;

    }


    /* -----------------------------------
       READY
       ----------------------------------- */

    case "READY":

      handleReady(
        client,
        message
      );

      break;


    /* -----------------------------------
       BID
       ----------------------------------- */

    case "BID":

      handleBid(
        client,
        message
      );

      break;


    /* -----------------------------------
       BID +1
       ----------------------------------- */

    case "BID_ONE":

      handleBidOne(
        client
      );

      break;


    /* -----------------------------------
       BID +5
       ----------------------------------- */

    case "BID_FIVE":

      handleBidFive(
        client
      );

      break;


    /* -----------------------------------
       PASS
       ----------------------------------- */

    case "PASS":

      handlePass(
        client
      );

      break;


    /* -----------------------------------
       NEXT AUCTION
       ----------------------------------- */

    case "NEXT_AUCTION":

      handleNextAuction(
        client,
        message
      );

      break;


    /* -----------------------------------
       CHAT
       ----------------------------------- */

    case "CHAT":

      handleChat(
        client,
        message
      );

      break;


    /* -----------------------------------
       PING
       ----------------------------------- */

    case "PING":

      handlePing(
        client
      );

      break;


    /* -----------------------------------
       ROOM STATE
       ----------------------------------- */

    case "GET_ROOM_STATE": {

      const room =
        getRoom(
          client.roomCode
        );


      if (!room) {

        sendError(
          client.socket,
          "ROOM_NOT_FOUND"
        );

        return;

      }


      sendMessage(
        client.socket,
        "ROOM_STATE",
        getSafeRoomState(
          room
        )
      );


      break;

    }


    /* -----------------------------------
       LEAVE
       ----------------------------------- */

    case "LEAVE_ROOM":

      leaveRoom(
        client
      );

      sendMessage(
        client.socket,
        "LEFT_ROOM"
      );

      break;


    /* -----------------------------------
       UNKNOWN
       ----------------------------------- */

    default:

      sendError(
        client.socket,
        "UNKNOWN_MESSAGE_TYPE",
        {

          received:
            message.type

        }
      );

      break;

  }

}


/* =========================================================
   HTTP SERVER
   ========================================================= */

const httpServer =
  http.createServer(
    (request, response) => {

      response.writeHead(
        200,
        {
          "Content-Type":
            "application/json; charset=utf-8",

          "Access-Control-Allow-Origin":
            "*"
        }
      );


      response.end(
        JSON.stringify({

          name:
            "R2 Football Games Online Server",

          status:
            "online",

          version:
            R2_CONFIG.version,

          rooms:
            ONLINE_STATE.rooms.size,

          connections:
            ONLINE_STATE.clients.size

        })
      );

    }
  );


/* =========================================================
   WEBSOCKET SERVER
   ========================================================= */

const wss =
  new WebSocket.Server({
    server: httpServer
  });


/* =========================================================
   NEW CONNECTION
   ========================================================= */

wss.on(
  "connection",
  socket => {

    const client =
      createClientState(
        socket
      );


    ONLINE_STATE.clients.set(
      client.id,
      client
    );


    ONLINE_STATE.totalConnections++;


    console.log(
      `[ONLINE] Connected: ${client.id}`
    );


    sendMessage(
      socket,
      "CONNECTED",
      {

        clientId:
          client.id,

        serverTime:
          Date.now(),

        serverVersion:
          R2_CONFIG.version

      }
    );


    /* -----------------------------------
       MESSAGE
       ----------------------------------- */

    socket.on(
      "message",
      rawMessage => {

        handleMessage(
          client,
          rawMessage.toString()
        );

      }
    );


    /* -----------------------------------
       CLOSE
       ----------------------------------- */

    socket.on(
      "close",
      () => {

        console.log(
          `[ONLINE] Disconnected: ${client.id}`
        );


        leaveRoom(
          client
        );


        ONLINE_STATE.clients.delete(
          client.id
        );

      }
    );


    /* -----------------------------------
       ERROR
       ----------------------------------- */

    socket.on(
      "error",
      error => {

        console.error(
          `[ONLINE] Socket error ${client.id}:`,
          error.message
        );

      }
    );

  }
);


/* =========================================================
   HEARTBEAT
   ========================================================= */

const heartbeat =
  setInterval(
    () => {

      const now =
        Date.now();


      ONLINE_STATE.clients.forEach(
        client => {

          if (
            now -
              client.lastPing >
            ONLINE_SERVER_CONFIG
              .pingInterval * 3
          ) {

            try {

              client.socket.terminate();

            } catch (error) {

              console.error(
                "[ONLINE] Terminate error:",
                error.message
              );

            }

            return;

          }


          if (
            client.socket.readyState ===
            WebSocket.OPEN
          ) {

            try {

              client.socket.ping();

            } catch (error) {

              console.error(
                "[ONLINE] Ping error:",
                error.message
              );

            }

          }

        }
      );


      /*
        تنظيف الغرف الفارغة.
      */

      ONLINE_STATE.rooms.forEach(
        (room, roomCode) => {

          const hasConnectedPlayer =
            room.players.some(
              player =>
                player &&
                player.connected
            );


          if (
            !hasConnectedPlayer &&
            Date.now() -
              room.createdAt >
            10 * 60 * 1000
          ) {

            ONLINE_STATE.rooms.delete(
              roomCode
            );

          }

        }
      );

    },
    ONLINE_SERVER_CONFIG.pingInterval
  );


/* =========================================================
   START SERVER
   ========================================================= */

httpServer.listen(
  ONLINE_SERVER_CONFIG.port,
  ONLINE_SERVER_CONFIG.host,
  () => {

    console.log(
      "\n======================================"
    );

    console.log(
      " R2 FOOTBALL GAMES ONLINE SERVER"
    );

    console.log(
      "======================================"
    );

    console.log(
      ` HTTP  : http://localhost:${ONLINE_SERVER_CONFIG.port}`
    );

    console.log(
      ` WS    : ws://localhost:${ONLINE_SERVER_CONFIG.port}`
    );

    console.log(
      ` ROOMS : ${ONLINE_SERVER_CONFIG.maxRooms}`
    );

    console.log(
      " STATUS: ONLINE"
    );

    console.log(
      "======================================\n"
    );

  }
);


/* =========================================================
   GRACEFUL SHUTDOWN
   ========================================================= */

function shutdownServer() {

  console.log(
    "\n[ONLINE] Shutting down..."
  );


  clearInterval(
    heartbeat
  );


  ONLINE_STATE.clients.forEach(
    client => {

      try {

        sendMessage(
          client.socket,
          "SERVER_SHUTDOWN",
          {

            message:
              "السيرفر بيقفل حاليا"

          }
        );


        client.socket.close();

      } catch (error) {

        console.error(
          "[ONLINE] Close error:",
          error.message
        );

      }

    }
  );


  wss.close(
    () => {

      httpServer.close(
        () => {

          console.log(
            "[ONLINE] Server stopped."
          );

          process.exit(0);

        }
      );

    }
  );

}


process.on(
  "SIGINT",
  shutdownServer
);


process.on(
  "SIGTERM",
  shutdownServer
);


/* =========================================================
   FINAL SERVER EXPORT
   ========================================================= */

module.exports = {

  ONLINE_STATE,

  ONLINE_SERVER_CONFIG,

  createOnlineRoom,

  getRoom,

  sendMessage,

  broadcastRoom,

  broadcastRoomState,

  joinRoom,

  leaveRoom,

  getSafeRoomState

};


/* =========================================================
   FINAL CHECK
   ========================================================= */

console.log(
  "R2 ONLINE.JS — PART 6/6 LOADED"
);
