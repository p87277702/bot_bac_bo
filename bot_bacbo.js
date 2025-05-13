// Função para processar estratégia de Diferenças Específicas
async function processarEstrategiaDiferencas(res) {
  // Ignorar empates para esta estratégia
  if (res.resultado === "tie") {
    console.log("Ignorando empate para estratégia de diferenças");
    return;
  }

  // Classificar a diferença atual
  const diferencaAtual = res.diferenca;
  let tipoDiferenca = "pequena"; // 1-2

  if (diferencaAtual >= 5) {
    tipoDiferenca = "grande"; // 5+
  } else if (diferencaAtual >= 3) {
    tipoDiferenca = "media"; // 3-4
  }

  // Adiciona a diferença atual à lista
  estrategiaDiferencas.ultimasDiferencas.unshift({
    valor: diferencaAtual,
    tipo: tipoDiferenca,
  });

  // Mantém apenas as últimas N diferenças
  if (
    estrategiaDiferencas.ultimasDiferencas.length >
    estrategiaDiferencas.qtdConsiderada
  ) {
    estrategiaDiferencas.ultimasDiferencas =
      estrategiaDiferencas.ultimasDiferencas.slice(
        0,
        estrategiaDiferencas.qtdConsiderada
      );
  }

  // Primeira rodada após detectar padrão (G0)
  if (
    estrategiaDiferencas.alertaAtivo &&
    estrategiaDiferencas.alvoProximaRodada &&
    estrategiaDiferencas.rodadaG0 === null
  ) {
    console.log(
      `Alerta ativo para diferença ${estrategiaDiferencas.alvoProximaRodada}, primeira tentativa (G0).`
    );

    // Verificamos se a diferença atual corresponde ao alvo esperado
    const acertou = tipoDiferenca === estrategiaDiferencas.alvoProximaRodada;

    if (acertou) {
      estrategiaDiferencas.totalGreens++;
      estrategiaDiferencas.vitoriaConsecutiva++;

      // Atualiza o contador de maior sequência de vitórias
      if (
        estrategiaDiferencas.vitoriaConsecutiva >
        estrategiaDiferencas.maiorVitoriaConsecutiva
      ) {
        estrategiaDiferencas.maiorVitoriaConsecutiva =
          estrategiaDiferencas.vitoriaConsecutiva;
      }

      await enviarTelegram(
        `🟢 DIFERENÇA ${estrategiaDiferencas.alvoProximaRodada.toUpperCase()}: ${res.resultado.toUpperCase()} [${
          res.player
        }-${
          res.banker
        }], ✅ Green! Diferença de ${diferencaAtual} é ${tipoDiferenca} como esperado [${
          estrategiaDiferencas.vitoriaConsecutiva
        } VITÓRIA${
          estrategiaDiferencas.vitoriaConsecutiva > 1 ? "S" : ""
        } CONSECUTIVA${
          estrategiaDiferencas.vitoriaConsecutiva > 1 ? "S" : ""
        }]\n📊 Diferenças: Greens: ${
          estrategiaDiferencas.totalGreens
        } | Reds: ${estrategiaDiferencas.totalReds}`,
        "diferencas"
      );

      // Registrar a vitória
      estrategiaDiferencas.ultimaVitoria = {
        resultado: res.resultado,
        player: res.player,
        banker: res.banker,
        dataHora: new Date(),
      };

      // Resetar alerta
      resetarAlertaDiferencas();
    } else {
      await enviarTelegram(
        `🔄 DIFERENÇA ${estrategiaDiferencas.alvoProximaRodada.toUpperCase()}: ${res.resultado.toUpperCase()} [${
          res.player
        }-${
          res.banker
        }], vamos para o G1... Diferença de ${diferencaAtual} é ${tipoDiferenca}, esperávamos ${
          estrategiaDiferencas.alvoProximaRodada
        }`,
        "diferencas"
      );
      estrategiaDiferencas.rodadaG0 = res;
    }
  }
  // Segunda rodada após detectar padrão (G1)
  else if (
    estrategiaDiferencas.alertaAtivo &&
    estrategiaDiferencas.alvoProximaRodada &&
    estrategiaDiferencas.rodadaG0
  ) {
    console.log("Processando G1 para estratégia de diferenças");

    // Verificamos se a diferença atual corresponde ao alvo esperado
    const acertou = tipoDiferenca === estrategiaDiferencas.alvoProximaRodada;

    if (acertou) {
      estrategiaDiferencas.totalGreens++;
      estrategiaDiferencas.vitoriaConsecutiva++;

      // Atualiza o contador de maior sequência de vitórias
      if (
        estrategiaDiferencas.vitoriaConsecutiva >
        estrategiaDiferencas.maiorVitoriaConsecutiva
      ) {
        estrategiaDiferencas.maiorVitoriaConsecutiva =
          estrategiaDiferencas.vitoriaConsecutiva;
      }

      await enviarTelegram(
        `🟢 DIFERENÇA ${estrategiaDiferencas.alvoProximaRodada.toUpperCase()}: ${res.resultado.toUpperCase()} [${
          res.player
        }-${
          res.banker
        }], ✅ Green no G1! Diferença de ${diferencaAtual} é ${tipoDiferenca} como esperado [${
          estrategiaDiferencas.vitoriaConsecutiva
        } VITÓRIA${
          estrategiaDiferencas.vitoriaConsecutiva > 1 ? "S" : ""
        } CONSECUTIVA${
          estrategiaDiferencas.vitoriaConsecutiva > 1 ? "S" : ""
        }]\n📊 Diferenças: Greens: ${
          estrategiaDiferencas.totalGreens
        } | Reds: ${estrategiaDiferencas.totalReds}`,
        "diferencas"
      );

      // Registrar a vitória
      estrategiaDiferencas.ultimaVitoria = {
        resultado: res.resultado,
        player: res.player,
        banker: res.banker,
        dataHora: new Date(),
      };

      // Resetar alerta
      resetarAlertaDiferencas();
    } else {
      estrategiaDiferencas.totalReds++;
      estrategiaDiferencas.vitoriaConsecutiva = 0;

      await enviarTelegram(
        `❌ DIFERENÇA ${estrategiaDiferencas.alvoProximaRodada.toUpperCase()}: ${res.resultado.toUpperCase()} [${
          res.player
        }-${
          res.banker
        }], ❌ Red! Diferença de ${diferencaAtual} é ${tipoDiferenca}, esperávamos ${
          estrategiaDiferencas.alvoProximaRodada
        }\n📊 Diferenças: Greens: ${estrategiaDiferencas.totalGreens} | Reds: ${
          estrategiaDiferencas.totalReds
        }`,
        "diferencas"
      );

      // Registrar a derrota
      estrategiaDiferencas.ultimaVitoria = {
        resultado: res.resultado,
        player: res.player,
        banker: res.banker,
        dataHora: new Date(),
      };

      // Resetar alerta
      resetarAlertaDiferencas();
    }
  }
  // Análise normal do histórico para detecção de padrões de diferenças
  else if (
    !estrategiaDiferencas.alertaAtivo &&
    estrategiaDiferencas.ultimasDiferencas.length >=
      estrategiaDiferencas.qtdConsiderada
  ) {
    // Verificar se temos uma sequência de diferenças do mesmo tipo
    const contagem = { pequena: 0, media: 0, grande: 0 };

    estrategiaDiferencas.ultimasDiferencas.forEach((d) => {
      contagem[d.tipo]++;
    });

    // Se temos predominância de um tipo de diferença (pelo menos 2 em 3)
    let tipoPredominante = null;

    if (contagem.pequena >= 2) {
      tipoPredominante = "pequena";
    } else if (contagem.media >= 2) {
      tipoPredominante = "media";
    } else if (contagem.grande >= 2) {
      tipoPredominante = "grande";
    }

    if (tipoPredominante) {
      // O padrão sugere que o próximo tipo de diferença será o mesmo do predominante
      estrategiaDiferencas.alertaAtivo = true;
      estrategiaDiferencas.alvoProximaRodada = tipoPredominante;

      await enviarTelegram(
        `⚠️ ESTRATÉGIA DE DIFERENÇAS: Detectadas ${contagem[tipoPredominante]} diferenças ${tipoPredominante}s nos últimos ${estrategiaDiferencas.qtdConsiderada} resultados!\n🎯 Entrada sugerida: Apostar em diferença ${tipoPredominante} na próxima rodada!`,
        "diferencas"
      );

      console.log(
        `Alerta ativado para diferenças! Próximo tipo esperado: ${estrategiaDiferencas.alvoProximaRodada}`
      );
    }
  }
}

// Função para resetar alerta de diferenças
function resetarAlertaDiferencas() {
  console.log("Resetando alerta de diferenças");
  estrategiaDiferencas.alertaAtivo = false;
  estrategiaDiferencas.alvoProximaRodada = null;
  estrategiaDiferencas.rodadaG0 = null;

  // Não limpamos todas as diferenças para manter histórico parcial
  // Mantemos as últimas 2 para continuar análise
  if (estrategiaDiferencas.ultimasDiferencas.length > 2) {
    estrategiaDiferencas.ultimasDiferencas =
      estrategiaDiferencas.ultimasDiferencas.slice(0, 2);
  }
} // Adicionando nova estratégia para Diferenças Específicas
let estrategiaDiferencas = {
  alertaAtivo: false,
  ultimasDiferencas: [], // Armazenar as últimas diferenças
  qtdConsiderada: 3, // Quantas diferenças para considerar
  rodadaG0: null,
  alvoProximaRodada: null, // "pequena" (1-2), "media" (3-4), "grande" (5+)
  totalGreens: 0,
  totalReds: 0,
  ultimaVitoria: null,
  vitoriaConsecutiva: 0,
  maiorVitoriaConsecutiva: 0,
};
const axios = require("axios");
const puppeteer = require("puppeteer");
require("dotenv").config();
const express = require("express");

