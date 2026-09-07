/**
 * Frio Energy Services — Grok chat widget
 * Talks to POST https://app.frioenergyservices.com/api/chat (API key stays on the droplet).
 */
(function () {
  var history = [];
  var open = false;
  var busy = false;

  function el(tag, className, html) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function addBubble(container, role, text) {
    var b = el("div", "frio-chat-bubble " + role);
    b.textContent = text;
    container.appendChild(b);
    container.scrollTop = container.scrollHeight;
    return b;
  }

  function build() {
    var btn = el(
      "button",
      "frio-chat-btn",
      '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg><span>Ask Frio</span>'
    );
    btn.type = "button";
    btn.setAttribute("aria-label", "Open Frio chat");

    var panel = el("div", "frio-chat-panel");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Frio Energy chat");

    var header = el("div", "frio-chat-header");
    var titles = el("div", "");
    titles.appendChild(el("h3", "", "Frio Energy Assistant"));
    titles.appendChild(
      el("p", "", "Generators · Eagle Ford · 24/7 support · Powered by Grok")
    );
    var close = el("button", "frio-chat-close", "×");
    close.type = "button";
    close.setAttribute("aria-label", "Close chat");
    header.appendChild(titles);
    header.appendChild(close);

    var messages = el("div", "frio-chat-messages");
    addBubble(
      messages,
      "bot",
      "Hi — ask about natural gas generator rentals, wellhead-gas pad power, coverage, or how to get a quote. For pricing/dispatch call (830) 346-1222 or use the quote form."
    );

    var form = el("form", "frio-chat-form");
    var input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Ask about gensets, service, coverage…";
    input.autocomplete = "off";
    input.maxLength = 1000;
    var send = document.createElement("button");
    send.type = "submit";
    send.textContent = "Send";
    form.appendChild(input);
    form.appendChild(send);

    var hint = el(
      "div",
      "frio-chat-hint",
      'Urgent power? <a href="tel:+18303461222">(830) 346-1222</a> · <a href="#quote">Request a quote</a>'
    );

    panel.appendChild(header);
    panel.appendChild(messages);
    panel.appendChild(form);
    panel.appendChild(hint);

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    function setOpen(v) {
      open = v;
      if (open) {
        panel.classList.add("open");
        input.focus();
      } else {
        panel.classList.remove("open");
      }
    }

    btn.addEventListener("click", function () {
      setOpen(!open);
    });
    close.addEventListener("click", function () {
      setOpen(false);
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (busy) return;
      var text = (input.value || "").trim();
      if (!text) return;
      input.value = "";
      addBubble(messages, "user", text);
      history.push({ role: "user", content: text });
      if (history.length > 12) history = history.slice(-12);

      busy = true;
      send.disabled = true;
      var thinking = addBubble(messages, "bot", "Thinking…");

      fetch("https://app.frioenergyservices.com/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: history.slice(0, -1) }),
      })
        .then(function (r) {
          return r.json().then(function (j) {
            return { ok: r.ok, status: r.status, body: j };
          });
        })
        .then(function (res) {
          thinking.remove();
          if (!res.ok) {
            var err =
              (res.body && (res.body.detail || res.body.message)) ||
              "Chat unavailable. Please call (830) 346-1222.";
            if (typeof err !== "string") err = JSON.stringify(err);
            addBubble(messages, "err", err);
            return;
          }
          var reply = (res.body && res.body.reply) || "";
          addBubble(messages, "bot", reply);
          history.push({ role: "assistant", content: reply });
        })
        .catch(function () {
          thinking.remove();
          addBubble(
            messages,
            "err",
            "Network error. Call (830) 346-1222 or use the quote form."
          );
        })
        .finally(function () {
          busy = false;
          send.disabled = false;
          input.focus();
        });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
