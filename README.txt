===============================================================================
  BÚSSOLA MACRO — simulador interativo de modelos macroeconômicos de curto prazo
===============================================================================

  Criado pelo aluno Bruno Alves Riether
  Matrícula 261012139

===============================================================================


1. O QUE É
-------------------------------------------------------------------------------

Um simulador de macroeconomia que roda no navegador, sem instalar nada e sem
internet (só as fontes vêm da web; sem elas o texto cai para as fontes do
sistema e tudo continua funcionando).

A ideia é ver o modelo se mexer. Você arrasta um parâmetro e as curvas se
deslocam na hora, o equilíbrio anda, e um painel explica a cadeia de causa e
efeito que aquele controle disparou.

São camadas do MESMO modelo, cada uma acrescentando um mercado:

  Nível 1  Cruz keynesiana   — só o mercado de bens. O multiplicador age inteiro.
  Nível 2  IS-LM             — entra o mercado de moeda, o juro e o crowding out.
  Nível 3  Mundell-Fleming   — economia aberta. AINDA NÃO IMPLEMENTADO.

Os três partem da mesma economia (produto 1.000, com consumo 600, investimento
150 e governo 250), de propósito: trocar de nível não troca o país, troca a
lente. O que muda é quanto do estímulo sobrevive — na cruz keynesiana cada real
de gasto público vira R$ 2,50 de produto; no IS-LM, o juro engole mais da
metade e sobram R$ 1,11.


2. COMO USAR
-------------------------------------------------------------------------------

Abra o arquivo  index.html  com duplo clique. Ele é a tela de escolha do modelo.

IMPORTANTE: os arquivos precisam ficar todos na MESMA PASTA. As páginas carregam
o CSS e os modelos de arquivos externos; separá-los quebra tudo.

Dentro de um simulador:

  - Arraste os sliders da coluna da esquerda. O gráfico responde na hora.
  - No nível 2, as ABAS "IS" e "LM" separam os controles por curva. A cor do
    trilho de cada slider diz qual curva ele comanda: azul = IS, laranja = LM.
    A aba ativa também realça a sua curva no gráfico.
  - Passe o mouse (ou clique) em qualquer termo com o ícone ⓘ para abrir a
    definição ali mesmo. Clicar FIXA o balão; Esc fecha.
  - O botão "Cenário" abre um menu com situações prontas, agrupadas em
    Choques, Decisões de política e Mundos teóricos. Cada uma conta uma
    história e diz o que observar no gráfico.
  - Assim que você mexe num slider, o cenário vira "Personalizado" e o
    briefing some — porque a história já não descreve mais o que está na tela.
  - "Ver as contas" abre as equações com os números vivos, agrupadas por
    mercado e coloridas pela curva a que pertencem.
  - Você também pode ARRASTAR AS CURVAS direto no gráfico. Empurrar a IS muda
    os gastos do governo; empurrar a LM muda a oferta de moeda (ou a meta de
    juros, conforme o regime). O ponto de equilíbrio NÃO é arrastável de
    propósito: ele é resultado do modelo, não entrada.

Atalhos:

  - Duplo clique no slider  → volta o parâmetro ao valor de fábrica.
  - Shift + seta            → anda 10 passos de uma vez.
  - Setas ← →               → alternam as abas quando elas estão em foco.
  - Esc                     → fecha balão de definição ou menu aberto.


3. OS MODELOS
-------------------------------------------------------------------------------