// Estado do bot
let historico = [];
let ultimoDiaVerificado = new Date().getDate(); // Dia do mês atual
let contadorRodadas = 0;
let ultimoResultadoProcessado = null;

// Contadores gerais
let totalPlayer = 0;
let totalBanker = 0;
let totalTie = 0;

// Maior pontuação já registrada para cada lado
let maiorPontuacaoPlayer = 0;
let maiorPontuacaoBanker = 0;

// Rastreamento de sequências
let sequenciaAtualPlayer = 0;
let sequenciaAtualBanker = 0;
let maiorSequenciaPlayer = 0;
let maiorSequenciaBanker = 0;

// Rastreamento de sequências de empates
let sequenciaAtualTie = 0;
let maiorSequenciaTie = 0;

// Última vitória registrada
let ultimaVitoria = {
  resultado: null,
  playerScore: null,
  bankerScore: null,
  estrategia: null,
  dataHora: null,
};

// Estratégia de Sequência
let estrategiaSequencia = {
  alertaAtivo: false,
  sequenciaConsiderada: 4, // Alterado de 3 para 4 resultados
  ultimosResultados: [], // Para rastrear os últimos resultados
  alvoProximaRodada: null, // "player" ou "banker"
  rodadaG0: null,
  totalGreens: 0,
  totalReds: 0,
  ultimaVitoria: null,
  vitoriaConsecutiva: 0,
  maiorVitoriaConsecutiva: 0,
};

// Estratégia 2: Diferença Pequena (Apostando no mesmo lado após detectar padrão)
let estrategiaDiferencaPequena = {
  alertaAtivo: false,
  ultimasDiferencas: [], // Armazenar as últimas diferenças
  ultimosResultados: [], // Lista para armazenar resultados com classificação alto/baixo
  qtdConsiderada: 3, // Quantas diferenças pequenas seguidas para ativar
  diferencaLimite: 2, // Diferença máxima para considerar "pequena"
  limiteValorBaixo: 4, // Valor máximo para considerar "baixo"
  limiteValorAlto: 8, // Valor mínimo para considerar "alto"
  rodadaG0: null,
  proximoAlvo: null, // Para armazenar o alvo da próxima rodada (alto/baixo)
  alvoProximaRodada: null, // Mantido para compatibilidade com código existente
  totalGreens: 0,
  totalReds: 0,
  ultimaVitoria: null,
  vitoriaConsecutiva: 0,
  maiorVitoriaConsecutiva: 0,
};

// Estratégia 3: Após Empate (apostar no mesmo resultado anterior ao Tie)
let estrategiaAposEmpate = {
  alertaAtivo: false,
  ultimoResultadoAntesTie: null,
  rodadaG0: null,
  totalGreens: 0,
  totalReds: 0,
  ultimaVitoria: null,
  vitoriaConsecutiva: 0,
  maiorVitoriaConsecutiva: 0,
};

// Estratégia 4: Alternância específica
// Detecta padrões de alternância como PBPB (Player-Banker-Player-Banker)
let estrategiaAlternancia = {
  alertaAtivo: false,
  padrao: [], // Padrão detectado
  proximoResultadoEsperado: null,
  rodadaG0: null,
  totalGreens: 0,
  totalReds: 0,
  ultimaVitoria: null,
  vitoriaConsecutiva: 0,
  maiorVitoriaConsecutiva: 0,
};

// Configuração do Telegram
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Tokens e chat IDs para estratégias específicas
const TELEGRAM_TOKEN_SEQUENCIA = process.env.TELEGRAM_TOKEN_SEQUENCIA;
const TELEGRAM_CHAT_ID_SEQUENCIA = process.env.TELEGRAM_CHAT_ID_SEQUENCIA;

const TELEGRAM_TOKEN_DIFERENCA = process.env.TELEGRAM_TOKEN_DIFERENCA;
const TELEGRAM_CHAT_ID_DIFERENCA = process.env.TELEGRAM_CHAT_ID_DIFERENCA;

const TELEGRAM_TOKEN_APOS_EMPATE = process.env.TELEGRAM_TOKEN_APOS_EMPATE;
const TELEGRAM_CHAT_ID_APOS_EMPATE = process.env.TELEGRAM_CHAT_ID_APOS_EMPATE;

// Variáveis globais para controlar o navegador
let browser = null;
let page = null;

// Função principal para buscar resultados do Bac Bo
async function getBacBoResultado() {
  try {
    console.log("Buscando resultados do Bac Bo...");

    // Inicializar o navegador apenas uma vez
    if (!browser) {
      console.log("Iniciando navegador pela primeira vez...");

      // Configuração para ambiente Linux em VPS
      const options = {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--disable-features=AudioServiceOutOfProcess",
          "--disable-extensions",
          "--single-process",
          "--no-zygote",
          "--no-first-run",
          "--ignore-certificate-errors",
        ],
      };

      // Verifica se o caminho foi especificado nas variáveis de ambiente
      if (process.env.CHROME_PATH) {
        console.log(
          `Usando caminho do Chrome especificado nas variáveis de ambiente: ${process.env.CHROME_PATH}`
        );
        options.executablePath = process.env.CHROME_PATH;
      }

      try {
        browser = await puppeteer.launch(options);
        console.log("Navegador iniciado com sucesso!");
      } catch (error) {
        console.error(`Erro ao iniciar o navegador: ${error.message}`);
        console.error("Tentando alternativas para executar o Chrome...");

        // Tente localizar o Chrome usando comando do sistema
        const { execSync } = require("child_process");
        try {
          // Tenta vários possíveis caminhos do Chrome/Chromium no Linux
          let chromePath = "";
          try {
            chromePath = execSync("which google-chrome").toString().trim();
          } catch (e) {
            try {
              chromePath = execSync("which chromium-browser").toString().trim();
            } catch (e) {
              try {
                chromePath = execSync("which chromium").toString().trim();
              } catch (e) {
                throw new Error(
                  "Nenhum executável do Chrome/Chromium encontrado."
                );
              }
            }
          }

          console.log(
            `Chrome/Chromium encontrado no sistema em: ${chromePath}`
          );
          options.executablePath = chromePath;
          browser = await puppeteer.launch(options);
          console.log("Navegador iniciado após usar localização alternativa!");
        } catch (fallbackError) {
          console.error(
            `Erro após tentativa alternativa: ${fallbackError.message}`
          );
          throw new Error(
            "Não foi possível iniciar o navegador após tentativas alternativas."
          );
        }
      }

      console.log("Abrindo nova página...");
      page = await browser.newPage();

      // Configurando o User-Agent para parecer um navegador normal
      await page.setUserAgent(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
      );

      // Otimizações adicionais para ambiente VPS
      await page.setRequestInterception(true);
      page.on("request", (request) => {
        // Bloquear recursos desnecessários para economizar largura de banda e CPU
        const blockedResourceTypes = ["image", "media", "font", "stylesheet"];
        if (
          blockedResourceTypes.includes(request.resourceType()) &&
          !request.url().includes("casinoscores.com") // só bloqueia recursos de terceiros
        ) {
          request.abort();
        } else {
          request.continue();
        }
      });
    } else {
      console.log("Navegador já está aberto, apenas atualizando a página...");
    }

    // Verificar mudança de dia a cada execução
    verificarMudancaDeDia();

    try {
      // Navegar ou recarregar a página com timeout aumentado
      if (page.url() === "https://casinoscores.com/pt-br/bac-bo/") {
        console.log("Recarregando a página...");
        await page.reload({
          waitUntil: "networkidle2",
          timeout: 120000, // 2 minutos - mais tempo para ambiente VPS
        });
      } else {
        console.log("Navegando para casinoscores.com/pt-br/bac-bo/...");
        await page.goto("https://casinoscores.com/pt-br/bac-bo/", {
          waitUntil: "networkidle2",
          timeout: 120000, // 2 minutos - mais tempo para ambiente VPS
        });
      }
    } catch (navigationError) {
      console.error(`Erro ao navegar: ${navigationError.message}`);
      console.log("Tentando continuar mesmo com erro de navegação...");
      // Tentar recuperar de erros de navegação
      await new Promise((r) => setTimeout(r, 5000)); // Espera 5 segundos antes de continuar
    }

    console.log("Página carregada, extraindo resultados...");

    // Esperando pelo conteúdo carregar
    await page
      .waitForSelector("#SpinHistoryTableBacBo", { timeout: 60000 })
      .catch(() => {
        console.log(
          "Timeout ao esperar pelo seletor, tentando extrair mesmo assim..."
        );
      });

    // Extraindo os resultados detalhados do Bac Bo da tabela de histórico
    const resultados = await page
      .evaluate(() => {
        try {
          const items = [];
          // Seletor para a tabela de histórico
          const linhas = document.querySelectorAll(
            "#SpinHistoryTableBacBo tbody tr"
          );

          if (!linhas || linhas.length === 0) {
            console.error("Elementos da tabela não encontrados na página");
            return [];
          }

          // Processamos cada linha da tabela (cada resultado)
          linhas.forEach((linha) => {
            try {
              // Extrai o resultado (Player/Banker/Tie) da imagem
              const imagemResultado = linha.querySelector("img[alt='Êxito']");
              if (!imagemResultado) return;

              const srcImagem = imagemResultado.getAttribute("src");
              let resultado = null;

              if (srcImagem.includes("/P.png")) {
                resultado = "player";
              } else if (srcImagem.includes("/B.png")) {
                resultado = "banker";
              } else if (srcImagem.includes("/TIE.png")) {
                resultado = "tie";
              }

              // Agora extraímos as pontuações
              const divOutcome = linha.querySelector(".bac-bo-dice-outcome");
              if (!divOutcome) return;

              // Pontuação do Player
              const spanPlayerSum = divOutcome.querySelector(
                ".d-flex:nth-child(1) span"
              );
              const playerScore = spanPlayerSum
                ? parseInt(spanPlayerSum.textContent.replace("Σ", ""), 10)
                : 0;

              // Pontuação do Banker
              const spanBankerSum = divOutcome.querySelector(
                ".d-flex:nth-child(2) span"
              );
              const bankerScore = spanBankerSum
                ? parseInt(spanBankerSum.textContent.replace("Σ", ""), 10)
                : 0;

              // Diferença entre as pontuações
              const diferenca = Math.abs(playerScore - bankerScore);

              // Adiciona o resultado ao array de items
              items.push({
                player: playerScore,
                banker: bankerScore,
                resultado: resultado,
                diferenca: diferenca,
                // Adicionamos a hora para verificar se é um resultado novo
                hora: linha.querySelector(".dateTime_DateTime__time__f0_Bn")
                  ? linha.querySelector(".dateTime_DateTime__time__f0_Bn")
                      .textContent
                  : "",
              });
            } catch (rowError) {
              console.error(
                "Erro ao processar linha da tabela:",
                rowError.message
              );
            }
          });

          return items;
        } catch (evalError) {
          console.error("Erro durante execução no browser:", evalError.message);
          return [];
        }
      })
      .catch((error) => {
        console.error("Erro ao executar evaluate:", error.message);
        return [];
      });

    if (!resultados || resultados.length === 0) {
      console.error("Não foi possível encontrar resultados do Bac Bo.");
      return;
    }

    console.log(`Encontrados ${resultados.length} resultados`);
    console.log(
      `Último resultado: Player ${resultados[0].player} - Banker ${resultados[0].banker} (${resultados[0].resultado})`
    );

    // Pegamos o resultado mais recente (primeiro da lista)
    const ultimoResultado = resultados[0];

    // Verificar se é um novo resultado
    let novoResultado = false;

    if (!ultimoResultadoProcessado) {
      novoResultado = true;
      console.log("Primeiro resultado desde o início do programa.");
    } else if (
      ultimoResultadoProcessado.player !== resultados[0].player ||
      ultimoResultadoProcessado.banker !== resultados[0].banker ||
      ultimoResultadoProcessado.hora !== resultados[0].hora
    ) {
      novoResultado = true;
      console.log(
        `Novo resultado detectado: Player ${resultados[0].player} - Banker ${resultados[0].banker} (${resultados[0].resultado})`
      );
    } else {
      console.log(
        `Sem mudanças nos resultados. Último resultado continua sendo: Player ${resultados[0].player} - Banker ${resultados[0].banker} (${resultados[0].resultado})`
      );
    }

    if (novoResultado) {
      console.log("Novo resultado confirmado, atualizando histórico...");

      // Pegamos o último resultado (primeiro item da lista)
      const ultimoResultado = resultados[0];

      // Atualiza o histórico
      historico.unshift(ultimoResultado);
      if (historico.length > 30) historico = historico.slice(0, 30);

      // Incrementa os contadores
      if (ultimoResultado.resultado === "player") {
        totalPlayer++;
        sequenciaAtualPlayer++;
        sequenciaAtualBanker = 0;
        sequenciaAtualTie = 0;

        // Atualiza a maior sequência
        if (sequenciaAtualPlayer > maiorSequenciaPlayer) {
          maiorSequenciaPlayer = sequenciaAtualPlayer;
        }
      } else if (ultimoResultado.resultado === "banker") {
        totalBanker++;
        sequenciaAtualBanker++;
        sequenciaAtualPlayer = 0;
        sequenciaAtualTie = 0;

        // Atualiza a maior sequência
        if (sequenciaAtualBanker > maiorSequenciaBanker) {
          maiorSequenciaBanker = sequenciaAtualBanker;
        }
      } else if (ultimoResultado.resultado === "tie") {
        totalTie++;
        sequenciaAtualTie++;
        sequenciaAtualPlayer = 0;
        sequenciaAtualBanker = 0;

        // Atualiza a maior sequência
        if (sequenciaAtualTie > maiorSequenciaTie) {
          maiorSequenciaTie = sequenciaAtualTie;
        }
      }

      // Atualiza as maiores pontuações
      if (ultimoResultado.player > maiorPontuacaoPlayer) {
        maiorPontuacaoPlayer = ultimoResultado.player;
        console.log(`Nova maior pontuação de Player: ${maiorPontuacaoPlayer}`);
      }
      if (ultimoResultado.banker > maiorPontuacaoBanker) {
        maiorPontuacaoBanker = ultimoResultado.banker;
        console.log(`Nova maior pontuação de Banker: ${maiorPontuacaoBanker}`);
      }

      // Processa o resultado para as estratégias
      await processarResultado(ultimoResultado);

      // Atualiza o resultado processado
      ultimoResultadoProcessado = ultimoResultado;
    } else {
      // Nenhuma mudança nos resultados
      console.log("Aguardando nova rodada do Bac Bo...");
    }
  } catch (err) {
    console.error("Erro ao capturar resultado:", err.message);
    console.error("Stack trace:", err.stack);

    // Se ocorrer um erro grave com o navegador, fechamos e reiniciamos na próxima execução
    if (
      err.message.includes("Protocol error") ||
      err.message.includes("Target closed") ||
      err.message.includes("Session closed") ||
      err.message.includes("Browser was not found") ||
      err.message.includes("WebSocket") ||
      err.message.includes("failed to connect") ||
      err.message.includes("connection closed")
    ) {
      console.error(
        "Erro de conexão com o navegador, reiniciando na próxima execução..."
      );
      try {
        if (page) await page.close().catch(() => {});
        if (browser) await browser.close().catch(() => {});
      } catch (closeErr) {
        console.error("Erro ao fechar navegador:", closeErr.message);
      }
      page = null;
      browser = null;
    }

    if (err.response) {
      console.error("Resposta do site:", err.response.status);
      if (err.response.data) {
        console.error(
          "HTML da resposta:",
          err.response.data.substring(0, 200) + "..."
        );
      }
    }
  }
}

