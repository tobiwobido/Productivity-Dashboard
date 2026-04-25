var COGS_KEY = 'packsplit_products';
var ICON_CLOSE = '<svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2 2L8 8M8 2L2 8"/></svg>';
var actionFeedbackTimers = {};
var cogsUndoStack = [];
var cogsRedoStack = [];
var cogsUndoing = false;
var cogsFormIds = [
  'prodName', 'listPrice', 'sourcePack', 'sellPack', 'qty',
  'existingUnits', 'hasDiscount', 'discount', 'hasTax', 'taxRate'
];

function getCogsFormState() {
  var state = {};
  cogsFormIds.forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    state[id] = el.type === 'checkbox' ? el.checked : el.value;
  });
  return state;
}

function setCogsFormState(state) {
  cogsFormIds.forEach(function(id) {
    var el = document.getElementById(id);
    if (!el || !state || !Object.prototype.hasOwnProperty.call(state, id)) return;
    if (el.type === 'checkbox') el.checked = !!state[id];
    else el.value = state[id];
  });
  toggleDiscount();
  toggleTax();
  calc();
}

function getCogsSnapshot() {
  return JSON.stringify({
    products: localStorage.getItem(COGS_KEY) || '{}',
    form: getCogsFormState()
  });
}

function pushCogsUndo(snapshot) {
  if (cogsUndoing) return;
  var snap = snapshot || getCogsSnapshot();
  if (cogsUndoStack[cogsUndoStack.length - 1] === snap) return;
  cogsUndoStack.push(snap);
  if (cogsUndoStack.length > 50) cogsUndoStack.shift();
  cogsRedoStack = [];
}

function doCogsUndo() {
  var active = document.activeElement;
  var pending = active && active._undoSnapshot && active._undoSnapshot !== getCogsSnapshot()
    ? active._undoSnapshot
    : null;
  if (!pending && !cogsUndoStack.length) return false;
  var current = getCogsSnapshot();
  cogsUndoing = true;
  cogsRedoStack.push(current);
  if (cogsRedoStack.length > 50) cogsRedoStack.shift();
  var snap = JSON.parse(pending || cogsUndoStack.pop());
  localStorage.setItem(COGS_KEY, snap.products || '{}');
  setCogsFormState(snap.form || {});
  renderSaved();
  if (active) active._undoSnapshot = null;
  cogsUndoing = false;
  return true;
}

window.doCogsUndo = doCogsUndo;

function doCogsRedo() {
  if (!cogsRedoStack.length) return false;
  var active = document.activeElement;
  var current = getCogsSnapshot();
  cogsUndoing = true;
  cogsUndoStack.push(current);
  if (cogsUndoStack.length > 50) cogsUndoStack.shift();
  var snap = JSON.parse(cogsRedoStack.pop());
  localStorage.setItem(COGS_KEY, snap.products || '{}');
  setCogsFormState(snap.form || {});
  renderSaved();
  if (active) active._undoSnapshot = null;
  cogsUndoing = false;
  return true;
}

window.doCogsRedo = doCogsRedo;

function triggerActionFeedback(btnId) {
  var btn = document.getElementById(btnId);
  if (!btn) return;
  if (actionFeedbackTimers[btnId]) clearTimeout(actionFeedbackTimers[btnId]);
  btn.classList.remove('show-feedback', 'feedback-ready', 'preview-reset', 'click-animating');
  void btn.offsetWidth;
  btn.classList.add('click-animating');
  setTimeout(function() {
    btn.classList.remove('click-animating');
    btn.classList.add('show-feedback');
  }, 420);
  actionFeedbackTimers[btnId] = setTimeout(function() {
    btn.classList.add('preview-reset');
    setTimeout(function() {
      btn.classList.remove('show-feedback', 'feedback-ready', 'preview-reset');
      actionFeedbackTimers[btnId] = null;
    }, 380);
  }, 2000);
}

function bindActionFeedbackReset(btnId) {
  var btn = document.getElementById(btnId);
  if (!btn) return;
  btn.addEventListener('mouseenter', function() {
    if (btn.classList.contains('show-feedback') && btn.classList.contains('feedback-ready')) {
      btn.classList.add('preview-reset');
    }
  });
  btn.addEventListener('mouseleave', function() {
    if (btn.classList.contains('preview-reset')) {
      btn.classList.remove('show-feedback', 'feedback-ready', 'preview-reset');
    } else if (btn.classList.contains('show-feedback')) {
      btn.classList.add('feedback-ready');
    }
  });
}

