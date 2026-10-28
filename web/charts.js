/* Wykresy canvas: drabina zapadalności i wartość oszczędności. Bez zależności. */
(function (root) {
  "use strict";

  const COLORS = {
    accent: "#1f4e79",
    green: "#1f9d55",
    grid: "#dce6f1",
    muted: "#68798b",
    capital: "#8a9bb0",
    depositBg: "rgba(234, 241, 248, 0.75)",
    maturityBg: "rgba(234, 246, 238, 0.8)",
    profitFill: "rgba(31, 157, 85, 0.16)",
    capitalFill: "rgba(111, 156, 196, 0.13)",
  };

  const state = { result: null, depositYears: 0, benchmarks: [], plan: "monthly" };

  function plNumber(value, decimals) {
    return new Intl.NumberFormat("pl-PL", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
      .format(value)
      .replace(/\u00A0/g, " ");
  }

  function axisMoney(value) {
    if (Math.abs(value) >= 1000) {
      const thousands = value / 1000;
      const rounded = Math.round(thousands);
      const decimals =
        Math.abs(thousands) < 10 && Math.abs(thousands - rounded) > 1e-9 ? 1 : 0;
      return plNumber(thousands, decimals) + " tys.";
    }
    return plNumber(Math.round(value), 0);
  }

  function niceStep(raw) {
    if (!(raw > 0)) return 1;
    const exponent = Math.floor(Math.log10(raw));
    const base = Math.pow(10, exponent);
    const fraction = raw / base;
    const candidates = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
    const nice = candidates.find((value) => fraction <= value) || 10;
    return nice * base;
  }

  function setupCanvas(canvas) {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (width < 60 || height < 60) return null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    return { ctx, width, height };
  }

  function computeFrame(width, height, seriesMax) {
    const pad = { left: 56, right: 12, top: 12, bottom: 28 };
    const plotWidth = Math.max(10, width - pad.left - pad.right);
    const plotHeight = Math.max(10, height - pad.top - pad.bottom);
    const ticks = 5;
    const step = niceStep((seriesMax > 0 ? seriesMax : 1) / ticks);
    const yMax = step * ticks;
    return { pad, plotWidth, plotHeight, yMax, ticks };
  }

  function drawGrid(ctx, frame) {
    const { pad, plotWidth, plotHeight, yMax, ticks } = frame;
    ctx.save();
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.fillStyle = COLORS.muted;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.font = '11px "Segoe UI", system-ui, sans-serif';

    for (let i = 0; i <= ticks; i += 1) {
      const value = (yMax / ticks) * i;
      const y = pad.top + plotHeight - (value / yMax) * plotHeight;
      ctx.beginPath();
      ctx.moveTo(pad.left, Math.round(y) + 0.5);
      ctx.lineTo(pad.left + plotWidth, Math.round(y) + 0.5);
      ctx.stroke();
      ctx.fillText(axisMoney(value), pad.left - 8, y);
    }
    ctx.restore();
  }

  function drawXLabels(ctx, frame, years, xFor) {
    const count = years.length;
    if (!count) return;
    const step = Math.max(1, Math.ceil(count / 8));
    const yBase = frame.pad.top + frame.plotHeight;
    ctx.save();
    ctx.fillStyle = COLORS.muted;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = '11px "Segoe UI", system-ui, sans-serif';

    years.forEach((year, index) => {
      const isLast = index === count - 1;
      if (index !== 0 && !isLast && year % step !== 0) return;
      ctx.fillText(String(year), xFor(year), yBase + 8);
    });
    ctx.restore();
  }

  function drawLadder(result) {
    const setup = setupCanvas(document.getElementById("chart-ladder"));
    if (!setup) return;
    const { ctx, width, height } = setup;
    const rows = result.rows;
    if (!rows.length) return;

    const principal = rows.map((r) => r.maturedPrincipal);
    const interest = rows.map((r) => Math.max(0, r.maturedInterest));
    const totals = principal.map((p, i) => p + interest[i]);
    const maxValue = Math.max(0, ...totals);
    const frame = computeFrame(width, height, maxValue * 1.18);
    const { pad, plotWidth, plotHeight, yMax } = frame;
    const count = rows.length;
    const xFor = (year) => pad.left + (plotWidth * (year - 0.3)) / (count + 0.4);
    const phaseEnd = state.plan === "lump" ? 0 : Math.min(state.depositYears, result.years);

    // tło faz
    ctx.save();
    if (phaseEnd > 0) {
      ctx.fillStyle = COLORS.depositBg;
      ctx.fillRect(
        xFor(0.5),
        pad.top,
        Math.max(0, xFor(phaseEnd + 0.5) - xFor(0.5)),
        plotHeight
      );
    }
    ctx.fillStyle = COLORS.maturityBg;
    ctx.fillRect(
      xFor(phaseEnd + 0.5),
      pad.top,
      Math.max(0, xFor(count + 0.5) - xFor(phaseEnd + 0.5)),
      plotHeight
    );
    ctx.restore();

    drawGrid(ctx, frame);

    const barWidth = Math.max(2, Math.min(30, (plotWidth / count) * 0.72));
    const baseY = pad.top + plotHeight;

    rows.forEach((row, index) => {
      const x = xFor(row.year) - barWidth / 2;
      const hPrincipal = yMax > 0 ? (principal[index] / yMax) * plotHeight : 0;
      const hInterest = yMax > 0 ? (interest[index] / yMax) * plotHeight : 0;

      if (hPrincipal > 0.2) {
        ctx.fillStyle = COLORS.accent;
        ctx.fillRect(x, baseY - hPrincipal, barWidth, hPrincipal);
      }
      if (hInterest > 0.2) {
        ctx.fillStyle = COLORS.green;
        ctx.fillRect(x, baseY - hPrincipal - hInterest, barWidth, hInterest);
      }
    });

    drawXLabels(ctx, frame, rows.map((r) => r.year), xFor);
  }

  function drawWealth(result) {
    const setup = setupCanvas(document.getElementById("chart-wealth"));
    if (!setup) return;
    const { ctx, width, height } = setup;
    const rows = result.rows;
    if (!rows.length) return;

    const maxValue = Math.max(
      0,
      ...rows.map((r) => Math.max(r.net, r.cumulativeDeposits)),
      ...state.benchmarks.flatMap((b) => b.values || [])
    );
    const frame = computeFrame(width, height, maxValue * 1.08);
    const { pad, plotWidth, plotHeight, yMax } = frame;
    const count = rows.length;
    const points = [{ year: 0, net: 0, deposits: 0 }].concat(
      rows.map((r) => ({ year: r.year, net: r.net, deposits: r.cumulativeDeposits }))
    );
    const xFor = (year) => pad.left + (plotWidth * year) / (count + 0.3);
    const yFor = (value) => pad.top + plotHeight - (yMax > 0 ? (value / yMax) * plotHeight : 0);
    const baseY = pad.top + plotHeight;

    // obszar zysku: między wartością netto a wpłatami
    ctx.save();
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = xFor(p.year);
      const y = yFor(p.net);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    for (let i = points.length - 1; i >= 0; i -= 1) {
      ctx.lineTo(xFor(points[i].year), yFor(points[i].deposits));
    }
    ctx.closePath();
    ctx.fillStyle = COLORS.profitFill;
    ctx.fill();

    // obszar wpłaconego kapitału
    ctx.beginPath();
    ctx.moveTo(xFor(0), baseY);
    points.forEach((p) => ctx.lineTo(xFor(p.year), yFor(p.deposits)));
    ctx.lineTo(xFor(points[points.length - 1].year), baseY);
    ctx.closePath();
    ctx.fillStyle = COLORS.capitalFill;
    ctx.fill();
    ctx.restore();

    drawGrid(ctx, frame);

    // linia wpłat
    ctx.save();
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = xFor(p.year);
      const y = yFor(p.deposits);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = COLORS.capital;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.restore();

    // linie benchmarków (identyczny plan wpłat)
    state.benchmarks.forEach((bench) => {
      if (!bench.values || !bench.values.length) return;
      ctx.save();
      ctx.beginPath();
      bench.values.forEach((value, index) => {
        const x = xFor(index + 1);
        const y = yFor(value);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = bench.color;
      ctx.lineWidth = 1.9;
      ctx.lineJoin = "round";
      ctx.setLineDash([]);
      ctx.stroke();
      ctx.restore();
    });

    // linia wartości netto
    ctx.save();
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = xFor(p.year);
      const y = yFor(p.net);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 2.2;
    ctx.lineJoin = "round";
    ctx.stroke();

    if (count <= 30) {
      ctx.fillStyle = COLORS.accent;
      points.forEach((p) => {
        if (p.year === 0) return;
        ctx.beginPath();
        ctx.arc(xFor(p.year), yFor(p.net), 2.6, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.restore();

    drawXLabels(ctx, frame, rows.map((r) => r.year), xFor);
  }

  function render(result, depositYears, options = {}) {
    state.result = result;
    state.depositYears = depositYears;
    state.benchmarks = options.benchmarks || [];
    state.plan = options.plan || "monthly";
    redraw();
  }

  function redraw() {
    if (!state.result) return;
    drawLadder(state.result);
    drawWealth(state.result);
  }

  let resizeQueued = false;
  function queueRedraw() {
    if (resizeQueued) return;
    resizeQueued = true;
    window.requestAnimationFrame(() => {
      resizeQueued = false;
      redraw();
    });
  }

  if (typeof window !== "undefined") {
    window.addEventListener("resize", queueRedraw);
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(queueRedraw);
      const ladder = document.getElementById("chart-ladder");
      const wealth = document.getElementById("chart-wealth");
      if (ladder) observer.observe(ladder.parentElement);
      if (wealth) observer.observe(wealth.parentElement);
    }
  }

  root.BondCharts = { render, redraw };
})(typeof globalThis !== "undefined" ? globalThis : this);
