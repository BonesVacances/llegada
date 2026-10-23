// Página de llegada personal: con ?c=CLAVE en el enlace, primero el registro y después el vídeo.
// Cada página lo carga antes de horarios.js con: <script src="../reserva.js"></script>
// Lo que solo se enseña con el registro completo lleva data-privado en el HTML y no tiene datos dentro:
// los manda el script de Google (README.md de automatizaciones/llegada-por-reserva).
// Sin ?c= la página no cambia (enlace general).
(function () {
  const ENDPOINT = document.currentScript.dataset.endpoint || "https://script.google.com/macros/s/AKfycbynCugvzaoGqfJUTEs8sSyVF7N1K0oAWOcDGTbJzGmvKIeGPsN8PD6kTnoEpolOrVEw/exec";
  const WA = "https://wa.me/376662217";
  const clave = (new URLSearchParams(location.search).get("c") || "").toUpperCase().replace(/[^A-Z2-9]/g, "");
  // Sin clave: si la página ya no lleva los datos en el HTML (bloqueo de verdad), se pide el enlace personal.
  // Si los lleva (páginas de hoy), no se toca nada.
  const bloqueada = typeof VIDEOS === "object" && !VIDEOS.es;
  if (!clave && !bloqueada) return;

  const T = {
    es: {
      title: "Antes de llegar: el registro", hi: "Hola {n}.",
      text: "En Andorra es obligatorio registrar a todos los huéspedes antes de la llegada. Cuando esté hecho, aquí verás el vídeo de llegada, el wifi y los códigos.",
      btn: "Hacer el registro", noLink: "Usa el enlace del registro que te enviamos por Airbnb, Booking o correo.",
      done: "Ya lo he hecho", checking: "Comprobando…",
      wait: "Aún no nos consta. Lo revisamos a mano y puede tardar un poco. Vuelve a abrir este enlace más tarde o escríbenos por WhatsApp.",
      ok: "Registro completo, muchas gracias.", loading: "Cargando tu reserva…",
      error: "No encontramos tu reserva con este enlace. Escríbenos por WhatsApp y te ayudamos.",
      old: "Este enlace era para una estancia que ya ha terminado.",
      net: "No se ha podido cargar. Revisa la conexión y vuelve a abrir el enlace.",
      nokey: "Abre el enlace personal que te enviamos: ahí verás el vídeo de llegada, el wifi y los códigos.",
      other: "Otros códigos"
    },
    en: {
      title: "Before you arrive: registration", hi: "Hi {n}.",
      text: "In Andorra all guests must be registered before arrival. Once it's done, you'll see the arrival video, the wifi and the codes here.",
      btn: "Register now", noLink: "Use the registration link we sent you on Airbnb, Booking or by email.",
      done: "I've done it", checking: "Checking…",
      wait: "We can't see it yet. We check it by hand, so it can take a little while. Open this link again later or message us on WhatsApp.",
      ok: "Registration complete, thank you.", loading: "Loading your booking…",
      error: "We couldn't find your booking with this link. Message us on WhatsApp and we'll help.",
      old: "This link was for a stay that has already ended.",
      net: "It couldn't load. Check your connection and open the link again.",
      nokey: "Open the personal link we sent you: that's where you'll find the arrival video, the wifi and the codes.",
      other: "Other codes"
    },
    fr: {
      title: "Avant d'arriver : l'enregistrement", hi: "Bonjour {n}.",
      text: "En Andorre, tous les voyageurs doivent être enregistrés avant l'arrivée. Une fois fait, vous verrez ici la vidéo d'arrivée, le wifi et les codes.",
      btn: "Faire l'enregistrement", noLink: "Utilisez le lien d'enregistrement que nous vous avons envoyé sur Airbnb, Booking ou par e-mail.",
      done: "C'est fait", checking: "Vérification…",
      wait: "Nous ne le voyons pas encore. Nous le vérifions à la main, cela peut prendre un peu de temps. Rouvrez ce lien plus tard ou écrivez-nous sur WhatsApp.",
      ok: "Enregistrement terminé, merci beaucoup.", loading: "Chargement de votre réservation…",
      error: "Nous ne trouvons pas votre réservation avec ce lien. Écrivez-nous sur WhatsApp, nous vous aiderons.",
      old: "Ce lien concernait un séjour déjà terminé.",
      net: "Le chargement a échoué. Vérifiez la connexion et rouvrez le lien.",
      nokey: "Ouvrez le lien personnel que nous vous avons envoyé : vous y trouverez la vidéo d'arrivée, le wifi et les codes.",
      other: "Autres codes"
    }
  };
  const lang = () => (T[document.documentElement.lang] ? document.documentElement.lang : "en");

  // Mientras no se sepa el estado, lo privado no se ve.
  const privados = () => document.querySelectorAll("[data-privado]");
  privados().forEach(el => { el.hidden = true; });

  const sec = document.createElement("section");
  sec.className = "wa reg";
  sec.setAttribute("aria-live", "polite");
  sec.innerHTML = '<h2 class="reg-title"></h2><p class="reg-hi"></p><p class="reg-text"></p>' +
    '<a class="wa-btn reg-btn" target="_blank" rel="noopener" hidden></a><p class="reg-nolink" hidden></p>' +
    '<button type="button" class="wa-btn reg-done" hidden></button><p class="reg-msg"></p>';
  const place = document.querySelector("section.place");
  place.parentNode.insertBefore(sec, place.nextSibling);
  const $ = s => sec.querySelector(s);

  let estado = { fase: "cargando" };
  let msg = "loading";

  function pintar() {
    const t = T[lang()];
    const f = estado.fase;
    sec.hidden = f === "completo";
    $(".reg-title").textContent = f === "error" ? "" : t.title;
    $(".reg-title").hidden = f === "error";
    $(".reg-hi").textContent = estado.nombre ? t.hi.replace("{n}", estado.nombre) : "";
    $(".reg-text").textContent = f === "pendiente" ? t.text : "";
    $(".reg-btn").hidden = f !== "pendiente" || !estado.guestapp;
    $(".reg-btn").textContent = t.btn;
    if (estado.guestapp) $(".reg-btn").href = estado.guestapp;
    $(".reg-nolink").hidden = f !== "pendiente" || !!estado.guestapp;
    $(".reg-nolink").textContent = t.noLink;
    $(".reg-done").hidden = f !== "pendiente";
    $(".reg-done").textContent = msg === "checking" ? t.checking : t.done;
    $(".reg-msg").textContent = msg && msg !== "checking" ? t[msg] : "";
    const otros = document.getElementById("otros-k");
    if (otros) otros.textContent = t.other;
  }

  function mostrar(c) {
    // Variables de la página (VIDEOS, DOWNLOADS y render, en su script): se rellenan y se vuelve a pintar.
    if (c && typeof VIDEOS === "object") {
      Object.assign(VIDEOS, c.videos || {});
      Object.assign(DOWNLOADS, c.descargas || {});
    }
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || ""; };
    if (c) {
      set("wifi-red", c.wifiRed);
      set("wifi-pass", c.wifiPass);
      set("otros-v", c.otros);
    }
    privados().forEach(el => { el.hidden = false; });
    // "Otros códigos" (portal, parking, taquilla…) solo si el piso los tiene.
    const fila = document.getElementById("otros-row");
    if (fila && !(c && c.otros)) fila.hidden = true;
    if (typeof render === "function") render(currentLang);
  }

  async function cargar(manual) {
    if (manual) { msg = "checking"; pintar(); }
    try {
      const r = await fetch(ENDPOINT + (ENDPOINT.indexOf("?") < 0 ? "?" : "&") + "k=" + encodeURIComponent(clave));
      const d = await r.json();
      if (!d.ok) {
        estado = { fase: "error" };
        msg = d.error === "caducada" ? "old" : "error";
      } else if (d.registro) {
        estado = { fase: "completo", nombre: d.nombre };
        msg = "";
        mostrar(d.contenido);
      } else {
        estado = { fase: "pendiente", nombre: d.nombre, guestapp: /^https:\/\/app\.icnea\.net\//.test(d.guestapp || "") ? d.guestapp : "" };
        msg = manual ? "wait" : "";
      }
    } catch (e) {
      msg = "net";
      if (estado.fase === "cargando") estado = { fase: "error" };
    }
    pintar();
  }

  if (!clave) {
    estado = { fase: "error" };
    msg = "nokey";
    pintar();
    return;
  }
  $(".reg-done").addEventListener("click", () => cargar(true));
  // La página cambia el idioma en <html lang>: se vuelve a pintar en el idioma nuevo.
  new MutationObserver(pintar).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  pintar();
  cargar(false);
})();
