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
  alvoAtual: null, // Para compatibilidade
  rodadaG0: null,
  totalGreens: 0,
  totalReds: 0,
  greensG0: 0, // Novo contador para vitórias no G0
  greensG1: 0, // Novo contador para vitórias no G1
  redsG1: 0, // Novo contador para derrotas no G1
  ultimaVitoria: null,
  vitoriaConsecutiva: 0,
  maiorVitoriaConsecutiva: 0,
};

// Estratégia 3: Após Empate (apostar no mesmo resultado anterior ao Tie)
let estrategiaAposEmpate = {
  alertaAtivo: false,
  ultimoResultadoAntesTie: null,
  alvoAposEmpate: null,
  rodadaG0: null,
  totalGreens: 0,
  totalReds: 0,
  greensG0: 0, // Novo contador para vitórias no G0
  greensG1: 0, // Novo contador para vitórias no G1
  redsG1: 0, // Novo contador para derrotas no G1
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
  greensG0: 0, // Novo contador para vitórias no G0
  greensG1: 0, // Novo contador para vitórias no G1
  redsG1: 0, // Novo contador para derrotas no G1
  ultimaVitoria: null,
  vitoriaConsecutiva: 0,
  maiorVitoriaConsecutiva: 0,
};

let estrategiaProporcaoDinamica = {
  alertaAtivo: false,
  windowSize: 20, // Tamanho da janela para análise (últimos 20 resultados)
  limiteDesbalanceamento: 65, // Percentual que indica desbalanceamento (65% significa 65:35)
  alvoProximaRodada: null,
  rodadaG0: null,
  totalGreens: 0,
  totalReds: 0,
  greensG0: 0, // Novo contador para vitórias no G0
  greensG1: 0, // Novo contador para vitórias no G1
  redsG1: 0, // Novo contador para derrotas no G1
  ultimaVitoria: null,
  vitoriaConsecutiva: 0,
  maiorVitoriaConsecutiva: 0,
};

// Configuração do Telegram
const TELEGRAM_TOKEN = "7740348369:AAFSBFhXmEXXtgNR0gFgIsQam6nLzy_gHpM";
const TELEGRAM_CHAT_ID = "6051804710"; // coloque aqui o chat ID real


// Tokens e chat IDs para estratégias específicas
const TELEGRAM_TOKEN_SEQUENCIA = process.env.TELEGRAM_TOKEN_SEQUENCIA;
const TELEGRAM_CHAT_ID_SEQUENCIA = process.env.TELEGRAM_CHAT_ID_SEQUENCIA;

const TELEGRAM_TOKEN_APOS_EMPATE = process.env.TELEGRAM_TOKEN_APOS_EMPATE;
const TELEGRAM_CHAT_ID_APOS_EMPATE = process.env.TELEGRAM_CHAT_ID_APOS_EMPATE;

const TELEGRAM_TOKEN_PROPORCAO = process.env.TELEGRAM_TOKEN_PROPORCAO;
const TELEGRAM_CHAT_ID_PROPORCAO = process.env.TELEGRAM_CHAT_ID_PROPORCAO;

// Variáveis globais para controlar o navegador
let browser = null;
let page = null;

// Adicione estas variáveis globais no início do seu código
let ultimaReinicializacaoNavegador = Date.now();
const INTERVALO_REINICIALIZACAO = 15 * 60 * 1000; // 15 minutos em milissegundos

