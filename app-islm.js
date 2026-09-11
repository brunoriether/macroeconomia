/* ═════════════════════════════
   BÚSSOLA MACRO — aplicação do IS-LM
   Compartilhada por modelo-islm-basico.html (nível 2) e
   modelo-intermediario.html (nível 3). Qual das duas está no ar vem de
   window.ISLM_NIVEL, lido logo abaixo em NIVEL.
   ═════════════════════════════ */

"use strict";

/* O modelo vem namespaced; a página trabalha com nomes curtos. O regime
   monetário corrente é estado DA PÁGINA, e entra em solve() como argumento. */
var M = MODELO_INTER;
/* ═══ NÍVEL ═══
   A mesma aplicação serve duas telas. No nível básico saem de cena as
   sensibilidades (b, k, h), o nível de preços e a meta de juros: continuam
   valendo na álgebra, no valor de base, mas deixam de ser botões. É a forma
   em que o Blanchard apresenta o modelo — lá eles são a inclinação das
   funções I(Y, i) e L(i), não dials que o leitor ajusta. */
var NIVEL = (window.ISLM_NIVEL === "basico") ? "basico" : "completo";
var OCULTO = NIVEL === "basico" ? { b:1, ibar:1, P:1, k:1, h:1 } : {};

var EPS = M.EPS, P_BY_ID = M.P_BY_ID, TERMS = M.TERMS,
    CHAINS = M.CHAINS, CHAINS_META = M.CHAINS_META, baseState = M.baseState;

/* P_BY_ID continua inteiro — solve() precisa de todos os parâmetros.
   Só encolhe o que a tela desenha. */
var PARAMS = M.PARAMS.filter(function (p) { return !OCULTO[p.id]; });

var TABS = NIVEL === "basico"
  ? { IS: { groups:[ { title:"Demanda", ids:["C0", "c", "I0"] },
                     { title:"Política fiscal", ids:["G", "T"] } ] },
      LM: { groups:[ { title:"Política monetária", ids:["M"] } ] } }
  : M.TABS;

/* Sobram os cenários que esta tela consegue mostrar por inteiro: sem meta de
   juros e sem mexer em parâmetro que não está à vista. */
var SCENARIOS = M.SCENARIOS.filter(function (s) {
  if (NIVEL !== "basico") return true;
  if (s.mode !== "moeda") return false;
  return Object.keys(s.set || {}).every(function (id) { return !OCULTO[id]; });
}).map(function (s) {
  if (NIVEL !== "basico" || !s.watchBasico) return s;
  var c = {}, k;                     // texto alternativo, quando o original
  for (k in s) if (s.hasOwnProperty(k)) c[k] = s[k];   // cita um regime que
  c.watch = s.watchBasico;                             // esta tela não tem
  return c;
});
var mode = "moeda";
function solve(st, md) { return M.solve(st, md || mode); }

/* ═══ FORMATAÇÃO pt-BR ═══ */

var nf = function (d) { return new Intl.NumberFormat("pt-BR", { minimumFractionDigits:d, maximumFractionDigits:d }); };
var f0 = nf(0), f1 = nf(1), f4 = nf(4);
function minus(t) { return t.replace(/-/g, "−"); }
function fmt(v, d) { return isFinite(v) ? minus(nf(d).format(v)) : "—"; }
function fmtPct(v) { return isFinite(v) ? f1.format(v * 100) + " %" : "—"; }
function fmtP(p, v) { return isFinite(v) ? (p.u.pre || "") + minus(nf(p.dec || 0).format(v)) + (p.u.suf || "") : "—"; }
/* O sinal sai do valor JA arredondado: senao um resto de ponto flutuante
   da −1e-15 vira "−0" na tela. */
function sign(v, d) {
  if (!isFinite(v)) return "—";
  var r = Number(v.toFixed(d || 0));
  return (r > 0 ? "+" : r < 0 ? "−" : "") + nf(d || 0).format(Math.abs(r));
}

/* Uma linha: rótulo, a fórmula (apagada) e a conta com os números embaixo. */
function grupo(cls, nome, sub, linhas) {
  return '<div class="eqgroup ' + cls + '"><div class="eqgroup-h">' + nome +
    "<span>" + sub + "</span></div>" +
    linhas.map(function (l) {
      var unid = l[3] ? "<u>" + l[3] + "</u>" : "";
      return '<div class="eqrow">' +
        '<span class="eqlab">' + l[0] + "</span>" +
        (l[1] ? '<span class="eqform">' + l[1] + "</span>" : "") +
        '<span class="eqval"><span class="calc">' + l[2] + "</span>" + unid + "</span></div>";
    }).join("") + "</div>";
}

/* Soma de componentes, começando pelo total: a linha dos números espelha a
   fórmula acima termo por termo, e o olho não precisa reorganizar nada. */
function soma(partes, total, d) {
  return fmt(total, d || 0) + " = " + partes.map(function (v, i) {
    return (i === 0 ? (v < 0 ? "\u2212" : "") : (v < 0 ? " \u2212 " : " + ")) + fmt(Math.abs(v), d || 0);
  }).join("");
}

/* "a \u00d7 b" com o sinal de multiplicação de verdade. */
function vezes(a, b) { return a + " \u00d7 " + b; }