NÍVEL 1 — CRUZ KEYNESIANA (modelo-simplificado.html)

  DA(Y) = C + I + G,  com  C = C₀ + c(Y − T)  e  I = I₀ (dado)
  Equilíbrio: Y = DA(Y)  ⇒  Y* = A/(1 − c),  com A = C₀ − cT + I₀ + G

  5 parâmetros: C₀, c, I₀, G, T.
  Não existe juro nem moeda. O investimento é um número, não uma função.

  O gráfico é a reta de demanda cruzando a reta de 45°. As duas escalas são
  iguais de propósito — a área de plotagem é quadrada, senão a reta de 45°
  não seria de 45° e o desenho mentiria.

  O painel "Forças em ação" decompõe o multiplicador em rodadas: um gasto novo
  de R$ 100 vira R$ 60 na rodada seguinte, R$ 36 na outra, e assim por diante
  até somar R$ 250. É de onde vem o 1/(1−c).

NÍVEL 2 — IS-LM BÁSICO (modelo-islm-basico.html)

  As mesmas duas curvas do nível 3, com seis controles em vez de onze:
  C₀, c, I₀, G, T e M. As sensibilidades b, k e h, o nível de preços e a
  meta de juros continuam agindo — no valor de base —, mas saem da tela.

  É a forma em que o livro-texto apresenta o modelo: você DESLOCA as
  curvas, sem GIRÁ-LAS. Dos doze cenários, sobram os sete que cabem
  aqui; os outros cinco mexem em parâmetro escondido ou em regime.

  A tela é a mesma aplicação do nível 3 (app-islm.js), ligada em outro
  modo por window.ISLM_NIVEL. Não há cópia de código entre as duas.


NÍVEL 3 — IS-LM COMPLETO (modelo-intermediario.html)

  Bens : Y = C + I + G,  C = C₀ + c(Y − T),  I = I₀ − b·i
  Moeda: M/P = k·Y − h·i
  IS   : (1 − c)·Y = A − b·i
  Equilíbrio, com D = h(1−c) + b·k:
     Y* = (h·A + b·M/P) / D
     i* = (k·A − (1−c)·M/P) / D

  11 parâmetros: C₀, c, I₀, b, G, T, M, ī, P, k, h.

  Notação: o juro é i, como em Blanchard. Com preços fixos e sem inflação
  esperada, o juro nominal e o real coincidem (i = r), e i é também a letra
  usada na paridade de juros do Mundell-Fleming, o próximo modelo da fila.

  DE ONDE VEM ESTA FORMA DO MODELO

  A forma linear — I = I₀ − b·i e (M/P)ᵈ = k·Y − h·i — é a notação de
  Dornbusch, Fischer & Startz, padrão em macro intermediária. O Blanchard
  escreve o MESMO modelo com funções genéricas:

     IS:  Y = C(Y − T) + I(Y, i) + G
     LM:  M/P = Y · L(i)

  Sem intercepto nomeado e sem coeficiente nomeado. Um simulador precisa
  desenhar a reta, e para isso precisa de número: por isso a forma linear.
  b é a inclinação da função I do Blanchard; h e k são as inclinações da L
  dele em relação a i e a Y. Não é outro modelo, é uma forma funcional
  escolhida.

  Uma diferença real, que vale registrar: no Blanchard o investimento
  depende TAMBÉM da renda, I(Y, i); aqui depende só do juro. Isso altera a
  inclinação da IS, não o sentido de nenhum resultado.

  O nível 2 existe justamente por causa disso: é o modelo com os parâmetros
  fora da tela, mais próximo do que se vê no livro.

  A forma fechada de i* NÃO divide por h de propósito: assim o caso clássico
  (h = 0, LM vertical) sai da mesma conta, sem exceção no código.

  DOIS REGIMES MONETÁRIOS, na aba LM:

    "a quantidade de moeda"  IS-LM de Hicks. O BC fixa M e o juro sai do
                             cruzamento. É o modelo do livro-texto.

    "a taxa de juros"        IS-MP (Romer, 2000). O BC fixa a meta ī e entrega
                             toda a moeda demandada àquele preço. A LM vira
                             HORIZONTAL, a moeda vira resultado e o crowding
                             out desaparece. É como os bancos centrais operam
                             de verdade desde os anos 1990 — o Copom anuncia a
                             Selic, não quantos reais vai emitir.

  Trocar de regime NÃO move o equilíbrio: o novo instrumento assume o valor
  que o antigo produzia. Só a forma da LM muda, e quem está no comando. Isso é
  intencional, para isolar a mudança.

  O experimento que vale a pena fazer em aula: deixe em "quantidade de moeda",
  suba G de 250 para 450 e anote. Vire a chave para "taxa de juros" e repita.

                        | meta de moeda | meta de juros
      Y*                | 1.000 → 1.222 | 1.000 → 1.500
      i*                | 5,00 → 7,22 % | 5,00 → 5,00 %
      multiplicador     |     1,11×     |     2,50×  (o cheio)
      engolido pelo juro|     55,6 %    |       0 %
      moeda             | escolhida 300 | calculada: 300 → 600

  Aquele 300 → 600 é o número que costuma faltar na aula: o BC teve de dobrar
  a oferta de moeda para segurar a Selic diante da expansão fiscal.