// Funções para processar estratégias

// Processa o resultado para todas as estratégias
async function processarResultado(res) {
  console.log(
    `Processando resultado: ${res.resultado} (Player: ${res.player}, Banker: ${res.banker})`
  );
  contadorRodadas++;

  // Incrementa os contadores
  if (res.resultado === "player") {
    totalPlayer++;
    sequenciaAtualPlayer++;
    sequenciaAtualBanker = 0;
    sequenciaAtualTie = 0;

    // Atualiza a maior sequência
    if (sequenciaAtualPlayer > maiorSequenciaPlayer) {
      maiorSequenciaPlayer = sequenciaAtualPlayer;
    }
  } else if (res.resultado === "banker") {
    totalBanker++;
    sequenciaAtualBanker++;
    sequenciaAtualPlayer = 0;
    sequenciaAtualTie = 0;

    // Atualiza a maior sequência
    if (sequenciaAtualBanker > maiorSequenciaBanker) {
      maiorSequenciaBanker = sequenciaAtualBanker;
    }
  } else if (res.resultado === "tie") {
    totalTie++;
    sequenciaAtualTie++;
    sequenciaAtualPlayer = 0;
    sequenciaAtualBanker = 0;

    // Atualiza a maior sequência
    if (sequenciaAtualTie > maiorSequenciaTie) {
      maiorSequenciaTie = sequenciaAtualTie;
    }
  }

  // Atualiza as maiores pontuações
  if (res.player > maiorPontuacaoPlayer) {
    maiorPontuacaoPlayer = res.player;
    console.log(`Nova maior pontuação de Player: ${maiorPontuacaoPlayer}`);
  }
  if (res.banker > maiorPontuacaoBanker) {
    maiorPontuacaoBanker = res.banker;
    console.log(`Nova maior pontuação de Banker: ${maiorPontuacaoBanker}`);
  }

  // Log detalhado do estado atual para depuração
  console.log(`--- ESTADO ATUAL ---`);
  console.log(
    `Alertas ativos: Sequência: ${estrategiaSequencia.alertaAtivo}, Diferença Pequena: ${estrategiaDiferencaPequena.alertaAtivo}`
  );
  console.log(
    `Alertas ativos: Após Empate: ${estrategiaAposEmpate.alertaAtivo}, Alternância: ${estrategiaAlternancia.alertaAtivo}`
  );
  console.log(
    `Player: ${totalPlayer}, Banker: ${totalBanker}, Tie: ${totalTie}`
  );
  console.log(`Diferença atual: ${res.diferenca}`);
  console.log(`-------------------`);

  // Processa as estratégias
  await processarEstrategiaSequencia(res);
  await processarEstrategiaDiferencaPequena(res);
  await processarEstrategiaAposEmpate(res);

  // Envia resumo a cada 100 rodadas
  if (contadorRodadas % 100 === 0) {
    await enviarResumo();
  }

  // Envia relatório detalhado a cada 200 rodadas
  if (contadorRodadas % 200 === 0) {
    await enviarRelatorioDetalhado();
  }
}