// Função atualizada para buscar resultados do Bac Bo do site tipminer.com
async function getBacBoResultado() {
  try {
    console.log("Buscando resultados do Bac Bo no tipminer...");

    // Verificar se é hora de reiniciar o navegador
    const tempoAtual = Date.now();
    if (
      tempoAtual - ultimaReinicializacaoNavegador >
      INTERVALO_REINICIALIZACAO
    ) {
      console.log(
        `Reinicializando navegador após ${Math.round(
          (tempoAtual - ultimaReinicializacaoNavegador) / 60000
        )} minutos de execução`
      );

      // Fechar navegador existente se estiver aberto
      if (browser) {
        try {
          if (page)
            await page
              .close()
              .catch((e) => console.error("Erro ao fechar página:", e));
          await browser
            .close()
            .catch((e) => console.error("Erro ao fechar navegador:", e));
        } catch (closeErr) {
          console.error("Erro ao fechar navegador:", closeErr.message);
        }
        page = null;
        browser = null;
      }

      // Atualizar timestamp de reinicialização
      ultimaReinicializacaoNavegador = tempoAtual;
    }

    // Inicializar o navegador apenas uma vez
    if (!browser) {
      console.log("Iniciando navegador...");

      // Configuração otimizada para ambiente VPS Linux
      const options = {
        headless: "new", // Usar o novo modo headless
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--disable-features=AudioServiceOutOfProcess",
          "--disable-extensions",
          "--window-size=1366,768",
          "--disable-accelerated-2d-canvas",
          "--disable-gl-drawing-for-tests",
        ],
        defaultViewport: {
          width: 1366,
          height: 768,
        },
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

        console.log("Abrindo nova página...");
        page = await browser.newPage();

        // Configurando o User-Agent para parecer um navegador normal
        await page.setUserAgent(
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36"
        );

        // Otimizações adicionais para ambiente VPS
        await page.setRequestInterception(true);
        page.on("request", (request) => {
          // Bloquear recursos desnecessários para economizar largura de banda e CPU
          const blockedResourceTypes = ["image", "media", "font", "stylesheet"];
          if (
            blockedResourceTypes.includes(request.resourceType()) &&
            !request.url().includes("tipminer.com") // só bloqueia recursos de terceiros
          ) {
            request.abort();
          } else {
            request.continue();
          }
        });
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
    }

    // Verificar se page está definido
    if (!page) {
      console.error("A página não foi inicializada. Tentando reabrir...");
      try {
        page = await browser.newPage();
        await page.setUserAgent(
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36"
        );
      } catch (error) {
        console.error(`Erro ao criar nova página: ${error.message}`);
        // Força reinicialização do browser na próxima chamada
        browser = null;
        return;
      }
    }

    // Verificar mudança de dia a cada execução
    verificarMudancaDeDia();

    try {
      // Navegar para o novo site com tentativas máximas de recuperação
      let tentativas = 0;
      const MAX_TENTATIVAS = 3;
      let navegacaoSucesso = false;

      while (!navegacaoSucesso && tentativas < MAX_TENTATIVAS) {
        try {
          tentativas++;
          console.log(
            `Tentativa ${tentativas}/${MAX_TENTATIVAS} - Navegando para tipminer.com/br/historico/blaze/bac-bo-ao-vivo...`
          );

          const resposta = await page.goto(
            "https://www.tipminer.com/br/historico/blaze/bac-bo-ao-vivo",
            {
              waitUntil: "networkidle2",
              timeout: 45000, // reduzindo para 45 segundos
            }
          );

          // Verificando se a resposta foi bem-sucedida (código 200)
          if (resposta && resposta.status() === 200) {
            navegacaoSucesso = true;
            console.log("Página carregada com sucesso.");
          } else {
            console.log(
              `Resposta não ideal: ${resposta ? resposta.status() : "null"}`
            );
            // Pequena espera antes da próxima tentativa
            await new Promise((r) => setTimeout(r, 3000));
          }
        } catch (navErr) {
          console.error(`Erro na tentativa ${tentativas}: ${navErr.message}`);
          // Espera entre tentativas
          await new Promise((r) => setTimeout(r, 3000));
        }
      }

      if (!navegacaoSucesso) {
        console.error(
          "Todas as tentativas de navegação falharam. Forçando reinício do navegador."
        );
        browser = null;
        page = null;
        return;
      }
    } catch (navigationError) {
      console.error(`Erro ao navegar: ${navigationError.message}`);
      console.log("Tentando continuar mesmo com erro de navegação...");
      // Tentar recuperar de erros de navegação
      await new Promise((r) => setTimeout(r, 5000)); // Espera 5 segundos antes de continuar
    }

    // Esperar um tempo adicional para garantir que a página carregue completamente
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log(
      "Verificando se os elementos de resultados existem na página..."
    );

    // Verifica se os elementos de resultado existem antes de tentar extraí-los
    let tentativasSeletor = 0;
    const MAX_TENTATIVAS_SELETOR = 3;
    let seletorEncontrado = false;

    while (!seletorEncontrado && tentativasSeletor < MAX_TENTATIVAS_SELETOR) {
      tentativasSeletor++;
      try {
        const seletorExiste = await page.evaluate(() => {
          return !!document.querySelector(".grid__row.flex");
        });

        if (seletorExiste) {
          seletorEncontrado = true;
          console.log(`Seletor encontrado na tentativa ${tentativasSeletor}.`);
        } else {
          console.log(
            `Tentativa ${tentativasSeletor}/${MAX_TENTATIVAS_SELETOR} - Seletor não encontrado. Esperando...`
          );
          // Espera adicional e rola a página para garantir carregamento
          await page.evaluate(() => window.scrollBy(0, 100));
          await new Promise((r) => setTimeout(r, 2000));
        }
      } catch (selectorErr) {
        console.error(
          `Erro ao verificar seletor (tentativa ${tentativasSeletor}): ${selectorErr.message}`
        );
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    if (!seletorEncontrado) {
      console.error(
        "Seletor '.grid__row.flex' não encontrado na página após múltiplas tentativas."
      );
      return; // Sair da função para tentar novamente na próxima execução
    }

    console.log("Seletor encontrado, extraindo resultados...");

    // Extraindo os resultados do Bac Bo da nova estrutura HTML
    const resultados = await page
      .evaluate(() => {
        try {
          const items = [];

          // Seleciona todos os botões de célula na grid row
          const celulas = document.querySelectorAll(
            ".grid__row.flex button.cell"
          );

          if (!celulas || celulas.length === 0) {
            console.error("Células de resultado não encontradas na página");
            return [];
          }

          // Processamos cada célula de resultado
          Array.from(celulas).forEach((celula, index) => {
            try {
              // Determina o tipo de resultado (player/banker/tie)
              let resultado = null;
              if (celula.classList.contains("cell--type-player")) {
                resultado = "player";
              } else if (celula.classList.contains("cell--type-banker")) {
                resultado = "banker";
              } else if (celula.classList.contains("cell--type-tie")) {
                resultado = "tie";
              } else {
                return; // Ignora se não for um tipo conhecido
              }

              // Obtém a pontuação do resultado
              const resultadoText = celula
                .querySelector(".cell__result")
                ?.textContent.trim();
              const pontuacao = parseInt(resultadoText || "0", 10);

              // Define pontuações do player e banker com base no resultado
              let playerScore = 0;
              let bankerScore = 0;

              if (resultado === "player") {
                playerScore = pontuacao;
                bankerScore = pontuacao - 2; // Estimativa, já que o player sempre ganha com pontuação maior
              } else if (resultado === "banker") {
                bankerScore = pontuacao;
                playerScore = pontuacao - 2; // Estimativa, já que o banker sempre ganha com pontuação maior
              } else if (resultado === "tie") {
                // Em caso de empate, as pontuações são iguais
                playerScore = pontuacao;
                bankerScore = pontuacao;
              }

              // Calcula a diferença entre as pontuações
              const diferenca = Math.abs(playerScore - bankerScore);

              // Adiciona ao array de resultados
              items.push({
                player: playerScore,
                banker: bankerScore,
                resultado: resultado,
                diferenca: diferenca,
                indice: index,
                resultadoString: resultado.substring(0, 1).toUpperCase(),
              });
            } catch (celError) {
              console.error(
                "Erro ao processar célula de resultado:",
                celError.message
              );
            }
          });

          // Retorna a lista de resultados em ordem (mais recente primeiro)
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

    console.log(`Extraídos ${resultados.length} resultados.`);

    // Se não existirem resultados, sai da função
    if (!resultados || resultados.length === 0) {
      console.log("Nenhum resultado foi encontrado.");
      return;
    }

    // Vamos construir o histórico de resultados (mais recente primeiro)
    const ultimoResultado = resultados[0];

    // Verifica se o último resultado é diferente do último processado
    if (
      !ultimoResultadoProcessado ||
      ultimoResultado.resultado !== ultimoResultadoProcessado.resultado ||
      ultimoResultado.player !== ultimoResultadoProcessado.player ||
      ultimoResultado.banker !== ultimoResultadoProcessado.banker
    ) {
      console.log("Novo resultado detectado! Processando...");

      // Atualiza o último resultado processado
      ultimoResultadoProcessado = ultimoResultado;

      // Adiciona o resultado ao histórico
      historico.unshift(ultimoResultado);

      // Limita o tamanho do histórico a 50 resultados
      if (historico.length > 50) {
        historico = historico.slice(0, 50);
      }

      // Processa o novo resultado para as estratégias
      await processarResultado(ultimoResultado);
    } else {
      console.log("Nenhum resultado novo desde a última verificação.");
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
      err.message.includes("connection closed") ||
      err.message.includes("Cannot read properties of null") ||
      err.message.includes("detached") ||
      err.message.includes("Attempted to use detached Frame")
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
    `Alertas ativos: Sequência: ${estrategiaSequencia.alertaAtivo}, Após Empate: ${estrategiaAposEmpate.alertaAtivo}, Alternância: ${estrategiaAlternancia.alertaAtivo}, Proporção: ${estrategiaProporcaoDinamica.alertaAtivo}`
  );
  console.log(
    `Player: ${totalPlayer}, Banker: ${totalBanker}, Tie: ${totalTie}`
  );
  console.log(`Diferença atual: ${res.diferenca}`);
  console.log(`-------------------`);

  // Processa as estratégias
  await processarEstrategiaSequencia(res);
  await processarEstrategiaAposEmpate(res);
  await processarEstrategiaAlternancia(res);
  await processarEstrategiaProporcaoDinamica(res); // Nova estratégia adicionada

  // Envia relatório estatístico a cada 50 rodadas
  if (contadorRodadas % 50 === 0) {
    await enviarRelatorioEstatistico();
  }

  // Envia resumo a cada 100 rodadas
  if (contadorRodadas % 100 === 0) {
    await enviarResumo();
  }

  // Envia relatório detalhado a cada 200 rodadas
  if (contadorRodadas % 200 === 0) {
    await enviarRelatorioDetalhado();
  }
}

// Estratégia de Sequência melhorada com mais logs de depuração
// Função para processar a estratégia de Sequência com contadores G0/G1
async function processarEstrategiaSequencia(res) {
  // Verificar se o resultado é um empate e se já temos um alerta ativo
  if (res.resultado === "tie" && estrategiaSequencia.alertaAtivo) {
    // Se for um empate quando temos um alerta ativo, consideramos como vitória
    console.log(
      "Empate detectado durante alerta ativo. Contabilizando como Green para estratégia de sequência"
    );

    estrategiaSequencia.totalGreens++;
    estrategiaSequencia.greensG0++; // Considera como vitória no G0
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
      `🟢 SEQUÊNCIA: TIE/EMPATE [${res.player}-${
        res.banker
      }], ✅ Green para estratégia de sequência! [${
        estrategiaSequencia.vitoriaConsecutiva
      } VITÓRIA${
        estrategiaSequencia.vitoriaConsecutiva > 1 ? "S" : ""
      } CONSECUTIVA${estrategiaSequencia.vitoriaConsecutiva > 1 ? "S" : ""}]
📊 Sequência: Greens: ${estrategiaSequencia.totalGreens} [G0=${
        estrategiaSequencia.greensG0
      } G1=${estrategiaSequencia.greensG1}] | Reds: ${
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
    return;
  }
  // Ignorar empates para análise de sequência e detecção
  else if (res.resultado === "tie") {
    console.log("Ignorando empate para análise de estratégia de sequência");
    return;
  }

  // Logs de depuração
  console.log(`Estado atual da estratégia de sequência:`);
  console.log(`- Alerta ativo: ${estrategiaSequencia.alertaAtivo}`);
  console.log(
    `- sequenciaConsiderada: ${estrategiaSequencia.sequenciaConsiderada}`
  );
  console.log(`- Total no histórico: ${historico.length}`);

  // Debug para verificar o estado atual
  const resultadosSemEmpate = historico.filter(
    (item) => item.resultado !== "tie"
  );
  console.log(
    `Estado para análise de sequência: ${resultadosSemEmpate
      .slice(0, 6)
      .map((r) => (r.resultado === "player" ? "P" : "B"))
      .join("")}`
  );

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
      estrategiaSequencia.greensG0++; // Incrementa contador de G0
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
        } CONSECUTIVA${estrategiaSequencia.vitoriaConsecutiva > 1 ? "S" : ""}]
📊 Sequência: Greens: ${estrategiaSequencia.totalGreens} [G0=${
          estrategiaSequencia.greensG0
        } G1=${estrategiaSequencia.greensG1}] | Reds: ${
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
      estrategiaSequencia.greensG1++; // Incrementa contador de G1
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
        } CONSECUTIVA${estrategiaSequencia.vitoriaConsecutiva > 1 ? "S" : ""}]
📊 Sequência: Greens: ${estrategiaSequencia.totalGreens} [G0=${
          estrategiaSequencia.greensG0
        } G1=${estrategiaSequencia.greensG1}] | Reds: ${
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
      estrategiaSequencia.redsG1++; // Incrementa contador de Reds no G1
      estrategiaSequencia.vitoriaConsecutiva = 0;

      await enviarTelegram(
        `❌ SEQUÊNCIA: ${res.resultado.toUpperCase()} [${res.player}-${
          res.banker
        }], ❌ Red na estratégia de sequência
📊 Sequência: Greens: ${estrategiaSequencia.totalGreens} [G0=${
          estrategiaSequencia.greensG0
        } G1=${estrategiaSequencia.greensG1}] | Reds: ${
          estrategiaSequencia.totalReds
        }`,
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

      // Debug para verificar exatamente o que estamos checando
      const sequenciaStr = primeirosResultados
        .map((r) => (r.resultado === "player" ? "P" : "B"))
        .join("");
      console.log(`Verificando sequência: ${sequenciaStr}`);

      const primeiroResultado = primeirosResultados[0].resultado;
      const todosIguais = primeirosResultados.every(
        (item) => item.resultado === primeiroResultado
      );

      console.log(`Todos iguais a ${primeiroResultado}? ${todosIguais}`);

      if (todosIguais) {
        console.log("**** SEQUÊNCIA DE 4 DETECTADA! ****");
        estrategiaSequencia.alertaAtivo = true;
        // Define o alvo como o MESMO da sequência detectada
        estrategiaSequencia.alvoAtual = primeiroResultado;
        estrategiaSequencia.alvoProximaRodada = estrategiaSequencia.alvoAtual; // Para compatibilidade

        await enviarTelegram(
          `⚠️ ESTRATÉGIA DE SEQUÊNCIA: ${
            estrategiaSequencia.sequenciaConsiderada
          }x ${primeiroResultado.toUpperCase()} seguidos!
🎯 Entrada sugerida: ${estrategiaSequencia.alvoAtual.toUpperCase()} na próxima rodada!
📊 Stats: Greens: ${estrategiaSequencia.totalGreens} [G0=${
            estrategiaSequencia.greensG0
          } G1=${estrategiaSequencia.greensG1}] | Reds: ${
            estrategiaSequencia.totalReds
          }`,
          "sequencia"
        );

        console.log(
          `Alerta ativado para sequência! Alvo: ${estrategiaSequencia.alvoAtual}`
        );
      }
    }
  }
}

// Estratégia Após Empate - Corrigida
// Estratégia Após Empate corrigida - considera novo empate como vitória
// Função para processar Estratégia Após Empate com contadores G0/G1
async function processarEstrategiaAposEmpate(res) {
  // Se o resultado atual é um empate
  if (res.resultado === "tie") {
    // Caso 1: Se a estratégia já está ativa e recebemos outro empate, consideramos como Green
    if (estrategiaAposEmpate.alertaAtivo) {
      console.log(
        "Novo empate detectado com estratégia ativa. Contabilizando como Green!"
      );

      estrategiaAposEmpate.totalGreens++;
      estrategiaAposEmpate.greensG0++; // Considera como vitória no G0
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
        `🟢 APÓS EMPATE: NOVO EMPATE [${res.player}-${
          res.banker
        }], ✅ Green! Novo empate é considerado vitória [${
          estrategiaAposEmpate.vitoriaConsecutiva
        } VITÓRIA${
          estrategiaAposEmpate.vitoriaConsecutiva > 1 ? "S" : ""
        } CONSECUTIVA${estrategiaAposEmpate.vitoriaConsecutiva > 1 ? "S" : ""}]
📊 Após Empate: Greens: ${estrategiaAposEmpate.totalGreens} [G0=${
          estrategiaAposEmpate.greensG0
        } G1=${estrategiaAposEmpate.greensG1}] | Reds: ${
          estrategiaAposEmpate.totalReds
        }`,
        "aposEmpate"
      );

      // Registrar a vitória
      estrategiaAposEmpate.ultimaVitoria = {
        resultado: res.resultado,
        player: res.player,
        banker: res.banker,
        dataHora: new Date(),
      };

      // Mantemos a estratégia ativa com o mesmo alvo
      // Não resetamos o alerta para continuar monitorando após empates consecutivos
      return;
    }

    // Caso 2: Primeiro empate detectado, ativamos a estratégia
    console.log("Empate detectado, ativando estratégia de Após Empate");
    estrategiaAposEmpate.alertaAtivo = true;

    // Procurar no histórico o último resultado não-empate para ser o alvo
    let ultimoNaoEmpate = null;

    // Olha o histórico para encontrar o último resultado não-empate
    for (let i = 1; i < historico.length; i++) {
      if (historico[i]?.resultado !== "tie") {
        ultimoNaoEmpate = historico[i];
        break;
      }
    }

    if (ultimoNaoEmpate) {
      estrategiaAposEmpate.alvoAposEmpate = ultimoNaoEmpate.resultado;

      await enviarTelegram(
        `⚠️ ESTRATÉGIA APÓS EMPATE: Empate [${res.player}-${
          res.banker
        }] detectado!
🎯 Entrada sugerida: ${estrategiaAposEmpate.alvoAposEmpate.toUpperCase()} na próxima rodada (mesmo vencedor da rodada anterior ao empate)
📊 Stats: Greens: ${estrategiaAposEmpate.totalGreens} [G0=${
          estrategiaAposEmpate.greensG0
        } G1=${estrategiaAposEmpate.greensG1}] | Reds: ${
          estrategiaAposEmpate.totalReds
        }`,
        "aposEmpate"
      );

      console.log(
        `Alerta ativado após empate! Alvo: ${estrategiaAposEmpate.alvoAposEmpate}`
      );
    } else {
      // Se não encontrar um resultado não-empate no histórico, desativa o alerta
      estrategiaAposEmpate.alertaAtivo = false;
      console.log(
        "Não foi possível encontrar um vencedor anterior ao empate no histórico"
      );
    }
  }
  // Primeira rodada após detectar empate (G0)
  else if (
    estrategiaAposEmpate.alertaAtivo &&
    estrategiaAposEmpate.rodadaG0 === null
  ) {
    console.log(
      `Primeira rodada após empate (G0). Alvo: ${estrategiaAposEmpate.alvoAposEmpate}, Resultado: ${res.resultado}`
    );

    if (res.resultado === estrategiaAposEmpate.alvoAposEmpate) {
      estrategiaAposEmpate.totalGreens++;
      estrategiaAposEmpate.greensG0++; // Incrementa contador de G0
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
        }], ✅ Green! Apostamos no mesmo vencedor antes do empate e acertamos! [${
          estrategiaAposEmpate.vitoriaConsecutiva
        } VITÓRIA${
          estrategiaAposEmpate.vitoriaConsecutiva > 1 ? "S" : ""
        } CONSECUTIVA${estrategiaAposEmpate.vitoriaConsecutiva > 1 ? "S" : ""}]
📊 Após Empate: Greens: ${estrategiaAposEmpate.totalGreens} [G0=${
          estrategiaAposEmpate.greensG0
        } G1=${estrategiaAposEmpate.greensG1}] | Reds: ${
          estrategiaAposEmpate.totalReds
        }`,
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
    } else {
      await enviarTelegram(
        `🔄 APÓS EMPATE: ${res.resultado.toUpperCase()} [${res.player}-${
          res.banker
        }], vamos para o G1. Esperávamos ${estrategiaAposEmpate.alvoAposEmpate.toUpperCase()}, mas veio ${res.resultado.toUpperCase()}`,
        "aposEmpate"
      );
      estrategiaAposEmpate.rodadaG0 = res;
    }
  }
  // Segunda rodada após detectar empate (G1)
  else if (estrategiaAposEmpate.alertaAtivo && estrategiaAposEmpate.rodadaG0) {
    console.log(
      `Segunda rodada após empate (G1). Alvo: ${estrategiaAposEmpate.alvoAposEmpate}, Resultado: ${res.resultado}`
    );

    if (res.resultado === estrategiaAposEmpate.alvoAposEmpate) {
      estrategiaAposEmpate.totalGreens++;
      estrategiaAposEmpate.greensG1++; // Incrementa contador de G1
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
        }], ✅ Green no G1! Apostamos no mesmo vencedor antes do empate e acertamos! [${
          estrategiaAposEmpate.vitoriaConsecutiva
        } VITÓRIA${
          estrategiaAposEmpate.vitoriaConsecutiva > 1 ? "S" : ""
        } CONSECUTIVA${estrategiaAposEmpate.vitoriaConsecutiva > 1 ? "S" : ""}]
📊 Após Empate: Greens: ${estrategiaAposEmpate.totalGreens} [G0=${
          estrategiaAposEmpate.greensG0
        } G1=${estrategiaAposEmpate.greensG1}] | Reds: ${
          estrategiaAposEmpate.totalReds
        }`,
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
    } else {
      estrategiaAposEmpate.totalReds++;
      estrategiaAposEmpate.redsG1++; // Incrementa contador de Reds no G1
      estrategiaAposEmpate.vitoriaConsecutiva = 0;

      await enviarTelegram(
        `❌ APÓS EMPATE: ${res.resultado.toUpperCase()} [${res.player}-${
          res.banker
        }], ❌ Red! Esperávamos ${estrategiaAposEmpate.alvoAposEmpate.toUpperCase()}, mas veio ${res.resultado.toUpperCase()}
📊 Após Empate: Greens: ${estrategiaAposEmpate.totalGreens} [G0=${
          estrategiaAposEmpate.greensG0
        } G1=${estrategiaAposEmpate.greensG1}] | Reds: ${
          estrategiaAposEmpate.totalReds
        }`,
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
}

// Estratégia de Alternância
// Função para processar Estratégia de Alternância com contadores G0/G1
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
      estrategiaAlternancia.greensG0++; // Incrementa contador de G0
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
        } CONSECUTIVA${estrategiaAlternancia.vitoriaConsecutiva > 1 ? "S" : ""}]
📊 Alternância: Greens: ${estrategiaAlternancia.totalGreens} [G0=${
          estrategiaAlternancia.greensG0
        } G1=${estrategiaAlternancia.greensG1}] | Reds: ${
          estrategiaAlternancia.totalReds
        }`,
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
      estrategiaAlternancia.greensG1++; // Incrementa contador de G1
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
        } CONSECUTIVA${estrategiaAlternancia.vitoriaConsecutiva > 1 ? "S" : ""}]
📊 Alternância: Greens: ${estrategiaAlternancia.totalGreens} [G0=${
          estrategiaAlternancia.greensG0
        } G1=${estrategiaAlternancia.greensG1}] | Reds: ${
          estrategiaAlternancia.totalReds
        }`,
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
      estrategiaAlternancia.redsG1++; // Incrementa contador de Reds no G1
      estrategiaAlternancia.vitoriaConsecutiva = 0;

      await enviarTelegram(
        `❌ ALTERNÂNCIA: ${res.resultado.toUpperCase()} [${res.player}-${
          res.banker
        }], ❌ Red na estratégia de alternância
📊 Alternância: Greens: ${estrategiaAlternancia.totalGreens} [G0=${
          estrategiaAlternancia.greensG0
        } G1=${estrategiaAlternancia.greensG1}] | Reds: ${
          estrategiaAlternancia.totalReds
        }`,
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
🎯 Entrada sugerida: ${estrategiaAlternancia.proximoResultadoEsperado.toUpperCase()} na próxima rodada!
📊 Stats: Greens: ${estrategiaAlternancia.totalGreens} [G0=${
            estrategiaAlternancia.greensG0
          } G1=${estrategiaAlternancia.greensG1}] | Reds: ${
            estrategiaAlternancia.totalReds
          }`,
          "alternancia"
        );

        console.log(
          `Alerta ativado para alternância! Próximo esperado: ${estrategiaAlternancia.proximoResultadoEsperado}`
        );
      }
    }
  }
}

