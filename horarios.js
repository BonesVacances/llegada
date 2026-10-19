// Apartado "¿A qué hora llegarás y te irás?" de las páginas de llegada.
// Cada página lo carga con: <script src="../horarios.js" data-piso="CAPRI-5F"></script>
// data-piso = nombre del piso tal cual en la columna PISO de BV Reservas.
// La respuesta va a un script de Google (Apps Script) que busca la próxima reserva de ese piso
// en BV Reservas y la apunta en "Horario de llegada" y "Horario de salida".
(function () {
  const ENDPOINT = "https://script.google.com/macros/s/AKfycbz-8TukPJj1clYERayT6esupg_jI-TA56l39GdDeF-loET8Jekjx0GyWk5vrwtgdx0y/exec";
  const me = document.currentScript;
  const PISO = me.dataset.piso;

  // Valores tal como quedan en la hoja (Aida, 19 oct 2026: llegada hasta las 22:00).
  const ANTES = "antes de 16h00 si está listo";
  const TARDE = "después de 22h00";
  const LLEGADAS = [ANTES, "16h00-17h00", "17h00-18h00", "18h00-19h00", "19h00-20h00", "20h00-21h00", "21h00-22h00", TARDE];
  const SALIDAS = ["antes de 08h00", "08h00-09h00", "09h00-10h00", "10h00-11h00"];

  const T = {
    es: { title: "Tu horario", text: "Check-in a partir de las 16:00, check-out hasta las 11:00. ¿A qué hora más o menos llegarás y te irás?", arrive: "Llegaré", leave: "Me iré", choose: "Elige", unknown: "Aún no lo sé", early: "Lo antes posible: avisadme si el piso está listo antes de las 16:00", late: "Más tarde de las 22:00", before: "Antes de las 8:00", send: "Enviar", sending: "Enviando…", ok: "¡Gracias! Lo hemos apuntado.", err: "No se ha podido enviar. Inténtalo otra vez o escríbenos por WhatsApp.", missing: "Elige al menos una hora.", earlyNote: "Si el piso está listo antes, te avisaremos. Si no, la entrada es a partir de las 16:00.", lateNote: "Puedes llegar más tarde sin problema, pero a partir de las 22:00 no atendemos WhatsApp ni llamadas. Mira bien el vídeo antes de llegar.", other: "¿Necesitas irte después de las 11:00? Escríbenos por WhatsApp." },
    en: { title: "Your times", text: "Check-in from 16:00, check-out by 11:00. Roughly what time will you arrive and leave?", arrive: "I'll arrive", leave: "I'll leave", choose: "Choose", unknown: "Not sure yet", early: "As early as possible: let me know if the flat is ready before 16:00", late: "Later than 22:00", before: "Before 8:00", send: "Send", sending: "Sending…", ok: "Thank you! We've noted it down.", err: "It couldn't be sent. Please try again or message us on WhatsApp.", missing: "Please choose at least one time.", earlyNote: "If the flat is ready earlier, we'll let you know. If not, check-in is from 16:00.", lateNote: "You can arrive later, no problem, but from 22:00 we don't answer WhatsApp or calls. Please watch the video carefully before you arrive.", other: "Need to leave after 11:00? Message us on WhatsApp." },
    fr: { title: "Vos horaires", text: "Check-in à partir de 16h00, check-out jusqu'à 11h00. Vers quelle heure pensez-vous arriver et repartir ?", arrive: "J'arriverai", leave: "Je partirai", choose: "Choisir", unknown: "Je ne sais pas encore", early: "Le plus tôt possible : prévenez-moi si le logement est prêt avant 16h00", late: "Après 22h00", before: "Avant 8h00", send: "Envoyer", sending: "Envoi…", ok: "Merci ! C'est noté.", err: "L'envoi n'a pas abouti. Réessayez ou écrivez-nous sur WhatsApp.", missing: "Choisissez au moins une heure.", earlyNote: "Si le logement est prêt plus tôt, nous vous préviendrons. Sinon, l'arrivée se fait à partir de 16h00.", lateNote: "Vous pouvez arriver plus tard sans problème, mais à partir de 22h00 nous ne répondons ni sur WhatsApp ni au téléphone. Regardez bien la vidéo avant d'arriver.", other: "Besoin de partir après 11h00 ? Écrivez-nous sur WhatsApp." }
  };

  function label(v, t) {
    if (v === ANTES) return t.early;
    if (v === TARDE) return t.late;
    if (v === "antes de 08h00") return t.before;
    return v.replace(/h/g, ":").replace("-", " – ");
  }

  const sec = document.createElement("section");
  sec.className = "wa hor";
  sec.setAttribute("aria-labelledby", "hor-title");
  sec.innerHTML =
    '<h2 id="hor-title"></h2><p class="hor-text"></p>' +
    '<label for="hor-in" class="hor-l-in"></label><select id="hor-in"></select>' +
    '<p class="hor-note" id="hor-note"></p>' +
    '<label for="hor-out" class="hor-l-out"></label><select id="hor-out"></select>' +
    '<button type="button" class="wa-btn hor-btn" id="hor-btn"></button>' +
    '<p class="hor-msg" id="hor-msg" role="status" aria-live="polite"></p><p class="hor-other"></p>';
  const wa = document.querySelector("section.wa");
  wa.parentNode.insertBefore(sec, wa);

  const css = document.createElement("style");
  css.textContent =
    ".hor select{font:inherit;color:var(--fg);background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:12px 14px;width:100%;}" +
    ".hor select:focus-visible{outline:2px solid var(--chip);outline-offset:2px;}" +
    ".hor-btn{border:0;font:inherit;font-weight:500;cursor:pointer;}.hor-btn[disabled]{opacity:.6;cursor:default;}" +
    ".hor-note:empty,.hor-msg:empty{display:none;}.hor-note{font-size:.9rem;border-left:3px solid var(--chip);padding-left:12px;}" +
    ".hor-msg{color:var(--fg)!important;font-weight:500;}.hor-other{font-size:.85rem;}";
  document.head.appendChild(css);

  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);

  let lang = "es";
  function currentLang() {
    const l = (document.documentElement.lang || "es").slice(0, 2);
    return T[l] ? l : "en";
  }
  function fill(sel, values, t) {
    const prev = sel.value;
    sel.textContent = "";
    [["", t.choose]].concat(values.map(v => [v, label(v, t)]), [["?", t.unknown]]).forEach(([v, txt]) => {
      const o = document.createElement("option"); o.value = v; o.textContent = txt; sel.appendChild(o);
    });
    sel.value = prev;
  }
  function note() {
    const t = T[lang], v = $("hor-in").value;
    $("hor-note").textContent = v === ANTES ? t.earlyNote : v === TARDE ? t.lateNote : "";
  }
  function render() {
    lang = currentLang();
    const t = T[lang];
    $("hor-title").textContent = t.title;
    sec.querySelector(".hor-text").textContent = t.text;
    sec.querySelector(".hor-l-in").textContent = t.arrive;
    sec.querySelector(".hor-l-out").textContent = t.leave;
    sec.querySelector(".hor-other").textContent = t.other;
    if (!$("hor-btn").disabled) $("hor-btn").textContent = t.send;
    fill($("hor-in"), LLEGADAS, t);
    fill($("hor-out"), SALIDAS, t);
    note();
  }
  // La página cambia el idioma con render(); lo seguimos mirando el atributo lang.
  new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  $("hor-in").addEventListener("change", note);
  render();

  $("hor-btn").addEventListener("click", async () => {
    lang = currentLang();
    const t = T[lang];
    const msg = $("hor-msg");
    // Sin día de llegada: el script busca la próxima reserva de este piso.
    // Un enlace con ?entrada=AAAA-MM-DD fija la reserva (lo usamos para pruebas).
    const data = {
      piso: PISO, llegada: $("hor-in").value, salida: $("hor-out").value,
      entrada: /^\d{4}-\d{2}-\d{2}$/.test(params.get("entrada") || "") ? params.get("entrada") : "",
      reserva: ($("wa-res") || {}).value || "", idioma: lang,
      prueba: params.get("prueba") === "1"
    };
    if (!data.llegada && !data.salida) { msg.textContent = t.missing; return; }
    $("hor-btn").disabled = true; $("hor-btn").textContent = t.sending; msg.textContent = "";
    try {
      const r = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(data) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "error");
      msg.textContent = t.ok;
    } catch (e) {
      msg.textContent = t.err;
    }
    $("hor-btn").disabled = false; $("hor-btn").textContent = t.send;
  });
})();