function term(key, label) {
  var txt = label || TERMS[key].t;
  return txt + '<button type="button" class="term" data-term="' + key +
    '" aria-expanded="false" aria-label="Definição: ' + txt.replace(/<[^>]*>/g, "").replace(/"/g, "") + '">ⓘ</button>';
}

/* ═══ ESTADO ═══ */

var state = baseState();
var ghost = null, lastMove = null, dragBase = null, animId = 0, pendingTarget = null;
/* activeScenario = o cenário está intacto (null se o usuário mexeu nos
   controles). loadedScenario = qual cenário está carregado, e esse nunca
   fica vazio — é o que mantém o texto na tela e o gráfico parado. */
var activeScenario = "base", loadedScenario = "base", tab = "IS", emphasis = "IS";
var view = { Ymin:0, Ymax:2000, iMin:0, iMax:15 };

var PAD = { l:62, r:64, t:24, b:44 };
var VB = { w:720, h:420 };
var PLOT = { x:PAD.l, y:PAD.t, w:VB.w - PAD.l - PAD.r, h:VB.h - PAD.t - PAD.b };

var $ = function (id) { return document.getElementById(id); };
var NS = "http://www.w3.org/2000/svg";
function el(tag, attrs, text) {
  var n = document.createElementNS(NS, tag);
  for (var a in attrs) if (attrs[a] != null) n.setAttribute(a, attrs[a]);
  if (text !== undefined) n.textContent = text;
  return n;
}

/* ═══ ESCALAS ═══ */

function sx(Y) { return PLOT.x + (Y - view.Ymin) / (view.Ymax - view.Ymin) * PLOT.w; }
function sy(i) { return PLOT.y + (view.iMax - i) / (view.iMax - view.iMin) * PLOT.h; }
function ix(px) { return view.Ymin + (px - PLOT.x) / PLOT.w * (view.Ymax - view.Ymin); }
function iy(py) { return view.iMax - (py - PLOT.y) / PLOT.h * (view.iMax - view.iMin); }

function clipLine(line) {
  if (line.vertical) {
    if (!isFinite(line.at) || line.at < view.Ymin || line.at > view.Ymax) return null;
    return [{ Y:line.at, i:view.iMin }, { Y:line.at, i:view.iMax }];
  }
  var m = line.m, q = line.q;
  if (!isFinite(m) || !isFinite(q)) return null;
  var lo = view.Ymin, hi = view.Ymax;
  if (Math.abs(m) > EPS) {
    var a = (view.iMin - q) / m, b = (view.iMax - q) / m;
    lo = Math.max(lo, Math.min(a, b));
    hi = Math.min(hi, Math.max(a, b));
  } else if (q < view.iMin || q > view.iMax) return null;
  if (hi - lo <= EPS) return null;
  return [{ Y:lo, i:m * lo + q }, { Y:hi, i:m * hi + q }];
}

var NICE_Y = [500, 1000, 2000, 4000, 8000, 16000, 32000, 64000];
var NICE_I = [5, 10, 15, 20, 30, 40, 60, 90, 120];
var NICE_IMIN = [0, -5, -10, -20, -40, -80];

/* A moldura cresce quando o equilíbrio encosta na borda e só encolhe com folga
   larga: se a régua se reajustasse a cada quadro, mexer um slider pareceria
   não mover a curva — que é justamente o que a tela existe para mostrar. */
function fitView(eq) {
  if (!isFinite(eq.Y) || !isFinite(eq.i)) return;
  var yi = NICE_Y.indexOf(view.Ymax); if (yi < 0) yi = 2;
  while (yi < NICE_Y.length - 1 && eq.Y > 0.88 * NICE_Y[yi]) yi++;
  while (yi > 0 && eq.Y < 0.28 * NICE_Y[yi - 1]) yi--;
  view.Ymax = NICE_Y[yi];

  var ri = NICE_I.indexOf(view.iMax); if (ri < 0) ri = 2;
  while (ri < NICE_I.length - 1 && eq.i > 0.88 * NICE_I[ri]) ri++;
  while (ri > 0 && eq.i < 0.28 * NICE_I[ri - 1] && eq.i > view.iMin) ri--;
  view.iMax = NICE_I[ri];

  var mi = NICE_IMIN.indexOf(view.iMin); if (mi < 0) mi = 0;
  while (mi < NICE_IMIN.length - 1 && eq.i < NICE_IMIN[mi] + 0.12 * (view.iMax - NICE_IMIN[mi])) mi++;
  while (mi > 0 && eq.i > NICE_IMIN[mi - 1] + 0.10 * (view.iMax - NICE_IMIN[mi - 1])) mi--;
  view.iMin = NICE_IMIN[mi];
}
function resetView() { view = { Ymin:0, Ymax:2000, iMin:0, iMax:15 }; }

function ticks(min, max, count) {
  var raw = (max - min) / count;
  var mag = Math.pow(10, Math.floor(Math.log10(raw)));
  var n = raw / mag;
  var step = (n >= 5 ? 10 : n >= 2.5 ? 5 : n >= 2 ? 2.5 : n >= 1 ? 2 : 1) * mag;
  var out = [], v = Math.ceil(min / step) * step;
  for (; v <= max + EPS; v += step) out.push(Math.abs(v) < EPS ? 0 : v);
  return out;
}

/* ═══ DESENHO ═══ */

function drawFrame() {
  var g = $("grid"), a = $("axes");
  g.textContent = ""; a.textContent = "";
  $("clipR").setAttribute("x", PLOT.x); $("clipR").setAttribute("y", PLOT.y);
  $("clipR").setAttribute("width", PLOT.w); $("clipR").setAttribute("height", PLOT.h);

  ticks(view.iMin, view.iMax, 5).forEach(function (i) {
    var y = sy(i);
    g.appendChild(el("line", { class:"grid-line", x1:PLOT.x, y1:y, x2:PLOT.x + PLOT.w, y2:y }));
    a.appendChild(el("text", { class:"tick-text", x:PLOT.x - 10, y:y + 4, "text-anchor":"end" }, f0.format(i)));
  });
  ticks(view.Ymin, view.Ymax, 5).forEach(function (Y) {
    a.appendChild(el("text", { class:"tick-text", x:sx(Y), y:PLOT.y + PLOT.h + 20, "text-anchor":"middle" }, f0.format(Y)));
  });

  a.appendChild(el("line", { class:"axis", x1:PLOT.x, y1:PLOT.y, x2:PLOT.x, y2:PLOT.y + PLOT.h }));
  a.appendChild(el("line", { class:"axis", x1:PLOT.x, y1:PLOT.y + PLOT.h, x2:PLOT.x + PLOT.w, y2:PLOT.y + PLOT.h }));
  a.appendChild(el("text", { class:"axis-title", x:PLOT.x - 8, y:PLOT.y - 10, "text-anchor":"start" }, "JURO %"));
  a.appendChild(el("text", { class:"axis-title", x:PLOT.x + PLOT.w, y:PLOT.y + PLOT.h + 37, "text-anchor":"end" }, "RENDA"));
}

function pathOf(line) {
  var s = clipLine(line);
  return s ? "M " + sx(s[0].Y).toFixed(2) + " " + sy(s[0].i).toFixed(2) +
             " L " + sx(s[1].Y).toFixed(2) + " " + sy(s[1].i).toFixed(2) : null;
}

function drawArrow(a, b, layer) {
  if (!a || !isFinite(a.Y) || !isFinite(b.Y) || !isFinite(a.i) || !isFinite(b.i)) return;
  var x1 = sx(a.Y), y1 = sy(a.i), x2 = sx(b.Y), y2 = sy(b.i);
  var dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
  if (len < 8) return;
  var ux = dx / len, uy = dy / len;
  var sX = x1 + ux * 6, sY = y1 + uy * 6, eX = x2 - ux * 10, eY = y2 - uy * 10;
  if (Math.hypot(eX - sX, eY - sY) < 4) return;
  layer.appendChild(el("line", { class:"arrow", x1:sX, y1:sY, x2:eX, y2:eY }));
  var k = 5;
  layer.appendChild(el("polygon", { class:"arrow-head", points:[
    eX + ux * k, eY + uy * k,
    eX - uy * k * .6 - ux * k * .2, eY + ux * k * .6 - uy * k * .2,
    eX + uy * k * .6 - ux * k * .2, eY - ux * k * .6 - uy * k * .2
  ].map(function (v) { return v.toFixed(2); }).join(" ") }));
}

function labelFor(line, name, cls) {
  var seg = clipLine(line);
  if (!seg) return null;
  var pt = seg[1], px, anchor;
  if (sx(pt.Y) >= PLOT.x + PLOT.w - 4) { px = VB.w - 6; anchor = "end"; }
  else { px = Math.min(sx(pt.Y) + 9, VB.w - 6); anchor = "start"; }
  return { x:px, y:Math.max(PLOT.y + 12, Math.min(PLOT.y + PLOT.h - 6, sy(pt.i) + 4)), anchor:anchor, name:name, cls:cls };
}

function draw(eq) {
  drawFrame();
  var cl = $("curves"), mk = $("marks"), lb = $("labels"), gh = $("ghosts");
  cl.textContent = ""; mk.textContent = ""; lb.textContent = ""; gh.textContent = "";

  if (ghost) {
    var g2 = solve(ghost, ghost.__mode || mode);
    [["is", g2.IS], ["lm", g2.LM]].forEach(function (p) {
      var d = pathOf(p[1]);
      if (d) gh.appendChild(el("path", { class:"ghost " + p[0], d:d }));
    });
    if (isFinite(g2.Y)) gh.appendChild(el("circle", { class:"ghost-ring", cx:sx(g2.Y), cy:sy(g2.i), r:4 }));
  }
  gh.setAttribute("opacity", ghost ? 1 : 0);

  // a aba ativa realça a sua curva; a outra recua sem sumir
  cl.setAttribute("class", emphasis ? "dim" : "");
  [["IS", eq.IS, "Curva IS, mercado de bens"], ["LM", eq.LM, "Curva LM, mercado de moeda"]].forEach(function (p) {
    var d = pathOf(p[1]);
    if (!d) return;
    var g = el("g", { class:"grp", "data-curve":p[0], tabindex:"0", role:"img", "aria-label":p[2] });
    g.appendChild(el("path", { class:"hit", d:d }));
    g.appendChild(el("path", { class:"curve " + p[0].toLowerCase() + (emphasis === p[0] ? " on" : ""), d:d }));
    cl.appendChild(g);
  });

  if (eq.ok && isFinite(eq.Y) && isFinite(eq.i)) {
    var X = sx(eq.Y), Y = sy(eq.i);
    if (X >= PLOT.x - 1 && X <= PLOT.x + PLOT.w + 1 && Y >= PLOT.y - 1 && Y <= PLOT.y + PLOT.h + 1) {
      mk.appendChild(el("line", { class:"guide", x1:X, y1:Y, x2:X, y2:PLOT.y + PLOT.h }));
      mk.appendChild(el("line", { class:"guide", x1:PLOT.x, y1:Y, x2:X, y2:Y }));
      if (ghost) drawArrow(solve(ghost, ghost.__mode || mode), eq, mk);
      mk.appendChild(el("circle", { class:"ring", cx:X, cy:Y, r:8 }));
      mk.appendChild(el("circle", { class:"dot", cx:X, cy:Y, r:2.5 }));
      lb.appendChild(el("text", { class:"eqmark", x:X, y:PLOT.y + PLOT.h - 9, "text-anchor":"middle" }, fmt(eq.Y, 0)));
      lb.appendChild(el("text", { class:"eqmark", x:PLOT.x + 9, y:Y - 8, "text-anchor":"start" }, fmt(eq.i, 1) + " %"));
    }
  }

  [labelFor(eq.IS, "IS", "is"), labelFor(eq.LM, "LM", "lm")].forEach(function (L) {
    if (L) lb.appendChild(el("text", { class:"clabel " + L.cls, x:L.x, y:L.y, "text-anchor":L.anchor }, L.name));
  });
}

/* ═══ PAINÉIS ═══ */

function renderResults(eq) {
  $("outY").textContent = eq.ok ? fmt(eq.Y, 0) : "—";
  $("outI").textContent = eq.ok ? fmt(eq.i, 2) : "—";
  // C e I são realizados: já descontam o juro de equilíbrio
  $("compo").innerHTML = [["C", eq.C], ["I", eq.I], ["G", state.G]].map(function (x) {
    return "<span><i>" + x[0] + "</i>" + fmt(x[1], 0) + "</span>";
  }).join("");
  $("dK").textContent = eq.ok ? "somam Y* = " + fmt(eq.Y, 0) : "";
  if (ghost && eq.ok) {
    var g = solve(ghost, ghost.__mode || mode);
    $("dY").textContent = sign(eq.Y - g.Y, 0) + " bi vs. antes";
    $("dI").textContent = sign(eq.i - g.i, 2) + " p.p. vs. antes";
  } else { $("dY").textContent = ""; $("dI").textContent = ""; }

  var isTxt = eq.IS.vertical ? "Y = " + fmt(eq.IS.at, 0) + "   (vertical)"
            : "i = " + fmt(eq.IS.q, 2) + (eq.IS.m < 0 ? " − " : " + ") + f4.format(Math.abs(eq.IS.m)) + " · Y";
  var lmTxt = eq.LM.pegged ? "i = " + fmt(eq.LM.q, 2) + "   (meta do Banco Central)"
            : eq.LM.vertical ? "Y = " + fmt(eq.LM.at, 0) + "   (vertical)"
            : "i = " + fmt(eq.LM.q, 2) + " + " + f4.format(eq.LM.m) + " · Y";

  var c2 = fmt(state.c, 2);
  var i2 = fmt(eq.i, 2);
  var den = eq.den;

  var c2 = fmt(state.c, 2);
  var i2 = fmt(eq.i, 2);
  var den = eq.den;

  $("eqs").innerHTML =
    grupo("is", "IS", "mercado de bens", [
      ["a reta", null, isTxt, null],
      ["produto", "Y = C + I + G", soma([eq.C, eq.I, state.G], eq.Y), "R$ bi"],
      ["consumo", "C = C\u2080 + c(Y \u2212 T)",
        fmt(eq.C, 0) + " = " + fmt(state.C0, 0) + " + " +
        vezes(c2, "(" + fmt(eq.Y, 0) + " \u2212 " + fmt(state.T, 0) + ")"), "R$ bi"],
      ["investimento", "I = I\u2080 \u2212 b\u00b7i",
        fmt(eq.I, 0) + " = " + fmt(state.I0, 0) + " \u2212 " + vezes(fmt(state.b, 0), i2), "R$ bi"],
      ["poupan\u00e7a privada", "S = Y \u2212 T \u2212 C",
        fmt(eq.S, 0) + " = " + fmt(eq.Y, 0) + " \u2212 " + fmt(state.T, 0) + " \u2212 " + fmt(eq.C, 0), "R$ bi"],
      ["gasto aut\u00f4nomo", "A = C\u2080 \u2212 cT + I\u2080 + G",
        fmt(eq.A, 0) + " = " + fmt(state.C0, 0) + " \u2212 " + vezes(c2, fmt(state.T, 0)) +
        " + " + fmt(state.I0, 0) + " + " + fmt(state.G, 0), "R$ bi"]
    ]) +
    '<div class="eqcol">' +
      grupo("lm", "LM", mode === "juros" ? "meta de juros do Banco Central" : "mercado de moeda", [
        ["a reta", null, lmTxt, null],
        [mode === "juros" ? "moeda entregue" : "moeda real", "M/P = k\u00b7Y \u2212 h\u00b7i",
          fmt(eq.mp, 0) + " = " + vezes(fmt(state.k, 2), fmt(eq.Y, 0)) +
          " \u2212 " + vezes(fmt(state.h, 0), i2), "R$ bi"]
      ]) +
      grupo("", "Multiplicadores", "quanto cada real vira de produto", [
        ["simples", "\u0394Y/\u0394A = 1 / (1 \u2212 c)",
          fmt(eq.multSimple, 2) + "\u00d7 = 1 / (1 \u2212 " + c2 + ")", "sem o freio do juro"],
        ["fiscal", mode === "juros" ? "\u0394Y/\u0394G = 1 / (1 \u2212 c)"
                                    : "\u0394Y/\u0394G = h / [h(1\u2212c) + b\u00b7k]",
          fmt(eq.multFiscal, 2) + "\u00d7 = " + (mode === "juros"
            ? "1 / (1 \u2212 " + c2 + ")"
            : fmt(state.h, 0) + " / " + fmt(den, 1)),
          mode === "juros" ? "o juro n\u00e3o reage" : "com o juro reagindo"],
        ["monet\u00e1rio", mode === "juros" ? "\u0394Y/\u0394(M/P) = 0"
                                             : "\u0394Y/\u0394(M/P) = b / [h(1\u2212c) + b\u00b7k]",
          fmt(eq.multMoney, 2) + "\u00d7" + (mode === "juros" ? ""
            : " = " + fmt(state.b, 0) + " / " + fmt(den, 1)),
          mode === "juros" ? "o BC j\u00e1 acomoda" : null]
      ]) +
    "</div>";
}

function renderAlert(eq) {
  var msg = null;
  var ratio = (eq.IS.vertical || eq.LM.vertical || eq.LM.pegged || Math.abs(eq.IS.m) < EPS)
    ? NaN : Math.abs(eq.LM.m) / Math.abs(eq.IS.m);

  if (!eq.ok && !isFinite(eq.Y)) {
    msg = "IS e LM estão as duas verticais (b = 0 e h = 0): não se cruzam em um único ponto, e o modelo não determina o equilíbrio.";
  } else if (eq.Y < 0) {
    msg = "Renda de equilíbrio negativa. Essa combinação não descreve uma economia possível — reduza T ou eleve os gastos autônomos.";
  } else if (mode === "juros") {
    msg = "Meta de juros: a LM é horizontal porque o BC entrega toda a moeda pedida a " + fmt(eq.i, 2) + " %. Sem crowding out — a política fiscal age com o multiplicador cheio (" + fmt(eq.multSimple, 2) + "×), e emitir moeda deixa de mover a renda.";
  } else if (eq.LM.vertical) {
    msg = "Caso clássico: com h = 0 a LM é vertical. A renda depende só da moeda real, e gasto público apenas eleva o juro — o crowding out é total.";
  } else if (eq.IS.vertical) {
    msg = "Investimento insensível ao juro: com b = 0 a IS é vertical. Não há crowding out, porque o juro sobe sem derrubar investimento nenhum.";
  } else if (eq.i < 0) {
    msg = "O juro de equilíbrio ficou abaixo de zero. O modelo permite; a economia real quase nunca — na prática existe um piso perto de zero.";
  } else if (ratio > 4) {
    msg = "Quase o caso clássico: a LM está muito mais inclinada que a IS, e o juro engole " + fmtPct(eq.crowding) + " de qualquer impulso fiscal.";
  } else if (ratio < 0.25) {
    msg = "Perto da armadilha da liquidez: a LM está quase horizontal. Emitir moeda quase não mexe no juro, e a política fiscal age com quase toda a força do multiplicador.";
  }
  $("alert").classList.toggle("on", !!msg);
  $("alertTxt").textContent = msg || "";
}

function renderChain() {
  var host = $("chain");
  host.textContent = "";
  if (!lastMove) {
    var d = document.createElement("p");
    d.className = "chain-idle";
    d.textContent = "Mexa em qualquer controle para ver a cadeia de causa e efeito que ele dispara.";
    host.appendChild(d);
    return;
  }
  var p = P_BY_ID[lastMove.id];
  var flip = lastMove.dir < 0 ? -1 : 1;
  var steps = (mode === "juros" ? CHAINS_META : CHAINS)[lastMove.id] || [];

  function chip(cls, html) {
    var n = document.createElement("div");
    n.className = "step " + cls;
    n.innerHTML = html;
    host.appendChild(n);
  }
  chip("head", "<em>" + (flip > 0 ? "↑" : "↓") + "</em>" + term("p:" + p.id, p.sym));
  steps.forEach(function (st) {
    var txt = st.term ? term(st.term, st.t) : st.t;
    if (st.shift) chip(st.curve.toLowerCase(), txt + " <em>" + (st.d * flip > 0 ? "→" : "←") + "</em>");
    else if (st.rot) chip(st.curve.toLowerCase(), txt + " (mais " + ((flip > 0 ? st.flat : !st.flat) ? "horizontal" : "vertical") + ")");
    else chip(st.curve ? st.curve.toLowerCase() : "",
      st.d === 0 ? txt : txt + " <em>" + (st.d * flip > 0 ? "↑" : "↓") + "</em>");
  });
}

function renderMeter(eq) {
  var lost = Math.max(0, Math.min(1, eq.crowding)), kept = 1 - lost;
  $("mA").style.width = (kept * 100).toFixed(1) + "%";
  $("mB").style.width = (lost * 100).toFixed(1) + "%";
  $("mAt").textContent = fmtPct(kept);
  $("mBt").textContent = fmtPct(lost);
  $("meter").setAttribute("aria-label",
    "De cada real de impulso fiscal, " + fmtPct(kept) + " chega à renda e " + fmtPct(lost) + " é engolido pela alta do juro.");
}

function syncControls(eq) {
  PARAMS.forEach(function (p) {
    var input = $("in-" + p.id), row = $("row-" + p.id);
    if (!input) return;
    // o instrumento que o BC não escolheu vira resultado: trava e vira leitura
    var locked = (mode === "juros" && p.id === "M") || (mode === "moeda" && p.id === "ibar");
    var v = state[p.id];
    if (locked && eq) v = p.id === "M" ? eq.mp * state.P : eq.i;
    // o NÚMERO mostra o valor real mesmo fora da faixa; só o marcador é limitado
    var thumb = isFinite(v) ? Math.max(p.min, Math.min(p.max, v)) : p.min;

    input.disabled = locked;
    row.classList.toggle("locked", locked);
    if (Number(input.value) !== thumb) input.value = thumb;
    input.style.setProperty("--pct", ((thumb - p.min) / (p.max - p.min) * 100).toFixed(2) + "%");
    var campo = $("val-" + p.id);
    campo.disabled = locked;
    // nao sobrescreve enquanto o usuario esta digitando naquele campo
    if (document.activeElement !== campo) {
      campo.value = nf(p.dec || 0).format(v);
      // o valor derivado pode passar do maximo do slider (M sob meta de juros
      // chega a quatro digitos): o campo cresce para nao cortar o numero
      campo.style.width = Math.max(larguraCh(p), campo.value.length + 1.5) + "ch";
    }
    input.setAttribute("aria-valuetext", p.label + " " + fmtP(p, v) + (locked ? " (determinado pelo modelo)" : ""));
    $("eff-" + p.id).textContent = mode === "juros" ? p.effMeta : p.eff;
  });
}

/* ═══ RENDER ═══ */

var raf = null;
function render() {
  if (raf) return;
  raf = requestAnimationFrame(function () {
    raf = null;
    var eq = solve(state);
    fitView(eq);
    draw(eq);
    renderResults(eq);
    renderAlert(eq);
    renderChain();
    renderMeter(eq);
    syncControls(eq);
  });
}

/* ═══ CONSTRUÇÃO DOS PAINÉIS ═══ */

function ctrlHTML(p) {
  return '<div class="ctrl" id="row-' + p.id + '" data-curve="' + p.curve + '">' +
    '<div class="ctrl-head">' +
      '<span class="ctrl-name">' + term("p:" + p.id, p.label) +
        ' <span class="term-sym">(' + p.sym + ')</span><span class="chip-res">resultado</span></span>' +
      '<span class="ctrl-val">' +
        (p.u.pre ? "<u>" + p.u.pre + "</u>" : "") +
        '<input type="text" inputmode="decimal" class="valin" id="val-' + p.id + '"' +
          ' style="width:' + larguraCh(p) + 'ch" aria-label="' + p.label + ', digite um valor">' +
        (p.u.suf ? "<u>" + p.u.suf + "</u>" : "") +
      "</span>" +
    '</div>' +
    '<input type="range" id="in-' + p.id + '" min="' + p.min + '" max="' + p.max + '" step="' + p.step + '"' +
      ' value="' + p.base + '" aria-label="' + p.label + '">' +
    '<p class="ctrl-eff" id="eff-' + p.id + '"></p>' +
  '</div>';
}

function buildPanels() {
  Object.keys(TABS).forEach(function (key) {
    var html = "";
    TABS[key].groups.forEach(function (g) {
      html += '<h3 class="group-title">' + g.title + "</h3>";
      if (g.regime) {
        html += '<div class="regime">' +
          '<p class="regime-q">O que o Banco Central controla? ' + term("meta-juros", "Os dois regimes") + "</p>" +
          '<div class="regime-sw" role="group" aria-label="Regime monetário">' +
            '<button type="button" data-mode="moeda" aria-pressed="true">a quantidade de moeda</button>' +
            '<button type="button" data-mode="juros" aria-pressed="false">a taxa de juros</button>' +
          "</div></div>";
      }
      g.ids.forEach(function (id) { html += ctrlHTML(P_BY_ID[id]); });
    });
    $("panel-" + key).innerHTML = html;
  });

  PARAMS.forEach(function (p) {
    var input = $("in-" + p.id);
    input.addEventListener("pointerdown", beginGesture);
    input.addEventListener("keydown", function (ev) {
      if (ev.key.indexOf("Arrow") !== 0) return;
      beginGesture();
      if (ev.shiftKey) {
        ev.preventDefault();
        var d = (ev.key === "ArrowRight" || ev.key === "ArrowUp") ? 1 : -1;
        setParam(p.id, clampP(p, state[p.id] + d * p.step * 10));
      }
    });
    input.addEventListener("dblclick", function () { beginGesture(); setParam(p.id, p.base); });
    input.addEventListener("input", function () { setParam(p.id, Number(input.value)); });
    ligarCampo(p);
  });
}

/* ═══ VALOR DIGITAVEL ═══ */

/* Largura do campo: cabe o maior numero da faixa, com folga para o caso em
   que o valor e derivado e passa do maximo do slider. */
function larguraCh(pa) {
  var d = pa.dec || 0;
  var a = nf(d).format(pa.min).length, b = nf(d).format(pa.max).length;
  return Math.max(4.5, Math.max(a, b) + 1.5);
}

/* Aceita 1.234,5 / 1234,5 / 1234.5 / "R$ 450 bi". A virgula sempre e decimal;
   o ponto so e decimal se o parametro tiver casas, senao e separador de milhar. */
function parseNum(txt, pa) {
  var s = String(txt).replace(/\u2212/g, "-").replace(/[^\d.,\-]/g, "");
  if (s.indexOf(",") >= 0) s = s.replace(/\./g, "").replace(",", ".");
  else if (!pa.dec) s = s.replace(/\./g, "");
  var v = parseFloat(s);
  return isFinite(v) ? v : NaN;
}

function commitVal(pa) {
  var campo = $("val-" + pa.id);
  var v = parseNum(campo.value, pa);
  if (!isFinite(v)) { render(); return; }              // lixo digitado: volta ao valor atual
  var lim = Math.max(pa.min, Math.min(pa.max, v));
  if (Math.abs(lim - v) > 1e-9) {                      // estourou a faixa: avisa e limita
    campo.classList.remove("limite");
    void campo.offsetWidth;
    campo.classList.add("limite");
  }
  beginGesture();
  setParam(pa.id, lim);
  endGesture();
  render();
}

function ligarCampo(pa) {
  var campo = $("val-" + pa.id);
  campo.addEventListener("focus", function () { campo.select(); });
  // a classe do pisca sai sozinha, para nao ficar presa no DOM
  campo.addEventListener("animationend", function () { campo.classList.remove("limite"); });
  campo.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter") { ev.preventDefault(); campo.blur(); }
    else if (ev.key === "Escape") { ev.preventDefault(); campo.dataset.esc = "1"; campo.blur(); }
  });
  campo.addEventListener("blur", function () {
    if (campo.dataset.esc) { delete campo.dataset.esc; render(); return; }
    commitVal(pa);
  });
}

