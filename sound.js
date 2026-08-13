/* =========================================================
   R2 FOOTBALL GAMES
   sound.js
   نظام الأصوات الكامل للموقع
   ========================================================= */

(() => {
  "use strict";

  /* =========================================================
     R2 SOUND SYSTEM
     ---------------------------------------------------------
     - لا يعتمد على ملفات صوت خارجية.
     - يستخدم Web Audio API.
     - يشتغل مع أزرار الموقع والأحداث المهمة.
     - يمكن التحكم فيه من الإعدادات.
     ========================================================= */

  const R2Sound = {

    /* =======================================================
       SETTINGS
       ======================================================= */

    enabled: true,

    volume: 0.22,

    audioContext: null,

    masterGain: null,

    initialized: false,

    lastSoundTime: 0,


    /* =======================================================
       INITIALIZE
       ======================================================= */

    init() {

      if (this.initialized) {
        return;
      }

      try {

        const AudioContext =
          window.AudioContext ||
          window.webkitAudioContext;

        if (!AudioContext) {
          console.warn("R2 Sound: Web Audio API غير مدعوم.");
          return;
        }

        this.audioContext = new AudioContext();

        this.masterGain =
          this.audioContext.createGain();

        this.masterGain.gain.value =
          this.volume;

        this.masterGain.connect(
          this.audioContext.destination
        );

        this.initialized = true;

      } catch (error) {

        console.warn(
          "R2 Sound initialization failed:",
          error
        );

      }

    },


    /* =======================================================
       RESUME AUDIO
       -------------------------------------------------------
       بعض المتصفحات تمنع الصوت قبل أول تفاعل من المستخدم.
       ======================================================= */

    resume() {

      if (!this.initialized) {
        this.init();
      }

      if (!this.audioContext) {
        return;
      }

      if (this.audioContext.state === "suspended") {

        this.audioContext.resume()
          .catch(() => {});

      }

    },


    /* =======================================================
       ENABLE / DISABLE
       ======================================================= */

    setEnabled(value) {

      this.enabled = Boolean(value);

      if (this.enabled) {
        this.resume();
      }

    },


    /* =======================================================
       VOLUME
       ======================================================= */

    setVolume(value) {

      let volume =
        Number(value);

      if (Number.isNaN(volume)) {
        volume = 22;
      }

      volume =
        Math.max(
          0,
          Math.min(
            100,
            volume
          )
        );

      this.volume =
        volume / 100;

      if (
        this.masterGain &&
        this.audioContext
      ) {

        this.masterGain.gain.setTargetAtTime(
          this.volume,
          this.audioContext.currentTime,
          0.02
        );

      }

    },


    /* =======================================================
       BASIC OSCILLATOR
       ======================================================= */

    tone({
      frequency = 440,
      duration = 0.08,
      type = "sine",
      gain = 0.25,
      attack = 0.005,
      release = 0.04,
      detune = 0
    } = {}) {

      if (!this.enabled) {
        return;
      }

      this.resume();

      if (
        !this.audioContext ||
        !this.masterGain
      ) {
        return;
      }

      const now =
        this.audioContext.currentTime;

      const oscillator =
        this.audioContext.createOscillator();

      const gainNode =
        this.audioContext.createGain();

      oscillator.type = type;

      oscillator.frequency.setValueAtTime(
        frequency,
        now
      );

      oscillator.detune.setValueAtTime(
        detune,
        now
      );

      gainNode.gain.setValueAtTime(
        0,
        now
      );

      gainNode.gain.linearRampToValueAtTime(
        gain,
        now + attack
      );

      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        now +
        Math.max(
          attack + 0.01,
          duration - release
        )
      );

      oscillator.connect(
        gainNode
      );

      gainNode.connect(
        this.masterGain
      );

      oscillator.start(now);

      oscillator.stop(
        now + duration + 0.02
      );

    },


    /* =======================================================
       DOUBLE TONE
       ======================================================= */

    doubleTone(
      firstFrequency,
      secondFrequency,
      duration = 0.08
    ) {

      this.tone({
        frequency: firstFrequency,
        duration,
        type: "sine",
        gain: 0.18
      });

      setTimeout(() => {

        this.tone({
          frequency: secondFrequency,
          duration,
          type: "sine",
          gain: 0.18
        });

      }, duration * 650);

    },


    /* =======================================================
       CLICK
       ======================================================= */

    click() {

      this.tone({
        frequency: 520,
        duration: 0.045,
        type: "square",
        gain: 0.055
      });

    },


    /* =======================================================
       BUTTON
       ======================================================= */

    button() {

      this.tone({
        frequency: 440,
        duration: 0.055,
        type: "triangle",
        gain: 0.08
      });

    },


    /* =======================================================
       SUCCESS
       ======================================================= */

    success() {

      this.tone({
        frequency: 523.25,
        duration: 0.09,
        type: "sine",
        gain: 0.11
      });

      setTimeout(() => {

        this.tone({
          frequency: 659.25,
          duration: 0.09,
          type: "sine",
          gain: 0.11
        });

      }, 90);

      setTimeout(() => {

        this.tone({
          frequency: 783.99,
          duration: 0.14,
          type: "sine",
          gain: 0.13
        });

      }, 180);

    },


    /* =======================================================
       ERROR
       ======================================================= */

    error() {

      this.tone({
        frequency: 180,
        duration: 0.11,
        type: "sawtooth",
        gain: 0.07
      });

      setTimeout(() => {

        this.tone({
          frequency: 130,
          duration: 0.13,
          type: "sawtooth",
          gain: 0.06
        });

      }, 100);

    },


    /* =======================================================
       NOTIFICATION
       ======================================================= */

    notification() {

      this.doubleTone(
        660,
        880,
        0.07
      );

    },


    /* =======================================================
       FRIEND REQUEST
       ======================================================= */

    friendRequest() {

      this.tone({
        frequency: 587.33,
        duration: 0.08,
        type: "triangle",
        gain: 0.10
      });

      setTimeout(() => {

        this.tone({
          frequency: 783.99,
          duration: 0.12,
          type: "triangle",
          gain: 0.12
        });

      }, 90);

    },


    /* =======================================================
       MESSAGE
       ======================================================= */

    message() {

      this.tone({
        frequency: 660,
        duration: 0.06,
        type: "sine",
        gain: 0.08
      });

      setTimeout(() => {

        this.tone({
          frequency: 880,
          duration: 0.08,
          type: "sine",
          gain: 0.09
        });

      }, 70);

    },


    /* =======================================================
       AUCTION BID
       ======================================================= */

    bid() {

      this.tone({
        frequency: 330,
        duration: 0.055,
        type: "square",
        gain: 0.075
      });

      setTimeout(() => {

        this.tone({
          frequency: 440,
          duration: 0.065,
          type: "square",
          gain: 0.085
        });

      }, 55);

    },


    /* =======================================================
       AUCTION SOLD
       ======================================================= */

    sold() {

      this.tone({
        frequency: 392,
        duration: 0.08,
        type: "triangle",
        gain: 0.10
      });

      setTimeout(() => {

        this.tone({
          frequency: 523.25,
          duration: 0.08,
          type: "triangle",
          gain: 0.11
        });

      }, 90);

      setTimeout(() => {

        this.tone({
          frequency: 659.25,
          duration: 0.16,
          type: "triangle",
          gain: 0.13
        });

      }, 180);

    },


    /* =======================================================
       PASS TO OPPONENT
       ======================================================= */

    pass() {

      this.tone({
        frequency: 270,
        duration: 0.09,
        type: "triangle",
        gain: 0.08
      });

      setTimeout(() => {

        this.tone({
          frequency: 210,
          duration: 0.11,
          type: "triangle",
          gain: 0.07
        });

      }, 80);

    },


    /* =======================================================
       WILD CARD
       ======================================================= */

    wildCard() {

      const notes = [
        523.25,
        659.25,
        783.99,
        1046.50
      ];

      notes.forEach(
        (frequency, index) => {

          setTimeout(() => {

            this.tone({
              frequency,
              duration: 0.12,
              type: "sine",
              gain: 0.10
            });

          }, index * 85);

        }
      );

    },


    /* =======================================================
       BOX OPENING
       ======================================================= */

    boxOpen() {

      this.tone({
        frequency: 220,
        duration: 0.08,
        type: "triangle",
        gain: 0.07
      });

      setTimeout(() => {

        this.tone({
          frequency: 330,
          duration: 0.08,
          type: "triangle",
          gain: 0.08
        });

      }, 80);

      setTimeout(() => {

        this.tone({
          frequency: 440,
          duration: 0.12,
          type: "triangle",
          gain: 0.10
        });

      }, 160);

    },


    /* =======================================================
       DEAL
       ======================================================= */

    deal() {

      this.tone({
        frequency: 392,
        duration: 0.09,
        type: "sine",
        gain: 0.10
      });

      setTimeout(() => {

        this.tone({
          frequency: 523.25,
          duration: 0.13,
          type: "sine",
          gain: 0.12
        });

      }, 100);

    },


    /* =======================================================
       NO DEAL
       ======================================================= */

    noDeal() {

      this.tone({
        frequency: 250,
        duration: 0.09,
        type: "square",
        gain: 0.06
      });

      setTimeout(() => {

        this.tone({
          frequency: 190,
          duration: 0.13,
          type: "square",
          gain: 0.06
        });

      }, 100);

    },


    /* =======================================================
       GOAL
       ======================================================= */

    goal() {

      const melody = [
        392,
        523.25,
        659.25,
        783.99,
        1046.50
      ];

      melody.forEach(
        (frequency, index) => {

          setTimeout(() => {

            this.tone({
              frequency,
              duration: 0.15,
              type: "sawtooth",
              gain: 0.09
            });

          }, index * 110);

        }
      );

    },


    /* =======================================================
       MATCH START
       ======================================================= */

    matchStart() {

      this.tone({
        frequency: 261.63,
        duration: 0.12,
        type: "triangle",
        gain: 0.09
      });

      setTimeout(() => {

        this.tone({
          frequency: 329.63,
          duration: 0.12,
          type: "triangle",
          gain: 0.09
        });

      }, 120);

      setTimeout(() => {

        this.tone({
          frequency: 392,
          duration: 0.18,
          type: "triangle",
          gain: 0.11
        });

      }, 240);

    },


    /* =======================================================
       MATCH FINISH
       ======================================================= */

    matchFinish() {

      this.success();

    },


    /* =======================================================
       WIN
       ======================================================= */

    win() {

      const melody = [
        523.25,
        659.25,
        783.99,
        1046.50,
        1318.51
      ];

      melody.forEach(
        (frequency, index) => {

          setTimeout(() => {

            this.tone({
              frequency,
              duration: 0.16,
              type: "triangle",
              gain: 0.12
            });

          }, index * 130);

        }
      );

    },


    /* =======================================================
       LOSE
       ======================================================= */

    lose() {

      this.tone({
        frequency: 440,
        duration: 0.13,
        type: "sine",
        gain: 0.08
      });

      setTimeout(() => {

        this.tone({
          frequency: 349.23,
          duration: 0.13,
          type: "sine",
          gain: 0.075
        });

      }, 120);

      setTimeout(() => {

        this.tone({
          frequency: 261.63,
          duration: 0.20,
          type: "sine",
          gain: 0.07
        });

      }, 240);

    },


    /* =======================================================
       COUNTDOWN
       ======================================================= */

    countdown(number) {

      if (number <= 0) {

        this.matchStart();

        return;

      }

      const frequency =
        number === 1
          ? 880
          : number === 2
            ? 660
            : 520;

      this.tone({
        frequency,
        duration: 0.14,
        type: "square",
        gain: 0.08
      });

    },


    /* =======================================================
       ROOM CONNECT
       ======================================================= */

    roomConnect() {

      this.tone({
        frequency: 440,
        duration: 0.07,
        type: "triangle",
        gain: 0.07
      });

      setTimeout(() => {

        this.tone({
          frequency: 554.37,
          duration: 0.09,
          type: "triangle",
          gain: 0.08
        });

      }, 80);

      setTimeout(() => {

        this.tone({
          frequency: 659.25,
          duration: 0.14,
          type: "triangle",
          gain: 0.10
        });

      }, 170);

    },


    /* =======================================================
       ROOM ERROR
       ======================================================= */

    roomError() {

      this.error();

    },


    /* =======================================================
       COPY
       ======================================================= */

    copy() {

      this.tone({
        frequency: 700,
        duration: 0.05,
        type: "sine",
        gain: 0.06
      });

    },


    /* =======================================================
       SETTINGS
       ======================================================= */

    settings() {

      this.tone({
        frequency: 500,
        duration: 0.06,
        type: "triangle",
        gain: 0.06
      });

    },


    /* =======================================================
       GENERIC ACTION
       ======================================================= */

    play(name) {

      if (
        typeof this[name] === "function"
      ) {

        this[name]();

      } else {

        this.click();

      }

    }

  };


  /* =========================================================
     GLOBAL ACCESS
     ========================================================= */

  window.R2Sound = R2Sound;


  /* =========================================================
     AUTO INITIALIZATION
     ========================================================= */

  document.addEventListener(
    "DOMContentLoaded",
    () => {

      R2Sound.init();


      /* =====================================================
         FIRST USER INTERACTION
         ===================================================== */

      const unlockAudio = () => {

        R2Sound.resume();

        document.removeEventListener(
          "pointerdown",
          unlockAudio
        );

        document.removeEventListener(
          "keydown",
          unlockAudio
        );

      };

      document.addEventListener(
        "pointerdown",
        unlockAudio,
        {
          once: true,
          passive: true
        }
      );

      document.addEventListener(
        "keydown",
        unlockAudio,
        {
          once: true
        }
      );


      /* =====================================================
         GLOBAL BUTTON SOUNDS
         ===================================================== */

      document.addEventListener(
        "click",
        (event) => {

          const button =
            event.target.closest(
              "button"
            );

          if (!button) {
            return;
          }

          if (
            button.dataset.sound === "none"
          ) {
            return;
          }

          const soundName =
            button.dataset.sound;

          if (
            soundName &&
            typeof R2Sound[soundName] === "function"
          ) {

            R2Sound[soundName]();

            return;

          }

          R2Sound.button();

        }
      );


      /* =====================================================
         INPUT ENTER SOUND
         ===================================================== */

      document.addEventListener(
        "keydown",
        (event) => {

          if (
            event.key !== "Enter"
          ) {
            return;
          }

          const target =
            event.target;

          if (
            target &&
            (
              target.tagName === "INPUT" ||
              target.tagName === "SELECT"
            )
          ) {

            R2Sound.click();

          }

        }
      );

    }
  );


})();