function getDiscount() {
  return document.getElementById('hasDiscount').checked
    ? (parseFloat(document.getElementById('discount').value) || 0) : 0;
}
function getTax() {
  return document.getElementById('hasTax').checked
    ? (parseFloat(document.getElementById('taxRate').value) || 0) : 0;
}
function toggleDiscount() {
  var show = document.getElementById('hasDiscount').checked;
  document.getElementById('discountRow').style.display = show ? 'flex' : 'none';
  document.getElementById('b-discRow').style.display = show ? 'flex' : 'none';
  calc();
}
function toggleTax() {
  var show = document.getElementById('hasTax').checked;
  document.getElementById('taxRow').style.display = show ? 'flex' : 'none';
  document.getElementById('b-taxRow').style.display = show ? 'flex' : 'none';
  calc();
}

function fmt(n) { return '$' + Math.abs(n).toFixed(2); }

function isValidQty(q, sourcePack, sellPack, existingUnits) {
  var totalSingles = q * sourcePack + existingUnits;
  if (totalSingles % sellPack !== 0) return false;
  return (totalSingles / sellPack) % 5 === 0;
}

function findNearestValid(currentQty, sourcePack, sellPack, existingUnits) {
  var below = null, above = null;
  for (var q = currentQty - 1; q >= 1; q--) {
    if (isValidQty(q, sourcePack, sellPack, existingUnits)) { below = q; break; }
  }
  for (var q2 = currentQty + 1; q2 <= 500; q2++) {
    if (isValidQty(q2, sourcePack, sellPack, existingUnits)) { above = q2; break; }
  }
  return { below: below, above: above };
}

function calc() {
  var listPrice    = parseFloat(document.getElementById('listPrice').value) || 0;
  var sourcePack   = parseInt(document.getElementById('sourcePack').value) || 1;
  var sellPack     = parseInt(document.getElementById('sellPack').value) || 1;
  var qty          = parseInt(document.getElementById('qty').value) || 1;
  var existingUnits = parseInt(document.getElementById('existingUnits').value) || 0;
  var discount = getDiscount(), tax = getTax();

  var afterDiscount    = listPrice * (1 - discount / 100);
  var packCost         = afterDiscount * (1 + tax / 100);
  var perUnit          = packCost / sourcePack;
  var cogs             = perUnit * sellPack;
  var totalSingles     = qty * sourcePack + existingUnits;
  var orderCost        = packCost * qty;
  var floorListing     = Math.floor(totalSingles / sellPack);
  var effectiveListing = Math.floor(floorListing / 5) * 5;
  var effectiveLeftover = totalSingles - effectiveListing * sellPack;
  var isValid = effectiveLeftover === 0 && effectiveListing > 0;

  var qtyEl         = document.getElementById('qty');
  var alertEl       = document.getElementById('validationAlert');
  var listingMetric = document.getElementById('m-listingUnits');

  if (isValid) {
    qtyEl.classList.remove('error');
    listingMetric.className = 'metric valid';
    alertEl.className = 'alert success';
    alertEl.innerHTML = '<strong>Valid order.</strong> ' + effectiveListing + ' listing units &mdash; divisible by 5.';
  } else {
    qtyEl.classList.add('error');
    listingMetric.className = 'metric invalid';
    var msg = '<strong>Invalid qty.</strong> ' + effectiveListing + ' listing units with ' + effectiveLeftover + ' singles left over.';
    var nearest = findNearestValid(qty, sourcePack, sellPack, existingUnits);
    var parts = [];
    if (nearest.below !== null) parts.push('try <strong>' + nearest.below + '</strong> packs below');
    if (nearest.above !== null) parts.push('<strong>' + nearest.above + '</strong> packs above');
    if (parts.length) msg += ' Nearest valid: ' + parts.join(' or ') + '.';
    alertEl.className = 'alert error';
    alertEl.innerHTML = msg;
  }

  document.getElementById('heroVal').textContent = fmt(cogs);
  document.getElementById('heroSub').textContent = sellPack + 'ct listing unit (cost per single × ' + sellPack + ')';
  document.getElementById('r-packCost').textContent    = fmt(packCost);
  document.getElementById('r-perUnit').textContent     = fmt(perUnit);
  document.getElementById('r-totalSingles').textContent = totalSingles;
  document.getElementById('r-listingUnits').textContent = effectiveListing;
  document.getElementById('r-orderCost').textContent   = fmt(orderCost);
  document.getElementById('r-leftover').textContent    = effectiveLeftover + ' units';
  document.getElementById('b-list').textContent        = fmt(listPrice);
  document.getElementById('b-discLabel').textContent   = '— ' + discount.toFixed(1) + '% discount';
  document.getElementById('b-disc').textContent        = '-' + fmt(listPrice * discount / 100);
  document.getElementById('b-taxLabel').textContent    = '+ ' + tax.toFixed(3).replace(/\.?0+$/, '') + '% tax';
  document.getElementById('b-tax').textContent         = '+' + fmt(afterDiscount * tax / 100);
  document.getElementById('b-packCost').textContent    = fmt(packCost);
  document.getElementById('b-divLabel').textContent    = '÷ ' + sourcePack + ' units';
  document.getElementById('b-div').textContent         = '÷ ' + sourcePack;
  document.getElementById('b-perUnit').textContent     = fmt(perUnit);
  document.getElementById('b-mulLabel').textContent    = '× ' + sellPack + ' units';
  document.getElementById('b-mul').textContent         = '× ' + sellPack;
  document.getElementById('b-cogs').textContent        = fmt(cogs);
}