function clampP(p, v) { return Math.max(p.min, Math.min(p.max, Math.round(v / p.step) * p.step)); }

/* A mão do usuário interrompe a animação de um preset — mas o preset já foi
   pedido, então seu alvo é aplicado de uma vez antes de ceder o controle. */
function commitPending() {
  if (!pendingTarget) return;
  var t = pendingTarget;
  pendingTarget = null;
  PARAMS.forEach(function (p) { state[p.id] = t[p.id]; });
}

/* A referência FICA quando vale a pena comparar: contra a economia base, ou
   contra o estado logo antes de você mexer num controle. Ao pular de um
   cenário direto para outro sem relação, ela aparece por 3 s e some. */
var ghostTimer = null;
function fadeGhost(ms) {
  clearTimeout(ghostTimer);
  ghostTimer = setTimeout(function () { ghost = null; render(); }, ms);
}
function holdGhost() { clearTimeout(ghostTimer); }

/* A referência fica na tela até o próximo movimento: ela mostra onde a
   economia estava ANTES da sua última ação, e some sozinha só quando é
   substituída. Some por tempo seria pior — o aluno olha para o controle
   enquanto arrasta e perde a comparação justamente quando volta ao gráfico. */
function beginGesture() {
  commitPending();
  animId++;
  holdGhost();                    // mexer num controle fixa a referência
  if (dragBase) { if (!ghost) ghost = dragBase; return; }
  dragBase = Object.assign({}, state);
  dragBase.__mode = mode;
  ghost = dragBase;
}
function endGesture() { dragBase = null; }
window.addEventListener("pointerup", endGesture);
window.addEventListener("keyup", function (ev) { if (ev.key.indexOf("Arrow") === 0) endGesture(); });

