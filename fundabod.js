/* Fundarboð (2.79.0)
   1) Fundir hafa upphaf og lok (date, dateEnd).
   2) Þátttakendur: samstarfsfólk og fólk utan fyrirtækisins (attendees: [{ nafn, netfang, innri }]).
      „Senda fundarboð“ býr fundinn til í Outlook-dagatali þess sem bókar (Microsoft Graph /me/events) – Outlook sendir
      boðin til allra, uppfærslur þegar fundi er breytt og afboðun þegar honum er eytt. Teams-hlekkur valfrjáls.
   3) Fundarboð sem notandinn fær: birtast í Atrium (Heim og Dagatal) og hann svarar – Samþykkja / Kannski / Hafna.
      Samþykktir fundir úr Outlook birtast í persónulegu dagatali hans í Atrium. Þeir eru aðeins sóttir á tækið og
      sjást aðeins honum sjálfum – ekkert af því er vistað í gagnagrunni Atrium.
   Krefst Microsoft-heimildarinnar Calendars.ReadWrite (ms.js). */
(() => {
  const E = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const CAL = "Calendars.ReadWrite", TZ = "Greenwich Standard Time"; // Ísland = UTC allt árið
  const msOn = () => { try { return !!(window.MS && MS.on() && !window.AERA_DEMO); } catch (e) { return false; } };
  const calOk = () => msOn() && MS.can(CAL);
  window.fbCalOk = calOk;
  const pad = n => String(n).padStart(2, "0");
  const myEmail = () => String(window.USER?.email || (window.MS && MS.user()?.email) || "").toLowerCase();
  const orgDomain = () => String(window.ORG?.ms?.domain || window.ORG?.len || "").toLowerCase().replace(/^@/, "");

  /* ---------- Þátttakendur ---------- */
  const norm = a => typeof a === "string" ? { nafn: /@/.test(a) ? "" : a, netfang: /@/.test(a) ? a : null } : (a || {});
  window.fbAtt = f => (f?.attendees || []).map(norm).filter(a => a.nafn || a.netfang);
  window.fbNames = f => window.fbAtt(f).map(a => a.nafn || a.netfang);
  const isInnri = em => { const d = orgDomain(); return !!em && !!d && String(em).toLowerCase().endsWith("@" + d); };
  function sugg() {
    const out = new Map(), put = (nafn, netfang, innri) => { const k = String(netfang || "").toLowerCase(); if (!k || !/@/.test(k) || out.has(k)) return; out.set(k, { nafn: nafn || netfang, netfang: k, innri }); };
    (window.nuUsers ? nuUsers() : []).filter(u => u.virkur !== false).forEach(u => put(u.nafn, u.email, true));
    (S?.vidskiptavinir || []).forEach(c => { if (c.netfangT) put((c.tengilidur || c.name) + " · " + c.name, c.netfangT, false); if (c.netfang) put(c.name, c.netfang, false); });
    return [...out.values()];
  }
  const chip = (a, i, pre) => `<span class="fbchip${a.innri ? " in" : ""}" title="${E(a.netfang || "")}"><b>${E(a.nafn || a.netfang)}</b>${a.netfang && a.nafn && a.nafn !== a.netfang ? `<small>${E(a.netfang)}</small>` : ""}${a.innri ? "" : `<i>utan fyrirtækis</i>`}<button type="button" data-fbrm="${pre}:${i}" aria-label="Fjarlægja ${E(a.nafn || a.netfang)}">×</button></span>`;
  // HTML fyrir þátttakendur + „senda boð“ (í formi nýs fundar og breytingu)
  window.fbField = function (pre, f) {
    const att = window.fbAtt(f), staff = (window.nuUsers ? nuUsers() : []).filter(u => u.virkur !== false && u.email && u.email.toLowerCase() !== myEmail());
    const sent = !!f?.msEventId, ok = calOk(), on = msOn();
    return `<div class="fbatt" id="${pre}-att" data-v="${E(JSON.stringify(att))}">
      <div class="fblab">Þátttakendur</div>
      <div class="fbchips" id="${pre}-chips">${att.map((a, i) => chip(a, i, pre)).join("")}</div>
      <input id="${pre}-attq" list="${pre}-attl" autocomplete="off" placeholder="Nafn eða netfang – Enter til að bæta við" aria-label="Bæta við þátttakanda">
      <datalist id="${pre}-attl">${sugg().map(s => `<option value="${E(s.netfang)}">${E(s.nafn)}${s.innri ? " (samstarfsfólk)" : ""}</option>`).join("")}</datalist>
      ${staff.length ? `<div class="fbquick"><span>Samstarfsfólk:</span>${staff.slice(0, 12).map(u => `<button type="button" class="fbq" data-fbadd="${pre}:${E(u.email)}">${E(u.nafn || u.email)}</button>`).join("")}</div>` : ""}
      <label class="chk fbsend"><input type="checkbox" id="${pre}-send"${on ? " checked" : " disabled"}><span>${sent ? "Senda uppfært fundarboð" : "Senda fundarboð"} í gegnum Outlook</span></label>
      ${!sent ? `<label class="chk fbsend"><input type="checkbox" id="${pre}-teams"${on ? "" : " disabled"}><span>Teams-fundur (hlekkur fylgir boðinu)</span></label>` : ""}
      <p class="hint fbhint">${!on ? "Tengdu Microsoft 365 (Stillingar) til að senda fundarboð. Þátttakendur vistast samt á fundinum." : !ok ? "Atrium þarf leyfi til að nota Outlook-dagatalið þitt – þú verður beðin(n) um það þegar boðið er sent." : "Boðið fer úr Outlook-dagatalinu þínu til allra þátttakenda – líka þeirra sem eru utan fyrirtækisins."}</p>
    </div>`;
  };
  const getV = pre => { try { return JSON.parse(document.getElementById(pre + "-att")?.dataset.v || "[]"); } catch (e) { return []; } };
  const setV = (pre, v) => { const w = document.getElementById(pre + "-att"); if (!w) return; w.dataset.v = JSON.stringify(v); document.getElementById(pre + "-chips").innerHTML = v.map((a, i) => chip(a, i, pre)).join(""); };
  function addAtt(pre, raw) {
    raw = String(raw || "").trim(); if (!raw) return false;
    const parts = raw.split(/[;,\n]+/).map(x => x.trim()).filter(Boolean); let added = false;
    const v = getV(pre);
    parts.forEach(p => {
      const m = p.match(/^(.*?)<\s*([^>]+@[^>]+)\s*>$/), em = (m ? m[2] : p).trim().toLowerCase(), nm = m ? m[1].trim().replace(/^"|"$/g, "") : "";
      const s = sugg().find(x => x.netfang === em || x.nafn.toLowerCase() === p.toLowerCase());
      if (s) { if (!v.some(a => (a.netfang || "").toLowerCase() === s.netfang)) { v.push({ nafn: s.nafn.split(" · ")[0], netfang: s.netfang, innri: s.innri || isInnri(s.netfang) }); added = true; } return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return;
      if (!v.some(a => (a.netfang || "").toLowerCase() === em)) { v.push({ nafn: nm || em, netfang: em, innri: isInnri(em) }); added = true; }
    });
    if (added) setV(pre, v);
    return added || parts.length === 0;
  }
  window.fbWire = function (pre) {
    const q = document.getElementById(pre + "-attq"); if (!q) return;
    const go = () => { if (addAtt(pre, q.value)) q.value = ""; else if (q.value.trim()) { q.classList.add("bad"); setTimeout(() => q.classList.remove("bad"), 900); } };
    q.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === "," || e.key === ";") { e.preventDefault(); go(); } });
    q.addEventListener("change", () => { if (/@/.test(q.value) && sugg().some(s => s.netfang === q.value.trim().toLowerCase())) go(); });
    q.addEventListener("blur", () => { if (/@/.test(q.value)) go(); });
  };
  window.fbRead = pre => { const q = document.getElementById(pre + "-attq"); if (q && q.value.trim()) addAtt(pre, q.value); return getV(pre); };
  window.fbWantSend = pre => !!document.getElementById(pre + "-send")?.checked;
  window.fbWantTeams = pre => !!document.getElementById(pre + "-teams")?.checked;
  document.addEventListener("click", e => {
    const rm = e.target.closest("[data-fbrm]"); if (rm) { e.preventDefault(); const [pre, i] = rm.dataset.fbrm.split(":"); const v = getV(pre); v.splice(+i, 1); setV(pre, v); return; }
    const ad = e.target.closest("[data-fbadd]"); if (ad) { e.preventDefault(); const i = ad.dataset.fbadd.indexOf(":"); addAtt(ad.dataset.fbadd.slice(0, i), ad.dataset.fbadd.slice(i + 1)); }
  });

  /* ---------- Senda / uppfæra / afboða í Outlook ---------- */
  const dt = s => { const x = String(s || ""); return x.length >= 16 ? x.slice(0, 16) + ":00" : x.slice(0, 10) + "T09:00:00"; };
  const plusH = s => { const x = new Date(dt(s) + "Z"); x.setUTCHours(x.getUTCHours() + 1); return x.toISOString().slice(0, 19); };
  async function ensureCal() {
    if (!msOn()) throw new Error("Ekki tengt Microsoft 365");
    if (!MS.can(CAL)) { toast("Samþykktu aðgang að Outlook-dagatalinu…"); await MS.login(); if (!MS.can(CAL)) throw new Error("Aðgangur að dagatali fékkst ekki"); }
  }
  function evBody(f, teams) {
    const p = f.projectId ? findProj(f.projectId) : null, att = window.fbAtt(f).filter(a => a.netfang && a.netfang.toLowerCase() !== myEmail());
    const lines = [f.lysing ? E(f.lysing).replace(/\n/g, "<br>") : "", p ? "Verkefni: " + E(p.nafn || p.nr) : "", f.fundarhlekkur && !teams ? `Fjarfundur: <a href="${E(f.fundarhlekkur)}">${E(f.fundarhlekkur)}</a>` : ""].filter(Boolean);
    const o = { subject: f.name || "Fundur", start: { dateTime: dt(f.date), timeZone: TZ }, end: { dateTime: f.dateEnd ? dt(f.dateEnd) : plusH(f.date), timeZone: TZ },
      location: { displayName: f.stadsetning || (f.fundarhlekkur && !teams ? "Fjarfundur" : "") }, body: { contentType: "HTML", content: lines.join("<br><br>") || " " },
      attendees: att.map(a => ({ emailAddress: { address: a.netfang, name: a.nafn || a.netfang }, type: "required" })), allowNewTimeProposals: true };
    if (teams) { o.isOnlineMeeting = true; o.onlineMeetingProvider = "teamsForBusiness"; }
    return o;
  }
  // Senda (nýtt) eða uppfæra fundarboð fyrir fund. ser = fjöldi og bil endurtekningar ({n, rp}) við fyrstu sendingu.
  window.fbSend = async function (fid, opt = {}) {
    const f = findFund(String(fid)); if (!f) return;
    try {
      await ensureCal();
      if (f.msEventId) {
        if (f.msOrg === false) return toast("Þú ert ekki skipuleggjandi fundarins – boðið er ekki sent héðan.");
        const b = evBody(f, false); delete b.allowNewTimeProposals;
        await MS.g("/me/events/" + encodeURIComponent(f.msEventId), { method: "PATCH", body: b });
        await saveSnapshot(s => { const q = (s.fundir || []).find(x => x.id === f.id); if (q) q.bodSent = new Date().toISOString(); });
        toast("Uppfært fundarboð sent á " + b.attendees.length + (b.attendees.length === 1 ? " þátttakanda" : " þátttakendur")); return;
      }
      const b = evBody(f, !!opt.teams);
      if (opt.ser && opt.ser.n > 1) { const st = String(f.date).slice(0, 10), rp = opt.ser.rp;
        b.recurrence = { pattern: rp === "m" ? { type: "absoluteMonthly", interval: 1, dayOfMonth: +st.slice(8, 10) } : { type: "weekly", interval: (+rp) / 7, daysOfWeek: [["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date(st + "T12:00:00Z").getUTCDay()]] },
          range: { type: "numbered", startDate: st, numberOfOccurrences: opt.ser.n } }; }
      const ev = await MS.g("/me/events", { method: "POST", body: b, headers: { Prefer: `outlook.timezone="${TZ}"` } });
      const join = ev?.onlineMeeting?.joinUrl || null;
      await saveSnapshot(s => { (s.fundir || []).filter(x => x.id === f.id || (f.seria && x.seria === f.seria)).forEach(q => { q.msEventId = ev.id; q.msICal = ev.iCalUId || null; q.msOrg = true; q.bodSent = new Date().toISOString(); q.skipuleggjandi = myEmail(); if (join && !q.fundarhlekkur) q.fundarhlekkur = join; }); });
      toast("Fundarboð sent á " + b.attendees.length + (b.attendees.length === 1 ? " þátttakanda" : " þátttakendur") + (join ? " · Teams-hlekkur kominn" : ""));
      refresh(true);
    } catch (e) { toast("Fundarboð fór ekki: " + (e?.message || e)); }
  };
  // Afboða í Outlook þegar fundi er eytt í Atrium (aðeins skipuleggjandi; síðasti fundur raðar afboðar alla röðina)
  window.fbCancel = async function (f) {
    if (!f?.msEventId || f.msOrg === false || !calOk()) return;
    if ((S?.fundir || []).some(x => x.msEventId === f.msEventId)) return;
    try { await MS.g("/me/events/" + encodeURIComponent(f.msEventId) + "/cancel", { method: "POST", body: { comment: "Fundinum hefur verið aflýst." } }); toast("Afboðun send þátttakendum"); }
    catch (e) { if (e.status !== 404) toast("Afboðun fór ekki: " + (e?.message || e)); }
  };

  /* ---------- Svör þátttakenda (fyrir skipuleggjanda) ---------- */
  const ST = {}; // msEventId → { t, list: [{nafn, netfang, svar}] }
  const SV = { accepted: "Samþykkt", tentativelyAccepted: "Kannski", declined: "Hafnað", notResponded: "Hefur ekki svarað", none: "Hefur ekki svarað", organizer: "Skipuleggjandi" };
  window.fbStatus = function (f) {
    if (!f?.msEventId || !calOk()) return null;
    const c = ST[f.msEventId]; if (c && Date.now() - c.t < 120000) return c.list;
    if (!c || !c.busy) { ST[f.msEventId] = { ...(c || {}), busy: true, t: c?.t || 0, list: c?.list || null };
      MS.g("/me/events/" + encodeURIComponent(f.msEventId) + "?$select=attendees,isOrganizer").then(ev => {
        ST[f.msEventId] = { t: Date.now(), list: (ev.attendees || []).map(a => ({ nafn: a.emailAddress?.name, netfang: String(a.emailAddress?.address || "").toLowerCase(), svar: a.status?.response || "none" })) };
        render();
      }).catch(() => { ST[f.msEventId] = { t: Date.now(), list: [] }; }); }
    return c?.list || null;
  };
  window.fbAttHTML = function (f) {
    const att = window.fbAtt(f); if (!att.length) return "";
    const st = window.fbStatus(f) || [], byE = new Map(st.map(x => [x.netfang, x.svar]));
    const pill = s => s ? `<span class="fbsv ${E(s)}">${E(SV[s] || s)}</span>` : "";
    return `<div class="ush2"><span>Þátttakendur · ${att.length}</span>${f.bodSent ? `<span class="m">boð sent ${E(String(f.bodSent).slice(8, 10) + "." + String(f.bodSent).slice(5, 7) + ".")}</span>` : ""}</div>
      <div class="fbalist">${att.map(a => `<div class="fbarow"><span><b>${E(a.nafn || a.netfang)}</b>${a.netfang && a.nafn !== a.netfang ? `<small>${E(a.netfang)}</small>` : ""}</span><span>${a.innri ? "" : `<i class="fbext">utan fyrirtækis</i>`}${pill(byE.get(String(a.netfang || "").toLowerCase()))}</span></div>`).join("")}</div>
      ${MCP && !f.msEventId ? `<div class="ubot"><button type="button" class="btn primary" data-act="fbsend:${E(f.id)}">Senda fundarboð</button></div>` : ""}`;
  };

  /* ---------- Fundarboð sem ég fæ + persónulega dagatalið ---------- */
  const FB = window.FB = { pending: [], mine: [], t: 0, err: null };
  window.FBV = 0;
  const ICAL = () => new Set((S?.fundir || []).map(f => f.msICal).filter(Boolean));
  let loading = null;
  async function refresh(force) {
    if (!calOk()) return;
    if (loading || (!force && Date.now() - FB.t < 4 * 60 * 1000)) return loading;
    const a = new Date(); a.setDate(a.getDate() - 7); const b = new Date(); b.setDate(b.getDate() + 120);
    loading = (async () => {
      try {
        let url = `/me/calendarView?startDateTime=${a.toISOString()}&endDateTime=${b.toISOString()}&$top=250&$orderby=start/dateTime&$select=id,subject,start,end,location,organizer,responseStatus,isOrganizer,webLink,isCancelled,onlineMeeting,iCalUId,isAllDay,showAs,type,seriesMasterId`;
        const all = [];
        for (let i = 0; url && i < 6; i++) { const j = await MS.g(url, { headers: { Prefer: `outlook.timezone="${TZ}"` } }); all.push(...(j.value || [])); url = j["@odata.nextLink"] || null; }
        const resp = e => e.responseStatus?.response || "none";
        FB.pending = all.filter(e => !e.isOrganizer && !e.isCancelled && ["notResponded", "none"].includes(resp(e)) && e.organizer?.emailAddress?.address);
        FB.mine = all.filter(e => !e.isCancelled && (e.isOrganizer || ["accepted", "tentativelyAccepted"].includes(resp(e))));
        FB.t = Date.now(); FB.err = null;
      } catch (e) { FB.err = e?.message || String(e); FB.t = Date.now(); }
      finally { loading = null; window.FBV++; try { if (typeof _cal === "object") _cal.k = null; } catch (e) {} try { render(); } catch (e) {} }
    })();
    return loading;
  }
  window.fbRefresh = refresh;
  window.addEventListener("ms-change", () => setTimeout(() => { refresh(true); teamRefresh(true); }, 300));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { refresh(); teamRefresh(); } });
  setInterval(() => { refresh(); teamRefresh(); }, 5 * 60 * 1000);
  setTimeout(() => { refresh(true); teamRefresh(true); }, 2500);

  // Viðbót við calItems (app-listar.js): fundarboð sem bíða svars og samþykktir fundir úr Outlook
  window.fbCalItems = function (add, who) {
    const known = ICAL(), w = e => String(e.start?.dateTime || "").slice(0, 16);
    teamItems(add, known, w, who || "");
    if (who && who !== "*") return; // dagatal annars: aðeins hans Outlook-fundir
    if (!calOk()) return;
    FB.pending.forEach(e => add(w(e), { t: "fbod", when: w(e), kind: "Fundarboð · bíður svars", title: e.subject || "Fundur", nr: e.organizer?.emailAddress?.name || "", open: "msev:" + e.id, o: { stadsetning: e.location?.displayName || "" } }));
    FB.mine.filter(e => !known.has(e.iCalUId)).forEach(e => add(e.isAllDay ? String(e.start?.dateTime || "").slice(0, 10) : w(e), { t: "msev", when: e.isAllDay ? String(e.start?.dateTime || "").slice(0, 10) : w(e), kind: e.responseStatus?.response === "tentativelyAccepted" ? "Outlook · kannski" : "Outlook", title: e.subject || "Fundur", nr: "", open: "msev:" + e.id, o: { stadsetning: e.location?.displayName || "" } }));
  };
  const findEv = id => FB.pending.find(e => e.id === id) || FB.mine.find(e => e.id === id) || (FB.team || []).find(e => e.id === id);
  const fmtW = e => { const s = String(e.start?.dateTime || ""), en = String(e.end?.dateTime || ""), x = new Date(s.slice(0, 10) + "T12:00:00");
    return `${DAYL[x.getDay()]} ${x.getDate()}. ${MONL[x.getMonth()]}${e.isAllDay ? "" : ` kl. ${s.slice(11, 16)}–${en.slice(11, 16)}`}`; };
  window.fbEvHTML = function (id) {
    const e = findEv(id); if (!e) return `<div class="uvb"><p class="usub">Fundurinn fannst ekki í Outlook-dagatalinu – hann gæti hafa verið færður eða afboðaður.</p></div>`;
    if ((FB.team || []).includes(e)) return teamEvHTML(e);
    const r = e.responseStatus?.response || "none", pend = FB.pending.includes(e);
    const btns = `<div class="fbresp"><button type="button" class="btn primary" data-act="fbr:${E(e.id)}:accept">Samþykkja</button><button type="button" class="btn" data-act="fbr:${E(e.id)}:tentativelyAccept">Kannski</button><button type="button" class="btn" data-act="fbr:${E(e.id)}:decline">Hafna</button></div>`;
    return `<div class="fbev"><div class="kind">${pend ? "Fundarboð · bíður svars" : "Úr Outlook-dagatalinu þínu"}</div><h2 class="big" style="margin:4px 0 2px">${E(e.subject || "Fundur")}</h2>
      <p class="sub">${E(fmtW(e))}${e.location?.displayName ? " · " + E(e.location.displayName) : ""}</p>
      <p class="sub">Frá ${E(e.organizer?.emailAddress?.name || e.organizer?.emailAddress?.address || "")}${!pend ? ` · ${E(SV[r] || r)}` : ""}</p>
      ${pend ? btns : ""}
      <div class="links" style="margin-top:12px">${e.onlineMeeting?.joinUrl ? `<a class="btn" href="${E(e.onlineMeeting.joinUrl)}" target="_blank" rel="noopener">Tengjast fundi</a>` : ""}${e.webLink ? `<a class="btn" href="${E(e.webLink)}" target="_blank" rel="noopener">Opna í Outlook</a>` : ""}${!pend ? `<button type="button" class="btn" data-act="fbr:${E(e.id)}:decline">Afboða mig</button>` : ""}</div>
      <p class="hint" style="margin-top:14px">Þessi fundur er í persónulega dagatalinu þínu og sést aðeins þér. Hann er ekki vistaður í Atrium.</p></div>`;
  };
  Object.assign(window.DETAIL_EXT = window.DETAIL_EXT || {}, { msev: id => (typeof backBar === "function" ? backBar() : "") + window.fbEvHTML(id) });
  // Listi yfir öll boð sem bíða (gluggi)
  window.fbInbox = function () {
    const L = FB.pending;
    sheet.innerHTML = `<h3 id="sheet-h">Fundarboð · ${L.length}</h3>${L.length ? L.map(e => `<div class="fbinv"><div><b>${E(e.subject || "Fundur")}</b><small>${E(fmtW(e))}${e.location?.displayName ? " · " + E(e.location.displayName) : ""}</small><small>Frá ${E(e.organizer?.emailAddress?.name || e.organizer?.emailAddress?.address || "")}</small></div>
      <div class="fbresp"><button type="button" class="btn primary" data-act="fbr:${E(e.id)}:accept">Samþykkja</button><button type="button" class="btn" data-act="fbr:${E(e.id)}:tentativelyAccept">Kannski</button><button type="button" class="btn" data-act="fbr:${E(e.id)}:decline">Hafna</button></div></div>`).join("") : `<p class="hint">Engin fundarboð bíða svars.</p>`}
      <div class="actions"><button type="button" class="btn" onclick="closeSheet()">Loka</button></div>`;
    sheetwrap.hidden = false;
  };
  const RL = { accept: "Samþykkt – fundurinn er kominn í dagatalið þitt", tentativelyAccept: "Svarað: kannski", decline: "Fundarboði hafnað" };
  async function respond(id, how) {
    try { await ensureCal(); await MS.g("/me/events/" + encodeURIComponent(id) + "/" + how, { method: "POST", body: { sendResponse: true } });
      FB.pending = FB.pending.filter(e => e.id !== id); toast(RL[how] || "Svarað");
      if (!sheetwrap.hidden && document.getElementById("sheet-h")?.textContent.startsWith("Fundarboð")) { FB.pending.length ? window.fbInbox() : closeSheet(); }
      await refresh(true);
    } catch (e) { toast("Svar fór ekki: " + (e?.message || e)); }
  }
  Object.assign(window.ACT_EXT = window.ACT_EXT || {}, {
    fbr: (k, r) => { const how = r[r.length - 1], id = r.slice(0, -1).join(":"); respond(id, how); },
    fbsend: (k, r) => window.fbSend(r.join(":")),
    fbinbox: () => window.fbInbox(),
    fbconnect: () => ensureCal().then(() => refresh(true)).catch(e => toast(e.message)),
  });
  // Lína á Heim: „N fundarboð bíða svars“ / tengja dagatal
  window.fbHomeRow = function (row) {
    if (msOn() && !MS.can(CAL)) { row("fbconnect:", "Tengja Outlook-dagatalið – til að fá fundarboð og senda þau úr Atrium", "Microsoft 365"); return; }
    const n = FB.pending.length; if (n) row("fbinbox:", n === 1 ? `Fundarboð bíður svars: ${E(FB.pending[0].subject || "Fundur")}` : `${n} fundarboð bíða svars`, "Dagatal");
  };

  /* ---------- Teymisdagatal (2.80.0): Outlook-dagatöl samstarfsfólks ----------
     Krefst Delegated-heimildarinnar Calendars.Read.Shared og að dagatölum sé deilt innan fyrirtækisins
     (sjálfgefin heimild „Default“ á dagatalinu = Reviewer). Einkafundir (Private) sjást aldrei. Ekkert vistað. */
  const TSH = "Calendars.Read.Shared";
  FB.team = []; FB.teamErr = {}; FB.tt = 0;
  const teamOk = () => msOn() && MS.can(TSH) && !!window.CALWHO;
  const fyrsta = n => String(n || "").split(" ")[0];
  let tload = null;
  async function teamRefresh(force) {
    if (!teamOk()) return;
    if (tload || (!force && Date.now() - FB.tt < 4 * 60 * 1000)) return tload;
    const a = new Date(); a.setDate(a.getDate() - 14); const b = new Date(); b.setDate(b.getDate() + 90);
    const me = myEmail(), users = (window.nuUsers ? nuUsers() : []).filter(u => u.email && u.virkur !== false && String(u.email).toLowerCase() !== me);
    tload = (async () => {
      const by = new Map(), err = {};
      await Promise.all(users.map(async u => {
        const who = u.nafn || u.email, em = String(u.email).toLowerCase();
        try {
          let url = `/users/${encodeURIComponent(u.email)}/calendarView?startDateTime=${a.toISOString()}&endDateTime=${b.toISOString()}&$top=250&$select=id,subject,start,end,location,organizer,isAllDay,showAs,sensitivity,isCancelled,iCalUId,webLink,onlineMeeting`;
          for (let i = 0; url && i < 4; i++) {
            const j = await MS.g(url, { headers: { Prefer: `outlook.timezone="${TZ}"` } });
            (j.value || []).forEach(e => {
              if (e.isCancelled || e.sensitivity === "private" || e.sensitivity === "confidential") return;
              const k = e.iCalUId || e.id, x = by.get(k);
              if (x) { if (!x.hverjir.includes(who)) { x.hverjir.push(who); x.hverE.push(em); } } else by.set(k, { ...e, hverjir: [who], hverE: [em] });
            });
            url = j["@odata.nextLink"] || null;
          }
        } catch (e) { err[em] = e?.message || String(e); }
      }));
      FB.team = [...by.values()]; FB.teamErr = err; FB.tt = Date.now();
    })().finally(() => { tload = null; window.FBV++; try { if (typeof _cal === "object") _cal.k = null; } catch (e) {} try { render(); } catch (e) {} });
    return tload;
  }
  window.fbTeamRefresh = teamRefresh;
  function teamItems(add, known, w, who) {
    if (!who || !teamOk()) return;
    const mine = new Set([...FB.pending, ...FB.mine].map(e => e.iCalUId).filter(Boolean));
    FB.team.filter(e => !known.has(e.iCalUId) && (who === "*" ? !mine.has(e.iCalUId) : e.hverE.includes(who))).forEach(e => {
      const when = e.isAllDay ? String(e.start?.dateTime || "").slice(0, 10) : w(e);
      add(when, { t: "teymi", when, kind: e.hverjir.map(fyrsta).join(", "), title: e.subject || "Upptekin(n)", nr: "", open: "msev:" + e.id, o: { stadsetning: e.location?.displayName || "" } });
    });
  }
  function teamEvHTML(e) {
    return `<div class="fbev"><div class="kind">Dagatal · ${E(e.hverjir.join(", "))}</div><h2 class="big" style="margin:4px 0 2px">${E(e.subject || "Upptekin(n)")}</h2>
      <p class="sub">${E(fmtW(e))}${e.location?.displayName ? " · " + E(e.location.displayName) : ""}</p>
      ${e.organizer?.emailAddress ? `<p class="sub">Skipuleggjandi: ${E(e.organizer.emailAddress.name || e.organizer.emailAddress.address || "")}</p>` : ""}
      ${e.onlineMeeting?.joinUrl ? `<div class="links" style="margin-top:12px"><a class="btn" href="${E(e.onlineMeeting.joinUrl)}" target="_blank" rel="noopener">Tengjast fundi</a></div>` : ""}
      <p class="hint" style="margin-top:14px">Úr Outlook-dagatali samstarfsfólks. Ekki vistað í Atrium; fundir merktir einkamál sjást ekki.</p></div>`;
  }
  /* ---------- Hvers dagatal (2.81.0): mitt sjálfgefið, fletta yfir á annarra ---------- */
  const lc = x => String(x || "").trim().toLowerCase();
  const USERS = () => (window.nuUsers ? nuUsers() : []).filter(u => u.email && u.virkur !== false);
  const userBy = em => USERS().find(u => lc(u.email) === lc(em));
  window.fbMe = () => lc(window.VIEWAS?.email || myEmail());
  window.CALWHO = "";
  // Sést fundurinn í dagatali em? (stofnandi, skipuleggjandi eða boðaður). Eldri fundir án skráningar sjást öllum.
  window.fundFor = function (f, em) {
    if (em === "*" || !em) return true;
    em = lc(em); const att = window.fbAtt(f);
    if (!f.stofnandi && !att.length) return true;
    if (lc(f.stofnandi) === em || lc(f.skipuleggjandi) === em) return true;
    const nm = lc(userBy(em)?.nafn);
    return att.some(a => lc(a.netfang) === em || (nm && lc(a.nafn) === nm));
  };
  window.fbTeymiBtn = function () {
    const us = USERS(), me = window.fbMe(), w = window.CALWHO || "";
    if (us.length < 2) return "";
    const lok = w && w !== "*" && FB.teamErr && FB.teamErr[w], ekkiMS = w && !msOn();
    return `<label class="calwho"><select aria-label="Hvers dagatal" onchange="fbSetWho(this.value)"><option value="">Mitt dagatal</option>${us.filter(u => lc(u.email) !== me).map(u => `<option value="${E(lc(u.email))}"${w === lc(u.email) ? " selected" : ""}>${E(u.nafn || u.email)}</option>`).join("")}<option value="*"${w === "*" ? " selected" : ""}>Allir</option></select></label>`
      + (lok ? `<span class="calwhoh">Outlook-dagatal ${E(userBy(w)?.nafn || w)} er ekki deilt – aðeins fundir úr Atrium sjást.</span>` : ekkiMS ? `<span class="calwhoh">Aðeins fundir úr Atrium – tengdu Microsoft 365 til að sjá Outlook-dagatalið líka.</span>` : "");
  };
  window.fbSetWho = async function (v) {
    window.CALWHO = v || ""; window.FBV++; render();
    if (!v || !msOn()) return;
    try {
      if (!MS.can(TSH)) { toast("Samþykktu aðgang að dagatölum samstarfsfólks…"); await MS.login(); if (!MS.can(TSH)) throw new Error("Aðgangur að dagatölum samstarfsfólks fékkst ekki"); }
      await teamRefresh(true);
    } catch (e) { toast(e?.message || String(e)); }
  };
  /* ---------- Árekstrar: er einhver boðaður þegar bókaður? ---------- */
  window.fbConflicts = async function ({ slots, att, self }) {
    const me = window.fbMe(), people = [...new Set([me, ...(att || []).map(a => lc(a.netfang))].filter(em => em && userBy(em)))];
    if (!people.length || !slots?.length) return [];
    const nm = em => userBy(em)?.nafn || em, hm = x => String(x).slice(11, 16), dd = x => +String(x).slice(8, 10) + "." + +String(x).slice(5, 7) + ".";
    const ov = (a1, b1, a2, b2) => a1 < b2 && a2 < b1, k16 = x => String(x || "").slice(0, 16);
    const endOf = f => f.dateEnd ? k16(f.dateEnd) : k16(plusH(f.date));
    const out = [];
    (S?.fundir || []).filter(f => f.date && String(f.date).length > 10 && (!self || f.id !== self.id) && (f.stofnandi || window.fbAtt(f).length)).forEach(f => {
      const fs = k16(f.date), fe = endOf(f);
      if (!slots.some(sl => ov(k16(sl.s), k16(sl.e), fs, fe))) return;
      people.forEach(em => { if (window.fundFor(f, em)) out.push(`${nm(em)} – á öðrum fundi ${dd(fs)} kl. ${hm(fs)}–${hm(fe)} (${f.name || "fundur"})`); });
    });
    if (calOk()) try {
      const ss = slots.map(x => k16(x.s)).sort(), ee = slots.map(x => k16(x.e)).sort();
      const j = await MS.g("/me/calendar/getSchedule", { method: "POST", headers: { Prefer: `outlook.timezone="${TZ}"` },
        body: { schedules: people, startTime: { dateTime: ss[0] + ":00", timeZone: TZ }, endTime: { dateTime: ee[ee.length - 1] + ":00", timeZone: TZ }, availabilityViewInterval: 15 } });
      const sjalf = self ? [k16(self.date), endOf(self)] : null;
      (j.value || []).forEach(sc => (sc.scheduleItems || []).forEach(it => {
        if (!["busy", "oof", "tentative"].includes(it.status)) return;
        const is = k16(it.start?.dateTime), ie = k16(it.end?.dateTime);
        if (sjalf && is === sjalf[0] && ie === sjalf[1]) return; // fundurinn sjálfur (í breytingu)
        if (slots.some(sl => ov(k16(sl.s), k16(sl.e), is, ie))) out.push(`${nm(lc(sc.scheduleId))} – á öðrum fundi ${dd(is)} kl. ${hm(is)}–${hm(ie)} (${it.subject || (it.status === "oof" ? "fjarverandi" : "Outlook")})`);
      }));
    } catch (e) {}
    return [...new Set(out)];
  };
  window.fbConflictMsg = c => "Árekstur: " + c.slice(0, 4).join(" · ") + (c.length > 4 ? ` (+${c.length - 4} fleiri)` : "") + ". Smelltu aftur á Vista til að bóka samt.";
})();
