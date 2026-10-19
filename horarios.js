// Apartado "¿A qué hora llegarás y te irás?" de las páginas de llegada.
// Cada página lo carga con: <script src="../horarios.js" data-piso="CAPRI-5F"></script>
// data-piso = nombre del piso tal cual en la columna PISO de BV Reservas.
// La respuesta va a un script de Google (Apps Script) que la apunta en BV Reservas,
// columnas "Horario de llegada" y "Horario de salida" de la reserva (piso + día de llegada).
(function () {
  const ENDPOINT = "https://script.google.com/macros/s/AKfycbz-8TukPJj1clYERayT6esupg_jI-TA56l39GdDeF-loET8Jekjx0GyWk5vrwtgdx0y/exec";
  const me = document.currentScript;
  const PISO = me.dataset.piso;

  const LLEGADAS = ["16h00-17h00", "17h00-18h00", "18h00-19h00", "19h00-20h00", "20h00-21h00", "21h00-22h00", "22h00-23h00", "después de 23h00"];
  const SALIDAS = ["antes de 08h00", "08h00-09h00", "09h00-10h00", "10h00-11h00"];

  const T = {
    es: { title: "Tu horario", text: "Check-in a partir de las 16:00, check-out hasta las 11:00. ¿A qué hora más o menos llegarás y te irás?", day: "Día de llegada", arrive: "Llegaré", leave: "Me iré", choose: "Elige", unknown: "Aún no lo sé", after: "Después de las 23:00", before: "Antes de las 8:00", send: "Enviar", sending: "Enviando…", ok: "¡Gracias! Lo hemos apuntado.", err: "No se ha podido enviar. Inténtalo otra vez o escríbenos por WhatsApp.", missing: "Indica el día de llegada y al menos una hora.", other: "¿Necesitas llegar antes o irte más tarde? Escríbenos por WhatsApp." },
    en: { title: "Your times", text: "Check-in from 16:00, check-out by 11:00. Roughly what time will you arrive and leave?", day: "Arrival day", arrive: "I'll arrive", leave: "I'll leave", choose: "Choose", unknown: "Not sure yet", after: "After 23:00", before: "Before 8:00", send: "Send", sending: "Sending…", ok: "Thank you! We've noted it down.", err: "It couldn't be sent. Please try again or message us on WhatsApp.", missing: "Please add your arrival day and at least one time.", other: "Need to arrive earlier or leave later? Message us on WhatsApp." },
    fr: { title: "Vos horaires", text: "Check-in à partir de 16h00, check-out jusqu'à 11h00. Vers quelle heure pensez-vous arriver et repartir ?", day: "Jour d'arrivée", arrive: "J'arriverai", leave: "Je partirai", choose: "Choisir", unknown: "Je ne sais pas encore", after: "Après 23h00", before: "Avant 8h00", send: "Envoyer", sending: "Envoi…", ok: "Merci ! C'est noté.", err: "L'envoi n'a pas abouti. Réessayez ou écrivez-nous sur WhatsApp.", missing: "Indiquez le jour d'arrivée et au moins une heure.", other: "Besoin d'arriver plus tôt ou de partir plus tard ? Écrivez-nous sur WhatsApp." }
  };

  function label(v, t) {
    if (v === "después de 23h00") return t.after;
    if (v === "antes de 08h00") return t.before;
    return v.replace(/h/g, ":").replace("-", " – ");
  }

  const sec = document.createElement("section");
  sec.className = "wa hor";
  sec.setAttribute("aria-labelledby", "hor-title");
  sec.innerHTML =
    '<h2 id="hor-title"></h2><p class="hor-text"></p>' +
    '<label for="hor-day" class="hor-l-day"></label><input id="hor-day" type="date">' +
    '<div class="hor-grid"><div><label for="hor-in" class="hor-l-in"></label><select id="hor-in"></select></div>' +
    '<div><label for="hor-out" class="hor-l-out"></label><select id="hor-out"></select></div></div>' +
    '<button type="button" class="wa-btn hor-btn" id="hor-btn"></button>' +
    '<p class="hor-msg" id="hor-msg" role="status" aria-live="polite"></p><p class="hor-other"></p>';
  const wa = document.querySelector("section.wa");
  wa.parentNode.insertBefore(sec, wa);

  const css = document.createElement("style");
  css.textContent =
    ".hor select{font:inherit;color:var(--fg);background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:12px 14px;width:100%;}" +
    ".hor select:focus-visible{outline:2px solid var(--chip);outline-offset:2px;}" +
    ".hor-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}.hor-grid div{display:flex;flex-direction:column;gap:12px;min-width:0;}" +
    ".hor-btn{border:0;font:inherit;font-weight:500;cursor:pointer;}.hor-btn[disabled]{opacity:.6;cursor:default;}" +
    ".hor-msg:empty{display:none;}.hor-msg{color:var(--fg)!important;font-weight:500;}.hor-other{font-size:.85rem;}";
  document.head.appendChild(css);

  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  if (/^\d{4}-\d{2}-\d{2}$/.test(params.get("entrada") || "")) $("hor-day").value = params.get("entrada");

  let lang = "es";
  function fill(sel, values, t) {
    const prev = sel.value;
    sel.textContent = "";
    [["", t.choose]].concat(values.map(v => [v, label(v, t)]), [["?", t.unknown]]).forEach(([v, txt]) => {
      const o = document.createElement("option"); o.value = v; o.textContent = txt; sel.appendChild(o);
    });
    sel.value = prev;
  }
  function render() {
    const l = (document.documentElement.lang || "es").slice(0, 2);
    lang = T[l] ? l : "en";
    const t = T[lang];
    $("hor-title").textContent = t.title;
    sec.querySelector(".hor-text").textContent = t.text;
    sec.querySelector(".hor-l-day").textContent = t.day;
    sec.querySelector(".hor-l-in").textContent = t.arrive;
    sec.querySelector(".hor-l-out").textContent = t.leave;
    sec.querySelector(".hor-other").textContent = t.other;
    if (!$("hor-btn").disabled) $("hor-btn").textContent = t.send;
    fill($("hor-in"), LLEGADAS, t);
    fill($("hor-out"), SALIDAS, t);
  }
  // La página cambia el idioma con render(); lo seguimos mirando el atributo lang.
  new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  render();

  $("hor-btn").addEventListener("click", async () => {
    const l = (document.documentElement.lang || "es").slice(0, 2);
    lang = T[l] ? l : "en";
    const t = T[lang];
    const msg = $("hor-msg");
    const data = {
      piso: PISO, entrada: $("hor-day").value, llegada: $("hor-in").value, salida: $("hor-out").value,
      reserva: ($("wa-res") || {}).value || "", idioma: lang,
      prueba: params.get("prueba") === "1"
    };
    if (!data.entrada || (!data.llegada && !data.salida)) { msg.textContent = t.missing; return; }
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
