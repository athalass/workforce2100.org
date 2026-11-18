/* On phones, data tables in the Work to 2035 tabs stack each row into a labeled card.
   This copies each column heading onto its cells so the card can show it. */
(function () {
  function label(table) {
    var heads = table.querySelectorAll('thead th');
    if (!heads.length) return;
    var names = [];
    heads.forEach(function (th) {
      var c = th.cloneNode(true);
      c.querySelectorAll('br').forEach(function (br) { br.replaceWith(' '); });
      names.push(c.textContent.replace(/\s+/g, ' ').trim());
    });
    table.querySelectorAll('tbody tr').forEach(function (tr) {
      var cells = tr.children;
      for (var i = 0; i < cells.length; i++) {
        if (cells[i].hasAttribute('colspan')) continue;
        if (names[i] && cells[i].getAttribute('data-label') !== names[i]) cells[i].setAttribute('data-label', names[i]);
      }
    });
  }
  function all() { document.querySelectorAll('[id^="tab-"] table').forEach(label); }
  var pending = false;
  new MutationObserver(function () {
    if (pending) return; pending = true;
    requestAnimationFrame(function () { pending = false; all(); });
  }).observe(document.body, { childList: true, subtree: true });
  all();
})();
