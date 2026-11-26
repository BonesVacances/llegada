// Guía virtual de la casa (la información que pide el reglamento de HUT: ficha del HUT, normas,
// aparatos, salida, servicios e inventario), en el idioma que tenga la página.
// Cada página la carga con dos líneas, antes de </body>:
//   <script src="guia-datos.js"></script>
//   <script src="../guia.js"></script>
// guia-datos.js define window.GUIA (formato en casa-canillo/guia-datos.js).
// Lo que va entre <mark>…</mark> está pendiente: no se enseña al huésped. Con ?borrador=1 se ve en amarillo.
(function () {
  const G = window.GUIA;
  if (!G) return;
  const BORRADOR = new URLSearchParams(location.search).get("borrador") === "1";

  const T = {
    es: { titulo: "Guía de la casa", sub: "Todo lo que necesitas saber durante tu estancia.", info: "Información de la vivienda", inv: "Inventario", ud: "Uds.", aviso: "Borrador: lo marcado en amarillo está pendiente y el huésped no lo ve." },
    ca: { titulo: "Guia de la casa", sub: "Tot el que necessites saber durant la teva estada.", info: "Informació de l'habitatge", inv: "Inventari", ud: "Unit.", aviso: "Esborrany: el que està en groc és pendent i l'hoste no ho veu." },
    en: { titulo: "House guide", sub: "Everything you need to know during your stay.", info: "Accommodation information", inv: "Inventory", ud: "Qty", aviso: "Draft: anything in yellow is pending and guests don't see it." },
    fr: { titulo: "Guide de la maison", sub: "Tout ce qu'il faut savoir pendant votre séjour.", info: "Informations sur le logement", inv: "Inventaire", ud: "Qté", aviso: "Brouillon : ce qui est en jaune est en attente et le client ne le voit pas." }
  };
  const COL = { ca: 0, es: 1, en: 2, fr: 3 };

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  // Texto con partes pendientes. Devuelve el HTML que se enseña, o null si no queda nada que enseñar.
  function texto(s) {
    s = String(s);
    if (BORRADOR) return esc(s).replace(/&lt;mark&gt;(.*?)&lt;\/mark&gt;/g, '<mark class="guia-pend">$1</mark>');
    if (s.indexOf("<mark>") < 0) return esc(s);
    let antes = s.slice(0, s.indexOf("<mark>")).trim();
    // "Forfaits y servicios de esquí. Precios: <mark>…</mark>": fuera la etiqueta que se queda sin dato.
    if (/:$/.test(antes)) antes = antes.slice(0, antes.lastIndexOf(". ") + 1).trim();
    // Solo se queda lo de antes si es una frase completa ("Forfaits y servicios de esquí. <mark>otros</mark>").
    return /[.!?]$/.test(antes) ? esc(antes) : null;
  }

  const sec = document.createElement("section");
  sec.className = "guia";
  sec.setAttribute("aria-labelledby", "guia-title");
  const wa = document.querySelector("section.wa");
  wa.parentNode.insertBefore(sec, wa);

  const css = document.createElement("style");
  css.textContent =
    ".guia{background:var(--surface);border-radius:18px;padding:20px;display:flex;flex-direction:column;gap:12px;}" +
    ".guia h2{font-family:var(--title);font-weight:400;font-size:1.35rem;letter-spacing:.1em;text-transform:uppercase;margin:0;}" +
    ".guia>p{margin:0;color:var(--muted);}" +
    ".guia details{border-top:1px solid var(--line);}" +
    ".guia summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 0;font-weight:500;}" +
    ".guia summary::-webkit-details-marker{display:none;}" +
    ".guia summary::after{content:'+';font-size:1.3rem;line-height:1;color:var(--chip);}" +
    ".guia details[open] summary::after{content:'–';}" +
    ".guia summary:focus-visible{outline:2px solid var(--chip);outline-offset:3px;border-radius:6px;}" +
    ".guia .cuerpo{padding-bottom:14px;display:flex;flex-direction:column;gap:10px;}" +
    ".guia .cuerpo p{margin:0;}" +
    ".guia h4{margin:6px 0 0;font-size:.72rem;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);font-weight:500;}" +
    ".guia ul{margin:0;padding-left:18px;}.guia li{margin:3px 0;}" +
    ".guia dl{margin:0;display:grid;gap:10px;}.guia dt{font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);}" +
    ".guia dd{margin:0;font-weight:500;overflow-wrap:anywhere;}" +
    ".guia .rec{font-size:.88rem;color:var(--muted);}" +
    ".guia table{width:100%;border-collapse:collapse;font-size:.92rem;}" +
    ".guia td{padding:5px 0;border-bottom:1px solid var(--line);vertical-align:top;}.guia td.q{text-align:right;width:3.5em;font-variant-numeric:tabular-nums;color:var(--muted);}" +
    ".guia tr.sala td{border-bottom:0;padding-top:14px;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);}" +
    ".guia-pend{background:#f7e27a;color:#3a403b;border-radius:3px;padding:0 3px;}" +
    ".guia .aviso{font-size:.8rem;border:1px dashed var(--chip);border-radius:10px;padding:8px 12px;}";
  document.head.appendChild(css);

  function lista(items) {
    const li = items.map(texto).filter(x => x !== null).map(x => "<li>" + x + "</li>").join("");
    return li ? "<ul>" + li + "</ul>" : "";
  }

  function render() {
    const l0 = (document.documentElement.lang || "es").slice(0, 2);
    const l = T[l0] && G.info[l0] ? l0 : "en";
    const t = T[l], info = G.info[l], carp = G.carpeta[l];
    let h = '<h2 id="guia-title">' + esc(t.titulo) + "</h2><p>" + esc(t.sub) + "</p>";
    if (BORRADOR) h += '<p class="aviso">' + esc(t.aviso) + "</p>";

    // 1. Información de la vivienda (ficha del HUT)
    const filas = info.filas.map(([k, v]) => [k, texto(v)]).filter(([, v]) => v !== null)
      .map(([k, v]) => "<div><dt>" + esc(k) + "</dt><dd>" + v + "</dd></div>").join("");
    h += "<details><summary>" + esc(t.info) + '</summary><div class="cuerpo"><dl>' + filas + '</dl><p class="rec">' + esc(info.reclamaciones) + "</p></div></details>";

    // 2. Carpeta de la casa: normas, espacios, aparatos, salida y servicios
    carp.secciones.forEach(([titulo, items]) => {
      const cuerpo = lista(items);
      if (cuerpo) h += "<details><summary>" + esc(titulo) + '</summary><div class="cuerpo">' + cuerpo + "</div></details>";
    });

    // 3. Inventario
    const c = COL[l];
    const filasInv = G.inventario.map(s =>
      '<tr class="sala"><td colspan="2">' + esc(s.sala[c] || s.sala[0]) + "</td></tr>" +
      s.cosas.map(x => "<tr><td>" + esc(x[c]) + '</td><td class="q">' + esc(x[4] || "") + "</td></tr>").join("")
    ).join("");
    h += "<details><summary>" + esc(t.inv) + '</summary><div class="cuerpo"><table>' + filasInv + "</table></div></details>";

    // Mantiene abiertos los apartados que el huésped tenía abiertos al cambiar de idioma.
    const abiertos = [...sec.querySelectorAll("details")].map(d => d.open);
    sec.innerHTML = h;
    sec.querySelectorAll("details").forEach((d, i) => { if (abiertos[i]) d.open = true; });
  }

  // La página cambia el idioma con su propio selector: la guía sigue el atributo lang.
  new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  render();
})();
