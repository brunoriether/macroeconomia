"use strict";
/* ═══════════════════════════════════════════════════════════════════════
   BÚSSOLA MACRO — MODELO SIMPLIFICADO (cruz keynesiana / renda-despesa)

   O modelo da primeira aula: o produto é determinado pela demanda, e ponto.
   Não existe juro, não existe moeda, não existe sensibilidade. O que existe
   é o multiplicador.

     DA(Y) = C + I + G,  com C = C₀ + c(Y − T)  e  I = I₀ (dado)
     Equilíbrio: Y = DA(Y)   ⇒   Y* = A/(1 − c),  com A = C₀ − cT + I₀ + G

   O baseline cai exatamente no mesmo ponto do modelo intermediário
   (Y = 1.000, C = 600, I = 150, G = 250), para que trocar de modelo mostre
   a mesma economia sob outra lente — e não uma economia diferente.
   ═══════════════════════════════════════════════════════════════════════ */

var MODELO_SIMPLES = (function () {

var EPS = 1e-9;

var MONEY = { pre:"R$ ", suf:" bi", name:"R$ bilhões" };
var PURE  = { name:"adimensional" };

var PARAMS = [
  { id:"C0", sym:"C₀", curve:"DA", u:MONEY, label:"Consumo autônomo", min:0, max:400, step:5, base:120,
    desc:"O piso do consumo, que existe mesmo com renda zero. O consumo realizado é bem maior: C = C₀ + c(Y − T).",
    eff:"↑ desloca a reta de demanda para cima: Y sobe pelo multiplicador." },

  { id:"c", sym:"c", curve:"DA", u:PURE, label:"Propensão marginal a consumir", min:0.10, max:0.90, step:0.01, base:0.60, dec:2,
    desc:"De cada real a mais de renda disponível, quanto vira consumo. O resto vira poupança. É o que define o tamanho do multiplicador.",
    eff:"↑ inclina a reta de demanda: cada rodada de gasto devolve mais, e o multiplicador cresce." },

  { id:"I0", sym:"I₀", curve:"DA", u:MONEY, label:"Investimento", min:0, max:600, step:10, base:150,
    desc:"O que as empresas investem. Aqui é um número dado de fora — no modelo intermediário ele passa a depender do juro.",
    eff:"↑ desloca a reta de demanda para cima: Y sobe pelo multiplicador." },

  { id:"G", sym:"G", curve:"DA", u:MONEY, label:"Gastos do governo", min:0, max:800, step:10, base:250,
    desc:"Compras de bens e serviços pelo governo. Entram direto na demanda agregada, sem passar pela renda das famílias.",
    eff:"↑ desloca a reta de demanda para cima na altura exata de ΔG." },

  { id:"T", sym:"T", curve:"DA", u:MONEY, label:"Tributos", min:0, max:800, step:10, base:200,
    desc:"Impostos líquidos de transferências. Cortam a renda disponível antes de ela virar consumo, então batem na demanda de forma indireta.",
    eff:"↑ desloca a reta para baixo em c·ΔT — menos que um corte de gasto do mesmo tamanho." }
];

var P_BY_ID = {};
PARAMS.forEach(function (p) { P_BY_ID[p.id] = p; });

var GROUPS = [
  { title:"Consumo e investimento", ids:["C0","c","I0"] },
  { title:"Política fiscal",        ids:["G","T"] }
];

function baseState() {
  var s = {};
  PARAMS.forEach(function (p) { s[p.id] = p.base; });
  return s;
}

function solve(s) {
  var A = s.C0 - s.c * s.T + s.I0 + s.G;        // gasto autônomo: o intercepto da reta DA
  var out = { A:A, ok:(1 - s.c) > EPS };

  out.Y = out.ok ? A / (1 - s.c) : NaN;
  out.mult = out.ok ? 1 / (1 - s.c) : Infinity;

  out.C = s.C0 + s.c * (out.Y - s.T);
  out.I = s.I0;
  out.G = s.G;
  out.Yd = out.Y - s.T;                         // renda disponível
  out.S = out.Yd - out.C;                       // poupança privada
  out.Spub = s.T - s.G;                         // resultado do governo
  out.multT = out.ok ? -s.c / (1 - s.c) : -Infinity;

  // a reta de demanda agregada, em DA = A + c·Y
  out.DA = { m:s.c, q:A };
  return out;
}

/* As rodadas do multiplicador: de onde vem o 1/(1−c).
   Um gasto novo de `imp` vira renda de alguém, que gasta c disso, e assim por
   diante. `n` rodadas explícitas mais o resto da série. */
function rodadas(c, imp, n) {
  var out = [], acum = 0;
  for (var i = 0; i < n; i++) {
    var v = imp * Math.pow(c, i);
    out.push({ i:i + 1, v:v });
    acum += v;
  }
  var total = imp / (1 - c);
  return { rodadas:out, resto:total - acum, total:total };
}

/* ═══ TERMOS ═══ */

var TERMS = {
  "cruz-keynesiana": { t:"Cruz keynesiana", d:"O diagrama deste modelo: a reta de demanda agregada cruzando a reta de 45°. O produto se acomoda onde o que se demanda é exatamente o que se produz." },
  "linha-45": { t:"Reta de 45°", d:"A reta em que a demanda é igual ao produto. Não é uma curva do modelo: é a condição de equilíbrio desenhada. Só nela o que as pessoas querem comprar coincide com o que foi produzido." },
  "demanda-agregada": { t:"Demanda agregada (DA)", d:"Soma do que famílias, empresas e governo querem comprar: C + I + G. Neste modelo é ela, sozinha, que determina o produto." },
  "equilibrio-renda": { t:"Equilíbrio de renda e despesa", d:"O ponto em que Y = DA. Acima dele as empresas vendem menos do que produziram e cortam produção; abaixo, os estoques somem e elas produzem mais. O ajuste é por quantidade, não por preço." },
  "multiplicador": { t:"Multiplicador", d:"Quantas vezes um gasto novo se amplia na renda total, porque o gasto de um vira renda de outro, que gasta parte dela, e assim por diante. Vale 1/(1−c): com c = 0,60, cada real vira R$ 2,50." },
  "renda-disponivel": { t:"Renda disponível", d:"A renda que sobra para as famílias depois dos impostos: Y menos T. É sobre ela que a propensão marginal a consumir age." },
  "gasto-autonomo": { t:"Gasto autônomo (A)", d:"A parte da demanda que não depende da renda: C₀ − cT + I₀ + G. É o intercepto da reta de demanda, e o produto de equilíbrio é exatamente A dividido por (1−c)." },
  "poupanca": { t:"Poupança privada", d:"A parte da renda disponível que as famílias não consomem. No equilíbrio, poupança privada mais resultado do governo é igual ao investimento." },
  "paradoxo": { t:"Paradoxo da parcimônia", d:"Se todos decidem poupar mais ao mesmo tempo, a demanda cai, a renda cai — e a poupança agregada pode nem aumentar. O que é prudente para uma família não é para o país inteiro." },
  "haavelmo": { t:"Teorema do orçamento equilibrado", d:"Subir gasto e imposto no mesmo valor não é neutro: o produto sobe exatamente o valor do gasto extra. O governo gasta 100 % do que tira, enquanto a família só teria gasto a fração c." },
  "consumo-induzido": { t:"Consumo induzido", d:"A parte do consumo que responde à renda: c·(Y − T). É o que dá inclinação à reta de demanda e faz o multiplicador existir." }
};

PARAMS.forEach(function (p) {
  TERMS["p:" + p.id] = { t:p.label + " (" + p.sym + ")", u:p.u.name, d:p.desc, param:p.id };
});

/* ═══ CADEIAS DE TRANSMISSÃO ═══ */
/* Sem juro e sem moeda, toda cadeia termina no multiplicador. É essa
   simplicidade que o modelo intermediário depois complica. */

function T(t, d, curve, tm) { return { t:t, d:d, curve:curve, term:tm }; }
function SH(d) { return { t:"a reta DA desloca", d:d, shiftV:true, curve:"DA", term:"demanda-agregada" }; }
function RO(f) { return { t:"a reta DA gira", flat:f, rot:true, curve:"DA", term:"multiplicador" }; }

var CHAINS = {
  C0: [ T("consumo autônomo",1), T("demanda agregada",1,null,"demanda-agregada"), SH(1), T("Y",1), T("consumo induzido",1,null,"consumo-induzido"), T("multiplicador em ação",0,null,"multiplicador") ],
  c:  [ T("consumo por real de renda",1,null,"consumo-induzido"), RO(false), T("multiplicador 1/(1−c)",1,null,"multiplicador"), T("Y",1) ],
  I0: [ T("investimento",1), T("demanda agregada",1,null,"demanda-agregada"), SH(1), T("Y",1), T("consumo induzido",1,null,"consumo-induzido") ],
  G:  [ T("gasto público",1), T("demanda agregada",1,null,"demanda-agregada"), SH(1), T("Y",1), T("multiplicador cheio: nada freia",0,null,"multiplicador") ],
  T:  [ T("renda disponível",-1,null,"renda-disponivel"), T("consumo",-1,null,"consumo-induzido"), SH(-1), T("Y",-1) ]
};

/* ═══ CENÁRIOS ═══ */

var SCENARIOS = [
  { id:"base", section:"Ponto de partida", name:"A economia em repouso", set:{},
    story:"Nada aconteceu ainda. A economia produz 1.000, dos quais 600 são consumo das famílias, 150 investimento das empresas e 250 gasto do governo.",
    watch:"Nada se deslocou: a reta de demanda cruza a de 45 graus em Y* = 1.000. Fixe a diferença que confunde: C₀ = 120 é o controle, o consumo autônomo; os 600 do painel são o consumo realizado, C = C₀ + c(Y − T). Sem juro, investimento autônomo e realizado valem 150." },

  { id:"obras", section:"Decisões de política", name:"Pacote de obras", set:{ G:450 },
    story:"Passada a recessão, o governo anuncia o maior programa de obras da década: pontes, saneamento, moradia popular. Ninguém mexe em imposto — a conta vai para a dívida.",
    watch:"A reta sobe 200, a altura exata do gasto novo, e o cruzamento anda para Y* = 1.500. O produto ganhou 500 porque 2,50 × 200: cada real de obra vira renda, que vira consumo, sem nada para frear a cadeia. No modelo intermediário o mesmo pacote sobe só 222." },

  { id:"conta", section:"Decisões de política", name:"A conta chegou", set:{ T:380 },
    story:"Para estancar a dívida, o Congresso aprova uma alta de tributos de quase o dobro, sem cortar um centavo de gasto. O superávit volta; o humor da economia, não.",
    watch:"Repare no tamanho da queda: 108, não os 180 de imposto novo. O tributo entra pela renda disponível, e a família absorve os 40 % que teria poupado; só 60 % viram menos consumo. Daí Y* cair para 730, com multiplicador tributário de −1,50 em vez de −2,50." },

  { id:"haavelmo", section:"Decisões de política", name:"Gastar mais e cobrar mais", set:{ G:400, T:350 },
    story:"Novo pacote: mais 150 em gastos, financiados por mais 150 em impostos. Déficit zero. Na coletiva, o ministro garante que é neutro para a economia.",
    watch:"Duas mudanças de uma vez: a reta sobe pelos 150 de gasto e desce pelo imposto, e o saldo líquido leva Y* a 1.150. O ganho é +150, o valor do gasto extra — multiplicador 1, o teorema de Haavelmo exato, porque não há juro reagindo. No intermediário o mesmo pacote rende +67." },

  { id:"confianca", section:"Choques", name:"Espíritos animais em fuga", set:{ I0:60 },
    story:"O índice de confiança do empresariado despenca. Sem que juro ou imposto tenham mudado, as empresas simplesmente engavetam a maior parte dos projetos.",
    watch:"Desta vez a reta desce, e desce 90 — o tamanho do corte no investimento, de 150 para 60. O produto perde 225, 2,50 vezes o choque: é o multiplicador ao contrário, cada corte virando menos renda para o vizinho, que corta também. Mesmo mecanismo das obras, sinal trocado." },

  { id:"parcimonia", section:"Choques", name:"Todo mundo resolveu poupar", set:{ c:0.45 },
    story:"Depois do susto, as famílias decidem guardar mais e gastar menos. Individualmente é prudência. Somado, é outra coisa.",
    watch:"O que mudou foi a inclinação: a reta girou e ficou mais rasa. Com c em 0,45, cada real de renda devolve menos consumo ao circuito e o multiplicador encolhe de 2,50 para 1,82, levando Y* a 782. Paradoxo da parcimônia: poupar mais é prudente para uma família e contracionista para o país." }
];

return {
  id:"simples", EPS:EPS, PARAMS:PARAMS, P_BY_ID:P_BY_ID, GROUPS:GROUPS,
  baseState:baseState, solve:solve, rodadas:rodadas,
  TERMS:TERMS, CHAINS:CHAINS, SCENARIOS:SCENARIOS
};

})();