//Estratégia de Proporção Dinâmica uuuuuh
// Função para processar Estratégia de Proporção Dinâmica com contadores G0/G1
async function processarEstrategiaProporcaoDinamica(res) {
  // Ignorar empates para esta estratégia
  if (res.resultado === "tie") {
    console.log("Ignorando empate para estratégia de Proporção Dinâmica");
    return;
  }

  // Primeira rodada após detectar desbalanceamento (G0)
  if (
    estrategiaProporcaoDinamica.alertaAtivo &&
    estrategiaProporcaoDinamica.alvoProximaRodada &&
    estrategiaProporcaoDinamica.rodadaG0 === null
  ) {
    console.log(
      `Alerta ativo para Proporção Dinâmica, primeira tentativa (G0). Alvo: ${estrategiaProporcaoDinamica.alvoProximaRodada}`
    );

    if (res.resultado === estrategiaProporcaoDinamica.alvoProximaRodada) {
      estrategiaProporcaoDinamica.totalGreens++;
      estrategiaProporcaoDinamica.greensG0++; // Incrementa contador de G0
      estrategiaProporcaoDinamica.vitoriaConsecutiva++;

      // Atualiza o contador de maior sequência de vitórias
      if (
        estrategiaProporcaoDinamica.vitoriaConsecutiva >
        estrategiaProporcaoDinamica.maiorVitoriaConsecutiva
      ) {
        estrategiaProporcaoDinamica.maiorVitoriaConsecutiva =
          estrategiaProporcaoDinamica.vitoriaConsecutiva;
      }

      await enviarTelegram(
        `🟢 PROPORÇÃO: ${res.resultado.toUpperCase()} [${res.player}-${
          res.banker
        }], ✅ Green para estratégia de Proporção Dinâmica! [${
          estrategiaProporcaoDinamica.vitoriaConsecutiva
        } VITÓRIA${
          estrategiaProporcaoDinamica.vitoriaConsecutiva > 1 ? "S" : ""
        } CONSECUTIVA${
          estrategiaProporcaoDinamica.vitoriaConsecutiva > 1 ? "S" : ""
        }]
📊 Proporção: Greens: ${estrategiaProporcaoDinamica.totalGreens} [G0=${
          estrategiaProporcaoDinamica.greensG0
        } G1=${estrategiaProporcaoDinamica.greensG1}] | Reds: ${
          estrategiaProporcaoDinamica.totalReds
        }`,
        "proporcao"
      );

      // Registrar a vitória
      estrategiaProporcaoDinamica.ultimaVitoria = {
        resultado: res.resultado,
        player: res.player,
        banker: res.banker,
        dataHora: new Date(),
      };

      // Resetar alerta
      resetarAlertaProporcaoDinamica();
    } else {
      await enviarTelegram(
        `🔄 PROPORÇÃO: ${res.resultado.toUpperCase()} [${res.player}-${
          res.banker
        }], vamos para o G1 na estratégia de Proporção Dinâmica...`,
        "proporcao"
      );
      estrategiaProporcaoDinamica.rodadaG0 = res;
    }
  }
  // Segunda rodada após detectar desbalanceamento (G1)
  else if (
    estrategiaProporcaoDinamica.alertaAtivo &&
    estrategiaProporcaoDinamica.alvoProximaRodada &&
    estrategiaProporcaoDinamica.rodadaG0
  ) {
    console.log("Processando G1 para estratégia de Proporção Dinâmica");

    if (res.resultado === estrategiaProporcaoDinamica.alvoProximaRodada) {
      estrategiaProporcaoDinamica.totalGreens++;
      estrategiaProporcaoDinamica.greensG1++; // Incrementa contador de G1
      estrategiaProporcaoDinamica.vitoriaConsecutiva++;

      // Atualiza o contador de maior sequência de vitórias
      if (
        estrategiaProporcaoDinamica.vitoriaConsecutiva >
        estrategiaProporcaoDinamica.maiorVitoriaConsecutiva
      ) {
        estrategiaProporcaoDinamica.maiorVitoriaConsecutiva =
          estrategiaProporcaoDinamica.vitoriaConsecutiva;
      }

      await enviarTelegram(
        `🟢 PROPORÇÃO: ${res.resultado.toUpperCase()} [${res.player}-${
          res.banker
        }], ✅ Green no G1 para estratégia de Proporção Dinâmica! [${
          estrategiaProporcaoDinamica.vitoriaConsecutiva
        } VITÓRIA${
          estrategiaProporcaoDinamica.vitoriaConsecutiva > 1 ? "S" : ""
        } CONSECUTIVA${
          estrategiaProporcaoDinamica.vitoriaConsecutiva > 1 ? "S" : ""
        }]
📊 Proporção: Greens: ${estrategiaProporcaoDinamica.totalGreens} [G0=${
          estrategiaProporcaoDinamica.greensG0
        } G1=${estrategiaProporcaoDinamica.greensG1}] | Reds: ${
          estrategiaProporcaoDinamica.totalReds
        }`,
        "proporcao"
      );

      // Registrar a vitória
      estrategiaProporcaoDinamica.ultimaVitoria = {
        resultado: res.resultado,
        player: res.player,
        banker: res.banker,
        dataHora: new Date(),
      };

      // Resetar alerta
      resetarAlertaProporcaoDinamica();
    } else {
      estrategiaProporcaoDinamica.totalReds++;
      estrategiaProporcaoDinamica.redsG1++; // Incrementa contador de Reds no G1
      estrategiaProporcaoDinamica.vitoriaConsecutiva = 0;

      await enviarTelegram(
        `❌ PROPORÇÃO: ${res.resultado.toUpperCase()} [${res.player}-${
          res.banker
        }], ❌ Red na estratégia de Proporção Dinâmica
📊 Proporção: Greens: ${estrategiaProporcaoDinamica.totalGreens} [G0=${
          estrategiaProporcaoDinamica.greensG0
        } G1=${estrategiaProporcaoDinamica.greensG1}] | Reds: ${
          estrategiaProporcaoDinamica.totalReds
        }`,
        "proporcao"
      );

      // Registrar a derrota
      estrategiaProporcaoDinamica.ultimaVitoria = {
        resultado: res.resultado,
        player: res.player,
        banker: res.banker,
        dataHora: new Date(),
      };

      // Resetar alerta
      resetarAlertaProporcaoDinamica();
    }
  }
  // Análise normal do histórico para detecção de desbalanceamento na proporção
  else if (
    !estrategiaProporcaoDinamica.alertaAtivo &&
    historico.length >= estrategiaProporcaoDinamica.windowSize
  ) {
    // Verificamos os últimos N resultados, ignorando empates
    const resultadosSemEmpate = historico
      .filter((item) => item.resultado !== "tie")
      .slice(0, estrategiaProporcaoDinamica.windowSize);

    // Se temos resultados suficientes após filtrar empates
    if (resultadosSemEmpate.length >= 10) {
      // Pelo menos 10 resultados para análise
      const totalResultados = resultadosSemEmpate.length;
      const totalPlayer = resultadosSemEmpate.filter(
        (item) => item.resultado === "player"
      ).length;
      const totalBanker = resultadosSemEmpate.filter(
        (item) => item.resultado === "banker"
      ).length;

      // Calculamos as porcentagens
      const percentualPlayer = (totalPlayer / totalResultados) * 100;
      const percentualBanker = (totalBanker / totalResultados) * 100;

      console.log(
        `Proporção atual: Player ${percentualPlayer.toFixed(
          1
        )}% vs Banker ${percentualBanker.toFixed(1)}%`
      );

      // Verificamos se há desbalanceamento significativo
      if (
        percentualPlayer >=
          estrategiaProporcaoDinamica.limiteDesbalanceamento ||
        percentualBanker >= estrategiaProporcaoDinamica.limiteDesbalanceamento
      ) {
        // Se há desbalanceamento, apostamos no resultado menos frequente
        estrategiaProporcaoDinamica.alertaAtivo = true;

        // O alvo é o resultado menos frequente
        estrategiaProporcaoDinamica.alvoProximaRodada =
          percentualPlayer > percentualBanker ? "banker" : "player";

        // Formatamos a mensagem de alerta
        const maiorPercentual = Math.max(
          percentualPlayer,
          percentualBanker
        ).toFixed(1);
        const menorPercentual = Math.min(
          percentualPlayer,
          percentualBanker
        ).toFixed(1);
        const maiorResultado =
          percentualPlayer > percentualBanker ? "PLAYER" : "BANKER";
        const menorResultado =
          percentualPlayer > percentualBanker ? "BANKER" : "PLAYER";

        await enviarTelegram(
          `⚠️ ESTRATÉGIA DE PROPORÇÃO DINÂMICA: Desbalanceamento detectado!
📊 Últimos ${totalResultados} resultados: ${maiorResultado} ${maiorPercentual}% vs ${menorResultado} ${menorPercentual}%
🎯 Entrada sugerida: ${estrategiaProporcaoDinamica.alvoProximaRodada.toUpperCase()} na próxima rodada!
📊 Stats: Greens: ${estrategiaProporcaoDinamica.totalGreens} [G0=${
            estrategiaProporcaoDinamica.greensG0
          } G1=${estrategiaProporcaoDinamica.greensG1}] | Reds: ${
            estrategiaProporcaoDinamica.totalReds
          }`,
          "proporcao"
        );

        console.log(
          `Alerta ativado para Proporção Dinâmica! Alvo: ${estrategiaProporcaoDinamica.alvoProximaRodada}`
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
  estrategiaSequencia.alvoProximaRodada = null;
  estrategiaSequencia.rodadaG0 = null;
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

// Função aprimorada para enviar relatório estatístico com taxas de G0/G1
async function enviarRelatorioEstatistico() {
  // Calcular taxas de sucesso para cada estratégia
  const taxaG0Sequencia = calcularTaxaDeSucesso(
    estrategiaSequencia.greensG0,
    estrategiaSequencia.greensG0 + (estrategiaSequencia.rodadaG0 ? 1 : 0)
  );

  const taxaG1Sequencia = calcularTaxaDeSucesso(
    estrategiaSequencia.greensG1,
    estrategiaSequencia.greensG1 + estrategiaSequencia.redsG1
  );

  const taxaG0AposEmpate = calcularTaxaDeSucesso(
    estrategiaAposEmpate.greensG0,
    estrategiaAposEmpate.greensG0 + (estrategiaAposEmpate.rodadaG0 ? 1 : 0)
  );

  const taxaG1AposEmpate = calcularTaxaDeSucesso(
    estrategiaAposEmpate.greensG1,
    estrategiaAposEmpate.greensG1 + estrategiaAposEmpate.redsG1
  );

  const taxaG0Alternancia = calcularTaxaDeSucesso(
    estrategiaAlternancia.greensG0,
    estrategiaAlternancia.greensG0 + (estrategiaAlternancia.rodadaG0 ? 1 : 0)
  );

  const taxaG1Alternancia = calcularTaxaDeSucesso(
    estrategiaAlternancia.greensG1,
    estrategiaAlternancia.greensG1 + estrategiaAlternancia.redsG1
  );

  const taxaG0Proporcao = calcularTaxaDeSucesso(
    estrategiaProporcaoDinamica.greensG0,
    estrategiaProporcaoDinamica.greensG0 +
      (estrategiaProporcaoDinamica.rodadaG0 ? 1 : 0)
  );

  const taxaG1Proporcao = calcularTaxaDeSucesso(
    estrategiaProporcaoDinamica.greensG1,
    estrategiaProporcaoDinamica.greensG1 + estrategiaProporcaoDinamica.redsG1
  );

  // Calcular taxa total de sucesso para cada estratégia
  const taxaTotalSequencia = calcularTaxaDeSucesso(
    estrategiaSequencia.totalGreens,
    estrategiaSequencia.totalGreens + estrategiaSequencia.totalReds
  );

  const taxaTotalAposEmpate = calcularTaxaDeSucesso(
    estrategiaAposEmpate.totalGreens,
    estrategiaAposEmpate.totalGreens + estrategiaAposEmpate.totalReds
  );

  const taxaTotalAlternancia = calcularTaxaDeSucesso(
    estrategiaAlternancia.totalGreens,
    estrategiaAlternancia.totalGreens + estrategiaAlternancia.totalReds
  );

  const taxaTotalProporcao = calcularTaxaDeSucesso(
    estrategiaProporcaoDinamica.totalGreens,
    estrategiaProporcaoDinamica.totalGreens +
      estrategiaProporcaoDinamica.totalReds
  );

  // Criar array para ranking
  const estrategias = [
    { nome: "Sequência", taxa: taxaTotalSequencia },
    { nome: "Após Empate", taxa: taxaTotalAposEmpate },
    { nome: "Alternância", taxa: taxaTotalAlternancia },
    { nome: "Proporção", taxa: taxaTotalProporcao },
  ];

  // Ordenar por taxa de sucesso (maior para menor)
  estrategias.sort((a, b) => b.taxa - a.taxa);

  // Enviar relatório detalhado
  await enviarTelegram(
    `📊 RELATÓRIO ESTATÍSTICO G0/G1 - RODADA #${contadorRodadas} 📊

🏆 RANKING DE ESTRATÉGIAS (taxa total de sucesso):
1. ${estrategias[0].nome}: ${estrategias[0].taxa}% de acerto
2. ${estrategias[1].nome}: ${estrategias[1].taxa}% de acerto
3. ${estrategias[2].nome}: ${estrategias[2].taxa}% de acerto
4. ${estrategias[3].nome}: ${estrategias[3].taxa}% de acerto

🎲 SEQUÊNCIA:
▶️ Total: ${estrategiaSequencia.totalGreens} greens / ${
      estrategiaSequencia.totalReds
    } reds (${taxaTotalSequencia}% acerto)
▶️ G0: ${estrategiaSequencia.greensG0} greens (${taxaG0Sequencia}% acerto)
▶️ G1: ${estrategiaSequencia.greensG1} greens / ${
      estrategiaSequencia.redsG1
    } reds (${taxaG1Sequencia}% acerto)

🎲 APÓS EMPATE:
▶️ Total: ${estrategiaAposEmpate.totalGreens} greens / ${
      estrategiaAposEmpate.totalReds
    } reds (${taxaTotalAposEmpate}% acerto)
▶️ G0: ${estrategiaAposEmpate.greensG0} greens (${taxaG0AposEmpate}% acerto)
▶️ G1: ${estrategiaAposEmpate.greensG1} greens / ${
      estrategiaAposEmpate.redsG1
    } reds (${taxaG1AposEmpate}% acerto)

🎲 ALTERNÂNCIA:
▶️ Total: ${estrategiaAlternancia.totalGreens} greens / ${
      estrategiaAlternancia.totalReds
    } reds (${taxaTotalAlternancia}% acerto)
▶️ G0: ${estrategiaAlternancia.greensG0} greens (${taxaG0Alternancia}% acerto)
▶️ G1: ${estrategiaAlternancia.greensG1} greens / ${
      estrategiaAlternancia.redsG1
    } reds (${taxaG1Alternancia}% acerto)

🎲 PROPORÇÃO DINÂMICA:
▶️ Total: ${estrategiaProporcaoDinamica.totalGreens} greens / ${
      estrategiaProporcaoDinamica.totalReds
    } reds (${taxaTotalProporcao}% acerto)
▶️ G0: ${
      estrategiaProporcaoDinamica.greensG0
    } greens (${taxaG0Proporcao}% acerto)
▶️ G1: ${estrategiaProporcaoDinamica.greensG1} greens / ${
      estrategiaProporcaoDinamica.redsG1
    } reds (${taxaG1Proporcao}% acerto)

📊 Métricas gerais:
📌 Total de rodadas: ${contadorRodadas}
📌 Player: ${totalPlayer} (${Math.round(
      (totalPlayer / contadorRodadas) * 100
    )}%)
📌 Banker: ${totalBanker} (${Math.round(
      (totalBanker / contadorRodadas) * 100
    )}%)
📌 Tie: ${totalTie} (${Math.round((totalTie / contadorRodadas) * 100)}%)`,
    "geral"
  );
}

// Função para resetar o alerta da estratégia de Proporção Dinâmica
function resetarAlertaProporcaoDinamica() {
  console.log("Resetando alerta de Proporção Dinâmica");
  estrategiaProporcaoDinamica.alertaAtivo = false;
  estrategiaProporcaoDinamica.alvoProximaRodada = null;
  estrategiaProporcaoDinamica.rodadaG0 = null;
}

// Função auxiliar para calcular taxa de sucesso
function calcularTaxaDeSucesso(numerador, denominador) {
  if (!numerador || !denominador) return 0;
  return Math.round((numerador / denominador) * 100);
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
        token = TELEGRAM_TOKEN; // Usa o token principal como fallback
        chatId = TELEGRAM_CHAT_ID;
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
      case "proporcao":
        token = TELEGRAM_TOKEN_PROPORCAO;
        chatId = TELEGRAM_CHAT_ID_PROPORCAO;
        break;
      default:
        // Para relatórios e resultados gerais
        token = TELEGRAM_TOKEN;
        chatId = TELEGRAM_CHAT_ID;
    }

    // Verifica se o token e o chatId são válidos antes de enviar
    if (!token || !chatId) {
      console.error(
        `Token ou chatId indefinido para estratégia ${estrategia}. Usando token geral.`
      );
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
Greens: ${estrategiaSequencia.totalGreens} [G0=${
    estrategiaSequencia.greensG0
  } G1=${estrategiaSequencia.greensG1}] | Reds: ${estrategiaSequencia.totalReds}
Maior sequência de vitórias: ${estrategiaSequencia.maiorVitoriaConsecutiva}

🎲 ESTATÍSTICAS APÓS EMPATE:
Greens: ${estrategiaAposEmpate.totalGreens} [G0=${
    estrategiaAposEmpate.greensG0
  } G1=${estrategiaAposEmpate.greensG1}] | Reds: ${
    estrategiaAposEmpate.totalReds
  }
Maior sequência de vitórias: ${estrategiaAposEmpate.maiorVitoriaConsecutiva}

🎲 ESTATÍSTICAS DE ALTERNÂNCIA:
Greens: ${estrategiaAlternancia.totalGreens} [G0=${
    estrategiaAlternancia.greensG0
  } G1=${estrategiaAlternancia.greensG1}] | Reds: ${
    estrategiaAlternancia.totalReds
  }
Maior sequência de vitórias: ${estrategiaAlternancia.maiorVitoriaConsecutiva}

🎲 ESTATÍSTICAS DE PROPORÇÃO DINÂMICA:
Greens: ${estrategiaProporcaoDinamica.totalGreens} [G0=${
    estrategiaProporcaoDinamica.greensG0
  } G1=${estrategiaProporcaoDinamica.greensG1}] | Reds: ${
    estrategiaProporcaoDinamica.totalReds
  }
Maior sequência de vitórias: ${
    estrategiaProporcaoDinamica.maiorVitoriaConsecutiva
  }

🎯 Maior pontuação Player: ${maiorPontuacaoPlayer}
🎯 Maior pontuação Banker: ${maiorPontuacaoBanker}
🔢 Maior sequência Player: ${maiorSequenciaPlayer}
🔢 Maior sequência Banker: ${maiorSequenciaBanker}
🔢 Maior sequência Tie: ${maiorSequenciaTie}`);

  // Resumo específico para o grupo de Sequência
  await enviarTelegram(
    `📊 RESUMO PARCIAL - SEQUÊNCIA (últimas ${contadorRodadas} rodadas):
✅ Greens: ${estrategiaSequencia.totalGreens} [G0=${
      estrategiaSequencia.greensG0
    } G1=${estrategiaSequencia.greensG1}] | Reds: ${
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

  // Resumo específico para o grupo de Após Empate
  await enviarTelegram(
    `📊 RESUMO PARCIAL - APÓS EMPATE (últimas ${contadorRodadas} rodadas):
✅ Greens: ${estrategiaAposEmpate.totalGreens} [G0=${
      estrategiaAposEmpate.greensG0
    } G1=${estrategiaAposEmpate.greensG1}] | Reds: ${
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
✅ Greens: ${estrategiaAlternancia.totalGreens} [G0=${
      estrategiaAlternancia.greensG0
    } G1=${estrategiaAlternancia.greensG1}] | Reds: ${
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

  // Resumo específico para o grupo de Proporção Dinâmica
  await enviarTelegram(
    `📊 RESUMO PARCIAL - PROPORÇÃO DINÂMICA (últimas ${contadorRodadas} rodadas):
✅ Greens: ${estrategiaProporcaoDinamica.totalGreens} [G0=${
      estrategiaProporcaoDinamica.greensG0
    } G1=${estrategiaProporcaoDinamica.greensG1}] | Reds: ${
      estrategiaProporcaoDinamica.totalReds
    }
🔄 Maior sequência de vitórias: ${
      estrategiaProporcaoDinamica.maiorVitoriaConsecutiva
    }
${
  estrategiaProporcaoDinamica.vitoriaConsecutiva > 0
    ? "🔥 Sequência atual: " +
      estrategiaProporcaoDinamica.vitoriaConsecutiva +
      " vitória(s) consecutiva(s)"
    : ""
}
✅ PLAYER: ${totalPlayer} (${Math.round(
      (totalPlayer / contadorRodadas) * 100
    )}%)
✅ BANKER: ${totalBanker} (${Math.round(
      (totalBanker / contadorRodadas) * 100
    )}%)`,
    "proporcao"
  );
}

// Função para relatório detalhado a cada 200 rodadas
async function enviarRelatorioDetalhado() {
  // Calcular as taxas de sucesso para cada estratégia
  const calcularTaxa = (greens, total) => {
    if (total === 0) return 0;
    return Math.round((greens / total) * 100);
  };

  const taxaSequencia = calcularTaxa(
    estrategiaSequencia.totalGreens,
    estrategiaSequencia.totalGreens + estrategiaSequencia.totalReds
  );

  const taxaAposEmpate = calcularTaxa(
    estrategiaAposEmpate.totalGreens,
    estrategiaAposEmpate.totalGreens + estrategiaAposEmpate.totalReds
  );

  const taxaAlternancia = calcularTaxa(
    estrategiaAlternancia.totalGreens,
    estrategiaAlternancia.totalGreens + estrategiaAlternancia.totalReds
  );

  const taxaProporcao = calcularTaxa(
    estrategiaProporcaoDinamica.totalGreens,
    estrategiaProporcaoDinamica.totalGreens +
      estrategiaProporcaoDinamica.totalReds
  );

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
✅ Greens: ${estrategiaSequencia.totalGreens} [G0=${
    estrategiaSequencia.greensG0
  } G1=${estrategiaSequencia.greensG1}] (${taxaSequencia}% de aproveitamento)
❌ Reds: ${estrategiaSequencia.totalReds}
🔄 Maior sequência de vitórias: ${estrategiaSequencia.maiorVitoriaConsecutiva}
${
  estrategiaSequencia.vitoriaConsecutiva > 0
    ? "🔥 Sequência atual: " +
      estrategiaSequencia.vitoriaConsecutiva +
      " vitória(s) consecutiva(s)"
    : ""
}

🎲 ESTRATÉGIA APÓS EMPATE:
✅ Greens: ${estrategiaAposEmpate.totalGreens} [G0=${
    estrategiaAposEmpate.greensG0
  } G1=${estrategiaAposEmpate.greensG1}] (${taxaAposEmpate}% de aproveitamento)
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
✅ Greens: ${estrategiaAlternancia.totalGreens} [G0=${
    estrategiaAlternancia.greensG0
  } G1=${
    estrategiaAlternancia.greensG1
  }] (${taxaAlternancia}% de aproveitamento)
❌ Reds: ${estrategiaAlternancia.totalReds}
🔄 Maior sequência de vitórias: ${estrategiaAlternancia.maiorVitoriaConsecutiva}
${
  estrategiaAlternancia.vitoriaConsecutiva > 0
    ? "🔥 Sequência atual: " +
      estrategiaAlternancia.vitoriaConsecutiva +
      " vitória(s) consecutiva(s)"
    : ""
}

🎲 ESTRATÉGIA DE PROPORÇÃO DINÂMICA:
✅ Greens: ${estrategiaProporcaoDinamica.totalGreens} [G0=${
    estrategiaProporcaoDinamica.greensG0
  } G1=${
    estrategiaProporcaoDinamica.greensG1
  }] (${taxaProporcao}% de aproveitamento)
❌ Reds: ${estrategiaProporcaoDinamica.totalReds}
🔄 Maior sequência de vitórias: ${
    estrategiaProporcaoDinamica.maiorVitoriaConsecutiva
  }
${
  estrategiaProporcaoDinamica.vitoriaConsecutiva > 0
    ? "🔥 Sequência atual: " +
      estrategiaProporcaoDinamica.vitoriaConsecutiva +
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

  // Relatórios específicos para cada grupo de estratégia
  // Você pode adicionar relatórios detalhados para cada canal específico de estratégia se desejar
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

// Inicia o bot - versão para depuração no Windows
// Função de inicialização para ambiente Ubuntu VPS
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
      "🎲 Bot do Bac Bo iniciado! Monitorando estratégia APÓS EMPATE...",
      "aposEmpate"
    );
    await enviarTelegram(
      "🎲 Bot do Bac Bo iniciado! Monitorando estratégia de ALTERNÂNCIA...",
      "alternancia"
    );

    console.log("Esperando 5 segundos antes da primeira execução...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Executa a primeira vez
    await getBacBoResultado();

    // No ambiente de produção, use um intervalo menor para capturar resultados mais rapidamente
    console.log("⏱️ Configurando intervalo de execução a cada 8 segundos");
    setInterval(getBacBoResultado, 8000);
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
const PORT = process.env.PORT || 3001;

app.get("/", (req, res) => {
  res.send("✅ Bot do Bac Bo está rodando!");
});

app.listen(PORT, () => {
  console.log(`🌐 Web service ativo na porta ${PORT}`);
});
