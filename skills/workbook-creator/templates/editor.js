/* ============================================================
   Workbook WYSIWYG Editor — Logic
   Single IIFE, no dependencies. Auto-inits on DOMContentLoaded.
   Expects window.WORKBOOK_CONFIG set before this script runs.
   ============================================================ */
(function () {
  'use strict';

  /* ── Language strings ────────────────────────────────────── */
  var LANG = {
    ru: {
      toolbar_undo: 'Отменить',
      toolbar_copy: 'Копировать',
      toolbar_pdf: 'PDF',
      toolbar_replace_cover: 'Обложка',
      comment_edit: '✏️ Правка',
      comment_instruction: '💡 Инструкция',
      comment_save: 'Сохранить',
      comment_delete: 'Удалить',
      comment_placeholder_edit: 'Какое изменение нужно?',
      comment_placeholder_instruction: 'Контекст / пояснение для AI…',
      page_break_before: 'Разрыв до',
      page_break_after: 'Разрыв после',
      export_edits_header: 'Правки (Edits)',
      export_instructions_header: 'Инструкции (Instructions)',
      copied: 'Скопировано!',
      no_comments: 'Нет комментариев'
    },
    uk: {
      toolbar_undo: 'Скасувати',
      toolbar_copy: 'Копiювати',
      toolbar_pdf: 'PDF',
      toolbar_replace_cover: 'Обкладинка',
      comment_edit: '✏️ Правка',
      comment_instruction: '💡 Інструкція',
      comment_save: 'Зберегти',
      comment_delete: 'Видалити',
      comment_placeholder_edit: 'Яку зміну потрібно?',
      comment_placeholder_instruction: 'Контекст / пояснення для AI…',
      page_break_before: 'Розрив до',
      page_break_after: 'Розрив після',
      export_edits_header: 'Правки (Edits)',
      export_instructions_header: 'Інструкції (Instructions)',
      copied: 'Скопійовано!',
      no_comments: 'Немає коментарів'
    },
    en: {
      toolbar_undo: 'Undo',
      toolbar_copy: 'Copy All',
      toolbar_pdf: 'PDF',
      toolbar_replace_cover: 'Cover',
      comment_edit: '✏️ Edit',
      comment_instruction: '💡 Instruction',
      comment_save: 'Save',
      comment_delete: 'Delete',
      comment_placeholder_edit: 'What change is needed?',
      comment_placeholder_instruction: 'Context / note for AI…',
      page_break_before: 'Break before',
      page_break_after: 'Break after',
      export_edits_header: 'Edits',
      export_instructions_header: 'Instructions',
      copied: 'Copied!',
      no_comments: 'No comments'
    }
  };

  /* ── Config & state ──────────────────────────────────────── */
  var CFG = window.WORKBOOK_CONFIG || {};
  var lang = LANG[CFG.lang] || LANG.ru;
  var blockNames = CFG.blockNames || {};
  var comments = {};        // blockId -> { text, type }
  var undoStack = [];       // max 50
  var UNDO_MAX = 50;
  var isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;

  /* ── Helpers ─────────────────────────────────────────────── */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'className') e.className = attrs[k];
      else if (k === 'textContent') e.textContent = attrs[k];
      else if (k === 'innerHTML') e.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    });
    if (children) children.forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }

  function blockId(wrap) {
    var inner = wrap.querySelector('[data-block]');
    return inner ? inner.getAttribute('data-block') : null;
  }

  function blockLabel(id) {
    return blockNames[id] || id;
  }

  function pushUndo(entry) {
    undoStack.push(entry);
    if (undoStack.length > UNDO_MAX) undoStack.shift();
    updateUndoBtn();
  }

  function updateUndoBtn() {
    var btn = $('#wbUndo');
    if (btn) btn.disabled = undoStack.length === 0;
  }

  function flash(msg) {
    var fb = $('.wb-toolbar-feedback');
    if (!fb) return;
    fb.textContent = msg;
    fb.style.opacity = '1';
    setTimeout(function () { fb.style.opacity = '0'; }, 1500);
  }

  function updateBadge() {
    var badge = $('.wb-count-badge');
    if (!badge) return;
    var count = Object.keys(comments).length;
    badge.textContent = count;
  }

  function bumpBadge() {
    var badge = $('.wb-count-badge');
    if (!badge) return;
    badge.classList.remove('wb-badge-bump');
    void badge.offsetWidth; // reflow
    badge.classList.add('wb-badge-bump');
  }

  /* ── Viewport scaling ────────────────────────────────────── */
  function applyScale() {
    var frame = $('.wb-scale-frame');
    if (!frame) return;
    var PAGE_W = 794;
    var available = window.innerWidth - 20;
    var scale = Math.min(1, available / PAGE_W);
    frame.style.transform = 'scale(' + scale + ')';
    frame.style.transformOrigin = 'top center';
    // Collapse dead space
    frame.style.marginBottom = (frame.scrollHeight * scale - frame.scrollHeight) + 'px';
  }

  /* ── Build toolbar ───────────────────────────────────────── */
  function buildToolbar() {
    var tb = el('div', { className: 'wb-toolbar' }, [
      el('span', { className: 'wb-toolbar-brand', textContent: CFG.brand || '' }),
      el('span', { className: 'wb-toolbar-title', textContent: CFG.title || '' }),
      el('div', { className: 'wb-toolbar-comments', innerHTML: '💬 <span class="wb-count-badge">0</span>' }),
      el('button', { className: 'wb-toolbar-btn', id: 'wbUndo', disabled: 'disabled', textContent: '↩ ' + lang.toolbar_undo }),
      el('button', { className: 'wb-toolbar-btn wb-btn-primary', id: 'wbCopy', textContent: '📋 ' + lang.toolbar_copy }),
      el('button', { className: 'wb-toolbar-btn wb-btn-ghost', id: 'wbCover', textContent: '🖼 ' + lang.toolbar_replace_cover }),
      el('button', { className: 'wb-toolbar-btn wb-btn-ghost', id: 'wbPDF', textContent: '⬇ ' + lang.toolbar_pdf }),
      el('span', { className: 'wb-toolbar-feedback' })
    ]);
    document.body.prepend(tb);
    document.body.classList.add('wb-editor-active');
  }

  /* ── Wrap content in scale frame ─────────────────────────── */
  function wrapScaleFrame() {
    if ($('.wb-scale-frame')) return;
    var pages = $$('.page, .cover');
    if (!pages.length) return;
    var frame = el('div', { className: 'wb-scale-frame' });
    pages[0].parentNode.insertBefore(frame, pages[0]);
    pages.forEach(function (p) { frame.appendChild(p); });
  }

  /* ── Detect content type and build controls ──────────────── */
  function detectControls(inner) {
    var extra = [];

    // Answer lines
    if (inner.querySelector('.answer-lines, .notes-lines')) {
      extra.push({ icon: '⤢', action: 'extend-lines', title: 'Extend' });
      extra.push({ icon: '⤡', action: 'shrink-lines', title: 'Shrink' });
    }

    // Sketch box
    if (inner.querySelector('.sketch-box')) {
      extra.push({ icon: '⤢', action: 'extend-sketch', title: 'Extend' });
      extra.push({ icon: '⤡', action: 'shrink-sketch', title: 'Shrink' });
    }

    // Chain empty
    if (inner.querySelector('.chain-item-empty')) {
      extra.push({ icon: '⤢', action: 'extend-chain', title: 'Extend' });
      extra.push({ icon: '⤡', action: 'shrink-chain', title: 'Shrink' });
    }

    // Table rows
    if (inner.querySelector('table tbody')) {
      extra.push({ icon: '＋', action: 'add-row', title: 'Add row' });
      extra.push({ icon: '－', action: 'remove-row', title: 'Remove row' });
      extra.push({ icon: '↧', action: 'pad-row-up', title: 'Increase row height' });
      extra.push({ icon: '↥', action: 'pad-row-down', title: 'Decrease row height' });
    }

    // Checklist
    if (inner.querySelector('.checklist')) {
      extra.push({ icon: '＋', action: 'add-item', title: 'Add item' });
      extra.push({ icon: '－', action: 'remove-item', title: 'Remove item' });
    }

    // Two-col movement
    if (inner.parentElement && inner.parentElement.classList.contains('two-col')) {
      extra.push({ icon: '←', action: 'move-left', title: 'Move left' });
      extra.push({ icon: '→', action: 'move-right', title: 'Move right' });
    }

    return extra;
  }

  /* ── Build block wrapper + controls ──────────────────────── */
  function wrapBlock(inner) {
    if (inner.parentElement && inner.parentElement.classList.contains('wb-block-wrap')) return;

    var wrap = el('div', { className: 'wb-block-wrap' });
    inner.parentNode.insertBefore(wrap, inner);
    wrap.appendChild(inner);

    // Drag handle
    var handle = el('div', { className: 'wb-drag-handle', textContent: '⠿', draggable: 'true' });
    wrap.appendChild(handle);

    // Build action bar
    var bar = el('div', { className: 'wb-action-bar' });

    // BASE controls
    var base = [
      { icon: '↑', action: 'move-up', title: 'Move up' },
      { icon: '↓', action: 'move-down', title: 'Move down' },
      { icon: '⬆✂', action: 'break-before', title: 'Break before' },
      { icon: '⬇✂', action: 'break-after', title: 'Break after' },
      { icon: '💬', action: 'comment', title: 'Comment', cls: 'wb-comment-btn' },
      { icon: '🗑', action: 'remove', title: 'Remove' }
    ];

    // Extra controls
    var extra = detectControls(inner);

    // Insert extra before comment
    var allCtrls = base.slice(0, 4).concat(extra).concat(base.slice(4));

    allCtrls.forEach(function (c) {
      var btn = el('button', {
        className: 'wb-action-btn' + (c.cls ? ' ' + c.cls : ''),
        textContent: c.icon,
        title: c.title,
        'data-action': c.action
      });
      bar.appendChild(btn);
    });

    wrap.appendChild(bar);

    // Restore comment state
    var bid = blockId(wrap);
    if (bid && comments[bid]) {
      wrap.classList.add('has-comment');
    }

    return wrap;
  }

  /* ── Make text elements editable ─────────────────────────── */
  var EDITABLE_SELECTORS = [
    '.section-header h2', '.section-header p',
    '.key-idea',
    '.question-prompt',
    'thead th', 'tbody td',
    '.chain-item-filled',
    '.checklist-text',
    '.pill',
    '.highlight-box',
    '.notes-full h3', '.notes-hint',
    '.sketch-label'
  ];

  function enableEditing() {
    EDITABLE_SELECTORS.forEach(function (sel) {
      $$(sel).forEach(function (elem) {
        if (elem.getAttribute('contenteditable') === 'true') return;
        elem.setAttribute('contenteditable', 'true');
      });
    });
  }

  /* ── Track inline edits ──────────────────────────────────── */
  document.addEventListener('input', function (e) {
    var target = e.target;
    if (target.getAttribute('contenteditable') !== 'true') return;
    // Walk up to find wrap
    var wrap = target.closest('.wb-block-wrap');
    if (wrap && !wrap.classList.contains('wb-edited')) {
      wrap.classList.add('wb-edited');
    }
  });

  /* ── Action handler ──────────────────────────────────────── */
  function getWrap(target) {
    return target.closest('.wb-block-wrap');
  }

  function handleAction(action, btn) {
    var wrap = getWrap(btn);
    if (!wrap) return;
    var inner = wrap.querySelector('[data-block]');

    switch (action) {
      case 'move-up': {
        var prev = wrap.previousElementSibling;
        if (prev && prev.classList.contains('wb-block-wrap')) {
          pushUndo({ type: 'move', wrap: wrap, ref: wrap.nextElementSibling, parent: wrap.parentNode });
          wrap.parentNode.insertBefore(wrap, prev);
        }
        break;
      }
      case 'move-down': {
        var next = wrap.nextElementSibling;
        if (next && next.classList.contains('wb-block-wrap')) {
          pushUndo({ type: 'move', wrap: wrap, ref: next, parent: wrap.parentNode });
          wrap.parentNode.insertBefore(wrap, next.nextElementSibling);
        }
        break;
      }
      case 'remove': {
        pushUndo({ type: 'remove', wrap: wrap, ref: wrap.nextElementSibling, parent: wrap.parentNode, html: wrap.outerHTML });
        wrap.remove();
        break;
      }
      case 'break-before': {
        var brk = makePageBreak(lang.page_break_before);
        pushUndo({ type: 'insert-break', el: brk });
        wrap.parentNode.insertBefore(brk, wrap);
        break;
      }
      case 'break-after': {
        var brk2 = makePageBreak(lang.page_break_after);
        pushUndo({ type: 'insert-break', el: brk2 });
        wrap.parentNode.insertBefore(brk2, wrap.nextElementSibling);
        break;
      }
      case 'comment': {
        toggleComment(wrap, btn);
        break;
      }
      case 'extend-lines': {
        if (!inner) break;
        var lines = inner.querySelectorAll('.answer-lines, .notes-lines');
        pushUndo({ type: 'extend-lines', inner: inner, count: 3 });
        lines.forEach(function (container) {
          for (var i = 0; i < 3; i++) {
            var line = document.createElement('div');
            line.className = 'answer-line';
            line.style.borderBottom = '1px solid var(--border, #ccc)';
            line.style.height = '32px';
            container.appendChild(line);
          }
        });
        break;
      }
      case 'shrink-lines': {
        if (!inner) break;
        var linesS = inner.querySelectorAll('.answer-lines, .notes-lines');
        pushUndo({ type: 'shrink-lines', inner: inner, count: 3 });
        linesS.forEach(function (container) {
          for (var i = 0; i < 3; i++) {
            var last = container.lastElementChild;
            if (last) last.remove();
          }
        });
        break;
      }
      case 'extend-sketch': {
        if (!inner) break;
        var sketches = inner.querySelectorAll('.sketch-box');
        pushUndo({ type: 'extend-sketch', targets: sketches, delta: 40 });
        sketches.forEach(function (sk) {
          var h = parseInt(getComputedStyle(sk).minHeight) || 100;
          sk.style.minHeight = (h + 40) + 'px';
        });
        break;
      }
      case 'shrink-sketch': {
        if (!inner) break;
        var sketchesS = inner.querySelectorAll('.sketch-box');
        pushUndo({ type: 'extend-sketch', targets: sketchesS, delta: -40 });
        sketchesS.forEach(function (sk) {
          var h = parseInt(getComputedStyle(sk).minHeight) || 100;
          sk.style.minHeight = Math.max(50, h - 40) + 'px';
        });
        break;
      }
      case 'extend-chain': {
        if (!inner) break;
        var chains = inner.querySelectorAll('.chain-item-empty');
        pushUndo({ type: 'extend-sketch', targets: chains, delta: 20 });
        chains.forEach(function (ch) {
          var h = parseInt(getComputedStyle(ch).minHeight) || 40;
          ch.style.minHeight = (h + 20) + 'px';
        });
        break;
      }
      case 'shrink-chain': {
        if (!inner) break;
        var chainsS = inner.querySelectorAll('.chain-item-empty');
        pushUndo({ type: 'extend-sketch', targets: chainsS, delta: -20 });
        chainsS.forEach(function (ch) {
          var h = parseInt(getComputedStyle(ch).minHeight) || 40;
          ch.style.minHeight = Math.max(28, h - 20) + 'px';
        });
        break;
      }
      case 'add-row': {
        if (!inner) break;
        var tbody = inner.querySelector('table tbody');
        if (!tbody) break;
        var lastRow = tbody.querySelector('tr:last-child');
        var cols = lastRow ? lastRow.children.length : 1;
        var tr = document.createElement('tr');
        for (var c = 0; c < cols; c++) {
          var td = document.createElement('td');
          td.setAttribute('contenteditable', 'true');
          tr.appendChild(td);
        }
        pushUndo({ type: 'extend-row', tbody: tbody, row: tr });
        tbody.appendChild(tr);
        break;
      }
      case 'remove-row': {
        if (!inner) break;
        var tbodyR = inner.querySelector('table tbody');
        if (!tbodyR) break;
        var rows = tbodyR.querySelectorAll('tr');
        if (rows.length <= 1) break;
        var removed = rows[rows.length - 1];
        pushUndo({ type: 'shrink-row', tbody: tbodyR, row: removed, html: removed.outerHTML });
        removed.remove();
        break;
      }
      case 'pad-row-up':
      case 'pad-row-down': {
        if (!inner) break;
        var tbl = inner.querySelector('table tbody');
        if (!tbl) break;
        var padDelta = action === 'pad-row-up' ? 4 : -4;
        var cells = tbl.querySelectorAll('td');
        var prevPads = [];
        cells.forEach(function (td) {
          var cur = parseInt(td.style.paddingTop) || parseInt(getComputedStyle(td).paddingTop) || 5;
          prevPads.push(cur);
          var next = Math.max(2, cur + padDelta);
          td.style.paddingTop = next + 'px';
          td.style.paddingBottom = next + 'px';
        });
        pushUndo({ type: 'pad-row', cells: cells, prevPads: prevPads });
        break;
      }
      case 'add-item': {
        if (!inner) break;
        var cl = inner.querySelector('.checklist');
        if (!cl) break;
        var item = document.createElement('label');
        item.className = 'checklist-item';
        item.innerHTML = '<input type="checkbox"><span class="checklist-text" contenteditable="true">…</span>';
        pushUndo({ type: 'add-item', parent: cl, item: item });
        cl.appendChild(item);
        break;
      }
      case 'remove-item': {
        if (!inner) break;
        var clR = inner.querySelector('.checklist');
        if (!clR) break;
        var items = clR.querySelectorAll('.checklist-item');
        if (items.length <= 1) break;
        var last = items[items.length - 1];
        pushUndo({ type: 'remove-item', parent: clR, item: last, html: last.outerHTML });
        last.remove();
        break;
      }
      case 'move-left': {
        var twoCol = wrap.parentElement;
        if (!twoCol || !twoCol.classList.contains('two-col')) break;
        var prevSib = wrap.previousElementSibling;
        if (prevSib) {
          pushUndo({ type: 'move', wrap: wrap, ref: wrap.nextElementSibling, parent: wrap.parentNode });
          twoCol.insertBefore(wrap, prevSib);
        }
        break;
      }
      case 'move-right': {
        var twoCol2 = wrap.parentElement;
        if (!twoCol2 || !twoCol2.classList.contains('two-col')) break;
        var nextSib = wrap.nextElementSibling;
        if (nextSib) {
          pushUndo({ type: 'move', wrap: wrap, ref: nextSib, parent: wrap.parentNode });
          twoCol2.insertBefore(wrap, nextSib.nextElementSibling);
        }
        break;
      }
    }
  }

  /* ── Page break ──────────────────────────────────────────── */
  function makePageBreak(label) {
    var pb = el('div', { className: 'wb-page-break' }, [
      el('span', { className: 'wb-page-break-label', textContent: label }),
      el('button', { className: 'wb-page-break-remove', textContent: '✕', 'data-action': 'remove-break' })
    ]);
    return pb;
  }

  /* ── Comment popover ─────────────────────────────────────── */
  function toggleComment(wrap, btn) {
    // Close any open popover first
    closeAllPopovers();

    var bid = blockId(wrap);
    if (!bid) return;

    var existing = wrap.querySelector('.wb-comment-popover');
    if (existing) {
      existing.classList.toggle('wb-open');
      return;
    }

    var savedComment = comments[bid] || { text: '', type: 'edit' };
    var currentType = savedComment.type || 'edit';

    var popover = el('div', { className: 'wb-comment-popover wb-open' });

    // Tabs
    var tabs = el('div', { className: 'wb-comment-tabs' });
    var tabEdit = el('button', {
      className: 'wb-comment-tab' + (currentType === 'edit' ? ' wb-tab-active' : ''),
      textContent: lang.comment_edit,
      'data-type': 'edit'
    });
    var tabInstr = el('button', {
      className: 'wb-comment-tab' + (currentType === 'instruction' ? ' wb-tab-active' : ''),
      textContent: lang.comment_instruction,
      'data-type': 'instruction'
    });
    tabs.appendChild(tabEdit);
    tabs.appendChild(tabInstr);
    popover.appendChild(tabs);

    // Body
    var body = el('div', { className: 'wb-comment-body' });
    var ta = el('textarea', {
      placeholder: currentType === 'edit' ? lang.comment_placeholder_edit : lang.comment_placeholder_instruction
    });
    ta.value = savedComment.text || '';
    body.appendChild(ta);

    // Actions
    var actions = el('div', { className: 'wb-comment-actions' });
    var delBtn = el('button', { className: 'wb-comment-delete', textContent: lang.comment_delete });
    var saveBtn = el('button', { className: 'wb-comment-save', textContent: lang.comment_save });
    actions.appendChild(delBtn);
    actions.appendChild(saveBtn);
    body.appendChild(actions);
    popover.appendChild(body);

    wrap.appendChild(popover);

    // Tab switching
    tabEdit.addEventListener('click', function () {
      tabEdit.classList.add('wb-tab-active');
      tabInstr.classList.remove('wb-tab-active');
      currentType = 'edit';
      ta.placeholder = lang.comment_placeholder_edit;
    });
    tabInstr.addEventListener('click', function () {
      tabInstr.classList.add('wb-tab-active');
      tabEdit.classList.remove('wb-tab-active');
      currentType = 'instruction';
      ta.placeholder = lang.comment_placeholder_instruction;
    });

    // Save
    saveBtn.addEventListener('click', function () {
      var text = ta.value.trim();
      if (!text) return;
      var isNew = !comments[bid];
      comments[bid] = { text: text, type: currentType };
      wrap.classList.add('has-comment');
      updateBadge();
      if (isNew) bumpBadge();
      popover.classList.remove('wb-open');
    });

    // Delete
    delBtn.addEventListener('click', function () {
      delete comments[bid];
      wrap.classList.remove('has-comment');
      updateBadge();
      popover.classList.remove('wb-open');
    });

    // Focus textarea
    setTimeout(function () { ta.focus(); }, 50);
  }

  function closeAllPopovers() {
    $$('.wb-comment-popover.wb-open').forEach(function (p) {
      p.classList.remove('wb-open');
    });
  }

  /* ── Undo ────────────────────────────────────────────────── */
  function performUndo() {
    if (!undoStack.length) return;
    var entry = undoStack.pop();
    updateUndoBtn();

    switch (entry.type) {
      case 'move':
        entry.parent.insertBefore(entry.wrap, entry.ref);
        break;
      case 'remove':
        entry.parent.insertBefore(entry.wrap, entry.ref);
        break;
      case 'insert-break':
        if (entry.el.parentNode) entry.el.remove();
        break;
      case 'extend-lines':
        // Remove last N lines from each container
        var containers = entry.inner.querySelectorAll('.answer-lines, .notes-lines');
        containers.forEach(function (c) {
          for (var i = 0; i < entry.count; i++) {
            var last = c.lastElementChild;
            if (last) last.remove();
          }
        });
        break;
      case 'shrink-lines':
        // Re-add lines (simplified — adds blank lines back)
        var containersS = entry.inner.querySelectorAll('.answer-lines, .notes-lines');
        containersS.forEach(function (c) {
          for (var i = 0; i < entry.count; i++) {
            var line = document.createElement('div');
            line.className = 'answer-line';
            line.style.borderBottom = '1px solid var(--border, #ccc)';
            line.style.height = '32px';
            c.appendChild(line);
          }
        });
        break;
      case 'extend-sketch':
        // Reverse delta
        if (entry.targets) {
          entry.targets.forEach(function (t) {
            var h = parseInt(getComputedStyle(t).minHeight) || 100;
            t.style.minHeight = Math.max(28, h - entry.delta) + 'px';
          });
        }
        break;
      case 'extend-row':
        if (entry.row.parentNode) entry.row.remove();
        break;
      case 'shrink-row':
        entry.tbody.insertAdjacentHTML('beforeend', entry.html);
        break;
      case 'pad-row':
        if (entry.cells && entry.prevPads) {
          entry.cells.forEach(function (td, i) {
            var prev = entry.prevPads[i] || 5;
            td.style.paddingTop = prev + 'px';
            td.style.paddingBottom = prev + 'px';
          });
        }
        break;
      case 'add-item':
        if (entry.item.parentNode) entry.item.remove();
        break;
      case 'remove-item':
        entry.parent.insertAdjacentHTML('beforeend', entry.html);
        break;
    }
  }

  /* ── Export comments to markdown ──────────────────────────── */
  function exportComments() {
    var ids = Object.keys(comments);
    if (!ids.length) {
      flash(lang.no_comments);
      return;
    }

    var edits = [];
    var instructions = [];
    ids.forEach(function (id) {
      var c = comments[id];
      var entry = { id: id, label: blockLabel(id), text: c.text };
      if (c.type === 'instruction') instructions.push(entry);
      else edits.push(entry);
    });

    var md = '';
    if (edits.length) {
      md += '## ' + lang.export_edits_header + '\n\n';
      edits.forEach(function (e, i) {
        md += '### [' + (i + 1) + '] ' + e.label + '\n';
        md += '`' + e.id + '`\n';
        md += e.text + '\n\n';
      });
    }
    if (instructions.length) {
      md += '## ' + lang.export_instructions_header + '\n\n';
      instructions.forEach(function (e, i) {
        md += '### [' + (i + 1) + '] ' + e.label + '\n';
        md += '`' + e.id + '`\n';
        md += e.text + '\n\n';
      });
    }

    // Copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(md.trim()).then(function () {
        flash(lang.copied);
      });
    } else {
      // Fallback
      var ta = document.createElement('textarea');
      ta.value = md.trim();
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      flash(lang.copied);
    }
  }

  /* ── Cover replace ───────────────────────────────────────── */
  function coverStorageKey() {
    return 'wb-cover:' + (CFG.title || document.title || 'workbook');
  }
  function applyCoverImage(dataUrl) {
    var cover = $('.page.page-cover, .page.cover, .cover');
    if (!cover) return false;
    cover.innerHTML = '<img src="' + dataUrl + '" style="width:100%;height:100%;object-fit:cover;display:block;">';
    cover.setAttribute('style', 'padding:0;background:none;display:block;');
    return true;
  }
  function restoreCoverFromStorage() {
    try {
      var saved = localStorage.getItem(coverStorageKey());
      if (saved) applyCoverImage(saved);
    } catch (e) { /* private mode / quota */ }
  }
  function replaceCover() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    input.addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        if (!applyCoverImage(ev.target.result)) return;
        try { localStorage.setItem(coverStorageKey(), ev.target.result); }
        catch (err) { console.warn('Cover image too large for browser storage; replacement is in-memory only.'); }
        flash(lang.copied);
      };
      reader.readAsDataURL(file);
    });
    document.body.appendChild(input);
    input.click();
    setTimeout(function () { try { input.remove(); } catch (_) {} }, 0);
  }

  /* ── PDF export ──────────────────────────────────────────── */
  function exportPDF() {
    var style = document.createElement('style');
    style.id = 'wb-print-css';
    style.textContent = [
      '@page { size: A4 portrait; margin: 0; }',
      '@media print {',
      '  /* Force ALL background colors and images to print */',
      '  *, *::before, *::after {',
      '    -webkit-print-color-adjust: exact !important;',
      '    print-color-adjust: exact !important;',
      '    color-adjust: exact !important;',
      '  }',
      '  html, body { background: white !important; margin: 0; padding: 0; }',
      '  /* Hide all editor chrome */',
      '  .wb-toolbar, .wb-action-bar, .wb-drag-handle, .wb-comment-btn,',
      '  .wb-comment-popover, .wb-page-break, .wb-cut-line, .page-cut-line,',
      '  .wb-block-wrap.wb-edited::after { display: none !important; }',
      '  .wb-block-wrap.has-comment { border-left-color: transparent !important; background: transparent !important; }',
      '  /* Reset scaling */',
      '  #scale-root, .wb-scale-root { padding: 0 !important; }',
      '  .wb-scale-frame, .scale-frame {',
      '    transform: none !important;',
      '    margin: 0 !important;',
      '    width: 210mm !important;',
      '  }',
      '  /* Page sizing and breaks */',
      '  .page, .cover {',
      '    width: 210mm !important;',
      '    height: 297mm !important;',
      '    box-shadow: none !important;',
      '    overflow: hidden !important;',
      '    page-break-after: always !important;',
      '    break-after: page !important;',
      '  }',
      '  /* Prevent blank trailing page */',
      '  .page:last-of-type, .cover:last-of-type {',
      '    page-break-after: avoid !important;',
      '    break-after: avoid !important;',
      '  }',
      '  /* Force backgrounds on key elements */',
      '  .cover, .block-title-page { background: var(--primary) !important; }',
      '  thead tr, thead th { background: var(--primary) !important; color: white !important; }',
      '  .key-idea { background: var(--primary-light, var(--section-bg, #dbeafe)) !important; }',
      '  .chain-item-filled, .chain-item { background: var(--primary) !important; color: white !important; }',
      '  .pill, .task-label { background: inherit; }',
      '  [contenteditable] { outline: none !important; }',
      '}'
    ].join('\n');
    document.head.appendChild(style);
    window.print();
    setTimeout(function () {
      var s = document.getElementById('wb-print-css');
      if (s) s.remove();
    }, 2000);
  }

  /* ── Drag & drop ─────────────────────────────────────────── */
  var dragWrap = null;

  document.addEventListener('dragstart', function (e) {
    var handle = e.target.closest('.wb-drag-handle');
    if (!handle) return;
    dragWrap = handle.closest('.wb-block-wrap');
    if (!dragWrap) return;
    dragWrap.classList.add('wb-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
  });

  document.addEventListener('dragover', function (e) {
    if (!dragWrap) return;
    e.preventDefault();
    var target = e.target.closest('.wb-block-wrap');
    // Clear all drag-over
    $$('.wb-drag-over').forEach(function (el) { el.classList.remove('wb-drag-over'); });
    if (target && target !== dragWrap) {
      target.classList.add('wb-drag-over');
    }
  });

  document.addEventListener('drop', function (e) {
    if (!dragWrap) return;
    e.preventDefault();
    $$('.wb-drag-over').forEach(function (el) { el.classList.remove('wb-drag-over'); });
    var target = e.target.closest('.wb-block-wrap');
    if (target && target !== dragWrap) {
      pushUndo({ type: 'move', wrap: dragWrap, ref: dragWrap.nextElementSibling, parent: dragWrap.parentNode });
      target.parentNode.insertBefore(dragWrap, target);
    }
    dragWrap.classList.remove('wb-dragging');
    dragWrap = null;
  });

  document.addEventListener('dragend', function () {
    if (dragWrap) {
      dragWrap.classList.remove('wb-dragging');
      dragWrap = null;
    }
    $$('.wb-drag-over').forEach(function (el) { el.classList.remove('wb-drag-over'); });
  });

  /* ── Touch: toggle action bar ────────────────────────────── */
  if (isTouch) {
    document.addEventListener('click', function (e) {
      var handle = e.target.closest('.wb-drag-handle');
      if (handle) {
        e.preventDefault();
        var wrap = handle.closest('.wb-block-wrap');
        if (!wrap) return;
        var bar = wrap.querySelector('.wb-action-bar');
        if (!bar) return;
        // Close all other bars first
        $$('.wb-action-bar.wb-touch-open').forEach(function (b) {
          if (b !== bar) b.classList.remove('wb-touch-open');
        });
        bar.classList.toggle('wb-touch-open');
        return;
      }
      // Tap outside closes bars
      if (!e.target.closest('.wb-action-bar') && !e.target.closest('.wb-drag-handle')) {
        $$('.wb-action-bar.wb-touch-open').forEach(function (b) {
          b.classList.remove('wb-touch-open');
        });
      }
    });
  }

  /* ── Global event delegation ─────────────────────────────── */
  document.addEventListener('click', function (e) {
    // Action buttons
    var actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      var action = actionBtn.getAttribute('data-action');
      if (action === 'remove-break') {
        var pb = actionBtn.closest('.wb-page-break');
        if (pb) pb.remove();
        return;
      }
      handleAction(action, actionBtn);
      return;
    }

    // Toolbar buttons
    if (e.target.id === 'wbUndo' || e.target.closest('#wbUndo')) {
      performUndo();
      return;
    }
    if (e.target.id === 'wbCopy' || e.target.closest('#wbCopy')) {
      exportComments();
      return;
    }
    if (e.target.id === 'wbCover' || e.target.closest('#wbCover')) {
      replaceCover();
      return;
    }
    if (e.target.id === 'wbPDF' || e.target.closest('#wbPDF')) {
      exportPDF();
      return;
    }

    // Click outside popovers
    if (!e.target.closest('.wb-comment-popover') && !e.target.closest('.wb-comment-btn')) {
      closeAllPopovers();
    }
  });

  /* ── Keyboard shortcut (Ctrl/Cmd+Z) ─────────────────────── */
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      // Only intercept if not inside contenteditable
      if (e.target.getAttribute('contenteditable') === 'true') return;
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      e.preventDefault();
      performUndo();
    }
  });

  /* ── Init ────────────────────────────────────────────────── */
  function init() {
    buildToolbar();
    wrapScaleFrame();
    restoreCoverFromStorage();

    // Wrap all [data-block] elements
    $$('[data-block]').forEach(function (block) {
      wrapBlock(block);
    });

    // Enable inline editing
    enableEditing();

    // Apply initial scale
    applyScale();

    // Resize listeners
    window.addEventListener('resize', applyScale);
    window.addEventListener('orientationchange', function () {
      setTimeout(applyScale, 100);
    });

    // Initial badge
    updateBadge();
    updateUndoBtn();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
