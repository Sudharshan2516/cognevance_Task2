(function () {
  'use strict';
  var list = document.getElementById('list');

  function api(path, opts) {
    return fetch(path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
  }
  function render(tasks) {
    list.innerHTML = '';
    tasks.forEach(function (t) {
      var li = document.createElement('li');
      if (t.done) li.className = 'done';
      var cb = document.createElement('input');
      cb.type = 'checkbox'; cb.checked = t.done; cb.setAttribute('aria-label', 'Mark done');
      cb.style.flex = '0';
      cb.onchange = function () { api('/api/tasks/' + t.id, { method: 'PATCH', body: JSON.stringify({ done: cb.checked }) }).then(load); };
      var span = document.createElement('span'); span.textContent = t.title;   // textContent: no HTML injection
      var del = document.createElement('button'); del.textContent = 'Delete';
      del.onclick = function () { api('/api/tasks/' + t.id, { method: 'DELETE' }).then(load); };
      li.append(cb, span, del); list.appendChild(li);
    });
  }
  function load() { api('/api/tasks').then(function (r) { return r.json(); }).then(render); }

  document.getElementById('addForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = document.getElementById('title');
    api('/api/tasks', { method: 'POST', body: JSON.stringify({ title: input.value }) }).then(function () { input.value = ''; load(); });
  });

  api('/version').then(function (r) { return r.json(); }).then(function (v) {
    document.getElementById('ver').textContent = v.version;
    document.getElementById('sha').textContent = String(v.commit).slice(0, 7);
  });
  load();
})();