4. ARQUIVOS
-------------------------------------------------------------------------------

  index.html                  Tela de escolha do modelo.
  modelo-simplificado.html    Nível 1 — cruz keynesiana.
  modelo-islm-basico.html     Nível 2 — IS-LM básico.
  modelo-intermediario.html   Nível 3 — IS-LM completo.
  glossario.html              Glossário completo, com busca. Cobre os dois modelos.
  fichamento.html             Resumo dos cinco pontos do IS-LM, para copiar à mão.

  modelo-simples.js           Modelo, termos, cadeias e cenários do nível 1.
  modelo-intermediario.js     Modelo, termos, cadeias e cenários do IS-LM.
  app-islm.js                 A interface do IS-LM, usada pelos níveis 2 e 3.
  estilo.css                  Visual compartilhado por todas as páginas.

  README.txt                  Este arquivo.

A matemática fica separada da interface de propósito: para mexer em faixa de
slider, texto de cenário ou definição de termo, edite só o arquivo do modelo.


5. DECISÕES DE PROJETO QUE VALE CONHECER
-------------------------------------------------------------------------------

- ESCALA MONETÁRIA. Os R$ bi são arbitrários, mas consistentes entre todas as
  variáveis. O que o modelo diz de verdade são proporções e sentidos, não
  valores absolutos. Y* = 1.000 não é previsão de PIB.

- UNIDADES. Cada parâmetro mostra a sua: R$ bi para fluxos e estoques,
  R$ bi/p.p. para as sensibilidades (b e h dão dinheiro por ponto percentual
  de juro), % ao ano para a meta, e nada para o que é adimensional (c e k são
  frações puras, R$ por R$ — e o silêncio é a informação).

- MOLDURA DO GRÁFICO. A escala cresce quando o equilíbrio encosta na borda,
  mas só encolhe com folga larga. Se a régua se reajustasse a cada quadro,
  mexer um slider pareceria não mover a curva — que é justamente o que a tela
  existe para mostrar.

- CASOS-LIMITE. O modelo avisa quando entra num regime especial: armadilha da
  liquidez, caso clássico, investimento insensível ao juro, juro negativo,
  produto negativo, e o caso patológico em que IS e LM ficam ambas verticais e
  não existe equilíbrio único.

- CORES. Só duas matizes no documento inteiro, com o mesmo significado nos dois
  níveis: azul = mercado de bens (DA no nível 1, IS no nível 2), laranja =
  mercado de moeda (LM). Foram verificadas para contraste e para daltonismo
  nos dois modelos, e há uma terceira já reservada para a curva BP do nível 3.

- O QUE FOI TESTADO. Todas as equações foram conferidas numericamente contra
  diferenças finitas; as identidades contábeis fecham em precisão de máquina;
  e cada número citado nas histórias dos cenários foi verificado contra o
  solucionador. Os dois simuladores passam por um teste funcional automatizado
  que dirige sliders, abas, menus, balões e troca de regime.


