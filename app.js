(function () {
  "use strict";

  var state = window.GameStorage.getState();
  var currentChatId = null;
  var chatTyping = false;
  var chatFree = false;
  var replyCursor = 0;
  var dragTarget = null;
  var dragOffset = { x: 0, y: 0 };
  var audioCtx = null;

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function getKeyword(id) {
    return (window.KEYWORDS || []).filter(function (k) { return k.id === id; })[0] || null;
  }
  function getCard(id) {
    return (window.CARDS || []).filter(function (c) { return c.id === id; })[0] || null;
  }
  function getAllKeywords() {
    return (window.KEYWORDS || []).filter(function (k) {
      return !k.generated || state.generatedKeywords.indexOf(k.id) !== -1;
    });
  }

  function showToast(text) {
    var t = qs('#toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('show'); }, window.APP_CONFIG.toastDuration || 2300);
  }

  function playTone(kind) {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var now = audioCtx.currentTime;

      if (kind === 'shutter') {
        var bufferSize = Math.floor(audioCtx.sampleRate * 0.08);
        var buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
          var env = Math.pow(1 - i / bufferSize, 2);
          data[i] = (Math.random() * 2 - 1) * env * 0.22;
        }
        var noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        var gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        noise.connect(gain); gain.connect(audioCtx.destination);
        noise.start(now);
      } else if (kind === 'chime') {
        [523.25, 659.25, 783.99].forEach(function (freq, idx) {
          var o = audioCtx.createOscillator();
          var g = audioCtx.createGain();
          o.type = 'sine'; o.frequency.value = freq;
          var t = now + idx * 0.09;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
          o.connect(g); g.connect(audioCtx.destination);
          o.start(t); o.stop(t + 0.24);
        });
      } else {
        var o2 = audioCtx.createOscillator();
        var g2 = audioCtx.createGain();
        o2.type = 'triangle'; o2.frequency.value = 380;
        g2.gain.setValueAtTime(0.0001, now);
        g2.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
        g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        o2.connect(g2); g2.connect(audioCtx.destination);
        o2.start(now); o2.stop(now + 0.14);
      }
    } catch (e) {
      // 音效失败不影响主流程
    }
  }

  function burstEffect() {
    var b = document.createElement('div');
    b.className = 'burst';
    document.body.appendChild(b);
    for (var i = 0; i < 16; i++) {
      var s = document.createElement('span');
      var angle = (Math.PI * 2 * i) / 16;
      var dist = 52 + Math.random() * 44;
      s.style.setProperty('--tx', (Math.cos(angle) * dist) + 'px');
      s.style.setProperty('--ty', (Math.sin(angle) * dist) + 'px');
      s.style.background = i % 3 === 0 ? '#ffb3c0' : '#c9b8ff';
      b.appendChild(s);
    }
    setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 800);
  }

  function flashEffect() {
    var f = qs('#flash-overlay');
    if (!f) {
      f = document.createElement('div');
      f.id = 'flash-overlay';
      f.className = 'flash-overlay';
      document.body.appendChild(f);
    }
    f.classList.remove('show');
    void f.offsetWidth;
    f.classList.add('show');
  }

  /* ===== 屏幕切换包装：新增页面渲染钩子 ===== */
  var originalGo = window.go;
  window.go = function (id) {
    var clean = id;
    if (id.indexOf('screen-') === 0) clean = id.slice(7);
    if (clean === 'password' && window.GameStorage.isPasswordRemembered()) {
      originalGo('archive');
      renderArchiveKeywords();
      return;
    }
    if (clean === 'cards') renderCards();
    if (clean === 'clues') renderClueBoard();
    if (clean === 'archive') renderArchiveKeywords();
    originalGo(id);
  };

  /* ===== 初始化和静态事件 ===== */
  function init() {
    qs('#screen-archive').classList.add('sub-inited');
    bindArchiveActions();
    bindPasswordExtras();
    bindModal();
    renderArchiveKeywords();
    renderCards();
    renderClueBoard();

    if (window.GameStorage.isPasswordRemembered()) {
      originalGo('archive');
    } else {
      originalGo('entry');
    }
  }

  function bindArchiveActions() {
    var resetBtn = qs('#reset-btn');
    if (resetBtn) resetBtn.addEventListener('click', function () { openResetModal(); });

    var forgetBtn = qs('#forget-pass');
    if (forgetBtn) forgetBtn.addEventListener('click', function () {
      window.GameStorage.rememberPassword(false);
      forgetBtn.style.display = 'none';
      var box = qs('#remember-pass');
      if (box) box.checked = false;
      showToast('已清除记住的密码');
    });

    var clueBtn = qs('#clue-btn');
    if (clueBtn) clueBtn.addEventListener('click', function () { window.go('clues'); });

    // 旧档案中带 data-kw 的关键词全部可点击
    qsa('[data-kw]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        openChat(el.getAttribute('data-kw'));
      });
    });

    // 聊天页返回
    var chatBack = qs('#chat-back');
    if (chatBack) chatBack.addEventListener('click', function () { backFromChat(); });

    // 线索页返回
    var cluesBack = qs('#clues-back');
    if (cluesBack) cluesBack.addEventListener('click', function () { window.go('archive'); });

    // 卡面页返回
    var cardsBack = qs('#cards-back');
    if (cardsBack) cardsBack.addEventListener('click', function () { window.go('archive'); });

    // 聊天发送
    var sendBtn = qs('#chat-send');
    var chatInput = qs('#chat-input');
    if (sendBtn) sendBtn.addEventListener('click', function () { sendChatMessage(); });
    if (chatInput) chatInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') sendChatMessage(); });
  }

  function bindPasswordExtras() {
    var box = qs('#remember-pass');
    var forgetBtn = qs('#forget-pass');
    if (window.GameStorage.isPasswordRemembered()) {
      if (box) box.checked = true;
      if (forgetBtn) forgetBtn.style.display = 'inline-block';
    } else if (forgetBtn) {
      forgetBtn.style.display = 'none';
    }
  }

  /* ===== 密码页：由 index.html 内联脚本调用成功后的存储逻辑 ===== */
  window.savePasswordPreference = function (enabled) {
    window.GameStorage.rememberPassword(!!enabled);
    var forgetBtn = qs('#forget-pass');
    if (forgetBtn) forgetBtn.style.display = enabled ? 'inline-block' : 'none';
  };

  /* ===== 档案页关键词渲染 ===== */
  function renderArchiveKeywords() {
    var wrap = qs('#keyword-clues');
    if (!wrap) return;
    wrap.innerHTML = '';
    getAllKeywords().forEach(function (kw) {
      var collected = state.collectedKeywords.indexOf(kw.id) !== -1;
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'kw-chip' + (collected ? ' collected' : '');
      chip.setAttribute('data-kw-id', kw.id);
      var dot = document.createElement('span');
      dot.className = 'kw-dot';
      dot.style.color = kw.color || '#a57cff';
      dot.style.background = kw.color || '#a57cff';
      chip.appendChild(dot);
      chip.appendChild(document.createTextNode(kw.name));
      if (kw.generated) {
        var n = document.createElement('span');
        n.className = 'kw-new';
        n.textContent = 'NEW';
        chip.appendChild(n);
      } else if (collected) {
        var c = document.createElement('span');
        c.className = 'kw-check';
        c.textContent = '✓';
        chip.appendChild(c);
      }
      chip.addEventListener('click', function () { openChat(kw.id); });
      wrap.appendChild(chip);
    });
  }

  /* ===== 聊天式故事页 ===== */
  function openChat(kwId) {
    var kw = getKeyword(kwId);
    if (!kw) return;
    currentChatId = kwId;
    chatFree = false;
    chatTyping = false;
    window.GameStorage.collectKeyword(kwId);

    var log = qs('#chat-log');
    if (log) log.innerHTML = '';
    var input = qs('#chat-input');
    if (input) { input.value = ''; input.disabled = true; }
    var send = qs('#chat-send');
    if (send) send.disabled = true;

    var avatar = qs('#chat-avatar');
    var card = getCard(kw.cardId);
    if (avatar) {
      avatar.src = card ? card.image : 'charlie.jpg';
      avatar.onerror = function () { this.onerror = null; this.src = 'charlie.jpg'; };
      avatar.setAttribute('data-card-id', kw.cardId || '');
    }
    var whoName = qs('#chat-name');
    if (whoName) whoName.textContent = kw.name;
    var whoSub = qs('#chat-sub');
    if (whoSub) whoSub.textContent = '档案对象 · ' + (card ? card.name : kw.name);

    window.go('chat');
    renderArchiveKeywords();
    playStory(kw.story && kw.story.length ? kw.story : ['这条线索我还在整理。']);
  }

  function playStory(lines) {
    var log = qs('#chat-log');
    if (!log) return;
    var idx = 0;
    function next() {
      if (!currentChatId) return;
      var chatScreen = qs('#screen-chat');
      if (!chatScreen || !chatScreen.classList.contains('active')) return;
      if (idx >= lines.length) {
        chatFree = true;
        chatTyping = false;
        var input = qs('#chat-input');
        var send = qs('#chat-send');
        if (input) input.disabled = false;
        if (send) send.disabled = false;
        if (input) input.focus();
        return;
      }
      chatTyping = true;
      typeLine(lines[idx], 'opponent', function () {
        idx += 1;
        setTimeout(next, window.APP_CONFIG.chat.pauseBetweenMessages || 420);
      });
    }
    next();
  }

  function typeLine(text, side, done) {
    if (!currentChatId) return;
    var log = qs('#chat-log');
    var kw = getKeyword(currentChatId);
    if (!kw) return;
    var msg = document.createElement('div');
    msg.className = 'msg ' + side;
    if (side === 'opponent') {
      var card = getCard(kw.cardId);
      var av = document.createElement('img');
      av.className = 'm-avatar';
      av.src = card ? card.image : 'charlie.jpg';
      av.onerror = function () { this.onerror = null; this.src = 'charlie.jpg'; };
      msg.appendChild(av);
    }
    var bubble = document.createElement('div');
    bubble.className = 'bubble';
    msg.appendChild(bubble);
    log.appendChild(msg);
    scrollChat();

    var i = 0;
    var speed = window.APP_CONFIG.chat.typingSpeed || 26;
    var timer = setInterval(function () {
      i += 1;
      bubble.textContent = text.slice(0, i);
      scrollChat();
      if (i >= text.length) {
        clearInterval(timer);
        chatTyping = false;
        if (done) done();
      }
    }, speed);
  }

  function scrollChat() {
    var log = qs('#chat-log');
    if (!log) return;
    log.scrollTop = log.scrollHeight;
  }

  function sendChatMessage() {
    var input = qs('#chat-input');
    if (!input || input.disabled) return;
    if (!currentChatId) return;
    var text = input.value.trim();
    if (!text) return;
    appendSelfMessage(text);
    input.value = '';

    var replies = window.APP_CONFIG.chat.defaultReplies || ['这条线索我先记下了。'];
    var reply = replies[replyCursor % replies.length];
    replyCursor += 1;

    var log = qs('#chat-log');
    var typing = document.createElement('div');
    typing.className = 'msg opponent typing-row';
    var kw = getKeyword(currentChatId);
    var card = kw ? getCard(kw.cardId) : null;
    var av = document.createElement('img');
    av.className = 'm-avatar';
    av.src = card ? card.image : 'charlie.jpg';
    av.onerror = function () { this.onerror = null; this.src = 'charlie.jpg'; };
    typing.appendChild(av);
    var tb = document.createElement('div');
    tb.className = 'bubble typing';
    tb.innerHTML = '<i></i><i></i><i></i>';
    typing.appendChild(tb);
    log.appendChild(typing);
    scrollChat();

    setTimeout(function () {
      if (typing.parentNode) typing.parentNode.removeChild(typing);
      typeLine(reply, 'opponent');
    }, 620);
  }

  function appendSelfMessage(text) {
    var log = qs('#chat-log');
    var msg = document.createElement('div');
    msg.className = 'msg self';
    var bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = text;
    msg.appendChild(bubble);
    log.appendChild(msg);
    scrollChat();
  }

  function backFromChat() {
    currentChatId = null;
    window.go('archive');
  }

  function collectCurrentCard() {
    var avatar = qs('#chat-avatar');
    if (!avatar) return;
    var cardId = avatar.getAttribute('data-card-id');
    if (!cardId) {
      showToast('该线索暂未绑定卡面');
      return;
    }
    if (!getCard(cardId)) {
      showToast('该线索暂未绑定卡面');
      return;
    }
    var collected = window.GameStorage.isCollectedCard(cardId);
    if (collected) {
      showToast('已收集');
      return;
    }
    window.GameStorage.collectCard(cardId);
    playTone('shutter');
    flashEffect();
    burstEffect();
    var wrap = qs('#chat-avatar-wrap');
    if (wrap) {
      wrap.classList.add('capture-pop');
      setTimeout(function () { wrap.classList.remove('capture-pop'); }, 420);
    }
    showToast('已收集卡面：' + (getCard(cardId) ? getCard(cardId).name : cardId));
    renderCards();
  }

  /* ===== 卡面收纳册 ===== */
  function renderCards() {
    var grid = qs('#cards-grid');
    var count = qs('#cards-count');
    if (!grid) return;
    grid.innerHTML = '';
    var cards = window.CARDS || [];
    var collectedCount = 0;
    cards.forEach(function (card) {
      var collected = state.collectedCards.indexOf(card.id) !== -1;
      if (collected) collectedCount += 1;
      var item = document.createElement('div');
      item.className = 'card-item' + (collected ? '' : ' locked');
      if (collected) {
        var img = document.createElement('img');
        img.className = 'card-photo';
        img.src = card.image || card.fallback || 'charlie.jpg';
        img.alt = card.name;
        img.onerror = function () { this.onerror = null; this.src = card.fallback || 'charlie.jpg'; };
        item.appendChild(img);
        var name = document.createElement('div');
        name.className = 'card-name';
        name.textContent = card.name;
        item.appendChild(name);
      } else {
        var lock = document.createElement('div');
        lock.className = 'card-photo';
        item.appendChild(lock);
        var mark = document.createElement('div');
        mark.className = 'card-lock';
        mark.textContent = '?';
        item.appendChild(mark);
        var lockName = document.createElement('div');
        lockName.className = 'card-name';
        lockName.textContent = '未收集';
        item.appendChild(lockName);
      }
      grid.appendChild(item);
    });
    if (count) count.textContent = collectedCount + ' / ' + cards.length;
  }

  /* ===== 线索收纳区 ===== */
  function renderClueBoard() {
    var stage = qs('#clue-stage');
    if (!stage) return;
    stage.innerHTML = '';
    var collected = state.collectedKeywords.slice();
    if (!collected.length) {
      var empty = document.createElement('div');
      empty.className = 'clue-empty';
      empty.textContent = '还没有已收集的线索。\n回到档案页，点击关键词开始调查。';
      stage.appendChild(empty);
      renderComboLog();
      return;
    }

    var positions = state.cluePositions || {};
    var rows = 3;
    collected.forEach(function (id, idx) {
      var kw = getKeyword(id);
      if (!kw) return;
      var note = document.createElement('div');
      note.className = 'clue-note shape-' + (kw.shape || 'rect');
      note.setAttribute('data-kw-id', kw.id);
      note.style.background = kw.color || '#a57cff';
      note.style.setProperty('--tilt', ((idx % 3) - 1) * 2.4 + 'deg');
      note.textContent = kw.name;
      var saved = positions[id];
      var x = saved ? saved.x : 18 + (idx % rows) * 118;
      var y = saved ? saved.y : 20 + Math.floor(idx / rows) * 118;
      note.style.left = x + 'px';
      note.style.top = y + 'px';
      stage.appendChild(note);
      bindClueNote(note);
    });
    renderComboLog();
  }

  function bindClueNote(note) {
    note.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      dragTarget = note;
      var rect = note.getBoundingClientRect();
      var stageRect = qs('#clue-stage').getBoundingClientRect();
      dragOffset.x = e.clientX - rect.left;
      dragOffset.y = e.clientY - rect.top;
      note.classList.add('dragging');
      note.setPointerCapture && note.setPointerCapture(e.pointerId);
      playTone('tick');
    });
    note.addEventListener('pointermove', function (e) {
      if (dragTarget !== note) return;
      var stage = qs('#clue-stage');
      var sr = stage.getBoundingClientRect();
      var w = note.offsetWidth;
      var h = note.offsetHeight;
      var x = Math.max(0, Math.min(sr.width - w, e.clientX - sr.left - dragOffset.x));
      var y = Math.max(0, Math.min(sr.height - h, e.clientY - sr.top - dragOffset.y));
      note.style.left = x + 'px';
      note.style.top = y + 'px';
    });
    note.addEventListener('pointerup', function () {
      if (dragTarget === note) {
        finishDrag(note);
      }
    });
  }

  function finishDrag(dragged) {
    dragged.classList.remove('dragging');
    var stage = qs('#clue-stage');
    var sr = stage.getBoundingClientRect();
    var dr = dragged.getBoundingClientRect();
    var x = dr.left - sr.left;
    var y = dr.top - sr.top;
    window.GameStorage.setCluePosition(dragged.getAttribute('data-kw-id'), Math.round(x), Math.round(y));

    var others = qsa('.clue-note', stage).filter(function (n) { return n !== dragged; });
    var done = false;
    (window.COMBINATIONS || []).forEach(function (combo) {
      if (done) return;
      if (state.unlockedCombinations.indexOf(combo.id) !== -1) return;
      var inputSet = combo.inputs.slice().sort().join('|');
      var draggedId = dragged.getAttribute('data-kw-id');
      others.forEach(function (other) {
        if (done) return;
        var otherId = other.getAttribute('data-kw-id');
        var pair = [draggedId, otherId].sort().join('|');
        if (pair !== inputSet) return;
        var or = other.getBoundingClientRect();
        var ox = or.left - sr.left;
        var oy = or.top - sr.top;
        var dist = Math.sqrt((x - ox) * (x - ox) + (y - oy) * (y - oy));
        if (dist < 76) {
          done = true;
          triggerCombination(combo, dragged, other);
        }
      });
    });

    if (!done) playTone('drop');
    dragTarget = null;
  }

  function triggerCombination(combo, a, b) {
    a.classList.add('matched');
    b.classList.add('matched');
    playTone('chime');
    showToast('组合成功：' + (getKeyword(combo.output) ? getKeyword(combo.output).name : combo.output));

    setTimeout(function () {
      window.GameStorage.unlockCombination(combo.id);
      window.GameStorage.addGeneratedKeyword(combo.output);
      renderArchiveKeywords();
      renderClueBoard();
    }, 560);
  }

  function renderComboLog() {
    var log = qs('#combo-log');
    if (!log) return;
    log.innerHTML = '';
    (window.COMBINATIONS || []).forEach(function (combo) {
      var row = document.createElement('div');
      row.className = 'combo-row';
      var out = getKeyword(combo.output);
      var inputs = combo.inputs.map(function (id) { var k = getKeyword(id); return k ? k.name : id; }).join(' + ');
      var unlocked = state.unlockedCombinations.indexOf(combo.id) !== -1;
      row.innerHTML = '<b>' + (unlocked ? '已解锁' : '待拼合') + '</b>　' + inputs + ' → ' + (out ? out.name : combo.output);
      log.appendChild(row);
    });
  }

  /* ===== 重置进度 ===== */
  function openResetModal() {
    var modal = qs('#reset-modal');
    if (modal) modal.classList.add('show');
  }

  function bindModal() {
    var modal = qs('#reset-modal');
    if (!modal) return;
    var cancel = qs('#reset-cancel');
    var confirm = qs('#reset-confirm');
    if (cancel) cancel.addEventListener('click', function () { modal.classList.remove('show'); });
    if (confirm) confirm.addEventListener('click', function () {
      window.GameStorage.resetProgress(window.APP_CONFIG.resetKeepsPassword !== false);
      state = window.GameStorage.getState();
      modal.classList.remove('show');
      currentChatId = null;
      renderArchiveKeywords();
      renderCards();
      renderClueBoard();
      showToast('进度已重置');
      window.go('archive');
    });
    modal.addEventListener('click', function (e) { if (e.target === modal) modal.classList.remove('show'); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('show')) modal.classList.remove('show');
    });
  }

  /* ===== 头像点击收集（聊天页） ===== */
  document.addEventListener('click', function (e) {
    var avatar = e.target.closest ? e.target.closest('#chat-avatar-wrap') : null;
    if (avatar) collectCurrentCard();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
