(function () {
  "use strict";

  var KEY = window.APP_CONFIG && window.APP_CONFIG.storageKey ? window.APP_CONFIG.storageKey : "lianshanhui.charlie.v1";
  var PASSWORD = window.APP_CONFIG && window.APP_CONFIG.password ? window.APP_CONFIG.password : "charlie0724";

  function defaultState() {
    return {
      collectedKeywords: [],
      collectedCards: [],
      unlockedCombinations: [],
      generatedKeywords: [],
      cluePositions: {},
      rememberPassword: false,
      passwordToken: ""
    };
  }

  function safeRead() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return defaultState();
      var parsed = JSON.parse(raw);
      var base = defaultState();
      Object.keys(base).forEach(function (k) {
        if (parsed && parsed[k] !== undefined) base[k] = parsed[k];
      });
      // 数组字段容错，避免后续 .includes 报错
      ["collectedKeywords", "collectedCards", "unlockedCombinations", "generatedKeywords"].forEach(function (k) {
        if (!Array.isArray(base[k])) base[k] = [];
      });
      if (typeof base.cluePositions !== "object" || base.cluePositions === null) base.cluePositions = {};
      return base;
    } catch (e) {
      return defaultState();
    }
  }

  var state = safeRead();

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      // 隐私模式或存储满时静默失败，避免白屏
    }
  }

  function addUnique(list, id) {
    if (!Array.isArray(list)) list = [];
    if (list.indexOf(id) === -1) {
      list.push(id);
      return true;
    }
    return false;
  }

  window.GameStorage = {
    getState: function () { return state; },

    save: persist,

    collectKeyword: function (id) {
      if (!id) return false;
      var changed = addUnique(state.collectedKeywords, id);
      if (changed) persist();
      return changed;
    },

    collectCard: function (id) {
      if (!id) return false;
      var changed = addUnique(state.collectedCards, id);
      if (changed) persist();
      return changed;
    },

    unlockCombination: function (comboId) {
      if (!comboId) return false;
      var changed = addUnique(state.unlockedCombinations, comboId);
      if (changed) persist();
      return changed;
    },

    addGeneratedKeyword: function (id) {
      if (!id) return false;
      var changed = addUnique(state.generatedKeywords, id);
      if (changed) {
        // 生成关键词同时视为已收集线索，直接进入收纳区
        addUnique(state.collectedKeywords, id);
        persist();
      }
      return changed;
    },

    isCollectedKeyword: function (id) {
      return state.collectedKeywords.indexOf(id) !== -1;
    },

    isCollectedCard: function (id) {
      return state.collectedCards.indexOf(id) !== -1;
    },

    isCombinationUnlocked: function (id) {
      return state.unlockedCombinations.indexOf(id) !== -1;
    },

    setCluePosition: function (id, x, y) {
      state.cluePositions[id] = { x: x, y: y };
      persist();
    },

    getCluePosition: function (id) {
      return state.cluePositions[id] || null;
    },

    rememberPassword: function (enabled) {
      state.rememberPassword = !!enabled;
      state.passwordToken = enabled ? PASSWORD : "";
      persist();
    },

    isPasswordRemembered: function () {
      return state.rememberPassword === true && state.passwordToken === PASSWORD;
    },

    resetProgress: function (keepPassword) {
      var preservedRemember = state.rememberPassword;
      var preservedToken = state.passwordToken;
      state = defaultState();
      if (keepPassword) {
        state.rememberPassword = preservedRemember;
        state.passwordToken = preservedToken;
      }
      persist();
      return state;
    }
  };
})();