function getProducts() {
  try { return JSON.parse(localStorage.getItem(COGS_KEY) || '{}'); } catch(e) { return {}; }
}
function saveProductsToStorage(data) {
  pushCogsUndo();
  localStorage.setItem(COGS_KEY, JSON.stringify(data));
}

function setProductNameSaveError(show) {
  var input = document.getElementById('prodName');
  var error = document.getElementById('prodNameError');
  if (input) input.classList.toggle('error', !!show);
  if (error) error.classList.toggle('show', !!show);
}

function focusProductNameAtEnd() {
  var input = document.getElementById('prodName');
  if (!input) return;
  input.focus();
  var end = input.value.length;
  if (typeof input.setSelectionRange === 'function') input.setSelectionRange(end, end);
}

function saveProduct() {
  var name = document.getElementById('prodName').value.trim();
  if (!name) {
    setProductNameSaveError(true);
    requestAnimationFrame(focusProductNameAtEnd);
    return;
  }
  setProductNameSaveError(false);
  var listPrice  = parseFloat(document.getElementById('listPrice').value) || 0;
  var sourcePack = parseInt(document.getElementById('sourcePack').value) || 1;
  var sellPack   = parseInt(document.getElementById('sellPack').value) || 1;
  var afterDiscount = listPrice * (1 - getDiscount() / 100);
  var packCost      = afterDiscount * (1 + getTax() / 100);
  var cogs          = (packCost / sourcePack) * sellPack;
  var key = 'product:' + name.toLowerCase().replace(/\s+/g, '_');
  var products = getProducts();
  products[key] = {
    name: name,
    listPrice: document.getElementById('listPrice').value,
    sourcePack: document.getElementById('sourcePack').value,
    sellPack: document.getElementById('sellPack').value,
    qty: document.getElementById('qty').value,
    existingUnits: document.getElementById('existingUnits').value,
    hasDiscount: document.getElementById('hasDiscount').checked,
    discount: document.getElementById('discount').value,
    hasTax: document.getElementById('hasTax').checked,
    taxRate: document.getElementById('taxRate').value,
    cogs: cogs.toFixed(2),
    savedAt: new Date().toLocaleDateString()
  };
  saveProductsToStorage(products);
  triggerActionFeedback('saveBtn');
  renderSaved();
  requestAnimationFrame(focusProductNameAtEnd);
}

