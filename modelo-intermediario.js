"use strict";
/* ═══════════════════════════════════════════════════════════════════════
   BÚSSOLA MACRO — MODELO INTERMEDIÁRIO (IS-LM)

   Entram o juro e o mercado de moeda. O investimento deixa de ser um número
   dado e passa a reagir ao custo do crédito — e é por isso que a política
   fiscal passa a ter de disputar espaço com o investimento privado.

   Bens   : Y = C + I + G,   C = C₀ + c(Y − T),   I = I₀ − b·i
   Moeda  : M/P = k·Y − h·i
   IS     : (1 − c)·Y = A − b·i,   com A = C₀ − cT + I₀ + G
   ═══════════════════════════════════════════════════════════════════════ */

var MODELO_INTER = (function () {

var EPS = 1e-9;

/* Unidades. `pre`/`suf` montam o valor exibido; `name` aparece no popover.
   O que é adimensional não recebe marcação — é isso que a unidade diz. */
var MONEY = { pre:"R$ ", suf:" bi",      name:"R$ bilhões" };
var SENS  = { pre:"R$ ", suf:" bi/p.p.", name:"R$ bilhões por ponto percentual de juro" };
var PCT   = { suf:" %",                  name:"por cento ao ano" };
var PURE  = { name:"adimensional" };

var PARAMS = [
  { id:"C0", sym:"C₀", curve:"IS", u:MONEY, label:"Consumo autônomo", min:0, max:400, step:5, base:120,
    desc:"O piso do consumo, que existe mesmo com renda zero. O consumo realizado é bem maior: C = C₀ + c(Y − T).",
    eff:"↑ desloca a IS para a direita: Y e i sobem.",
    effMeta:"↑ desloca a IS para a direita: Y sobe, o juro fica na meta." },

  { id:"c", sym:"c", curve:"IS", u:PURE, label:"Propensão marginal a consumir", min:0.10, max:0.90, step:0.01, base:0.60, dec:2,
    desc:"De cada real a mais de renda disponível, quanto vira consumo. O resto vira poupança. É o motor do multiplicador.",
    eff:"↑ achata a IS e a empurra à direita.",
    effMeta:"↑ achata a IS: o multiplicador age inteiro, sem freio do juro." },

  { id:"I0", sym:"I₀", curve:"IS", u:MONEY, label:"Investimento autônomo", min:0, max:800, step:10, base:400,
    desc:"O quanto as empresas investiriam com juro zero. O investimento realizado é menor: I = I₀ − b·i, já descontado o custo do crédito.",
    eff:"↑ desloca a IS para a direita: Y e i sobem.",
    effMeta:"↑ desloca a IS para a direita: Y sobe, o juro fica na meta." },

  { id:"b", sym:"b", curve:"IS", u:SENS, label:"Sensibilidade do investimento ao juro", min:0, max:150, step:5, base:50,
    desc:"Quantos R$ bi de investimento se perdem a cada ponto percentual a mais de juro. É o que define a inclinação da IS.",
    eff:"↑ achata a IS: a política fiscal perde força, a monetária ganha.",
    effMeta:"↑ faz o investimento reagir mais à meta: com ī acima de zero, Y cai." },

  { id:"G", sym:"G", curve:"IS", u:MONEY, label:"Gastos do governo", min:0, max:800, step:10, base:250,
    desc:"Compras de bens e serviços pelo governo. Entram direto na demanda agregada, sem passar pela renda das famílias.",
    eff:"↑ desloca a IS para a direita e puxa o juro junto.",
    effMeta:"↑ desloca a IS com o multiplicador cheio — sem crowding out." },

  { id:"T", sym:"T", curve:"IS", u:MONEY, label:"Tributos", min:0, max:800, step:10, base:200,
    desc:"Impostos líquidos de transferências. Cortam a renda disponível antes de ela virar consumo, então batem na demanda de forma indireta.",
    eff:"↑ desloca a IS para a esquerda, com força menor que a de G.",
    effMeta:"↑ desloca a IS para a esquerda, e o juro não cai para amortecer." },

  { id:"M", sym:"M", curve:"LM", u:MONEY, label:"Oferta de moeda", min:0, max:800, step:10, base:300,
    desc:"O estoque nominal de moeda em circulação. Sob meta de moeda é o instrumento do Banco Central; sob meta de juros, vira resultado.",
    eff:"↑ desloca a LM para a direita: o juro cai e Y sobe.",
    effMeta:"Virou resultado: o BC entrega a moeda que o mercado pedir." },

  { id:"ibar", sym:"ī", curve:"LM", u:PCT, label:"Meta de juros do Banco Central", min:0, max:15, step:0.25, base:5.00, dec:2,
    desc:"A taxa que o Banco Central anuncia e se compromete a sustentar — a Selic. Para mantê-la, fornece ou enxuga a moeda que for preciso.",
    eff:"Aqui é resultado: sai do cruzamento das duas curvas.",
    effMeta:"↑ encarece o crédito: o investimento cai e Y cai pelo multiplicador." },

  { id:"P", sym:"P", curve:"LM", u:PURE, label:"Nível de preços", min:0.40, max:2.50, step:0.05, base:1.00, dec:2,
    desc:"Índice geral de preços, exógeno no curto prazo. Só entra dividindo M: o que a LM enxerga é a oferta real M/P.",
    eff:"↑ encolhe M/P e desloca a LM para a esquerda.",
    effMeta:"↑ exige mais moeda nominal para o mesmo M/P. Não mexe em Y." },

  { id:"k", sym:"k", curve:"LM", u:PURE, label:"Demanda de moeda por renda", min:0.15, max:1.20, step:0.05, base:0.60, dec:2,
    desc:"Quanta moeda se quer reter por real de renda, para fazer transações. É o motivo transação da demanda por moeda.",
    eff:"↑ deixa a LM mais vertical: o produto responde menos.",
    effMeta:"↑ exige mais moeda para o mesmo Y. Não mexe em Y." },

  { id:"h", sym:"h", curve:"LM", u:SENS, label:"Demanda de moeda por juro", min:0, max:240, step:5, base:60,
    desc:"Quanta moeda se deixa de reter a cada ponto percentual de juro — juro alto é o custo de ficar líquido. É o motivo especulação.",
    eff:"↑ achata a LM rumo à armadilha; ↓ a verticaliza rumo ao caso clássico.",
    effMeta:"↑ reduz a moeda necessária para sustentar a meta. Não mexe em Y." }
];

var P_BY_ID = {};
PARAMS.forEach(function (p) { P_BY_ID[p.id] = p; });

/* Uma aba por curva, com grupos curtos: assim nenhum controle fica longe do
   gráfico. O ponto do app é mexer e ver a curva ao mesmo tempo. */
var TABS = {
  IS: { groups:[ { title:"Demanda", ids:["C0","c","I0","b"] },
                 { title:"Política fiscal", ids:["G","T"] } ] },
  LM: { groups:[ { title:"Instrumento do Banco Central", regime:true, ids:["M","ibar"] },
                 { title:"Demanda por moeda", ids:["P","k","h"] } ] }
};

function baseState() {
  var s = {};
  PARAMS.forEach(function (p) { s[p.id] = p.base; });
  return s;
}

/* Regime monetário — quem o Banco Central escolhe controlar:
     "moeda" = IS-LM de Hicks: fixa M, o juro sai do cruzamento.
     "juros" = IS-MP (Romer, 2000): fixa ī, a LM vira horizontal e a moeda vira endógena.
   Quem guarda o regime corrente é a página; aqui ele é sempre um argumento. */
function solve(s, md) {
  md = md || "moeda";
  var A = s.C0 - s.c * s.T + s.I0 + s.G;          // gasto autônomo
  var out = { A:A, ok:true, mode:md };

  if (md === "juros") {
    var rb = s.ibar;
    out.i  = rb;
    out.Y  = (1 - s.c) > EPS ? (A - s.b * rb) / (1 - s.c) : NaN;
    out.mp = s.k * out.Y - s.h * rb;              // moeda que o BC PRECISA entregar
    out.ok = isFinite(out.Y);
    out.multFiscal = 1 / (1 - s.c);               // multiplicador cheio
    out.multMoney  = 0;                           // emitir moeda não move Y: o BC já acomoda
    out.crowding   = 0;                           // o juro não sobe, logo não desloca investimento
    out.LM = { m:0, q:rb, pegged:true };
  } else {
    var mp  = s.M / Math.max(s.P, 1e-6);          // oferta real de moeda
    var den = s.h * (1 - s.c) + s.b * s.k;
    out.mp = mp; out.den = den;
    if (Math.abs(den) < EPS) {                    // IS e LM ambas verticais
      out.ok = false; out.Y = NaN; out.i = NaN;
    } else {
      out.Y = (s.h * A + s.b * mp) / den;
      // forma fechada que NÃO divide por h: vale também no caso clássico h = 0
      out.i = (s.k * A - (1 - s.c) * mp) / den;
    }
    out.multFiscal = s.h / den;                   // dY*/dG
    out.multMoney  = s.b / den;                   // dY*/d(M/P)
    out.crowding   = den === 0 ? 1 : (s.b * s.k) / den;
    out.LM = s.h > EPS ? { m:s.k / s.h, q:-mp / s.h }
                       : { vertical:true, at: s.k > EPS ? mp / s.k : NaN };
  }

  out.C = s.C0 + s.c * (out.Y - s.T);
  out.I = s.I0 - s.b * out.i;
  out.S = out.Y - s.T - out.C;
  out.multSimple = 1 / (1 - s.c);                 // 1/(1−c), sem freio monetário

  // a IS não depende do regime: só o lado monetário muda
  out.IS = s.b > EPS ? { m:-(1 - s.c) / s.b, q:A / s.b }
                     : { vertical:true, at:(1 - s.c) > EPS ? A / (1 - s.c) : NaN };
  return out;
}

/* ═══ TERMOS — definição sob demanda, no lugar de um glossário empurrado ═══ */

var TERMS = {
  "curva-is": { t:"Curva IS", d:"Todas as combinações de renda e juro que equilibram o mercado de bens: o que se produz é igual ao que se demanda. Inclinação negativa, porque juro menor estimula o investimento e, com ele, a renda." },
  "curva-lm": { t:"Curva LM", d:"Todas as combinações de renda e juro que equilibram o mercado de moeda. Inclinação positiva, porque renda maior exige mais moeda para transações e pressiona o juro." },
  "equilibrio": { t:"Equilíbrio de curto prazo", d:"O cruzamento das duas curvas: o único par (Y*, i*) em que os mercados de bens e de moeda estão equilibrados ao mesmo tempo, com os preços dados." },
  "renda": { t:"Renda de equilíbrio (Y*)", d:"O produto no ponto em que os dois mercados se equilibram. É resultado do modelo, nunca entrada — por isso o ponto não é arrastável no gráfico, embora as curvas sejam." },
  "juro": { t:"Juro de equilíbrio (i*)", d:"A taxa que zera o excesso de demanda por moeda no nível de renda Y*. Sob meta de juros ela deixa de ser resultado e passa a ser escolhida pelo Banco Central." },
  "demanda-agregada": { t:"Demanda agregada", d:"Soma do que famílias, empresas e governo querem comprar: C + I + G. É ela que determina o produto no curto prazo." },
  "renda-disponivel": { t:"Renda disponível", d:"A renda que sobra para as famílias depois dos impostos: Y menos T. É sobre ela que a propensão marginal a consumir age." },
  "multiplicador": { t:"Multiplicador", d:"Quantas vezes um aumento inicial de gasto se amplia na renda total, porque o gasto de um vira renda de outro. Quanto maior c, maior o multiplicador. O multiplicador simples 1/(1−c) só vale se o juro ficar parado." },
  "crowding-out": { t:"Efeito deslocamento (crowding out)", d:"Quando o gasto público eleva o juro e derruba o investimento privado. Parte do estímulo fiscal é anulada antes de virar renda. Sob meta de juros ele desaparece, porque o juro não sobe." },
  "impulso-fiscal": { t:"Impulso fiscal", d:"Qualquer aumento de gasto público ou corte de imposto que desloque a curva IS para a direita." },
  "politica-fiscal": { t:"Política fiscal", d:"Uso de gastos e tributos para mover a demanda agregada. No gráfico, aparece como deslocamento da curva IS." },
  "politica-monetaria": { t:"Política monetária", d:"Uso da moeda ou do juro pelo Banco Central. No gráfico, aparece como deslocamento da curva LM." },
  "armadilha": { t:"Armadilha da liquidez", d:"Juro tão baixo que as pessoas retêm qualquer moeda extra. A LM fica quase horizontal: emitir moeda não reduz mais o juro, e só a política fiscal funciona. Japão pós-1990, mundo pós-2008." },
  "classico": { t:"Caso clássico", d:"A demanda de moeda quase não reage ao juro (h próximo de zero). A LM fica vertical: a renda é fixada pela moeda real e o gasto público só eleva o juro, sem mexer no produto." },
  "oferta-real": { t:"Oferta real de moeda (M/P)", d:"M dividido por P: o poder de compra da moeda em circulação. É ela, e não a quantia nominal, que importa para o equilíbrio monetário — dobrar M e dobrar P deixa a LM exatamente no mesmo lugar." },
  "meta-juros": { t:"Meta de juros (IS-MP)", d:"Regime em que o Banco Central fixa a taxa e fornece toda a moeda demandada àquele preço. A LM vira horizontal, a moeda vira resultado e o crowding out desaparece. É como os bancos centrais operam de verdade desde os anos 1990 — o Copom anuncia a Selic, não quantos reais vai emitir." },
  "gasto-autonomo": { t:"Gasto autônomo (A)", d:"A parte da demanda que não depende da renda: C₀ − cT + I₀ + G. É o que desloca a curva IS horizontalmente, na razão ΔA/(1−c)." },
  "motivo-transacao": { t:"Motivo transação", d:"A moeda que se retém simplesmente para pagar contas, proporcional à renda. É o termo k·Y da demanda por moeda." },
  "motivo-especulacao": { t:"Motivo especulação", d:"A moeda que se deixa de reter quando o juro sobe, porque ficar líquido passa a custar caro. É o termo −h·i da demanda por moeda." }
};

// cada parâmetro também é um termo, com sua própria definição e unidade
PARAMS.forEach(function (p) {
  TERMS["p:" + p.id] = { t:p.label + " (" + p.sym + ")", u:p.u.name, d:p.desc, param:p.id };
});

/* ═══ CADEIAS DE TRANSMISSÃO ═══ */

function T(t, d, curve, tm) { return { t:t, d:d, curve:curve, term:tm }; }
function SH(c, d) { return { t:c + " desloca", d:d, shift:true, curve:c, term:c === "IS" ? "curva-is" : "curva-lm" }; }
function RO(c, f) { return { t:c + " gira", flat:f, rot:true, curve:c, term:c === "IS" ? "curva-is" : "curva-lm" }; }

var CHAINS = {
  C0: [ T("consumo autônomo",1), T("demanda agregada",1,null,"demanda-agregada"), SH("IS",1), T("Y",1), T("demanda por moeda",1), T("i",1), T("I",-1) ],
  c:  [ T("consumo por real de renda",1), T("multiplicador",1,null,"multiplicador"), RO("IS",true), T("Y",1), T("i",1), T("I",-1) ],
  I0: [ T("investimento autônomo",1), T("demanda agregada",1,null,"demanda-agregada"), SH("IS",1), T("Y",1), T("i",1), T("I",-1) ],
  b:  [ T("reação do investimento ao juro",1), RO("IS",true), T("crowding out",1,null,"crowding-out"), T("força da política fiscal",-1,null,"politica-fiscal") ],
  G:  [ T("demanda agregada",1,null,"demanda-agregada"), SH("IS",1), T("Y",1), T("demanda por moeda",1), T("i",1), T("I",-1) ],
  T:  [ T("renda disponível",-1,null,"renda-disponivel"), T("consumo",-1), SH("IS",-1), T("Y",-1), T("i",-1), T("I",1) ],
  M:  [ T("oferta real M/P",1,null,"oferta-real"), SH("LM",1), T("i",-1), T("I",1), T("Y",1) ],
  ibar:[ T("sem efeito: aqui o juro é resultado",0,null,"juro") ],
  P:  [ T("oferta real M/P",-1,null,"oferta-real"), SH("LM",-1), T("i",1), T("I",-1), T("Y",-1) ],
  k:  [ T("moeda por real de renda",1,null,"motivo-transacao"), RO("LM",false), T("i",1), T("Y",-1) ],
  h:  [ T("sensibilidade da moeda ao juro",1,null,"motivo-especulacao"), RO("LM",true), T("crowding out",-1,null,"crowding-out"), T("força da política fiscal",1,null,"politica-fiscal") ]
};

/* Sob meta de juros o elo "Y sobe → i sobe → I cai" simplesmente não existe:
   o Banco Central acomoda a demanda por moeda e o juro fica onde ele decidiu. */
var CHAINS_META = {
  C0: [ T("consumo autônomo",1), T("demanda agregada",1,null,"demanda-agregada"), SH("IS",1), T("Y",1), T("o BC entrega a moeda",0,"LM","meta-juros"), T("i fica na meta",0) ],
  c:  [ T("consumo por real de renda",1), T("multiplicador",1,null,"multiplicador"), RO("IS",true), T("Y",1), T("i fica na meta",0) ],
  I0: [ T("investimento autônomo",1), T("demanda agregada",1,null,"demanda-agregada"), SH("IS",1), T("Y",1), T("i fica na meta",0) ],
  b:  [ T("reação do investimento ao juro",1), RO("IS",true), T("investimento ao juro da meta",-1), T("Y",-1) ],
  G:  [ T("demanda agregada",1,null,"demanda-agregada"), SH("IS",1), T("Y",1), T("demanda por moeda",1), T("o BC emite para segurar ī",0,"LM","meta-juros"), T("sem crowding out",0,null,"crowding-out") ],
  T:  [ T("renda disponível",-1,null,"renda-disponivel"), T("consumo",-1), SH("IS",-1), T("Y",-1), T("i fica na meta",0) ],
  M:  [ T("sem efeito: a moeda virou resultado",0,"LM","meta-juros") ],
  ibar:[ T("a LM sobe até a nova meta",1,"LM","curva-lm"), T("custo do crédito",1), T("investimento",-1), T("Y",-1), T("moeda necessária",-1,"LM") ],
  P:  [ T("moeda nominal que o BC precisa emitir",1,"LM","oferta-real"), T("Y não muda",0) ],
  k:  [ T("moeda por real de renda",1,null,"motivo-transacao"), T("o BC precisa emitir mais",1,"LM"), T("Y não muda",0) ],
  h:  [ T("sensibilidade da moeda ao juro",1,null,"motivo-especulacao"), T("moeda necessária",-1,"LM"), T("Y não muda",0) ]
};

/* ═══ CENÁRIOS ═══ */
/* Cada cenário conta o que ACONTECEU (story) e faz a ponte para a mecânica do
   modelo (watch). Todos os números citados foram conferidos contra o
   solucionador — inclusive os que aparecem no meio das frases. */

var SCENARIOS = [
  { id:"base", section:"Ponto de partida", mode:"moeda", name:"A economia em repouso", set:{},
    story:"Nenhum pacote novo, nenhuma crise, nenhuma reunião extraordinária do Copom. A economia opera no ritmo de sempre, e é deste ponto que todos os outros cenários partem.",
    watch:"Nenhuma curva se moveu: este é o equilíbrio de partida. C₀ = 120 e I₀ = 400 são os controles autônomos; 600 e 150 são o consumo realizado, que soma 0,60 de cada real de renda disponível, e o investimento realizado, já descontado o juro de 5,00 %." },

  { id:"confianca", section:"Choques", mode:"moeda", name:"O ano dos projetos engavetados", set:{ I0:220 },
    story:"Dois trimestres de manchete ruim e uma eleição apertada bastaram para os conselhos das grandes empresas engavetarem expansão. A montadora adiou a segunda linha de produção e a encomenda de máquina parou de chegar.",
    watch:"A IS recuou para a esquerda e o equilíbrio desceu sobre a LM: produto 800, juro 3,00 %. Renda menor significa menos demanda por moeda, então o juro cede sozinho, sem ação do BC, e amortece a queda — o investimento realizado para em 70. Sob meta de juros, o produto iria a 550.",
    watchBasico:"A IS recuou para a esquerda e o equilíbrio desceu sobre a LM: produto 800, juro 3,00 %. Renda menor significa menos demanda por moeda, então o juro cede sozinho, sem ação do Banco Central, e amortece a queda — o investimento realizado para em 70." },

  { id:"inflacao", section:"Choques", mode:"moeda", name:"A nota de cem encolheu", set:{ P:1.40 },
    story:"Seca nas hidrelétricas e câmbio pressionado empurraram energia, frete e alimento juntos. Em um ano os preços subiram 40 %, e a nota de cem passou a comprar 70 % do carrinho anterior. O dinheiro na conta não mudou de número, mudou de tamanho.",
    watch:"Quem se deslocou foi a LM, para a esquerda: a oferta real de moeda caiu de 300 para 214, o juro subiu a 5,63 % e o produto ficou em 921. Repare no limite do modelo: P entra como dado. O IS-LM mostra o canal monetário da inflação, não a causa dela." },

  { id:"bolha", section:"Choques", mode:"moeda", name:"Crédito barato sem tomador", set:{ h:240, k:0.35, b:30, I0:90, M:160 },
    story:"A bolha de ativos estourou num feriado e levou junto o balanço de meia dúzia de bancos médios. Seis meses depois, a taxa do crédito era a menor da história e as filas não apareciam: empresário endividado quer pagar dívida, não abrir fábrica.",
    watch:"Olhe a inclinação da LM: quase deitada, porque a demanda por moeda passou a reagir muito ao juro e pouco à renda. O juro engole só 9,9 % do impulso fiscal, não 55,6 %, e o multiplicador vai a 2,25. Teste: moeda de 160 para 460 rende 85; gasto de 250 para 450 rende 451." },

  { id:"boom", section:"Choques", mode:"moeda", name:"A corrida dos galpões", set:{ I0:620 },
    story:"Uma nova geração de equipamento derrubou o custo de automatizar, e todo mundo quis estar dentro. Três grupos anunciaram centros de processamento no mesmo mês e a indústria de bens de capital vendeu dois anos de produção adiantados. O governo não gastou um real a mais.",
    watch:"O deslocamento veio da IS, para a direita, e o equilíbrio subiu pela LM: produto 1.244, juro 7,44 %. Mesmo com o juro mais alto, o investimento realizado sobe de 150 para 248, porque o autônomo saltou de 400 para 620. A IS não distingue demanda privada de pública." },

  { id:"obras", section:"Decisões de política", mode:"moeda", name:"O país vira canteiro", set:{ G:450 },
    story:"Ferrovia no Centro-Oeste, saneamento nas capitais do Nordeste, escolas paradas: o pacote de 200 bilhões saiu do papel sem nenhum imposto novo. O ministro da Fazenda diz que a conta vai para os títulos e que a obra se paga sozinha.",
    watch:"Note o salto da IS, 500 à direita, 2,50 vezes os 200 de gasto, mas o equilíbrio escorregou pela LM até 1.222: 278 do deslocamento evaporaram. O juro em 7,22 % derrubou o investimento realizado de 150 para 39 — 111 expulsos pelo pacote." },

  { id:"conta", section:"Decisões de política", mode:"moeda", name:"O leão aperta o cerco", set:{ T:380 },
    story:"Com a dívida em alta e sem maioria para cortar despesa, o Congresso aprovou um pacote de arrecadação: fim de desonerações, alíquota maior sobre dividendos, tributação de altas rendas. Nenhuma despesa é tocada.",
    watch:"Do lado da IS, um recuo de 270, menos do que um corte de gasto do mesmo tamanho provocaria — o tributo passa antes pela renda disponível e só 60 % dele vira menos consumo. Produto 880, juro 3,80 %, e o investimento realizado sobe de 150 para 210, liberado pelo juro menor." },

  { id:"haavelmo", section:"Decisões de política", mode:"moeda", name:"Neutro no papel", set:{ G:400, T:350 },
    story:"Cento e cinquenta bilhões a mais em custeio, manutenção e compras públicas, bancados por exatos 150 bilhões de tributo novo. O ministro chamou o pacote de neutro, o déficit termina o ano onde começou e o Congresso aprovou em duas semanas.",
    watch:"Os dois controles subiram 150 e a IS ainda assim anda 150 à direita: o governo gasta 100 % do que arrecada, a família gastaria só 60 %. É o teorema de Haavelmo. Mas o produto sobe apenas 67, para 1.067, porque o juro reage e vai a 5,67 %." },

  { id:"aperto", section:"Decisões de política", mode:"moeda", name:"A mesa recolhe o dinheiro", set:{ M:120 },
    story:"Terceiro trimestre seguido de inflação acima do teto, e o Banco Central reagiu sem meias palavras: a mesa de open market vendeu títulos até recolher mais da metade do dinheiro em circulação. Projetos de ampliação voltaram para a gaveta.",
    watch:"Desta vez a curva que anda é a LM, para a esquerda, e o equilíbrio corre sobre a IS parada: produto 833, juro 6,33 %, investimento realizado de 150 para 83. É o espelho exato do pacote de obras, onde a IS andava e o equilíbrio subia pela LM." },

  { id:"corte", section:"Decisões de política", mode:"juros", name:"Copom derruba a meta", set:{ ibar:2 },
    story:"Por unanimidade, o Copom levou a meta de 5 % para 2 %, depois de meses de inflação comportada e atividade fraca. O comunicado foi curto: a taxa fica onde o Banco Central mandar, e a mesa que se vire para entregar.",
    watch:"Sob meta de juros a LM deita na altura escolhida, agora 2,00 %, e o equilíbrio desliza pela IS até 1.375. O investimento realizado dobra, de 150 para 300, e o consumo induzido completa o resto do salto. Para sustentar a meta, o BC levou a moeda real de 300 a 705." },

  { id:"selic", section:"Decisões de política", mode:"juros", name:"Obras com a meta intacta", set:{ G:450, ibar:5 },
    story:"Fazenda e Banco Central apareceram juntos na coletiva, coisa rara o bastante para virar manchete: o pacote de obras de 200 bilhões iria a voto e a meta de juros não mudaria. Nos bastidores discutia-se se era coordenação madura ou um BC abrindo mão de dizer não.",
    watch:"Com o juro cravado em 5,00 %, a IS anda 500 e o produto vai junto, a 1.500: multiplicador cheio de 2,50, investimento realizado intacto em 150. O mesmo pacote com o BC controlando a moeda rendeu só 222 e o juro foi a 7,22 %. O preço: moeda real de 300 a 600." },

  { id:"classico", section:"Mundos teóricos", mode:"moeda", name:"A moeda que só circula", set:{ h:0, M:600 },
    story:"Aqui o dinheiro não espera juro nenhum: sai da conta para pagar salário, insumo e imposto, e o que fica parado depende só do tamanho das transações. É o mundo em que o monetarista aposta quando diz que gasto público não cria renda, só encarece o crédito.",
    watch:"Y* e i* não mudaram, mas a forma da LM sim: virou vertical em 1.000, onde (M/P)/k trava o produto. Sem sensibilidade da demanda por moeda ao juro, o impulso fiscal é engolido por inteiro. Arraste os gastos: a cada 50 a mais, o juro sobe 1 ponto e o produto fica em 1.000." }
];

return {
  id:"intermediario", EPS:EPS, PARAMS:PARAMS, P_BY_ID:P_BY_ID, TABS:TABS,
  baseState:baseState, solve:solve,
  TERMS:TERMS, CHAINS:CHAINS, CHAINS_META:CHAINS_META, SCENARIOS:SCENARIOS
};

})();