// Estratégia de Sequência
async function processarEstrategiaSequencia(res) {
  // Ignorar empates para esta estratégia
  if (res.resultado === "tie") {
    console.log("Ignorando empate para estratégia de sequência");
    return;
  }

  // Primeira rodada após detectar padrão (G0)
  if (
    estrategiaSequencia.alertaAtivo &&
    estrategiaSequencia.alvoAtual &&
    estrategiaSequencia.rodadaG0 === null
  ) {
    console.log(
      `Alerta ativo para sequência, primeira tentativa (G0). Alvo: ${estrategiaSequencia.alvoAtual}`
    );

    if (res.resultado === estrategiaSequencia.alvoAtual) {
      estrategiaSequencia.totalGreens++;
      estrategiaSequencia.vitoriaConsecutiva++;

      // Atualiza o contador de maior sequência de vitórias
      if (
        estrategiaSequencia.vitoriaConsecutiva >
        estrategiaSequencia.maiorVitoriaConsecutiva
      ) {
        estrategiaSequencia.maiorVitoriaConsecutiva =
          estrategiaSequencia.vitoriaConsecutiva;
      }

      await enviarTelegram(
        `🟢 SEQUÊNCIA: ${res.resultado.toUpperCase()} [${res.player}-${
          res.banker
        }], ✅ Green para estratégia de sequência! [${
          estrategiaSequencia.vitoriaConsecutiva
        } VITÓRIA${
          estrategiaSequencia.vitoriaConsecutiva > 1 ? "S" : ""
        } CONSECUTIVA${
          estrategiaSequencia.vitoriaConsecutiva > 1 ? "S" : ""
        }]\n📊 Sequência: Greens: ${estrategiaSequencia.totalGreens} | Reds: ${
          estrategiaSequencia.totalReds
        }`,
        "sequencia"
      );

      // Registrar a vitória
      estrategiaSequencia.ultimaVitoria = {
        resultado: res.resultado,
        player: res.player,
        banker: res.banker,
        dataHora: new Date(),
      };

      // Resetar alerta
      resetarAlertaSequencia();
    } else {
      await enviarTelegram(
        `🔄 SEQUÊNCIA: ${res.resultado.toUpperCase()} [${res.player}-${
          res.banker
        }], vamos para o G1 na estratégia de sequência...`,
        "sequencia"
      );
      estrategiaSequencia.rodadaG0 = res;
    }
  }
  // Segunda rodada após detectar padrão (G1)
  else if (
    estrategiaSequencia.alertaAtivo &&
    estrategiaSequencia.alvoAtual &&
    estrategiaSequencia.rodadaG0
  ) {
    console.log("Processando G1 para estratégia de sequência");

    if (res.resultado === estrategiaSequencia.alvoAtual) {
      estrategiaSequencia.totalGreens++;
      estrategiaSequencia.vitoriaConsecutiva++;

      // Atualiza o contador de maior sequência de vitórias
      if (
        estrategiaSequencia.vitoriaConsecutiva >
        estrategiaSequencia.maiorVitoriaConsecutiva
      ) {
        estrategiaSequencia.maiorVitoriaConsecutiva =
          estrategiaSequencia.vitoriaConsecutiva;
      }

      await enviarTelegram(
        `🟢 SEQUÊNCIA: ${res.resultado.toUpperCase()} [${res.player}-${
          res.banker
        }], ✅ Green no G1 para estratégia de sequência! [${
          estrategiaSequencia.vitoriaConsecutiva
        } VITÓRIA${
          estrategiaSequencia.vitoriaConsecutiva > 1 ? "S" : ""
        } CONSECUTIVA${
          estrategiaSequencia.vitoriaConsecutiva > 1 ? "S" : ""
        }]\n📊 Sequência: Greens: ${estrategiaSequencia.totalGreens} | Reds: ${
          estrategiaSequencia.totalReds
        }`,
        "sequencia"
      );

      // Registrar a vitória
      estrategiaSequencia.ultimaVitoria = {
        resultado: res.resultado,
        player: res.player,
        banker: res.banker,
        dataHora: new Date(),
      };

      // Resetar alerta
      resetarAlertaSequencia();
    } else {
      estrategiaSequencia.totalReds++;
      estrategiaSequencia.vitoriaConsecutiva = 0;

      await enviarTelegram(
        `❌ SEQUÊNCIA: ${res.resultado.toUpperCase()} [${res.player}-${
          res.banker
        }], ❌ Red na estratégia de sequência\n📊 Sequência: Greens: ${
          estrategiaSequencia.totalGreens
        } | Reds: ${estrategiaSequencia.totalReds}`,
        "sequencia"
      );

      // Registrar a derrota
      estrategiaSequencia.ultimaVitoria = {
        resultado: res.resultado,
        player: res.player,
        banker: res.banker,
        dataHora: new Date(),
      };

      // Resetar alerta
      resetarAlertaSequencia();
    }
  }
  // Análise normal do histórico para detecção de sequências
  else if (
    !estrategiaSequencia.alertaAtivo &&
    historico.length >= estrategiaSequencia.sequenciaConsiderada
  ) {
    // Verificamos os últimos N resultados, ignorando empates
    const resultadosSemEmpate = historico.filter(
      (item) => item.resultado !== "tie"
    );

    if (
      resultadosSemEmpate.length >= estrategiaSequencia.sequenciaConsiderada
    ) {
      // Verifica se os resultados são todos iguais
      const primeirosResultados = resultadosSemEmpate.slice(
        0,
        estrategiaSequencia.sequenciaConsiderada
      );
      const todosIguais = primeirosResultados.every(
        (item) => item.resultado === primeirosResultados[0].resultado
      );

      if (todosIguais) {
        estrategiaSequencia.alertaAtivo = true;
        // Define o alvo como o oposto da sequência detectada
        estrategiaSequencia.alvoAtual =
          primeirosResultados[0].resultado === "player" ? "banker" : "player";

        await enviarTelegram(
          `⚠️ ESTRATÉGIA DE SEQUÊNCIA: ${
            estrategiaSequencia.sequenciaConsiderada
          }x ${primeirosResultados[0].resultado.toUpperCase()} seguidos!\n🎯 Entrada sugerida: ${estrategiaSequencia.alvoAtual.toUpperCase()} na próxima rodada!`,
          "sequencia"
        );

        console.log(
          `Alerta ativado para sequência! Alvo: ${estrategiaSequencia.alvoAtual}`
        );
      }
    }
  }
}