6. PRÓXIMOS PASSOS
-------------------------------------------------------------------------------

NÍVEL 3 — MUNDELL-FLEMING (economia aberta)

  É o próximo da fila. Entram:
    - exportações líquidas: NX = X₀ − m·Y + n·e   (e = câmbio real)
    - mobilidade de capital e a curva BP
    - a atratividade do dólar contra a do real: o diferencial entre o juro
      interno e o externo puxando capital para dentro ou para fora
    - regime cambial (fixo ou flutuante) como uma segunda chave, igual à
      chave de regime monetário que já existe no nível 2

  O resultado que o modelo entrega é forte: com capital livre para ir embora,
  o REGIME CAMBIAL decide qual política ainda funciona. Com câmbio flutuante a
  fiscal perde a força e a monetária ganha; com câmbio fixo, o contrário. A
  cor da curva BP já está escolhida e validada.

CAMADA DE JOGO

  A barra acima do gráfico foi deixada com espaço vazio à direita justamente
  para isso. Ideias, da mais barata para a mais cara:

  - Filtros lúdicos nos cenários. Ex.: no pacote de obras, uma caixa de
    "superfaturamento" em que só uma fração do gasto vira demanda agregada —
    o resto sai da conta. Modelado direito, ensina que o que importa não é o
    que o governo empenha, é o que vira demanda.
  - Modo diagnóstico (quiz invertido): o app aplica um choque secreto, mostra
    só o antes e o depois, e pergunta o que aconteceu. Treina o raciocínio
    efeito → causa, que é o que cai na prova.
  - Modo desafio: uma meta ("leve Y para a faixa 1.700-1.800 sem deixar i
    passar de 8 %") com um orçamento de movimentos. Força o aluno a descobrir
    sozinho o mix fiscal-monetário.
  - Jogo por turnos com cartas de evento (choque do petróleo, fuga de capital,
    quebra de banco), acumulando dívida e aprovação popular.
  - Defasagem de política: o efeito só entra dois turnos depois. Ensina as
    "defasagens longas e variáveis" de Friedman pela frustração, não pela
    definição.
  - Permalink: o estado dos sliders vira hash na URL. O professor monta lista
    de exercícios como links; o aluno entrega colando o link de volta.

MELHORIAS MENORES

  - Congelar uma curva de referência para comparar dois estados lado a lado
    (existia numa versão anterior e foi removido por excesso de interface;
    vale voltar como opção).
  - Piso efetivo de juros (ELB) como chave, para a armadilha da liquidez ficar
    literal em vez de aproximada por h alto.
  - Testar o layout abaixo de 500 px de largura. O Chrome usado nos testes não
    desce disso, então o comportamento em celular pequeno foi ajustado por
    regra de CSS mas NÃO foi verificado visualmente.


7. LIMITES HONESTOS DO MODELO
-------------------------------------------------------------------------------

Vale dizer isto em aula, porque o simulador não diz sozinho:

- PREÇOS SÃO FIXOS. Todo o ajuste é por quantidade. O cenário de inflação do
  nível 2 mostra apenas o canal monetário (M/P encolhe e a LM desloca); ele
  não explica POR QUE os preços subiram. Para isso seria preciso oferta
  agregada e curva de Phillips.

- A META DE JUROS É EXÓGENA. No regime IS-MP o BC escolhe qualquer taxa e
  ignora a inflação. Um banco central de verdade segue algo como uma regra de
  Taylor, e aí a curva MP volta a ser inclinada — por um motivo completamente
  diferente do da LM.

- ECONOMIA FECHADA. Não há câmbio, exportação nem capital estrangeiro. É
  exatamente o que o nível 3 vem resolver.

- É CURTO PRAZO. Nada aqui fala de crescimento, produtividade ou capacidade
  instalada.

O modelo simplifica de propósito. Serve para enxergar mecanismos, não para
prever números.

===============================================================================
