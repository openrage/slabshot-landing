// Inline AJAX submit for the waitlist; falls back to a normal POST (the function returns an
// HTML thank-you) if JS is off or fails.
(function () {
  var form = document.getElementById("waitform");
  if (!form) return;
  var note = document.getElementById("note");
  var btn = form.querySelector("button[type=submit]");

  function setNote(msg, cls) {
    note.textContent = msg;
    note.className = "form-note" + (cls ? " " + cls : "");
  }

  form.addEventListener("submit", function (e) {
    var email = form.email.value.trim();
    var consent = form.consent.checked;
    if (!email || email.indexOf("@") < 1) { e.preventDefault(); setNote("Enter a valid email.", "err"); return; }
    if (!consent) { e.preventDefault(); setNote("Please tick the consent box to continue.", "err"); return; }

    // Progressive enhancement: try fetch; on any failure let the native POST proceed.
    if (!window.fetch) return;
    e.preventDefault();
    btn.disabled = true;
    setNote("Adding you…");

    fetch(form.action, {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(new FormData(form)).toString(),
    })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok) {
          form.reset();
          setNote(res.j.message || "You're on the list — watch your inbox.", "ok");
        } else {
          setNote((res.j && res.j.error) || "Something went wrong — try again.", "err");
          btn.disabled = false;
        }
      })
      .catch(function () {
        // Network/Function unavailable — submit natively so nothing is lost.
        form.submit();
      });
  });
})();
