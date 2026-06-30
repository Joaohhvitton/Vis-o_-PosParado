/* ===========================================================
   Painel POS Parado — Redeflex OPCOM
   app.js
   =========================================================== */
(function () {
  "use strict";

  const D = SITE_DATA;
  const fmtInt = (n) => new Intl.NumberFormat("pt-BR").format(n);
  const fmtPct = (n) => (n * 100).toFixed(1).replace(".", ",") + "%";
  const fmtDate = (s) => (s ? s.split("-").reverse().join("/") : "—");

  const COLORS = {
    wine: "#9C2B41",
    wineBright: "#C23A56",
    wineDeep: "#5C1322",
    gold: "#D7A93C",
    brick: "#BD5048",
    grid: "rgba(255,255,255,0.06)",
    text: "#B7A6A2",
  };

  /* -----------------------------------------------------------
     Navigation
  ----------------------------------------------------------- */
  const TITLES = {
    dashboard: ["Visão Geral", "Reativação de terminais parados via mensageria · resultado de retorno de venda"],
    mensageria: ["Mensageria", "Funil de entrega da campanha de WhatsApp"],
    retorno: ["Retorno de Vendas", "Cruzamento entre o disparo e a retomada de transações"],
    base: ["Base Consolidada", "Uma linha por cliente, com filtros e exportação"],
    naolocalizados: ["Não Localizados", "Clientes da campanha sem correspondência na base geral"],
  };

  document.getElementById("nav").addEventListener("click", (e) => {
    const btn = e.target.closest(".nav__item");
    if (!btn) return;
    const view = btn.dataset.view;

    document.querySelectorAll(".nav__item").forEach((b) => b.classList.toggle("is-active", b === btn));
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("is-active"));
    document.getElementById("view-" + view).classList.add("is-active");

    const [title, sub] = TITLES[view];
    document.getElementById("viewTitle").textContent = title;
    document.getElementById("viewSubtitle").textContent = sub;
  });

  document.getElementById("updatedAt").textContent = fmtDate(D.generatedAt);

  /* -----------------------------------------------------------
     KPI receipts (dashboard)
  ----------------------------------------------------------- */
  function bars(n) {
    return Array.from({ length: n }).map(() => "<span></span>").join("");
  }

  function receiptHTML({ label, value, sub, tone }) {
    return `
      <div class="receipt">
        <span class="receipt__label">${label}</span>
        <div class="receipt__value ${tone ? "is-" + tone : ""}">${value}</div>
        <div class="receipt__sub">${sub}</div>
        <div class="receipt__bars">${bars(22)}</div>
      </div>`;
  }

  const k = D.kpis;
  document.getElementById("kpiReceipts").innerHTML = [
    receiptHTML({ label: "Clientes acionados", value: fmtInt(k.totalCampanha), sub: "campanha · 16–20 jun" }),
    receiptHTML({ label: "Entrega confirmada", value: fmtPct(k.pctEntrega), sub: fmtInt(k.entregues) + " mensagens" }),
    receiptHTML({ label: "Falha de envio", value: fmtPct(k.pctFalha), sub: fmtInt(k.falhas) + " mensagens", tone: "brick" }),
    receiptHTML({ label: "Voltaram a vender", value: fmtPct(k.pctRetorno), sub: fmtInt(k.voltou) + " de " + fmtInt(k.elegiveis) + " elegíveis", tone: "gold" }),
    receiptHTML({ label: "Dias médios p/ retorno", value: k.diasMedioRetorno.toFixed(1).replace(".", ","), sub: "entre disparo e nova venda", tone: "wine" }),
  ].join("");

  /* -----------------------------------------------------------
     Insight text
  ----------------------------------------------------------- */
  const stageRates = D.retornoPorEtapa.filter((r) => r.etapa !== "Falha");
  const best = stageRates.reduce((a, b) => (b.taxa > a.taxa ? b : a));
  const falhaRate = D.retornoPorEtapa.find((r) => r.etapa === "Falha").taxa;
  document.getElementById("insightText").innerHTML =
    `Dos <strong>${fmtInt(k.elegiveis)}</strong> clientes localizados na base geral, ` +
    `<strong>${fmtPct(k.pctRetorno)}</strong> voltaram a transacionar após o disparo, em média ` +
    `<strong>${k.diasMedioRetorno.toFixed(1).replace(".", ",")} dias</strong> depois. ` +
    `A etapa <em>${best.etapa}</em> teve a maior taxa de retorno (${fmtPct(best.taxa)}), mas clientes cuja mensagem ` +
    `<em>falhou no envio</em> ainda assim voltaram a vender em ${fmtPct(falhaRate)} dos casos — sinal de que a recompra ` +
    `não depende só da entrega da mensagem, e outros fatores (visita comercial, sazonalidade) também pesam.`;

  /* -----------------------------------------------------------
     Charts — wrapped defensively: if Chart.js fails to load
     (e.g. blocked by a network/proxy policy) the rest of the
     page (tables, filters, KPIs) must keep working regardless.
  ----------------------------------------------------------- */
  function chartFallback(id, msg) {
    const box = document.getElementById(id) && document.getElementById(id).closest(".chart-box");
    if (box) box.innerHTML = `<div class="chart-fallback">${msg}</div>`;
  }

  try {
    if (typeof Chart === "undefined") {
      throw new Error("Biblioteca de gráficos (Chart.js) não carregou.");
    }

    if (window.ChartDataLabels) Chart.register(window.ChartDataLabels);
    Chart.defaults.font.family = "'IBM Plex Mono', monospace";
    Chart.defaults.font.size = 11.5;
    Chart.defaults.color = COLORS.text;

    var bar = function (ctx, labels, data, color, opts) {
      opts = opts || {};
      return new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [{ data, backgroundColor: color, borderRadius: 4, maxBarThickness: 46 }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: 22 } },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "#1B1316",
              borderColor: "rgba(255,255,255,0.1)",
              borderWidth: 1,
              titleFont: { family: "'IBM Plex Sans', sans-serif", weight: "600" },
              bodyFont: { family: "'IBM Plex Mono', monospace" },
              padding: 10,
            },
            datalabels: {
              color: COLORS.text,
              anchor: "end",
              align: "top",
              font: { family: "'IBM Plex Mono', monospace", size: 11, weight: "600" },
            },
          },
          scales: {
            x: { grid: { display: false }, border: { color: COLORS.grid } },
            y: { grid: { color: COLORS.grid }, border: { display: false }, beginAtZero: true },
          },
          ...opts,
        },
      });
    };

    // Funnel
    bar(
      document.getElementById("chartFunnel"),
      D.funnel.map((f) => f.etapa),
      D.funnel.map((f) => f.qtde),
      D.funnel.map((f) => (f.etapa === "Falha" ? COLORS.brick : COLORS.wine)),
      {
        plugins: {
          datalabels: { formatter: (v) => fmtInt(v) },
          tooltip: { callbacks: { label: (c) => fmtInt(c.parsed.y) + " clientes" } },
        },
        scales: {
          x: { grid: { display: false }, border: { color: COLORS.grid } },
          y: { title: { display: true, text: "Quantidade de clientes", color: COLORS.text, font: { size: 11 } }, grid: { color: COLORS.grid }, border: { display: false }, beginAtZero: true },
        },
      }
    );

    // Donut
    var donutData = [
      { label: "Voltou a vender", value: k.voltou, color: COLORS.gold },
      { label: "Não voltou", value: k.naoVoltou, color: COLORS.wineDeep },
      { label: "Não localizado", value: k.naoLocalizados, color: "#46343A" },
    ];
    new Chart(document.getElementById("chartDonut"), {
      type: "doughnut",
      data: {
        labels: donutData.map((d) => d.label),
        datasets: [{ data: donutData.map((d) => d.value), backgroundColor: donutData.map((d) => d.color), borderWidth: 2, borderColor: "#1B1316" }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#1B1316",
            borderColor: "rgba(255,255,255,0.1)",
            borderWidth: 1,
            bodyFont: { family: "'IBM Plex Mono', monospace" },
            callbacks: { label: (c) => `${c.label}: ${fmtInt(c.parsed)} (${fmtPct(c.parsed / k.totalCampanha)})` },
          },
          datalabels: {
            color: "#fff",
            font: { family: "'IBM Plex Mono', monospace", size: 11, weight: "700" },
            formatter: (v) => (v / k.totalCampanha > 0.04 ? fmtPct(v / k.totalCampanha) : ""),
          },
        },
      },
    });
    document.getElementById("donutLegend").innerHTML = donutData
      .map((d) => `<li><span class="dot" style="background:${d.color}"></span>${d.label} · ${fmtInt(d.value)}</li>`)
      .join("");

    // Stage return rate
    bar(
      document.getElementById("chartStageRate"),
      D.retornoPorEtapa.map((r) => r.etapa),
      D.retornoPorEtapa.map((r) => +(r.taxa * 100).toFixed(1)),
      D.retornoPorEtapa.map((r) => (r.etapa === "Falha" ? COLORS.brick : COLORS.gold)),
      {
        plugins: {
          datalabels: { formatter: (v) => v.toFixed(1).replace(".", ",") + "%" },
          tooltip: { callbacks: { label: (c) => fmtPct(c.parsed.y / 100) + " voltaram a vender" } },
        },
        scales: {
          y: { title: { display: true, text: "% que voltou a vender", color: COLORS.text, font: { size: 11 } }, grid: { color: COLORS.grid }, border: { display: false }, beginAtZero: true, ticks: { callback: (v) => v + "%" } },
          x: { grid: { display: false }, border: { color: COLORS.grid } },
        },
      }
    );

    // Histogram dias para retorno
    bar(
      document.getElementById("chartHist"),
      D.retornoHist.map((h) => h.faixa),
      D.retornoHist.map((h) => h.qtde),
      COLORS.wineBright,
      {
        plugins: {
          datalabels: { formatter: (v) => fmtInt(v) },
          tooltip: { callbacks: { label: (c) => fmtInt(c.parsed.y) + " clientes" } },
        },
        scales: {
          x: { title: { display: true, text: "Dias entre o disparo e a nova venda", color: COLORS.text, font: { size: 11 } }, grid: { display: false }, border: { color: COLORS.grid } },
          y: { title: { display: true, text: "Quantidade de clientes", color: COLORS.text, font: { size: 11 } }, grid: { color: COLORS.grid }, border: { display: false }, beginAtZero: true },
        },
      }
    );
  } catch (err) {
    console.error("Gráficos não puderam ser montados:", err);
    ["chartFunnel", "chartStageRate", "chartHist"].forEach((id) =>
      chartFallback(id, "Gráfico indisponível neste navegador (biblioteca não carregou). Os números completos estão nas tabelas abaixo e na Base Consolidada.")
    );
    chartFallback("chartDonut", "Gráfico indisponível — veja os números na legenda ao lado e nos cartões acima.");
    document.getElementById("donutLegend").innerHTML = [
      { label: "Voltou a vender", value: k.voltou, color: COLORS.gold },
      { label: "Não voltou", value: k.naoVoltou, color: COLORS.wineDeep },
      { label: "Não localizado", value: k.naoLocalizados, color: "#46343A" },
    ]
      .map((d) => `<li><span class="dot" style="background:${d.color}"></span>${d.label} · ${fmtInt(d.value)}</li>`)
      .join("");
  }

  /* -----------------------------------------------------------
     Generic table renderer
  ----------------------------------------------------------- */
  function renderTable(el, headers, rows) {
    const thead = `<thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>`;
    const tbody = `<tbody>${rows.join("")}</tbody>`;
    el.innerHTML = thead + tbody;
  }

  /* ---- Mensageria ---- */
  renderTable(
    document.getElementById("tblFunnel"),
    ["Etapa", "Qtde", "% do total"],
    D.funnel.map(
      (f) => `<tr><td>${tagFunil(f.etapa)}</td><td class="num">${fmtInt(f.qtde)}</td><td class="num">${fmtPct(f.qtde / k.totalCampanha)}</td></tr>`
    )
  );

  document.getElementById("falhaSubtitle").textContent = fmtInt(k.falhas) + " mensagens não entregues";
  renderTable(
    document.getElementById("tblFalhas"),
    ["Descrição", "Qtde"],
    D.falhaReasons.map((f) => `<tr><td>${f.descricao}</td><td class="num">${fmtInt(f.qtde)}</td></tr>`)
  );

  renderTable(
    document.getElementById("tblSituacoes"),
    ["Situação", "Qtde"],
    D.situacoes.map((s) => `<tr><td>${s.descricao}</td><td class="num">${fmtInt(s.qtde)}</td></tr>`)
  );

  function tagFunil(etapa) {
    const tone = etapa === "Falha" ? "brick" : etapa === "Respondida" || etapa === "Lida" ? "gold" : "muted";
    return `<span class="tag tag--${tone}">${etapa}</span>`;
  }

  /* ---- Retorno de Vendas ---- */
  document.getElementById("retornoSummary").innerHTML = [
    receiptHTML({ label: "Elegíveis (localizados)", value: fmtInt(k.elegiveis), sub: "base geral cruzada" }),
    receiptHTML({ label: "Voltaram a vender", value: fmtInt(k.voltou), sub: fmtPct(k.pctRetorno), tone: "gold" }),
    receiptHTML({ label: "Não voltaram", value: fmtInt(k.naoVoltou), sub: fmtPct(1 - k.pctRetorno), tone: "brick" }),
  ].join("");

  function rankedRows(list) {
    const max = Math.max(...list.map((x) => x.total));
    return list.map(
      (x) => `<tr>
        <td>${x.nome || "—"}</td>
        <td class="num">${fmtInt(x.total)}</td>
        <td class="num">${fmtInt(x.voltou)}</td>
        <td>
          <div class="rankbar">
            <span class="num">${fmtPct(x.taxa)}</span>
            <div class="rankbar__track"><div class="rankbar__fill" style="width:${(x.total / max) * 100}%"></div></div>
          </div>
        </td>
      </tr>`
    );
  }

  renderTable(document.getElementById("tblSupervisor"), ["Supervisor", "Campanha", "Voltaram", "Taxa de retorno"], rankedRows(D.bySupervisor));
  renderTable(document.getElementById("tblCidade"), ["Cidade", "Campanha", "Voltaram", "Taxa de retorno"], rankedRows(D.byCidade));
  renderTable(document.getElementById("tblVendedor"), ["Vendedor", "Campanha", "Voltaram", "Taxa de retorno"], rankedRows(D.byVendedor));

  /* -----------------------------------------------------------
     Base Consolidada — filter / sort / paginate
  ----------------------------------------------------------- */
  const state = { search: "", status: "", voltou: "", cidade: "", sortKey: "dataDisparo", sortDir: "desc", page: 1, pageSize: 30 };

  const statusSel = document.getElementById("fStatus");
  [...new Set(D.rows.map((r) => r.statusFunil))].sort().forEach((s) => {
    statusSel.insertAdjacentHTML("beforeend", `<option value="${s}">${s}</option>`);
  });
  const cidadeSel = document.getElementById("fCidade");
  [...new Set(D.rows.map((r) => r.cidade).filter(Boolean))].sort().forEach((c) => {
    cidadeSel.insertAdjacentHTML("beforeend", `<option value="${c}">${c}</option>`);
  });

  function voltouTag(v) {
    if (v === true) return `<span class="tag tag--gold">Voltou</span>`;
    if (v === false) return `<span class="tag tag--brick">Não voltou</span>`;
    return `<span class="tag tag--muted">N/D</span>`;
  }

  function getFiltered() {
    const s = state.search.trim().toLowerCase();
    return D.rows.filter((r) => {
      if (state.status && r.statusFunil !== state.status) return false;
      if (state.cidade && r.cidade !== state.cidade) return false;
      if (state.voltou === "true" && r.voltou !== true) return false;
      if (state.voltou === "false" && r.voltou !== false) return false;
      if (state.voltou === "null" && r.voltou !== null) return false;
      if (s) {
        const hay = [r.sgv, r.fantasia, r.contato, r.cidade, r.vendedor].join(" ").toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }

  function sortRows(rows) {
    const { sortKey, sortDir } = state;
    const mul = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (av === null || av === undefined) av = "";
      if (bv === null || bv === undefined) bv = "";
      if (typeof av === "boolean") av = av ? 1 : 0;
      if (typeof bv === "boolean") bv = bv ? 1 : 0;
      if (av < bv) return -1 * mul;
      if (av > bv) return 1 * mul;
      return 0;
    });
  }

  function renderBase() {
    let rows = sortRows(getFiltered());
    document.getElementById("baseCount").textContent = fmtInt(rows.length);

    const totalPages = Math.max(1, Math.ceil(rows.length / state.pageSize));
    state.page = Math.min(state.page, totalPages);
    const start = (state.page - 1) * state.pageSize;
    const pageRows = rows.slice(start, start + state.pageSize);

    document.getElementById("baseTbody").innerHTML = pageRows
      .map(
        (r) => `<tr>
          <td class="num">${r.sgv}</td>
          <td>${r.fantasia || r.contato}</td>
          <td>${r.cidade || "—"}</td>
          <td>${r.vendedor || "—"}</td>
          <td class="num">${fmtDate(r.dataDisparo)}</td>
          <td>${tagFunil(r.statusFunil)}</td>
          <td class="num">${r.diasParado ?? "—"}</td>
          <td>${voltouTag(r.voltou)}</td>
          <td class="num">${r.diasRetorno ?? "—"}</td>
        </tr>`
      )
      .join("");

    document.querySelectorAll("#tblBase th[data-key]").forEach((th) => {
      th.classList.toggle("sorted", th.dataset.key === state.sortKey);
      th.classList.toggle("asc", th.dataset.key === state.sortKey && state.sortDir === "asc");
    });

    document.getElementById("pagination").innerHTML = `
      <span>Página ${state.page} de ${totalPages} · ${fmtInt(rows.length)} registros</span>
      <div class="pagination__btns">
        <button data-pg="first" ${state.page === 1 ? "disabled" : ""}>« Início</button>
        <button data-pg="prev" ${state.page === 1 ? "disabled" : ""}>‹ Anterior</button>
        <button data-pg="next" ${state.page === totalPages ? "disabled" : ""}>Próxima ›</button>
        <button data-pg="last" ${state.page === totalPages ? "disabled" : ""}>Fim »</button>
      </div>`;
  }

  document.getElementById("fSearch").addEventListener("input", (e) => { state.search = e.target.value; state.page = 1; renderBase(); });
  statusSel.addEventListener("change", (e) => { state.status = e.target.value; state.page = 1; renderBase(); });
  document.getElementById("fVoltou").addEventListener("change", (e) => { state.voltou = e.target.value; state.page = 1; renderBase(); });
  cidadeSel.addEventListener("change", (e) => { state.cidade = e.target.value; state.page = 1; renderBase(); });

  document.getElementById("tblBase").querySelector("thead").addEventListener("click", (e) => {
    const th = e.target.closest("th[data-key]");
    if (!th) return;
    const key = th.dataset.key;
    if (state.sortKey === key) state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
    else { state.sortKey = key; state.sortDir = "asc"; }
    renderBase();
  });

  document.getElementById("pagination").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-pg]");
    if (!btn) return;
    const totalPages = Math.max(1, Math.ceil(sortRows(getFiltered()).length / state.pageSize));
    if (btn.dataset.pg === "first") state.page = 1;
    if (btn.dataset.pg === "prev") state.page = Math.max(1, state.page - 1);
    if (btn.dataset.pg === "next") state.page = Math.min(totalPages, state.page + 1);
    if (btn.dataset.pg === "last") state.page = totalPages;
    renderBase();
  });

  document.getElementById("btnExportCsv").addEventListener("click", () => {
    const rows = sortRows(getFiltered());
    const headers = ["SGV", "Telefone", "Contato", "Cliente", "Cidade", "Vendedor", "Supervisor", "Data Disparo", "Etapa", "Dias Parado", "Voltou a Vender", "Dias para Retorno"];
    const csvRows = rows.map((r) =>
      [r.sgv, r.telefone, r.contato, r.fantasia, r.cidade, r.vendedor, r.supervisor, r.dataDisparo, r.statusFunil, r.diasParado, r.voltou === true ? "Sim" : r.voltou === false ? "Não" : "N/D", r.diasRetorno ?? ""]
        .map((v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`)
        .join(";")
    );
    const csv = [headers.join(";"), ...csvRows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "base_consolidada_pos_parado.csv";
    a.click();
    URL.revokeObjectURL(url);
  });

  renderBase();

  /* -----------------------------------------------------------
     Não Localizados
  ----------------------------------------------------------- */
  document.getElementById("nlCount").textContent = fmtInt(D.naoLocalizados.length);
  document.getElementById("nlTbody").innerHTML = D.naoLocalizados
    .map(
      (r) => `<tr>
        <td class="num">${r.sgv}</td>
        <td class="num">${r.telefone}</td>
        <td>${r.contato}</td>
        <td class="num">${fmtDate(r.dataDisparo)}</td>
        <td>${tagFunil(r.statusFunil)}</td>
      </tr>`
    )
    .join("");
})();