function setParam(id, value) {
  var p = P_BY_ID[id];
  var v = Math.max(p.min, Math.min(p.max, value));
  if (Math.abs(v - state[id]) < 1e-12) return;
  commitPending();
  animId++;
  lastMove = { id:id, dir: v >= (dragBase || state)[id] ? 1 : -1 };
  state[id] = v;
  activeScenario = null;          // o cenário segue carregado, só não está mais intacto
  markScenario();
  render();
}

/* ═══ ABAS ═══ */

function setTab(t) {
  tab = t;
  emphasis = t;                                // a aba ativa realça sua curva
  Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (b) {
    var on = b.dataset.tab === t;
    b.setAttribute("aria-selected", on ? "true" : "false");
    b.tabIndex = on ? 0 : -1;
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-panel]"), function (p) {
    p.hidden = p.dataset.panel !== t;
  });
  render();
}

function setupTabs() {
  var btns = Array.prototype.slice.call(document.querySelectorAll(".tab"));
  btns.forEach(function (b, i) {
    b.addEventListener("click", function () { setTab(b.dataset.tab); });
    b.addEventListener("keydown", function (ev) {       // navegação por setas, como manda um tablist
      if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
      ev.preventDefault();
      var next = btns[(i + (ev.key === "ArrowRight" ? 1 : btns.length - 1)) % btns.length];
      next.focus(); setTab(next.dataset.tab);
    });
  });
  setTab("IS");
}