// Estratégia de Padrão para Valores Altos/Baixos
// Estratégia de Padrão para Valores Altos/Baixos
async function processarEstrategiaDiferencaPequena(res) {
  // Ignorar empates para esta estratégia
  if (res.resultado === "tie") {
    console.log("Ignorando empate para estratégia de valores altos/baixos");
    return;
  }

  // Classificar o resultado atual como alto ou baixo
  const valorPlayerAtual = res.player;
  const valorBankerAtual = res.banker;
  const vencedorAtual = res.resultado;
  const valorDoVencedor =
    vencedorAtual === "player" ? valorPlayerAtual : valorBankerAtual;

  // Verificar se os limites estão definidos, caso contrário, usar valores padrão
  const limiteValorBaixo = estrategiaDiferencaPequena.limiteValorBaixo || 4;
  const limiteValorAlto = estrategiaDiferencaPequena.limiteValorAlto || 8;

  const tipoValorAtual =
    valorDoVencedor <= limiteValorBaixo
      ? "baixo"
      : valorDoVencedor >= limiteValorAlto
      ? "alto"
      : "medio";

  // Adiciona o resultado atual à lista
  if (!estrategiaDiferencaPequena.ultimosResultados) {
    estrategiaDiferencaPequena.ultimosResultados = [];
  }

  estrategiaDiferencaPequena.ultimosResultados.unshift({
    resultado: res.resultado,
    valor: valorDoVencedor,
    tipo: tipoValorAtual,
  });

  // Mantém apenas os últimos N resultados
  if (
    estrategiaDiferencaPequena.ultimosResultados.length >
    estrategiaDiferencaPequena.qtdConsiderada
  ) {
    estrategiaDiferencaPequena.ultimosResultados =
      estrategiaDiferencaPequena.ultimosResultados.slice(
        0,
        estrategiaDiferencaPequena.qtdConsiderada
      );
  }

  // Primeira rodada após detectar padrão (G0)
  if (
    estrategiaDiferencaPequena.alertaAtivo &&
    estrategiaDiferencaPequena.proximoAlvo &&
    estrategiaDiferencaPequena.rodadaG0 === null
  ) {
    console.log(
      `Alerta ativo para valores ${estrategiaDiferencaPequena.proximoAlvo}, primeira tentativa (G0).`
    );

    // Verificamos se o valor atual corresponde ao alvo esperado
    const acertou =
      (estrategiaDiferencaPequena.proximoAlvo === "baixo" &&
        tipoValorAtual === "baixo") ||
      (estrategiaDiferencaPequena.proximoAlvo === "alto" &&
        tipoValorAtual === "alto");

    if (acertou) {
      estrategiaDiferencaPequena.totalGreens++;
      estrategiaDiferencaPequena.vitoriaConsecutiva++;

      // Atualiza o contador de maior sequência de vitórias
      if (
        estrategiaDiferencaPequena.vitoriaConsecutiva >
        estrategiaDiferencaPequena.maiorVitoriaConsecutiva
      ) {
        estrategiaDiferencaPequena.maiorVitoriaConsecutiva =
          estrategiaDiferencaPequena.vitoriaConsecutiva;
      }

      await enviarTelegram(
        `🟢 VALORES ${estrategiaDiferencaPequena.proximoAlvo.toUpperCase()}: ${res.resultado.toUpperCase()} [${
          res.player
        }-${
          res.banker
        }], ✅ Green! O valor ${valorDoVencedor} é ${tipoValorAtual} como esperado [${
          estrategiaDiferencaPequena.vitoriaConsecutiva
        } VITÓRIA${
          estrategiaDiferencaPequena.vitoriaConsecutiva > 1 ? "S" : ""
        } CONSECUTIVA${
          estrategiaDiferencaPequena.vitoriaConsecutiva > 1 ? "S" : ""
        }]\n📊 Valores: Greens: ${
          estrategiaDiferencaPequena.totalGreens
        } | Reds: ${estrategiaDiferencaPequena.totalReds}`,
        "diferenca"
      );

      // Registrar a vitória
      estrategiaDiferencaPequena.ultimaVitoria = {
        resultado: res.resultado,
        player: res.player,
        banker: res.banker,
        dataHora: new Date(),
      };

      // Resetar alerta
      resetarAlertaDiferencaPequena();
    } else {
      await enviarTelegram(
        `🔄 VALORES ${estrategiaDiferencaPequena.proximoAlvo.toUpperCase()}: ${res.resultado.toUpperCase()} [${
          res.player
        }-${
          res.banker
        }], vamos para o G1... O valor ${valorDoVencedor} é ${tipoValorAtual}, esperávamos ${
          estrategiaDiferencaPequena.proximoAlvo
        }`,
        "diferenca"
      );
      estrategiaDiferencaPequena.rodadaG0 = res;
    }
  }
  // Segunda rodada após detectar padrão (G1)
  else if (
    estrategiaDiferencaPequena.alertaAtivo &&
    estrategiaDiferencaPequena.proximoAlvo &&
    estrategiaDiferencaPequena.rodadaG0
  ) {
    console.log("Processando G1 para estratégia de valores altos/baixos");

    // Verificamos se o valor atual corresponde ao alvo esperado
    const acertou =
      (estrategiaDiferencaPequena.proximoAlvo === "baixo" &&
        tipoValorAtual === "baixo") ||
      (estrategiaDiferencaPequena.proximoAlvo === "alto" &&
        tipoValorAtual === "alto");

    if (acertou) {
      estrategiaDiferencaPequena.totalGreens++;
      estrategiaDiferencaPequena.vitoriaConsecutiva++;

      // Atualiza o contador de maior sequência de vitórias
      if (
        estrategiaDiferencaPequena.vitoriaConsecutiva >
        estrategiaDiferencaPequena.maiorVitoriaConsecutiva
      ) {
        estrategiaDiferencaPequena.maiorVitoriaConsecutiva =
          estrategiaDiferencaPequena.vitoriaConsecutiva;
      }

      await enviarTelegram(
        `🟢 VALORES ${estrategiaDiferencaPequena.proximoAlvo.toUpperCase()}: ${res.resultado.toUpperCase()} [${
          res.player
        }-${
          res.banker
        }], ✅ Green no G1! O valor ${valorDoVencedor} é ${tipoValorAtual} como esperado [${
          estrategiaDiferencaPequena.vitoriaConsecutiva
        } VITÓRIA${
          estrategiaDiferencaPequena.vitoriaConsecutiva > 1 ? "S" : ""
        } CONSECUTIVA${
          estrategiaDiferencaPequena.vitoriaConsecutiva > 1 ? "S" : ""
        }]\n📊 Valores: Greens: ${
          estrategiaDiferencaPequena.totalGreens
        } | Reds: ${estrategiaDiferencaPequena.totalReds}`,
        "diferenca"
      );

      // Registrar a vitória
      estrategiaDiferencaPequena.ultimaVitoria = {
        resultado: res.resultado,
        player: res.player,
        banker: res.banker,
        dataHora: new Date(),
      };

      // Resetar alerta
      resetarAlertaDiferencaPequena();
    } else {
      estrategiaDiferencaPequena.totalReds++;
      estrategiaDiferencaPequena.vitoriaConsecutiva = 0;

      await enviarTelegram(
        `❌ VALORES ${estrategiaDiferencaPequena.proximoAlvo.toUpperCase()}: ${res.resultado.toUpperCase()} [${
          res.player
        }-${
          res.banker
        }], ❌ Red! O valor ${valorDoVencedor} é ${tipoValorAtual}, esperávamos ${
          estrategiaDiferencaPequena.proximoAlvo
        }\n📊 Valores: Greens: ${
          estrategiaDiferencaPequena.totalGreens
        } | Reds: ${estrategiaDiferencaPequena.totalReds}`,
        "diferenca"
      );

      // Registrar a derrota
      estrategiaDiferencaPequena.ultimaVitoria = {
        resultado: res.resultado,
        player: res.player,
        banker: res.banker,
        dataHora: new Date(),
      };

      // Resetar alerta
      resetarAlertaDiferencaPequena();
    }
  }
  // Análise normal do histórico para detecção de padrões de valores
  else if (
    !estrategiaDiferencaPequena.alertaAtivo &&
    estrategiaDiferencaPequena.ultimosResultados.length >=
      estrategiaDiferencaPequena.qtdConsiderada
  ) {
    // Verificar se temos uma sequência de valores do mesmo tipo (altos ou baixos)
    const contagem = { baixo: 0, medio: 0, alto: 0 };

    estrategiaDiferencaPequena.ultimosResultados.forEach((r) => {
      contagem[r.tipo]++;
    });

    // Se temos predominância de valores baixos ou altos (pelo menos 3 em 4)
    const valorPredominante =
      contagem.baixo >= 3 ? "baixo" : contagem.alto >= 3 ? "alto" : null;

    if (valorPredominante) {
      // O padrão sugere que o próximo valor será o oposto do predominante
      estrategiaDiferencaPequena.alertaAtivo = true;
      estrategiaDiferencaPequena.proximoAlvo =
        valorPredominante === "baixo" ? "alto" : "baixo";
      // Para compatibilidade com código existente
      estrategiaDiferencaPequena.alvoProximaRodada =
        estrategiaDiferencaPequena.proximoAlvo;

      await enviarTelegram(
        `⚠️ ESTRATÉGIA DE VALORES: Detectados ${contagem[valorPredominante]} valores ${valorPredominante}s nos últimos ${estrategiaDiferencaPequena.qtdConsiderada} resultados!\n🎯 Entrada sugerida: Apostar em valores ${estrategiaDiferencaPequena.proximoAlvo}s na próxima rodada!`,
        "diferenca"
      );

      console.log(
        `Alerta ativado para valores! Próximo valor esperado: ${estrategiaDiferencaPequena.proximoAlvo}`
      );
    }
  }
}

// Estratégia Após Empate
async function processarEstrategiaAposEmpate(res) {
  // Primeira rodada após detectar empate (G0)
  if (
    estrategiaAposEmpate.alertaAtivo &&
    estrategiaAposEmpate.alvoAposEmpate &&
    estrategiaAposEmpate.rodadaG0 === null
  ) {
    console.log(
      `Alerta ativo após empate, primeira tentativa (G0). Alvo: ${estrategiaAposEmpate.alvoAposEmpate}`
    );

    if (res.resultado === estrategiaAposEmpate.alvoAposEmpate) {
      estrategiaAposEmpate.totalGreens++;
      estrategiaAposEmpate.vitoriaConsecutiva++;

      // Atualiza o contador de maior sequência de vitórias
      if (
        estrategiaAposEmpate.vitoriaConsecutiva >
        estrategiaAposEmpate.maiorVitoriaConsecutiva
      ) {
        estrategiaAposEmpate.maiorVitoriaConsecutiva =
          estrategiaAposEmpate.vitoriaConsecutiva;
      }

      await enviarTelegram(
        `🟢 APÓS EMPATE: ${res.resultado.toUpperCase()} [${res.player}-${
          res.banker
        }], ✅ Green para estratégia após empate! [${
          estrategiaAposEmpate.vitoriaConsecutiva
        } VITÓRIA${
          estrategiaAposEmpate.vitoriaConsecutiva > 1 ? "S" : ""
        } CONSECUTIVA${
          estrategiaAposEmpate.vitoriaConsecutiva > 1 ? "S" : ""
        }]\n📊 Após Empate: Greens: ${
          estrategiaAposEmpate.totalGreens
        } | Reds: ${estrategiaAposEmpate.totalReds}`,
        "aposEmpate"
      );

      // Registrar a vitória
      estrategiaAposEmpate.ultimaVitoria = {
        resultado: res.resultado,
        player: res.player,
        banker: res.banker,
        dataHora: new Date(),
      };

      // Resetar alerta
      resetarAlertaAposEmpate();
    } else if (res.resultado === "tie") {
      await enviarTelegram(
        `⚠️ APÓS EMPATE: Novo empate detectado! Mantendo estratégia e aguardando próxima rodada...`,
        "aposEmpate"
      );
      // Mantém o alerta ativo mas não considera como vitória ou derrota
    } else {
      await enviarTelegram(
        `🔄 APÓS EMPATE: ${res.resultado.toUpperCase()} [${res.player}-${
          res.banker
        }], vamos para o G1 na estratégia após empate...`,
        "aposEmpate"
      );
      estrategiaAposEmpate.rodadaG0 = res;
    }
  }
  // Segunda rodada após detectar empate (G1)
  else if (
    estrategiaAposEmpate.alertaAtivo &&
    estrategiaAposEmpate.alvoAposEmpate &&
    estrategiaAposEmpate.rodadaG0
  ) {
    console.log("Processando G1 para estratégia após empate");

    if (res.resultado === estrategiaAposEmpate.alvoAposEmpate) {
      estrategiaAposEmpate.totalGreens++;
      estrategiaAposEmpate.vitoriaConsecutiva++;

      // Atualiza o contador de maior sequência de vitórias
      if (
        estrategiaAposEmpate.vitoriaConsecutiva >
        estrategiaAposEmpate.maiorVitoriaConsecutiva
      ) {
        estrategiaAposEmpate.maiorVitoriaConsecutiva =
          estrategiaAposEmpate.vitoriaConsecutiva;
      }

      await enviarTelegram(
        `🟢 APÓS EMPATE: ${res.resultado.toUpperCase()} [${res.player}-${
          res.banker
        }], ✅ Green no G1 para estratégia após empate! [${
          estrategiaAposEmpate.vitoriaConsecutiva
        } VITÓRIA${
          estrategiaAposEmpate.vitoriaConsecutiva > 1 ? "S" : ""
        } CONSECUTIVA${
          estrategiaAposEmpate.vitoriaConsecutiva > 1 ? "S" : ""
        }]\n📊 Após Empate: Greens: ${
          estrategiaAposEmpate.totalGreens
        } | Reds: ${estrategiaAposEmpate.totalReds}`,
        "aposEmpate"
      );

      // Registrar a vitória
      estrategiaAposEmpate.ultimaVitoria = {
        resultado: res.resultado,
        player: res.player,
        banker: res.banker,
        dataHora: new Date(),
      };

      // Resetar alerta
      resetarAlertaAposEmpate();
    } else if (res.resultado === "tie") {
      await enviarTelegram(
        `⚠️ APÓS EMPATE: Novo empate detectado no G1! Mantendo estratégia e aguardando próxima rodada...`,
        "aposEmpate"
      );
      // Mantém o alerta ativo mas não considera como vitória ou derrota
    } else {
      estrategiaAposEmpate.totalReds++;
      estrategiaAposEmpate.vitoriaConsecutiva = 0;

      await enviarTelegram(
        `❌ APÓS EMPATE: ${res.resultado.toUpperCase()} [${res.player}-${
          res.banker
        }], ❌ Red na estratégia após empate\n📊 Após Empate: Greens: ${
          estrategiaAposEmpate.totalGreens
        } | Reds: ${estrategiaAposEmpate.totalReds}`,
        "aposEmpate"
      );

      // Registrar a derrota
      estrategiaAposEmpate.ultimaVitoria = {
        resultado: res.resultado,
        player: res.player,
        banker: res.banker,
        dataHora: new Date(),
      };

      // Resetar alerta
      resetarAlertaAposEmpate();
    }
  }
  // Análise normal do histórico para detecção de empates
  else if (!estrategiaAposEmpate.alertaAtivo) {
    // Se o resultado atual é um empate, ativamos o alerta
    if (res.resultado === "tie") {
      estrategiaAposEmpate.alertaAtivo = true;

      // Analisar o histórico para determinar o alvo após o empate
      // Estratégia: apostar no lado que tinha maior contagem antes do empate
      let contPlayer = 0;
      let contBanker = 0;

      // Olha os últimos 5 resultados antes do empate para definir o alvo
      for (let i = 1; i < Math.min(6, historico.length); i++) {
        if (historico[i]?.resultado === "player") {
          contPlayer++;
        } else if (historico[i]?.resultado === "banker") {
          contBanker++;
        }
        // Ignoramos empates anteriores
      }

      // Define o alvo como o lado que apareceu mais vezes antes do empate
      if (contPlayer >= contBanker) {
        estrategiaAposEmpate.alvoAposEmpate = "player";
      } else {
        estrategiaAposEmpate.alvoAposEmpate = "banker";
      }

      await enviarTelegram(
        `⚠️ ESTRATÉGIA APÓS EMPATE: Empate [${res.player}-${
          res.banker
        }] detectado!\n🎯 Entrada sugerida: ${estrategiaAposEmpate.alvoAposEmpate.toUpperCase()} na próxima rodada!`,
        "aposEmpate"
      );

      console.log(
        `Alerta ativado após empate! Alvo: ${estrategiaAposEmpate.alvoAposEmpate}`
      );
    }
  }
}