function loadProduct(key) {
  var products = getProducts();
  var d = products[key];
  if (!d) return;
  pushCogsUndo();
  document.getElementById('prodName').value       = d.name;
  document.getElementById('listPrice').value      = d.listPrice;
  document.getElementById('sourcePack').value     = d.sourcePack;
  document.getElementById('sellPack').value       = d.sellPack || d.amazonPack || '2';
  document.getElementById('qty').value            = d.qty;
  document.getElementById('existingUnits').value  = d.existingUnits || '0';
  document.getElementById('hasDiscount').checked  = d.hasDiscount;
  document.getElementById('discount').value       = d.discount;
  document.getElementById('hasTax').checked       = d.hasTax;
  document.getElementById('taxRate').value        = d.taxRate;
  toggleDiscount(); toggleTax(); calc();
  var mc = document.querySelector('.main-content');
  if (mc) mc.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteProduct(key, btn) {
  var item = btn && btn.closest ? btn.closest('.saved-item') : null;
  var list = document.getElementById('savedList');
  function removeFromData() {
    var products = getProducts();
    delete products[key];
    saveProductsToStorage(products);
    renderSaved();
    setTimeout(function() {
      var nextList = document.getElementById('savedList');
      if (nextList) nextList.classList.remove('is-reflowing');
    }, 120);
  }
  if (!item) { removeFromData(); return; }
  if (list) list.classList.add('is-reflowing');
  item.classList.add('removing');
  setTimeout(removeFromData, 260);
}

function renderSaved() {
  var container = document.getElementById('savedList');
  var products  = getProducts();
  var keys = Object.keys(products);
  if (keys.length === 0) {
    container.innerHTML = '<p class="no-saved">No saved products yet.</p>';
    return;
  }
  container.innerHTML = keys.map(function(key) {
    var d = products[key];
    return '<div class="saved-item" onclick="loadProduct(\'' + key + '\')">'
      + '<div class="saved-item-body">'
      +   '<div class="saved-title-row">'
      +     '<div class="sname">' + d.name + '</div>'
      +     '<span class="scogs">$' + d.cogs + '</span>'
      +   '</div>'
      + '</div>'
      + '<button class="sdel" onclick="event.stopPropagation();deleteProduct(\'' + key + '\',this)">' + ICON_CLOSE + '</button>'
      + '</div>';
  }).join('');
}

function clearForm() {
  pushCogsUndo();
  setProductNameSaveError(false);
  document.getElementById('prodName').value       = '';
  document.getElementById('listPrice').value      = '';
  document.getElementById('sourcePack').value     = '3';
  document.getElementById('sellPack').value       = '2';
  document.getElementById('qty').value            = '10';
  document.getElementById('existingUnits').value  = '0';
  document.getElementById('hasDiscount').checked  = false;
  document.getElementById('discount').value       = '15';
  document.getElementById('hasTax').checked       = true;
  document.getElementById('taxRate').value        = '8.25';
  toggleDiscount(); toggleTax(); calc();
  triggerActionFeedback('clearBtn');
}

function copyCOGS() {
  var val = document.getElementById('heroVal').textContent.replace('$', '');
  if (val === '—' || val === 'â€”') return;
  navigator.clipboard.writeText(val).catch(function() {});
  var btn = document.getElementById('copyBtn');
  var label = btn && btn.querySelector('.copy-btn-label');
  if (!btn || !label) return;
  if (copyBtnTimer) clearTimeout(copyBtnTimer);
  if (copyBtnAnimTimer) clearTimeout(copyBtnAnimTimer);
  btn.classList.remove('copied', 'copy-animating');
  label.textContent = 'Copied!';
  void btn.offsetWidth;
  btn.classList.add('copy-animating');
  copyBtnAnimTimer = setTimeout(function() {
    btn.classList.remove('copy-animating');
    btn.classList.add('copied');
  }, 420);
  copyBtnTimer = setTimeout(function() {
    btn.classList.remove('copied');
    label.textContent = 'Copy';
  }, 1800);
}

function copyCOGS() {
  var val = document.getElementById('heroVal').textContent.replace('$', '');
  if (val === 'â€”' || val === 'Ã¢â‚¬â€' || val === '—') return;
  navigator.clipboard.writeText(val).catch(function() {});
  triggerActionFeedback('copyBtn');
}

function bindCogsUndoControls() {
  cogsFormIds.forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    function remember() {
      el._undoSnapshot = getCogsSnapshot();
    }
    el.addEventListener('focusin', remember);
    el.addEventListener('mousedown', remember);
    el.addEventListener('keydown', function(e) {
      if (e.key !== 'Tab' && !el._undoSnapshot) remember();
    });
    el.addEventListener('change', function() {
      if (!el._undoSnapshot) return;
      if (el._undoSnapshot !== getCogsSnapshot()) pushCogsUndo(el._undoSnapshot);
      el._undoSnapshot = null;
    });
  });
}

bindActionFeedbackReset('saveBtn');
bindActionFeedbackReset('copyBtn');
bindActionFeedbackReset('clearBtn');
bindCogsUndoControls();

renderSaved();
calc();