/* ═══ MENU DE CENÁRIOS ═══ */

function buildScenarios() {
  var m = $("scenMenu");
  var html = "", secAtual = null;
  SCENARIOS.forEach(function (sc) {
    if (sc.section !== secAtual) {
      secAtual = sc.section;
      html += '<div class="menu-sec">' + secAtual + "</div>";
    }
    html += '<button type="button" class="menu-item" role="menuitemradio" data-id="' + sc.id + '"' +
      ' aria-checked="' + (sc.id === "base") + '">' +
      '<span class="mi-n">' + sc.name + "</span>" +
      '<span class="mi-d">' + sc.story + "</span></button>";
  });
  m.innerHTML = html;

  Array.prototype.forEach.call(m.querySelectorAll(".menu-item"), function (b) {
    b.addEventListener("click", function () {
      var sc = SCENARIOS.filter(function (s) { return s.id === b.dataset.id; })[0];
      closeMenu(true);
      applyScenario(sc);
    });
  });

  $("scenBtn").addEventListener("click", function (ev) {
    ev.stopPropagation();
    if ($("scenMenu").hidden) openMenu(); else closeMenu(true);
  });
  document.addEventListener("click", function (ev) {
    if (!$("scenMenu").hidden && !ev.target.closest(".menu-wrap")) closeMenu(false);
  });
  document.addEventListener("keydown", function (ev) {
    if ($("scenMenu").hidden) return;
    var items = Array.prototype.slice.call($("scenMenu").querySelectorAll(".menu-item"));
    var i = items.indexOf(document.activeElement);
    if (ev.key === "Escape") { ev.preventDefault(); closeMenu(true); }
    else if (ev.key === "ArrowDown") { ev.preventDefault(); items[(i + 1) % items.length].focus(); }
    else if (ev.key === "ArrowUp") { ev.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
  });
}
function openMenu() {
  $("scenMenu").hidden = false;
  $("scenBtn").setAttribute("aria-expanded", "true");
  var first = $("scenMenu").querySelector('.menu-item[aria-checked="true"]') || $("scenMenu").querySelector(".menu-item");
  if (first) first.focus();
}
function closeMenu(refocus) {
  $("scenMenu").hidden = true;
  $("scenBtn").setAttribute("aria-expanded", "false");
  if (refocus) $("scenBtn").focus();
}
function markScenario() {
  // O cenário carregado continua na tela mesmo depois de você mexer nos
  // controles. Some nada, move nada: o que muda é a etiqueta de status.
  var sc = SCENARIOS.filter(function (s) { return s.id === loadedScenario; })[0];
  if (!sc) return;
  $("scenNow").textContent = sc.name;
  $("modChip").dataset.on = activeScenario ? "nao" : "sim";
  $("briefStory").textContent = sc.story;
  $("briefWatch").textContent = sc.watch;
  Array.prototype.forEach.call($("scenMenu").querySelectorAll(".menu-item"), function (b) {
    b.setAttribute("aria-checked", b.dataset.id === loadedScenario ? "true" : "false");
  });
}

/* `limpo` = veio do botão Reiniciar: começa do zero, sem referência na tela.
   Um cenário escolhido no menu mantém a referência, porque ali comparar com o
   estado anterior é o ponto. */
function applyScenario(sc, limpo) {
  // sai da base (ou do Reiniciar) => a comparação vale e a referência fica;
  // pula de um cenário para outro => ela some depois de 3 s
  var vinhaDaBase = loadedScenario === "base";
  holdGhost();
  ghost = limpo ? null : Object.assign({}, state);
  if (ghost) ghost.__mode = mode;
  var someDepois = !limpo && !vinhaDaBase;
  dragBase = null;
  resetView();
  if (sc.mode && sc.mode !== mode) { mode = sc.mode; markMode(); }

  var target = baseState();
  for (var k in sc.set) target[k] = sc.set[k];

  activeScenario = loadedScenario = sc.id;
  lastMove = null;
  markScenario();
  setTab(sc.mode === "juros" ? "LM" : tab);

  var from = Object.assign({}, state);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    pendingTarget = null; state = target; render(); if (someDepois) fadeGhost(3000); return;
  }
  pendingTarget = target;
  var my = ++animId, t0 = performance.now(), DUR = 460;
  (function step(now) {
    if (my !== animId) return;
    var u = Math.min(1, (now - t0) / DUR);
    var e = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    PARAMS.forEach(function (p) { state[p.id] = from[p.id] + (target[p.id] - from[p.id]) * e; });
    render();
    if (u < 1) requestAnimationFrame(step);
    else { pendingTarget = null; state = target; render(); if (someDepois) fadeGhost(3000); }
  })(performance.now());
}