// Estratégia de Alternância
async function processarEstrategiaAlternancia(res) {
  // Ignorar empates para esta estratégia
  if (res.resultado === "tie") {
    console.log("Ignorando empate para estratégia de alternância");
    return;
  }

  // Primeira rodada após detectar padrão (G0)
  if (
    estrategiaAlternancia.alertaAtivo &&
    estrategiaAlternancia.proximoResultadoEsperado &&
    estrategiaAlternancia.rodadaG0 === null
  ) {
    console.log(
      `Alerta ativo para alternância, primeira tentativa (G0). Próximo esperado: ${estrategiaAlternancia.proximoResultadoEsperado}`
    );

    if (res.resultado === estrategiaAlternancia.proximoResultadoEsperado) {
      estrategiaAlternancia.totalGreens++;
      estrategiaAlternancia.vitoriaConsecutiva++;

      // Atualiza o contador de maior sequência de vitórias
      if (
        estrategiaAlternancia.vitoriaConsecutiva >
        estrategiaAlternancia.maiorVitoriaConsecutiva
      ) {
        estrategiaAlternancia.maiorVitoriaConsecutiva =
          estrategiaAlternancia.vitoriaConsecutiva;
      }

      await enviarTelegram(
        `🟢 ALTERNÂNCIA: ${res.resultado.toUpperCase()} [${res.player}-${
          res.banker
        }], ✅ Green para estratégia de alternância! [${
          estrategiaAlternancia.vitoriaConsecutiva
        } VITÓRIA${
          estrategiaAlternancia.vitoriaConsecutiva > 1 ? "S" : ""
        } CONSECUTIVA${
          estrategiaAlternancia.vitoriaConsecutiva > 1 ? "S" : ""
        }]\n📊 Alternância: Greens: ${
          estrategiaAlternancia.totalGreens
        } | Reds: ${estrategiaAlternancia.totalReds}`,
        "alternancia"
      );

      // Registrar a vitória
      estrategiaAlternancia.ultimaVitoria = {
        resultado: res.resultado,
        player: res.player,
        banker: res.banker,
        dataHora: new Date(),
      };

      // Resetar alerta
      resetarAlertaAlternancia();
    } else {
      await enviarTelegram(
        `🔄 ALTERNÂNCIA: ${res.resultado.toUpperCase()} [${res.player}-${
          res.banker
        }], vamos para o G1 na estratégia de alternância...`,
        "alternancia"
      );
      estrategiaAlternancia.rodadaG0 = res;
    }
  }
  // Segunda rodada após detectar padrão (G1)
  else if (
    estrategiaAlternancia.alertaAtivo &&
    estrategiaAlternancia.proximoResultadoEsperado &&
    estrategiaAlternancia.rodadaG0
  ) {
    console.log("Processando G1 para estratégia de alternância");

    // No G1, apostamos no oposto do último resultado
    const proximoEsperadoG1 =
      estrategiaAlternancia.rodadaG0.resultado === "player"
        ? "banker"
        : "player";

    if (res.resultado === proximoEsperadoG1) {
      estrategiaAlternancia.totalGreens++;
      estrategiaAlternancia.vitoriaConsecutiva++;

      // Atualiza o contador de maior sequência de vitórias
      if (
        estrategiaAlternancia.vitoriaConsecutiva >
        estrategiaAlternancia.maiorVitoriaConsecutiva
      ) {
        estrategiaAlternancia.maiorVitoriaConsecutiva =
          estrategiaAlternancia.vitoriaConsecutiva;
      }

      await enviarTelegram(
        `🟢 ALTERNÂNCIA: ${res.resultado.toUpperCase()} [${res.player}-${
          res.banker
        }], ✅ Green no G1 para estratégia de alternância! [${
          estrategiaAlternancia.vitoriaConsecutiva
        } VITÓRIA${
          estrategiaAlternancia.vitoriaConsecutiva > 1 ? "S" : ""
        } CONSECUTIVA${
          estrategiaAlternancia.vitoriaConsecutiva > 1 ? "S" : ""
        }]\n📊 Alternância: Greens: ${
          estrategiaAlternancia.totalGreens
        } | Reds: ${estrategiaAlternancia.totalReds}`,
        "alternancia"
      );

      // Registrar a vitória
      estrategiaAlternancia.ultimaVitoria = {
        resultado: res.resultado,
        player: res.player,
        banker: res.banker,
        dataHora: new Date(),
      };

      // Resetar alerta
      resetarAlertaAlternancia();
    } else {
      estrategiaAlternancia.totalReds++;
      estrategiaAlternancia.vitoriaConsecutiva = 0;

      await enviarTelegram(
        `❌ ALTERNÂNCIA: ${res.resultado.toUpperCase()} [${res.player}-${
          res.banker
        }], ❌ Red na estratégia de alternância\n📊 Alternância: Greens: ${
          estrategiaAlternancia.totalGreens
        } | Reds: ${estrategiaAlternancia.totalReds}`,
        "alternancia"
      );

      // Registrar a derrota
      estrategiaAlternancia.ultimaVitoria = {
        resultado: res.resultado,
        player: res.player,
        banker: res.banker,
        dataHora: new Date(),
      };

      // Resetar alerta
      resetarAlertaAlternancia();
    }
  }
  // Análise normal do histórico para detecção de alternância
  else if (!estrategiaAlternancia.alertaAtivo && historico.length >= 4) {
    // Filtra apenas resultados Player e Banker (sem empates)
    const resultadosFiltrados = historico
      .filter((item) => item.resultado !== "tie")
      .slice(0, 4);

    if (resultadosFiltrados.length >= 4) {
      // Verifica se há um padrão de alternância (PBPB ou BPBP)
      const ehAlternancia =
        resultadosFiltrados[0].resultado !== resultadosFiltrados[1].resultado &&
        resultadosFiltrados[1].resultado !== resultadosFiltrados[2].resultado &&
        resultadosFiltrados[2].resultado !== resultadosFiltrados[3].resultado &&
        resultadosFiltrados[0].resultado === resultadosFiltrados[2].resultado &&
        resultadosFiltrados[1].resultado === resultadosFiltrados[3].resultado;

      if (ehAlternancia) {
        estrategiaAlternancia.alertaAtivo = true;
        estrategiaAlternancia.padrao = [
          resultadosFiltrados[3].resultado,
          resultadosFiltrados[2].resultado,
          resultadosFiltrados[1].resultado,
          resultadosFiltrados[0].resultado,
        ];

        // O próximo esperado deve ser igual ao último detectado
        estrategiaAlternancia.proximoResultadoEsperado =
          resultadosFiltrados[0].resultado === "player" ? "banker" : "player";

        await enviarTelegram(
          `⚠️ ESTRATÉGIA DE ALTERNÂNCIA: Padrão de alternância detectado!
🔄 Últimos resultados: ${resultadosFiltrados
            .map((r) => r.resultado.toUpperCase().charAt(0))
            .join("")}
🎯 Entrada sugerida: ${estrategiaAlternancia.proximoResultadoEsperado.toUpperCase()} na próxima rodada!`,
          "alternancia"
        );

        console.log(
          `Alerta ativado para alternância! Próximo esperado: ${estrategiaAlternancia.proximoResultadoEsperado}`
        );
      }
    }
  }
}

// Funções para resetar alertas

function resetarAlertaSequencia() {
  console.log("Resetando alerta de sequência");
  estrategiaSequencia.alertaAtivo = false;
  estrategiaSequencia.alvoAtual = null;
  estrategiaSequencia.rodadaG0 = null;
}

