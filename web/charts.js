/* Wykresy canvas: rejestr wykresów, wykresy liniowe i słupkowe. Bez zależności. */
(function (root) {
  "use strict";

  const COLORS = {
    accent: "#1f4e79",
    green: "#1f9d55",
    grid: "#dce6f1",
    muted: "#68798b",
    capital: "#8a9bb0",
    a: "#1f4e79",
    b: "#c2410c",
    c: "#7c3aed",
  };

  const charts = new Map();

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

  function setup(canvas) {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (width < 60 || height < 60) return null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    return { ctx, width, height };
  }

  function frameFor(width, height, maxValue) {
    const pad = { left: 58, right: 14, top: 14, bottom: 28 };
    const plotWidth = Math.max(10, width - pad.left - pad.right);
    const plotHeight = Math.max(10, height - pad.top - pad.bottom);
    const ticks = 5;
    const step = niceStep((maxValue > 0 ? maxValue : 100) / ticks);
    return { pad, plotWidth, plotHeight, ticks, yMax: step * ticks };
  }

  function drawGrid(ctx, frame, frameCfg) {
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
    if (frameCfg && frameCfg.xTitle) {
      ctx.save();
      ctx.fillStyle = COLORS.muted;
      ctx.font = '11px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText(frameCfg.xTitle, pad.left + plotWidth, frameCfg.height - 2);
      ctx.restore();
    }
  }

  function drawXLabels(ctx, frame, years, xFor) {
    if (!years.length) return;
    const step = Math.max(1, Math.ceil(years.length / 9));
    const yBase = frame.pad.top + frame.plotHeight;
    ctx.save();
    ctx.fillStyle = COLORS.muted;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = '11px "Segoe UI", system-ui, sans-serif';
    years.forEach((year, index) => {
      const isLast = index === years.length - 1;
      if (index !== 0 && !isLast && year % step !== 0) return;
      ctx.fillText(String(year), xFor(year), yBase + 8);
    });
    ctx.restore();
  }

  /* ----------------------------------------------------------- liniowy */
  function drawLineChart(canvas, cfg) {
    const prepared = setup(canvas);
    if (!prepared) return;
    const { ctx, width, height } = prepared;
    const years = (cfg.years || []).map(Number);
    if (years.length < 2) return;

    const values = [];
    (cfg.series || []).forEach((s) => (s.values || []).forEach((v) => values.push(v)));
    (cfg.areas || []).forEach((area) => {
      (area.top || []).forEach((v) => values.push(v));
      (area.bottom || []).forEach((v) => values.push(v));
    });
    const maxValue = Math.max(1, ...values.filter((v) => Number.isFinite(v)));
    const frame = frameFor(width, height, maxValue * 1.08);
    const { pad, plotWidth, plotHeight, yMax } = frame;
    const minYear = years[0];
    const maxYear = years[years.length - 1];
    const xFor = (year) =>
      pad.left + (plotWidth * (year - minYear)) / Math.max(1e-9, maxYear - minYear);
    const yFor = (value) =>
      pad.top + plotHeight - (yMax > 0 ? (value / yMax) * plotHeight : 0);

    if (cfg.bands) {
      ctx.save();
      cfg.bands.forEach((band) => {
        if (band.from === band.to) return;
        ctx.fillStyle = band.color;
        const x1 = xFor(Math.max(minYear, band.from));
        const x2 = xFor(Math.min(maxYear, band.to));
        ctx.fillRect(x1, pad.top, Math.max(0, x2 - x1), plotHeight);
      });
      ctx.restore();
    }

    (cfg.areas || []).forEach((area) => {
      const top = area.top || [];
      const bottom = area.bottom || [];
      if (!top.length) return;
      ctx.save();
      ctx.beginPath();
      top.forEach((value, index) => {
        const x = xFor(years[index]);
        const y = yFor(value);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      for (let i = bottom.length - 1; i >= 0; i -= 1) {
        ctx.lineTo(xFor(years[Math.min(i, years.length - 1)]), yFor(bottom[i]));
      }
      ctx.closePath();
      ctx.fillStyle = area.color;
      ctx.fill();
      ctx.restore();
    });

    drawGrid(ctx, frame);
    drawXLabels(ctx, frame, years, xFor);

    (cfg.series || []).forEach((s) => {
      if (!s.values || s.values.length < 2) return;
      ctx.save();
      ctx.beginPath();
      s.values.forEach((value, index) => {
        const x = xFor(years[index]);
        const y = yFor(value);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = s.color || COLORS.accent;
      ctx.lineWidth = s.width || 2.2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.setLineDash(s.dash || []);
      ctx.stroke();
      if (s.dots) {
        ctx.fillStyle = s.color || COLORS.accent;
        s.values.forEach((value, index) => {
          if (index === 0 && s.skipFirstDot) return;
          ctx.beginPath();
          ctx.arc(xFor(years[index]), yFor(value), 2.4, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      ctx.restore();
    });
  }

  /* ---------------------------------------------------------- słupkowy */
  function drawBarChart(canvas, cfg) {
    const prepared = setup(canvas);
    if (!prepared) return;
    const { ctx, width, height } = prepared;
    const years = (cfg.years || []).map(Number);
    if (!years.length) return;

    const totals = years.map((_, index) =>
      (cfg.stacks || []).reduce((sum, stack) => sum + (Number(stack.values[index]) || 0), 0)
    );
    const maxValue = Math.max(100, ...totals);
    const frame = frameFor(width, height, maxValue * 1.18);
    const { pad, plotWidth, plotHeight, yMax } = frame;
    const count = years.length;
    const xFor = (year) => pad.left + (plotWidth * (year - 0.3)) / (count + 0.4);
    const baseY = pad.top + plotHeight;

    if (cfg.bands) {
      ctx.save();
      cfg.bands.forEach((band) => {
        ctx.fillStyle = band.color;
        const x1 = xFor(Math.max(years[0], band.from));
        const x2 = xFor(Math.min(years[count - 1] + 1, band.to));
        ctx.fillRect(x1, pad.top, Math.max(0, x2 - x1), plotHeight);
      });
      ctx.restore();
    }

    drawGrid(ctx, frame);
    const barWidth = Math.max(2, Math.min(30, (plotWidth / count) * 0.72));

    years.forEach((year, index) => {
      let yCursor = 0;
      const x = xFor(year) - barWidth / 2;
      (cfg.stacks || []).forEach((stack) => {
        const value = Math.max(0, Number(stack.values[index]) || 0);
        if (value <= 0) return;
        const h = yMax > 0 ? (value / yMax) * plotHeight : 0;
        if (h > 0.2) {
          ctx.fillStyle = stack.color;
          ctx.fillRect(x, baseY - yCursor - h, barWidth, h);
        }
        yCursor += h;
      });
    });

    drawXLabels(ctx, frame, years, xFor);
  }

  function drawOne(id) {
    const entry = charts.get(id);
    const canvas = document.getElementById(id);
    if (!entry || !canvas) return;
    if (entry.type === "bar") drawBarChart(canvas, entry.cfg);
    else drawLineChart(canvas, entry.cfg);
  }

  function bar(id, cfg) {
    charts.set(id, { type: "bar", cfg });
    drawOne(id);
  }

  function line(id, cfg) {
    charts.set(id, { type: "line", cfg });
    drawOne(id);
  }

  function redraw() {
    charts.forEach((_, id) => drawOne(id));
  }

  /* --------------------------------------------- wykresy kalkulatora */
  function render(result, depositYears, options = {}) {
    if (!result) return;
    const rows = result.rows || [];
    if (rows.length) {
      const years = rows.map((r) => r.year);
      bar("chart-ladder", {
        years,
        bands: [
          {
            from: 0,
            to: Math.min(depositYears, result.years),
            color: "rgba(234, 241, 248, 0.75)",
          },
          {
            from: Math.min(depositYears, result.years),
            to: result.years + 1,
            color: "rgba(234, 246, 238, 0.8)",
          },
        ],
        stacks: [
          { values: rows.map((r) => r.maturedPrincipal), color: COLORS.accent },
          {
            values: rows.map((r) => Math.max(0, r.maturedInterest)),
            color: COLORS.green,
          },
        ],
      });

      const points = [{ year: 0, net: 0, deposits: 0 }].concat(
        rows.map((r) => ({ year: r.year, net: r.net, deposits: r.cumulativeDeposits }))
      );
      const series = [
        {
          values: points.map((p) => p.deposits),
          color: COLORS.capital,
          width: 1.4,
          dash: [5, 4],
        },
      ];
      (options.benchmarks || []).forEach((bench) => {
        if (!bench.values || !bench.values.length) return;
        series.push({
          values: [0].concat(bench.values),
          color: bench.color,
          width: 1.9,
        });
      });
      series.push({
        values: points.map((p) => p.net),
        color: COLORS.accent,
        width: 2.2,
        dots: points.length <= 31,
        skipFirstDot: true,
      });

      line("chart-wealth", {
        years: points.map((p) => p.year),
        areas: [
          {
            top: points.map((p) => p.net),
            bottom: points.map((p) => p.deposits),
            color: "rgba(31, 157, 85, 0.16)",
          },
        ],
        series,
      });
    }
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
  }

  root.BondCharts = { render, redraw, bar, line };
})(typeof globalThis !== "undefined" ? globalThis : this);
