/* Atrium – Claude-aðstoð (2.164.0). Virkt í Firebase-verkefni þar sem functions/.env.<verkefni> hefur CLAUDE=1
   og leyndarmálið ANTHROPIC_API_KEY er í Secret Manager:
     npx firebase-tools functions:secrets:set ANTHROPIC_API_KEY --project <aera|dev|…>

   Hönnun:
   - Appið (claude.js) sendir samtalið hingað. Fallið staðfestir notandann (Firebase-innskráning + app/notendur), athugar að
     einingin sé virk (app/state › stillingar.einingar.claude) og að mánaðarþak sé ekki náð, og kallar á Claude API.
   - Kerfisfyrirmæli, verkfæri og líkan eru ákveðin HÉR – ekki af appinu. Appið sendir aðeins skilaboð notandans og svör verkfæra.
   - Verkfærin keyra í appinu sjálfu á gögnum sem notandinn hefur þegar aðgang að (Firestore-reglurnar ráða) – fallið les
     engin verkgögn. Skráning (skra_tima) er aðeins tillaga sem notandinn staðfestir í appinu.
   - Notkun er skráð í claude/<ÁÁÁÁ-MM> (aðeins fallið les og skrifar – engin Firestore-regla leyfir aðgang úr appinu).
     Admin sér notkunina í Stillingar › Claude-aðstoð (GET ?notkun=1).
   - Mánaðarleg samantekt (claudeSamantekt, 1. hvers mánaðar kl. 9) fer sem tilkynning til admin. */