function resetarAlertaDiferencaPequena() {
  console.log("Resetando alerta de padrão");
  estrategiaDiferencaPequena.alertaAtivo = false;
  estrategiaDiferencaPequena.proximoAlvo = null;
  estrategiaDiferencaPequena.alvoProximaRodada = null;
  estrategiaDiferencaPequena.rodadaG0 = null;

  // Não limpamos todos os resultados para manter histórico parcial
  // Mantemos os últimos 2 para continuar análise
  if (
    estrategiaDiferencaPequena.ultimosResultados &&
    estrategiaDiferencaPequena.ultimosResultados.length > 2
  ) {
    estrategiaDiferencaPequena.ultimosResultados =
      estrategiaDiferencaPequena.ultimosResultados.slice(0, 2);
  }
}

function resetarAlertaAposEmpate() {
  console.log("Resetando alerta após empate");
  estrategiaAposEmpate.alertaAtivo = false;
  estrategiaAposEmpate.alvoAposEmpate = null;
  estrategiaAposEmpate.rodadaG0 = null;
}

function resetarAlertaAlternancia() {
  console.log("Resetando alerta de alternância");
  estrategiaAlternancia.alertaAtivo = false;
  estrategiaAlternancia.padrao = [];
  estrategiaAlternancia.proximoResultadoEsperado = null;
  estrategiaAlternancia.rodadaG0 = null;
}

