/* Vista skjal (2.34.0): einn gluggi fyrir öll skjöl sem appið býr til – tilboð, pantanir, reikninga, tímaskýrslur og skýrslur.
   Val um svæði fyrirtækisins (SharePoint/OneDrive fyrirtækisins: mappa verkefnis eða Stofa › <tegund>), eigið svæði (Mín skjöl) eða að sækja á tækið.
   Síðasta val hverrar tegundar er munað á tækinu. Engin ný gögn í Firestore. */
(function () {
  const LK = "aera-vista:";
  const yr = () => String(new Date().getFullYear());
  const last = k => { try { return localStorage.getItem(LK + k) || ""; } catch (e) { return ""; } };
  const remember = (k, v) => { try { localStorage.setItem(LK + k, v); } catch (e) {} };
  const msOk = () => !!(window.MS && MS.on());
  const toBlob = (data, type) => data instanceof Blob ? data : new Blob([data], { type });
  // Sjálfgefin mappa fyrirtækisins: mappa verkefnis › 07 Útgefin gögn (ef til), annars Stofa › <tegund> › <ár>
  async function coDir(o) {
    if (o.coDir) return o.coDir;
    const p = o.pid && findProj(o.pid);
    if (p && window.msProjSub && !(window.noFolder && noFolder(p))) { const S0 = window.ORG?.undirmoppur || []; const out = S0.find(x => /^07\b/.test(x)) || S0.find(x => /útgef/i.test(x));
      return out ? msProjSub(p, out.slice(0, 2), out) : msProjSub(p, "07", "07 Útgefin gögn"); }
    return (ORG.od.stofa || ORG.od.mitt || "Atrium") + "/" + o.kind + "/" + yr();
  }
  const pretty = d => String(d || "").replace(/\//g, " › ");
  window.saveDoc = function (o) {
    // o: { data (Blob|Uint8Array), name, type, kind ("Tilboð", "Tímaskýrslur" …), pid?, coDir?, mineSub? }
    const type = o.type || "application/octet-stream", blob = toBlob(o.data, type), mineSub = o.mineSub || (o.kind + "/" + yr());
    const coHint = o.coDir ? pretty(o.coDir) : o.pid && findProj(o.pid) ? "Mappa verkefnisins " + findProj(o.pid).nr + " › Útgefin gögn" : pretty((ORG.od.stofa || "Stofa") + "/" + o.kind + "/" + yr());
    const opts = msOk() ? [["co", "Svæði fyrirtækisins", coHint], ["mine", "Mitt svæði", "Mín skjöl › " + pretty(mineSub) + " · aðeins þú sérð"], ["dl", "Sækja á tækið", "Vistast í niðurhali tækisins"]] : [["dl", "Sækja á tækið", "Tengstu Microsoft til að vista á svæði fyrirtækisins eða þitt eigið"]];
    const pre = opts.some(x => x[0] === last(o.kind)) ? last(o.kind) : opts[0][0];
    sheet.innerHTML = `<h3 id="sheet-h">Vista ${esc(({ "Tilboð": "tilboð", "Pantanir": "pöntun", "Reikningar": "reikning", "Tímaskýrslur": "tímaskýrslu", "Skýrslur": "skýrslu" })[o.kind] || "skjal")}</h3><form id="vsf" novalidate>
      <label>Heiti skjals<input id="vs-name" value="${esc(o.name)}"></label>
      <div class="kind" style="margin:6px 0">Hvert?</div><div class="vsopts">${opts.map(([k, l, d]) => `<label class="vsopt"><input type="radio" name="vs-w" value="${k}"${k === pre ? " checked" : ""}><span><b>${esc(l)}</b><small>${esc(d)}</small></span></label>`).join("")}</div>
      <div id="f-msg"></div><div class="actions"><button type="button" class="btn" id="vs-cancel">Hætta við</button><button class="btn primary" id="vs-go">Vista</button></div></form>`;
    sheetwrap.hidden = false;
    document.getElementById("vs-cancel").onclick = closeSheet;
    document.getElementById("vsf").onsubmit = async e => { e.preventDefault();
      const w = document.querySelector('input[name="vs-w"]:checked')?.value || "dl", name = (document.getElementById("vs-name").value || o.name).trim(), btn = document.getElementById("vs-go");
      remember(o.kind, w); btn.disabled = true; btn.textContent = "Vista…";
      try {
        if (w === "dl") { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); closeSheet(); toast("Skjal sótt á tækið"); return; }
        if (w === "mine") { const it = await odSaveMine(mineSub, name, blob, type); odSavedSheet(it, (ORG.od.mitt || "Atrium") + " › " + pretty(mineSub)); return; }
        const dir = await coDir(o), it = await msSaveFile(dir, name, blob, type, false); odSavedSheet(it, pretty(dir));
        if (o.after) o.after(it, dir);
      } catch (err) { btn.disabled = false; btn.textContent = "Vista"; const m = document.getElementById("f-msg"); if (m) m.innerHTML = `<div class="msg err">Vistun tókst ekki: ${esc(err?.message || "villa")}</div>`; }
    };
  };
})();