/* ═══ REGIME ═══ */

function setMode(m) {
  if (m === mode) return;
  commitPending();
  holdGhost();                    // comparar os dois regimes é o ponto: fica
  var eq = solve(state, mode);
  // sem arredondar ao passo do slider: o equilíbrio fica EXATAMENTE onde estava,
  // e só a forma da LM muda. O passo volta a valer no primeiro arrasto.
  function hold(p, x, fb) { return isFinite(x) ? Math.max(p.min, Math.min(p.max, x)) : fb; }
  if (m === "juros") state.ibar = hold(P_BY_ID.ibar, eq.i, P_BY_ID.ibar.base);
  else state.M = hold(P_BY_ID.M, eq.mp * state.P, P_BY_ID.M.base);

  ghost = Object.assign({}, state);
  ghost.__mode = mode;
  animId++;
  mode = m;
  lastMove = null;
  markMode();
  render();
}
function markMode() {
  Array.prototype.forEach.call(document.querySelectorAll("[data-mode]"), function (b) {
    b.setAttribute("aria-pressed", b.dataset.mode === mode ? "true" : "false");
  });
}
function setupRegime() {
  Array.prototype.forEach.call(document.querySelectorAll("[data-mode]"), function (b) {
    b.addEventListener("click", function () { setMode(b.dataset.mode); });
  });
  markMode();
}