// Envia mensagem para o Telegram
async function enviarTelegram(mensagem, estrategia = "geral") {
  try {
    console.log(`Enviando para Telegram (${estrategia}): ${mensagem}`);

    let token, chatId;

    // Seleciona o token e chat ID apropriados com base na estratégia
    switch (estrategia) {
      case "sequencia":
        token = TELEGRAM_TOKEN_SEQUENCIA;
        chatId = TELEGRAM_CHAT_ID_SEQUENCIA;
        break;
      case "diferenca":
      case "diferencas": // Use o mesmo token para ambos os casos
        token = TELEGRAM_TOKEN_DIFERENCA;
        chatId = TELEGRAM_CHAT_ID_DIFERENCA;
        break;
      case "aposEmpate":
        token = TELEGRAM_TOKEN_APOS_EMPATE;
        chatId = TELEGRAM_CHAT_ID_APOS_EMPATE;
        break;
      case "alternancia":
        // Use o token principal como fallback
        token = TELEGRAM_TOKEN;
        chatId = TELEGRAM_CHAT_ID;
        break;
      default:
        token = TELEGRAM_TOKEN;
        chatId = TELEGRAM_CHAT_ID;
    }

    // Se o token específico não estiver definido, usa o token geral
    if (!token) {
      token = TELEGRAM_TOKEN;
      chatId = TELEGRAM_CHAT_ID;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    const response = await axios.post(url, {
      chat_id: chatId,
      text: mensagem,
    });

    console.log(`Mensagem enviada com sucesso para grupo de ${estrategia}`);
    return response;
  } catch (err) {
    console.error(
      `Erro ao enviar mensagem para o Telegram (${estrategia}):`,
      err.message
    );
    if (err.response) {
      console.error("Resposta do Telegram:", err.response.data);
    }

    // Em caso de erro, tenta enviar pelo bot principal como fallback
    if (estrategia !== "geral") {
      try {
        console.log("Tentando enviar pelo bot principal como fallback...");
        const urlFallback = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
        await axios.post(urlFallback, {
          chat_id: TELEGRAM_CHAT_ID,
          text: `[FALLBACK - Falha ao enviar para grupo ${estrategia}] ${mensagem}`,
        });
        console.log("Mensagem enviada pelo bot fallback");
      } catch (fallbackErr) {
        console.error("Erro também no fallback:", fallbackErr.message);
      }
    }
  }
}

// Envia resumo das estatísticas
async function enviarResumo() {
  // Resumo geral para o grupo principal
  await enviarTelegram(`📊 RESUMO PARCIAL (últimas ${contadorRodadas} rodadas):
✅ PLAYER: ${totalPlayer} (${Math.round(
    (totalPlayer / contadorRodadas) * 100
  )}%)
✅ BANKER: ${totalBanker} (${Math.round(
    (totalBanker / contadorRodadas) * 100
  )}%)
✅ TIE: ${totalTie} (${Math.round((totalTie / contadorRodadas) * 100)}%)

🎲 ESTATÍSTICAS DE SEQUÊNCIA:
Greens: ${estrategiaSequencia.totalGreens} | Reds: ${
    estrategiaSequencia.totalReds
  }
Maior sequência de vitórias: ${estrategiaSequencia.maiorVitoriaConsecutiva}

🎲 ESTATÍSTICAS DE DIFERENÇA PEQUENA:
Greens: ${estrategiaDiferencaPequena.totalGreens} | Reds: ${
    estrategiaDiferencaPequena.totalReds
  }
Maior sequência de vitórias: ${
    estrategiaDiferencaPequena.maiorVitoriaConsecutiva
  }

🎲 ESTATÍSTICAS APÓS EMPATE:
Greens: ${estrategiaAposEmpate.totalGreens} | Reds: ${
    estrategiaAposEmpate.totalReds
  }
Maior sequência de vitórias: ${estrategiaAposEmpate.maiorVitoriaConsecutiva}

🎲 ESTATÍSTICAS DE ALTERNÂNCIA:
Greens: ${estrategiaAlternancia.totalGreens} | Reds: ${
    estrategiaAlternancia.totalReds
  }
Maior sequência de vitórias: ${estrategiaAlternancia.maiorVitoriaConsecutiva}

🎯 Maior pontuação Player: ${maiorPontuacaoPlayer}
🎯 Maior pontuação Banker: ${maiorPontuacaoBanker}
🔢 Maior sequência Player: ${maiorSequenciaPlayer}
🔢 Maior sequência Banker: ${maiorSequenciaBanker}
🔢 Maior sequência Tie: ${maiorSequenciaTie}`);

  // Resumo específico para o grupo de Sequência
  await enviarTelegram(
    `📊 RESUMO PARCIAL - SEQUÊNCIA (últimas ${contadorRodadas} rodadas):
✅ Greens: ${estrategiaSequencia.totalGreens} | Reds: ${
      estrategiaSequencia.totalReds
    }
🔄 Maior sequência de vitórias: ${estrategiaSequencia.maiorVitoriaConsecutiva}
${
  estrategiaSequencia.vitoriaConsecutiva > 0
    ? "🔥 Sequência atual: " +
      estrategiaSequencia.vitoriaConsecutiva +
      " vitória(s) consecutiva(s)"
    : ""
}
🔢 Maior sequência Player: ${maiorSequenciaPlayer}
🔢 Maior sequência Banker: ${maiorSequenciaBanker}`,
    "sequencia"
  );

  // Envia resumo específico para o grupo de Padrão (antiga Diferença Pequena)
  await enviarTelegram(
    `📊 RESUMO PARCIAL - PADRÃO (últimas ${contadorRodadas} rodadas):
✅ Greens: ${estrategiaDiferencaPequena.totalGreens} | Reds: ${
      estrategiaDiferencaPequena.totalReds
    }
🔄 Maior sequência de vitórias: ${
      estrategiaDiferencaPequena.maiorVitoriaConsecutiva
    }
${
  estrategiaDiferencaPequena.vitoriaConsecutiva > 0
    ? "🔥 Sequência atual: " +
      estrategiaDiferencaPequena.vitoriaConsecutiva +
      " vitória(s) consecutiva(s)"
    : ""
}
📊 Player: ${Math.round(
      (totalPlayer / contadorRodadas) * 100
    )}% | Banker: ${Math.round((totalBanker / contadorRodadas) * 100)}%`,
    "diferenca"
  );

  // Resumo específico para o grupo de Após Empate
  await enviarTelegram(
    `📊 RESUMO PARCIAL - APÓS EMPATE (últimas ${contadorRodadas} rodadas):
✅ Greens: ${estrategiaAposEmpate.totalGreens} | Reds: ${
      estrategiaAposEmpate.totalReds
    }
🔄 Maior sequência de vitórias: ${estrategiaAposEmpate.maiorVitoriaConsecutiva}
${
  estrategiaAposEmpate.vitoriaConsecutiva > 0
    ? "🔥 Sequência atual: " +
      estrategiaAposEmpate.vitoriaConsecutiva +
      " vitória(s) consecutiva(s)"
    : ""
}
🎲 Total de Ties: ${totalTie} (${Math.round(
      (totalTie / contadorRodadas) * 100
    )}%)
🔢 Maior sequência Tie: ${maiorSequenciaTie}`,
    "aposEmpate"
  );

  // Resumo específico para o grupo de Alternância
  await enviarTelegram(
    `📊 RESUMO PARCIAL - ALTERNÂNCIA (últimas ${contadorRodadas} rodadas):
✅ Greens: ${estrategiaAlternancia.totalGreens} | Reds: ${
      estrategiaAlternancia.totalReds
    }
🔄 Maior sequência de vitórias: ${estrategiaAlternancia.maiorVitoriaConsecutiva}
${
  estrategiaAlternancia.vitoriaConsecutiva > 0
    ? "🔥 Sequência atual: " +
      estrategiaAlternancia.vitoriaConsecutiva +
      " vitória(s) consecutiva(s)"
    : ""
}
✅ PLAYER: ${totalPlayer} (${Math.round(
      (totalPlayer / contadorRodadas) * 100
    )}%)
✅ BANKER: ${totalBanker} (${Math.round(
      (totalBanker / contadorRodadas) * 100
    )}%)`,
    "alternancia"
  );
}

// Função para relatório detalhado a cada 200 rodadas
async function enviarRelatorioDetalhado() {
  // Relatório completo para o grupo principal
  await enviarTelegram(`🔍 RELATÓRIO DETALHADO (RODADA #${contadorRodadas})

🎲 ESTATÍSTICAS GERAIS:
✅ PLAYER: ${totalPlayer} (${Math.round(
    (totalPlayer / contadorRodadas) * 100
  )}%)
✅ BANKER: ${totalBanker} (${Math.round(
    (totalBanker / contadorRodadas) * 100
  )}%)
✅ TIE: ${totalTie} (${Math.round((totalTie / contadorRodadas) * 100)}%)

🎲 ESTRATÉGIA DE SEQUÊNCIA:
✅ Greens: ${estrategiaSequencia.totalGreens} (${Math.round(
    (estrategiaSequencia.totalGreens /
      (estrategiaSequencia.totalGreens + estrategiaSequencia.totalReds || 1)) *
      100
  )}% de aproveitamento)
❌ Reds: ${estrategiaSequencia.totalReds}
🔄 Maior sequência de vitórias: ${estrategiaSequencia.maiorVitoriaConsecutiva}
${
  estrategiaSequencia.vitoriaConsecutiva > 0
    ? "🔥 Sequência atual: " +
      estrategiaSequencia.vitoriaConsecutiva +
      " vitória(s) consecutiva(s)"
    : ""
}

🎲 ESTRATÉGIA DE DIFERENÇA PEQUENA:
✅ Greens: ${estrategiaDiferencaPequena.totalGreens} (${Math.round(
    (estrategiaDiferencaPequena.totalGreens /
      (estrategiaDiferencaPequena.totalGreens +
        estrategiaDiferencaPequena.totalReds || 1)) *
      100
  )}% de aproveitamento)
❌ Reds: ${estrategiaDiferencaPequena.totalReds}
🔄 Maior sequência de vitórias: ${
    estrategiaDiferencaPequena.maiorVitoriaConsecutiva
  }
${
  estrategiaDiferencaPequena.vitoriaConsecutiva > 0
    ? "🔥 Sequência atual: " +
      estrategiaDiferencaPequena.vitoriaConsecutiva +
      " vitória(s) consecutiva(s)"
    : ""
}

🎲 ESTRATÉGIA APÓS EMPATE:
✅ Greens: ${estrategiaAposEmpate.totalGreens} (${Math.round(
    (estrategiaAposEmpate.totalGreens /
      (estrategiaAposEmpate.totalGreens + estrategiaAposEmpate.totalReds ||
        1)) *
      100
  )}% de aproveitamento)
❌ Reds: ${estrategiaAposEmpate.totalReds}
🔄 Maior sequência de vitórias: ${estrategiaAposEmpate.maiorVitoriaConsecutiva}
${
  estrategiaAposEmpate.vitoriaConsecutiva > 0
    ? "🔥 Sequência atual: " +
      estrategiaAposEmpate.vitoriaConsecutiva +
      " vitória(s) consecutiva(s)"
    : ""
}

🎲 ESTRATÉGIA DE ALTERNÂNCIA:
✅ Greens: ${estrategiaAlternancia.totalGreens} (${Math.round(
    (estrategiaAlternancia.totalGreens /
      (estrategiaAlternancia.totalGreens + estrategiaAlternancia.totalReds ||
        1)) *
      100
  )}% de aproveitamento)
❌ Reds: ${estrategiaAlternancia.totalReds}
🔄 Maior sequência de vitórias: ${estrategiaAlternancia.maiorVitoriaConsecutiva}
${
  estrategiaAlternancia.vitoriaConsecutiva > 0
    ? "🔥 Sequência atual: " +
      estrategiaAlternancia.vitoriaConsecutiva +
      " vitória(s) consecutiva(s)"
    : ""
}

🎯 Maior pontuação Player: ${maiorPontuacaoPlayer}
🎯 Maior pontuação Banker: ${maiorPontuacaoBanker}
🔢 Maior sequência Player: ${maiorSequenciaPlayer}
🔢 Maior sequência Banker: ${maiorSequenciaBanker}
🔢 Maior sequência Tie: ${maiorSequenciaTie}

📈 Total de rodadas analisadas: ${contadorRodadas}

📱 Bot monitorando 24/7 - Mantenha as apostas responsáveis!`);

  // Enviar relatórios específicos para os grupos de cada estratégia
  // (código similar ao enviarResumo, mas mais detalhado)
}

// Adicione esta nova função para enviar o relatório diário e reiniciar contadores
async function enviarRelatorioDiarioEReiniciar() {
  const hoje = new Date();
  const dataFormatada = hoje.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // Relatório completo para o grupo principal
  await enviarTelegram(`📅 RELATÓRIO FINAL DO DIA - ${dataFormatada}

🎲 RESUMO DAS ÚLTIMAS 24 HORAS:
✅ PLAYER: ${totalPlayer} (${Math.round(
    (totalPlayer / contadorRodadas) * 100
  )}%)
✅ BANKER: ${totalBanker} (${Math.round(
    (totalBanker / contadorRodadas) * 100
  )}%)
✅ TIE: ${totalTie} (${Math.round((totalTie / contadorRodadas) * 100)}%)

💯 TAXA DE APROVEITAMENTO DAS ESTRATÉGIAS:
🎯 Sequência: ${Math.round(
    (estrategiaSequencia.totalGreens /
      (estrategiaSequencia.totalGreens + estrategiaSequencia.totalReds || 1)) *
      100
  )}%
🎯 Diferença Pequena: ${Math.round(
    (estrategiaDiferencaPequena.totalGreens /
      (estrategiaDiferencaPequena.totalGreens +
        estrategiaDiferencaPequena.totalReds || 1)) *
      100
  )}%
🎯 Após Empate: ${Math.round(
    (estrategiaAposEmpate.totalGreens /
      (estrategiaAposEmpate.totalGreens + estrategiaAposEmpate.totalReds ||
        1)) *
      100
  )}%
🎯 Alternância: ${Math.round(
    (estrategiaAlternancia.totalGreens /
      (estrategiaAlternancia.totalGreens + estrategiaAlternancia.totalReds ||
        1)) *
      100
  )}%

🎯 Maior pontuação Player: ${maiorPontuacaoPlayer}
🎯 Maior pontuação Banker: ${maiorPontuacaoBanker}
🔢 Maior sequência Player: ${maiorSequenciaPlayer}
🔢 Maior sequência Banker: ${maiorSequenciaBanker}
🔢 Maior sequência Tie: ${maiorSequenciaTie}

📈 Total de rodadas analisadas: ${contadorRodadas}

🔄 Contadores reiniciados para o novo dia.
📱 Bot continua monitorando 24/7 - Boas apostas!`);

  // Reinicia todos os contadores para o novo dia
  totalPlayer = 0;
  totalBanker = 0;
  totalTie = 0;

  estrategiaSequencia.totalGreens = 0;
  estrategiaSequencia.totalReds = 0;
  estrategiaSequencia.vitoriaConsecutiva = 0;

  estrategiaDiferencaPequena.totalGreens = 0;
  estrategiaDiferencaPequena.totalReds = 0;
  estrategiaDiferencaPequena.vitoriaConsecutiva = 0;

  estrategiaAposEmpate.totalGreens = 0;
  estrategiaAposEmpate.totalReds = 0;
  estrategiaAposEmpate.vitoriaConsecutiva = 0;

  estrategiaAlternancia.totalGreens = 0;
  estrategiaAlternancia.totalReds = 0;
  estrategiaAlternancia.vitoriaConsecutiva = 0;

  contadorRodadas = 0;

  // Não reiniciamos sequências máximas históricas

  console.log("Contadores reiniciados para o novo dia.");
}

// Função para verificar a mudança de dia
function verificarMudancaDeDia() {
  const dataAtual = new Date();
  const diaAtual = dataAtual.getDate();

  // Se o dia mudou
  if (diaAtual !== ultimoDiaVerificado) {
    console.log(
      `Dia mudou de ${ultimoDiaVerificado} para ${diaAtual}. Enviando relatório diário e reiniciando contadores.`
    );

    // Envia o relatório do dia anterior e reinicia contadores
    enviarRelatorioDiarioEReiniciar();

    // Atualiza o dia verificado
    ultimoDiaVerificado = diaAtual;
  }
}

// Gerenciamento do encerramento
process.on("SIGINT", async () => {
  console.log("Encerrando bot graciosamente...");
  if (browser) {
    console.log("Fechando navegador...");
    await browser
      .close()
      .catch((err) => console.error("Erro ao fechar navegador:", err));
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Recebido sinal de término...");
  if (browser) {
    console.log("Fechando navegador...");
    await browser
      .close()
      .catch((err) => console.error("Erro ao fechar navegador:", err));
  }
  process.exit(0);
});

// Inicia o bot
(async function () {
  try {
    console.log("🎲 Bot do Bac Bo iniciado!");
    console.log("🔍 Monitorando resultados do Bac Bo...");

    // Envia mensagem inicial para todos os grupos
    await enviarTelegram(
      "🎲 Bot do Bac Bo iniciado! Monitorando resultados e enviando relatórios gerais..."
    );
    await enviarTelegram(
      "🎲 Bot do Bac Bo iniciado! Monitorando estratégia de SEQUÊNCIA (4 iguais)...",
      "sequencia"
    );
    await enviarTelegram(
      "🎲 Bot do Bac Bo iniciado! Monitorando estratégia de DIFERENÇA PEQUENA (≤2)...",
      "diferenca"
    );
    await enviarTelegram(
      "🎲 Bot do Bac Bo iniciado! Monitorando estratégia APÓS EMPATE...",
      "aposEmpate"
    );

    // Executa a primeira vez
    await getBacBoResultado();

    // Configura o intervalo para execução regular (a cada 15 segundos)
    console.log("⏱️ Configurando intervalo de execução a cada 30 segundos");
    setInterval(getBacBoResultado, 30000);
    console.log("⏱️ Configurando verificação de mudança de dia a cada minuto");
    setInterval(verificarMudancaDeDia, 60000); // Verifica a cada minuto
  } catch (err) {
    console.error("Erro fatal ao iniciar o bot:", err);
    // Tenta enviar mensagem de erro ao Telegram
    enviarTelegram("❌ Erro fatal ao iniciar o bot. Verifique os logs.").catch(
      () => {
        console.error(
          "Também não foi possível enviar mensagem de erro ao Telegram"
        );
      }
    );
  }
})();

// Inicia servidor Express para manter o bot vivo no Render
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("✅ Bot do Bac Bo está rodando!");
});

app.listen(PORT, () => {
  console.log(`🌐 Web service ativo na porta ${PORT}`);
});