module.exports = ({ db, admin, logger, onRequest, onSchedule, defineSecret, send, lc, TZ }) => {
  const exports = {};
  const KEY = defineSecret("ANTHROPIC_API_KEY");
  const GENGI = +(process.env.CLAUDE_GENGI || 140);            // kr. á USD (gróft – til að bera saman við þak í krónum)
  const THAK = +(process.env.CLAUDE_THAK || 3000);              // sjálfgefið mánaðarþak uppsetningar í kr.
  const LIKON = {
    sonnet: { id: "claude-sonnet-5-5", inn: 2, ut: 10, cache: 0.1, cw: 2.5 },
    haiku: { id: "claude-haiku-5-5", inn: 0.1, ut: 0.5, cache: 0.01, cw: 0.125 }
  };
  const MAXMSG = 60, MAXBYTES = 400000;
  const manudur = (d = new Date()) => new Date(d.toLocaleString("en-US", { timeZone: TZ })).toISOString().slice(0, 7);

  const TOOLS = [
    { name: "leita_verkefni", description: "Leitar í verkefnum fyrirtækisins. Skilar lista (id, nr, heiti, staða, viðskiptavinur, skiladagur, skráðir tímar, áætlun). Notaðu áður en þú vísar í verkefni eftir nafni eða númeri.",
      input_schema: { type: "object", properties: { leit: { type: "string", description: "Hluti af heiti, númeri eða viðskiptavini. Tómt = öll." }, stada: { type: "string", description: "t.d. 'virk' (ekki lokið), 'lokið' eða nákvæm staða" } } } },
    { name: "verkefni", description: "Nánari upplýsingar um eitt verkefni: undirverk, næsta skref, athugasemdir, tímar eftir starfsmanni, óreikningsfærðir tímar og kostnaður.",
      input_schema: { type: "object", properties: { id: { type: "string", description: "id eða nr verkefnis" } }, required: ["id"] } },
    { name: "timar", description: "Tímaskráningar sem notandinn hefur aðgang að á tímabili. Skilar samtölum eftir verkefni og starfsmanni og allt að 60 færslum.",
      input_schema: { type: "object", properties: { fra: { type: "string", description: "ÁÁÁÁ-MM-DD" }, til: { type: "string", description: "ÁÁÁÁ-MM-DD" }, verkefni: { type: "string", description: "id eða nr (valfrjálst)" }, starfsmadur: { type: "string", description: "skammstöfun, t.d. DM (valfrjálst)" }, oreikningsfaert: { type: "boolean", description: "aðeins tímar sem eru ekki komnir á reikning" } } } },
    { name: "reikningar", description: "Reikningar (aðeins fyrir admin). Skilar nr, viðskiptavini, upphæð, VSK, stöðu, dagsetningu og greiðsludegi.",
      input_schema: { type: "object", properties: { stada: { type: "string", description: "t.d. Drög, Sent, Greitt, Ógilt (valfrjálst)" }, fra: { type: "string" }, til: { type: "string" } } } },
    { name: "tilbod", description: "Tilboð og staða þeirra (nr, heiti, viðskiptavinur, upphæð, staða, gildir til).",
      input_schema: { type: "object", properties: { stada: { type: "string" }, leit: { type: "string" } } } },
    { name: "dagskra", description: "Dagskrá á tímabili: fundir, skil verkefna, afhendingar og skil pantana.",
      input_schema: { type: "object", properties: { fra: { type: "string", description: "ÁÁÁÁ-MM-DD" }, til: { type: "string", description: "ÁÁÁÁ-MM-DD" } }, required: ["fra", "til"] } },
    { name: "vidskiptavinir", description: "Leitar að viðskiptavinum (nafn, kennitala, netfang, sími, verkefni).",
      input_schema: { type: "object", properties: { leit: { type: "string" } } } },
    { name: "skra_tima", description: "Leggur til tímaskráningu fyrir notandann. Ekkert er vistað fyrr en notandinn staðfestir tillöguna í appinu. Finndu verkefnið fyrst með leita_verkefni. Ef notandinn gefur ekki upp klukkan hvað, veldu eðlilegan tíma (t.d. frá kl. 09:00) – appið varar við ef það skarast.",
      input_schema: { type: "object", properties: { verkefni: { type: "string", description: "id verkefnis" }, undirverk: { type: "string", description: "id undirverks (valfrjálst)" }, dags: { type: "string", description: "ÁÁÁÁ-MM-DD" }, fra: { type: "string", description: "hh:mm" }, til: { type: "string", description: "hh:mm" }, lysing: { type: "string", description: "stutt lýsing á vinnunni" } }, required: ["verkefni", "dags", "fra", "til", "lysing"] } },
    { name: "opna", description: "Opnar verkefni, tilboð, reikning eða viðskiptavin í appinu fyrir notandann.",
      input_schema: { type: "object", properties: { tegund: { type: "string", enum: ["verkefni", "tilbod", "reikningur", "vidskiptavinur"] }, id: { type: "string" } }, required: ["tegund", "id"] } }
  ];
  TOOLS[TOOLS.length - 1].cache_control = { type: "ephemeral" };

  const SYSTEM = (u, org, ctx) => [
    { type: "text", cache_control: { type: "ephemeral" }, text:
`Þú ert Huginn – aðstoðarmaður innbyggður í Atrium (nafnið vísar í hrafn Óðins sem flýgur um heiminn og færir honum fréttir), verkefna-, tíma- og reikningakerfi${org ? " fyrirtækisins " + org : ""}.
- Svaraðu alltaf á íslensku, stutt og hnitmiðað. Notaðu lista eða töflur aðeins þegar það hjálpar. Upphæðir í krónum með punkti sem þúsundaskil (t.d. 1.250.000 kr.), klukkustundir með kommu (t.d. 3,5 klst.).
- Notaðu verkfærin til að sækja gögn – giskaðu aldrei á tölur, nöfn eða stöðu. Ef verkfæri skilar engu, segðu það.
- Gögnin eru aðeins það sem notandinn hefur sjálfur aðgang að í appinu.
- Skráningar: notaðu skra_tima. Það vistar ekkert – notandinn staðfestir tillöguna sjálfur. Segðu stuttlega hvað þú lagðir til.
- Ef beðið er um eitthvað sem verkfærin ráða ekki við (t.d. breyta reikningi, senda póst), segðu hvar það er gert í appinu.
- Vísaðu í verkefni með númeri og heiti (t.d. 2603 Skipholt).
- Ef spurt er hver þú ert: Huginn, aðstoð Atrium, byggður á Claude frá Anthropic.` },
    { type: "text", text: `Notandi: ${u.nafn || u.email} (${u.sk || "–"}), hlutverk: ${u.hlutverk || "starfsmadur"}.
Í dag: ${ctx.dags || new Date().toISOString().slice(0, 10)} (${ctx.vikudagur || ""}).${ctx.skjar ? "\nNotandinn er með opið: " + String(ctx.skjar).slice(0, 300) : ""}` }
  ];

  // Aðeins skilaboð í réttu sniði fara áfram: user/assistant til skiptis, textar, tool_use og tool_result
  function clean(msgs) {
    if (!Array.isArray(msgs) || !msgs.length || msgs.length > MAXMSG) throw new Error("Ógilt samtal");
    if (Buffer.byteLength(JSON.stringify(msgs)) > MAXBYTES) throw new Error("Samtalið er orðið of langt – byrjaðu nýtt samtal.");
    const out = msgs.map((m, i) => {
      const role = m.role === "assistant" ? "assistant" : "user";
      if ((i % 2 === 0) !== (role === "user")) throw new Error("Ógild röð skilaboða");
      const c = typeof m.content === "string" ? [{ type: "text", text: m.content }] : m.content;
      if (!Array.isArray(c) || !c.length) throw new Error("Tóm skilaboð");
      return { role, content: c.map(b => {
        if (b.type === "text") return { type: "text", text: String(b.text || "").slice(0, 20000) || " " };
        if (b.type === "tool_use" && role === "assistant") return { type: "tool_use", id: String(b.id), name: String(b.name), input: b.input && typeof b.input === "object" ? b.input : {} };
        if (b.type === "tool_result" && role === "user") return { type: "tool_result", tool_use_id: String(b.tool_use_id), content: String(typeof b.content === "string" ? b.content : JSON.stringify(b.content ?? "")).slice(0, 60000), ...(b.is_error ? { is_error: true } : {}) };
        // 2.164.2: hugsun Claude (thinking/redacted_thinking) fer óbreytt til baka – API-ið krefst þess í verkfæraumferðum
        if (b.type === "thinking" && role === "assistant") return { type: "thinking", thinking: String(b.thinking || ""), signature: String(b.signature || "") };
        if (b.type === "redacted_thinking" && role === "assistant") return { type: "redacted_thinking", data: String(b.data || "") };
        if (role === "assistant") { logger.warn("claude: sleppi tegund", b.type); return null; }   // aðrar tegundir í svari Claude: sleppt
        throw new Error("Ógild tegund skilaboða (" + String(b.type).slice(0, 30) + ")");
      }).filter(Boolean) };
    });
    /* 2.165.2: hugsun (thinking) er bundin við samtalið eins og það var þegar hún varð til. Aðeins hugsun í yfirstandandi umferð
       (eftir síðustu spurningu notandans) fer áfram; eldri hugsun er felld niður – annars hafnar API-ið henni („Invalid signature“),
       t.d. eftir að kerfisfyrirmæli breytast eða samtal heldur áfram eftir deploy. */
    let start = 0; out.forEach((m, i) => { if (m.role === "user" && m.content.some(b => b.type === "text")) start = i; });
    out.forEach((m, i) => { if (m.role === "assistant" && i < start) m.content = m.content.filter(b => b.type !== "thinking" && b.type !== "redacted_thinking"); });
    out.forEach(m => { if (!m.content.length) m.content = [{ type: "text", text: " " }]; });
    return out;
  }

  async function notandi(req) {
    const tok = String(req.get("Authorization") || "").replace(/^Bearer\s+/i, ""); if (!tok) throw Object.assign(new Error("Innskráningu vantar"), { code: 401 });
    const me = await admin.auth().verifyIdToken(tok), email = lc(me.email || "");
    const nu = (await db.doc("app/notendur").get()).data()?.notendur || {};
    const u = nu[email] || Object.values(nu).find(x => lc(x?.netfang) === email);
    if (!u || u.virkur === false) throw Object.assign(new Error("Notandi ekki virkur"), { code: 403 });
    return { email, nafn: u.nafn || "", sk: u.sk || "", hlutverk: u.hlutverk || "starfsmadur" };
  }

  async function stillingar() {
    const st = (await db.doc("app/state").get()).data() || {}, S = st.stillingar || {}, C = S.claude || {};
    const virk = (S.einingar || {}).claude === true && (S.pakkar || {}).claude !== false;
    return { virk, thak: +C.thak > 0 ? +C.thak : THAK, thakNotandi: +C.thakNotandi > 0 ? +C.thakNotandi : 0, likan: LIKON[C.likan] ? C.likan : "sonnet" };
  }

  const kostn = (L, us) => {
    const usd = ((us.input_tokens || 0) * L.inn + (us.output_tokens || 0) * L.ut + (us.cache_read_input_tokens || 0) * L.cache + (us.cache_creation_input_tokens || 0) * L.cw) / 1e6;
    return { usd, kr: usd * GENGI };
  };

  exports.claude = onRequest({ secrets: [KEY], cors: true, maxInstances: 5, timeoutSeconds: 120, memory: "256MiB" }, async (req, res) => {
    try {
      const u = await notandi(req), C = await stillingar(), m = manudur(), ref = db.doc("claude/" + m);
      if (req.method === "GET") {
        if (u.hlutverk !== "admin") return res.status(403).json({ villa: "Aðeins admin" });
        const months = await db.collection("claude").orderBy(admin.firestore.FieldPath.documentId(), "desc").limit(6).get();
        return res.json({ manudur: m, thak: C.thak, thakNotandi: C.thakNotandi, likan: C.likan, virk: C.virk, gengi: GENGI, notkun: months.docs.map(d => ({ manudur: d.id, ...d.data() })) });
      }
      if (req.method !== "POST") return res.status(405).send("POST");
      if (!C.virk) return res.status(403).json({ villa: "Huginn er ekki virkur í þessari uppsetningu (Stillingar › Einingar)." });
      const N = (await ref.get()).data() || {}, minn = N.notendur?.[u.email.replace(/\./g, "·")] || {};
      if ((N.kr || 0) >= C.thak) return res.status(429).json({ villa: "Notkunarþaki mánaðarins er náð. Admin getur hækkað það í Stillingar › Huginn." });
      if (C.thakNotandi && (minn.kr || 0) >= C.thakNotandi) return res.status(429).json({ villa: "Þú hefur náð notkunarþaki þínu þennan mánuðinn." });
      const body = typeof req.body === "object" && req.body ? req.body : JSON.parse(req.body || "{}");
      const messages = clean(body.messages), ctx = body.samhengi || {}, L = LIKON[C.likan];
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": KEY.value().trim(), "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: L.id, max_tokens: 2000, system: SYSTEM(u, String(ctx.org || "").slice(0, 80), ctx), tools: TOOLS, messages })
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j) { logger.error("claude api", r.status, j); return res.status(502).json({ villa: r.status === 429 || r.status === 529 ? "Huginn er upptekinn – reyndu aftur eftir smá stund." : "Villa frá Claude (" + r.status + ")" + (j?.error?.message ? ": " + String(j.error.message).slice(0, 200) : "") }); }
      const k = kostn(L, j.usage || {}), key = u.email.replace(/\./g, "·"), inc = admin.firestore.FieldValue.increment;
      await ref.set({ kr: inc(k.kr), usd: inc(k.usd), n: inc(1), uppfaert: new Date().toISOString(), notendur: { [key]: { kr: inc(k.kr), n: inc(1), nafn: u.nafn || u.email } } }, { merge: true });
      res.json({ content: j.content, stop_reason: j.stop_reason, notkun: { kr: Math.round((N.kr || 0) + k.kr), thak: C.thak } });
    } catch (e) {
      const code = e.code === 401 || e.code === 403 ? e.code : /Ógil|Tóm|of langt/.test(e.message) ? 400 : 500;
      if (code === 500) logger.error("claude", e);
      res.status(code).json({ villa: String(e.message || e).slice(0, 300) });
    }
  });

  // 1. hvers mánaðar kl. 9: samantekt síðasta mánaðar til admin (tilkynning, tegund "claude")
  exports.claudeSamantekt = onSchedule({ schedule: "3 9 1 * *", timeZone: TZ }, async () => {
    const d = new Date(); d.setDate(0); const m = manudur(d), s = await db.doc("claude/" + m).get();
    if (!s.exists) return; const N = s.data(), C = await stillingar();
    const nu = (await db.doc("app/notendur").get()).data()?.notendur || {};
    const admins = Object.entries(nu).filter(([, x]) => x && x.virkur !== false && x.hlutverk === "admin").map(([e]) => e);
    const MN = ["janúar", "febrúar", "mars", "apríl", "maí", "júní", "júlí", "ágúst", "september", "október", "nóvember", "desember"];
    const kr = n => Math.round(n || 0).toLocaleString("de-DE") + " kr.";
    await send(admins, "claude", { title: "Huginn í " + MN[+m.slice(5) - 1], body: `${kr(N.kr)} (${N.n || 0} köll, þak ${kr(C.thak)})`, link: "#t=stillingar", tag: "claude-" + m });
    logger.info("claudeSamantekt", { m, kr: N.kr, n: N.n });
  });

  return exports;
};