/* ═══ DEFINIÇÃO EM CONTEXTO ═══ */
/* Passar o mouse ou focar abre; clicar fixa (para toque e para ler com calma). */

var pinned = null;

function showPop(btn) {
  var t = TERMS[btn.dataset.term];
  if (!t) return;
  var pop = $("pop");
  $("popT").textContent = t.t;
  $("popU").textContent = t.u ? "unidade: " + t.u : "";
  $("popU").hidden = !t.u;
  $("popD").textContent = t.d;
  var p = t.param ? P_BY_ID[t.param] : null;
  $("popE").textContent = p ? (mode === "juros" ? p.effMeta : p.eff) : "";
  $("popE").hidden = !p;

  pop.hidden = false;
  var r = btn.getBoundingClientRect();
  var w = pop.offsetWidth, h = pop.offsetHeight;
  var left = Math.min(Math.max(10, r.left + r.width / 2 - w / 2), window.innerWidth - w - 10);
  var top = r.top - h - 9;
  if (top < 10) top = Math.min(r.bottom + 9, window.innerHeight - h - 10);
  pop.style.left = left + "px";
  pop.style.top = Math.max(10, top) + "px";
  btn.setAttribute("aria-expanded", "true");
  btn.setAttribute("aria-describedby", "pop");
}

function hidePop() {
  $("pop").hidden = true;
  Array.prototype.forEach.call(document.querySelectorAll(".term[aria-expanded='true']"), function (b) {
    b.setAttribute("aria-expanded", "false");
    b.removeAttribute("aria-describedby");
  });
  pinned = null;
}

function setupTerms() {
  document.addEventListener("pointerover", function (ev) {
    var b = ev.target.closest && ev.target.closest(".term");
    if (b && !pinned) showPop(b);
  });
  document.addEventListener("pointerout", function (ev) {
    var b = ev.target.closest && ev.target.closest(".term");
    if (b && !pinned) hidePop();
  });
  document.addEventListener("focusin", function (ev) {
    var b = ev.target.closest && ev.target.closest(".term");
    if (b) showPop(b);
  });
  document.addEventListener("focusout", function (ev) {
    var b = ev.target.closest && ev.target.closest(".term");
    if (b && !pinned) hidePop();
  });
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest && ev.target.closest(".term");
    if (b) {
      ev.preventDefault();
      if (pinned === b) hidePop();
      else { pinned = null; showPop(b); pinned = b; }
      return;
    }
    if (pinned && !ev.target.closest(".pop")) hidePop();
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && !$("pop").hidden) hidePop();
  });
  window.addEventListener("scroll", function () { if (!pinned) hidePop(); }, true);
}

/* ═══ ARRASTE DIRETO NAS CURVAS ═══ */
/* Empurrar a IS muda G; empurrar a LM muda M (ou a meta ī).
   O equilíbrio nunca é arrastável: ele é resultado, não entrada. */

function setupDrag() {
  var svg = $("chart"), drag = null;

  function toModel(ev) {
    var r = svg.getBoundingClientRect();
    if (!r.width) return null;
    var px = (ev.clientX - r.left) / r.width * VB.w;
    var py = (ev.clientY - r.top) / r.height * VB.h;
    if (px < PLOT.x - 2 || px > PLOT.x + PLOT.w + 2 || py < PLOT.y - 2 || py > PLOT.y + PLOT.h + 2) return null;
    return { Y:ix(px), i:iy(py) };
  }

  svg.addEventListener("pointerdown", function (ev) {
    var g = ev.target.closest && ev.target.closest(".grp");
    if (!g) return;
    var pt = toModel(ev);
    if (!pt) return;
    beginGesture();
    setTab(g.dataset.curve);                    // arrastar a curva abre a aba dela
    drag = { curve:g.dataset.curve, Y0:pt.Y, i0:pt.i, G0:state.G, M0:state.M, IB0:state.ibar };
    svg.setPointerCapture(ev.pointerId);
    ev.preventDefault();
  });

  svg.addEventListener("pointermove", function (ev) {
    if (!drag) return;
    var pt = toModel(ev);
    if (!pt) return;
    if (drag.curve === "IS") {
      // deslocar a IS em ΔY exige ΔG = ΔY·(1−c)
      setParam("G", clampP(P_BY_ID.G, drag.G0 + (pt.Y - drag.Y0) * (1 - state.c)));
    } else if (mode === "juros") {
      setParam("ibar", clampP(P_BY_ID.ibar, drag.IB0 + (pt.i - drag.i0)));
    } else {
      // deslocar a LM em ΔY exige Δ(M/P) = ΔY·k, logo ΔM = ΔY·k·P
      setParam("M", clampP(P_BY_ID.M, drag.M0 + (pt.Y - drag.Y0) * state.k * state.P));
    }
  });

  svg.addEventListener("pointerup", function (ev) {
    if (drag) { try { svg.releasePointerCapture(ev.pointerId); } catch (e) {} }
    drag = null;
    endGesture();
  });
}

/* ═══ PARTIDA ═══ */

$("labY").innerHTML = term("renda", "Renda de equilíbrio · Y*");
$("labI").innerHTML = term("juro", 'Juro de equilíbrio · <span class="sym">i*</span>');
$("labK").innerHTML = term("demanda-agregada", "Composição da demanda");
$("meterCap").innerHTML = "De cada R$&nbsp;1 de " + term("impulso-fiscal", "impulso fiscal") +
  ", quanto chega à renda e quanto some por " + term("crowding-out", "crowding out") + ":";

buildPanels();
setupTabs();
setupRegime();
buildScenarios();
markScenario();
setupDrag();
setupTerms();
$("resetBtn").addEventListener("click", function () { applyScenario(SCENARIOS[0], true); });
render();
