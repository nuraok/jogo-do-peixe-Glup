document.addEventListener('DOMContentLoaded', () => {
    let i = 1;
    let juegoAtivo = false;          // só vira true depois de escolher o modo no menu
    let emMenu = true;
    let multiplayer = false;
    let jogoPausado = false;
    let tempoInicial = Date.now();
    let tempoPausadoTotal = 0;
    let inicioPausa = 0;
    let caixas = [];
    let escudosNaTela = [];
    let lentidoesNaTela = [];
    let verdesNaTela = [];

    // quanto cada bolinha de lentidão reduz do bônus de velocidade
    const REDUCAO_POR_BOLINHA =6;
    // quanto de bônus já foi "descontado" pelas bolinhas
    let reducaoBonus = 0;

    // bolinha verde: encolhe, gira e pisca as focas
    const REDUCAO_POR_VERDE = 10;      // menor que a laranja (1.5)
    const DURACAO_ENCOLHER = 10000;     // 10 segundos
    const ESCALA_ENCOLHIDA = 0.5;       // metade do tamanho
    let encolhendo = false;
    let tempoEncolher = 0;
    let anguloFoca = 0;

    // multiplayer: tempo que o jogador morto espera para voltar
    const TEMPO_REVIVER = 10000;        // 10 segundos

    // vara de pesca
    const RECARGA_VARA = 3000;      // ms entre um tiro e outro
    const VELOCIDADE_ANZOL = 20;    // pixels por frame
    let proximoTiro = 0;
    let anzol = null;
    const ALCANCE_VARA = 500;       // distância máxima do ataque (px)
    const HITBOX_W = 100;           // largura da área de acerto
    const HITBOX_H = 140;           // altura da área de acerto
    let direcaoVara = -1;           // -1 = esquerda (de onde vêm as caixas), 1 = direita

    let obj = { w: 140, h: 100 };

    let playerObj = {
        element: document.createElement('div'),
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        w: 30,
        h: 30,
        speed: 5,
        cor: "red",
        comEscudo: false,
        tempoEscudo: 0,
        morto: false,
        tempoVolta: 0
    };

    // jogador 2 (só existe no multiplayer): quadrado azul, move com as setinhas
    let player2 = {
        element: document.createElement('div'),
        x: window.innerWidth / 2 + 60,
        y: window.innerHeight / 2,
        w: 30,
        h: 30,
        speed: 5,
        cor: "blue",
        comEscudo: false,
        tempoEscudo: 0,
        morto: false,
        tempoVolta: 0
    };

    let jogadores = [playerObj];

    let placar = document.createElement('div');
    placar.style.position = "absolute";
    placar.style.top = "20px";
    placar.style.left = "20px";
    placar.style.color = "white";
    placar.style.fontFamily = "sans-serif";
    placar.style.fontSize = "24px";
    placar.style.fontWeight = "bold";
    placar.style.zIndex = "10";
    placar.innerText = "Tempo: 0s";
    document.body.appendChild(placar);

    // barra de recarga do anzol (ao lado do tempo)
    let barraVara = document.createElement('div');
    barraVara.style.position = "absolute";
    barraVara.style.top = "28px";
    barraVara.style.left = "200px";
    barraVara.style.width = "140px";
    barraVara.style.height = "16px";
    barraVara.style.border = "2px solid white";
    barraVara.style.borderRadius = "8px";
    barraVara.style.backgroundColor = "rgba(0, 0, 0, 0.35)";
    barraVara.style.overflow = "hidden";
    barraVara.style.boxSizing = "border-box";
    barraVara.style.zIndex = "10";

    let preenchimentoVara = document.createElement('div');
    preenchimentoVara.style.height = "100%";
    preenchimentoVara.style.width = "100%";
    preenchimentoVara.style.backgroundColor = "#7CFC00";
    barraVara.appendChild(preenchimentoVara);
    document.body.appendChild(barraVara);

    let telaPausa = document.createElement('div');
    telaPausa.style.position = "absolute";
    telaPausa.style.top = "0";
    telaPausa.style.left = "0";
    telaPausa.style.width = "100vw";
    telaPausa.style.height = "100vh";
    telaPausa.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    telaPausa.style.display = "none";
    telaPausa.style.justifyContent = "center";
    telaPausa.style.alignItems = "center";
    telaPausa.style.zIndex = "90";
    telaPausa.style.fontFamily = "sans-serif";

    let textoPausa = document.createElement('h1');
    textoPausa.innerText = "PAUSED";
    textoPausa.style.color = "white";
    textoPausa.style.fontSize = "48px";
    telaPausa.appendChild(textoPausa);
    document.body.appendChild(telaPausa);

    function criarPlayer(p = playerObj) {
        p.element.style.position = "absolute";
        p.element.style.width = `${p.w}px`;
        p.element.style.height = `${p.h}px`;
        p.element.style.backgroundColor = p.cor;
        p.element.style.borderRadius = "4px";
        p.element.style.boxSizing = "border-box";
        document.body.appendChild(p.element);
        atualizarPosicaoPlayer(p);
    }

    function atualizarPosicaoPlayer(p = playerObj) {
        p.element.style.left = `${p.x}px`;
        p.element.style.top = `${p.y}px`;
    }

    let teclas = {
        w: false, a: false, s: false, d: false,
        arrowup: false, arrowdown: false, arrowleft: false, arrowright: false
    };
    window.addEventListener('keydown', (e) => {
        let key = e.key.toLowerCase();
        if (key.startsWith("arrow")) e.preventDefault(); // setinhas não rolam a página
        if (key in teclas) teclas[key] = true;
        if (key === "a") direcaoVara = -1;
        if (key === "d") direcaoVara = -1;

        if (e.key === " ") {
            e.preventDefault();
            atirar();
        }

        if (e.key === "Escape") {
            if (juegoAtivo) {
                alternarPausa();
            }
        }

        if (e.key === "Enter") {
            if (!juegoAtivo && !emMenu) {
                location.reload();
            }
        }
    });
    window.addEventListener('keyup', (e) => {
        let key = e.key.toLowerCase();
        if (key in teclas) teclas[key] = false;
    });

    function atirar() {
        if (!juegoAtivo || jogoPausado || anzol) return;
        if (playerObj.morto) return;
        if (Date.now() < proximoTiro) return;

        proximoTiro = Date.now() + RECARGA_VARA;

        let cx = playerObj.x + playerObj.w / 2;
        let cy = playerObj.y + playerObj.h / 2;

        let elAnzol = document.createElement('div');
        elAnzol.style.position = "absolute";
        elAnzol.style.width = "10px";
        elAnzol.style.height = "10px";
        elAnzol.style.borderRadius = "50%";
        elAnzol.style.backgroundColor = "#ddd";
        elAnzol.style.border = "2px solid #555";
        elAnzol.style.boxSizing = "border-box";
        elAnzol.style.zIndex = "5";
        elAnzol.style.pointerEvents = "none";

        let elLinha = document.createElement('div');
        elLinha.style.position = "absolute";
        elLinha.style.height = "2px";
        elLinha.style.backgroundColor = "rgba(255,255,255,0.8)";
        elLinha.style.transformOrigin = "0 50%";
        elLinha.style.zIndex = "4";
        elLinha.style.pointerEvents = "none";

        // área de acerto visível (translúcida)
        let elArea = document.createElement('div');
        elArea.style.position = "absolute";
        elArea.style.width = `${HITBOX_W}px`;
        elArea.style.height = `${HITBOX_H}px`;
        elArea.style.backgroundColor = "rgba(255,255,255,0.18)";
        elArea.style.border = "1px dashed rgba(255,255,255,0.5)";
        elArea.style.boxSizing = "border-box";
        elArea.style.zIndex = "3";
        elArea.style.pointerEvents = "none";

        document.body.appendChild(elArea);
        document.body.appendChild(elLinha);
        document.body.appendChild(elAnzol);

        anzol = {
            x: cx,
            y: cy,
            vx: direcaoVara * VELOCIDADE_ANZOL,
            percorrido: 0,
            element: elAnzol,
            linha: elLinha,
            area: elArea
        };
    }

    function removerAnzol() {
        if (!anzol) return;
        anzol.element.remove();
        anzol.linha.remove();
        anzol.area.remove();
        anzol = null;
    }

    function atualizarAnzol() {
        if (!anzol) return;

        anzol.x += anzol.vx;
        anzol.percorrido += Math.abs(anzol.vx);

        let cx = playerObj.x + playerObj.w / 2;
        let cy = playerObj.y + playerObj.h / 2;

        // área de acerto grande centrada no anzol: destrói TODAS as caixas dentro dela
        let aL = anzol.x - HITBOX_W / 2;
        let aR = anzol.x + HITBOX_W / 2;
        let aT = cy - HITBOX_H / 2;
        let aB = cy + HITBOX_H / 2;

        caixas = caixas.filter(box => {
            let bx = parseFloat(box.style.left) || 0;
            let by = parseFloat(box.style.top) || 0;
            let acertou = (
                bx < aR && bx + obj.w > aL &&
                by < aB && by + obj.h > aT
            );
            if (acertou) box.remove();
            return !acertou;
        });

        // chegou no alcance máximo (ou saiu da tela)
        if (anzol.percorrido >= ALCANCE_VARA ||
            anzol.x < -20 || anzol.x > window.innerWidth + 20) {
            removerAnzol();
            return;
        }

        // desenha anzol, linha e área
        let comprimento = Math.abs(anzol.x - cx);
        anzol.element.style.left = `${anzol.x - 5}px`;
        anzol.element.style.top = `${cy - 5}px`;
        anzol.linha.style.left = `${Math.min(cx, anzol.x)}px`;
        anzol.linha.style.top = `${cy - 1}px`;
        anzol.linha.style.width = `${comprimento}px`;
        anzol.linha.style.transform = "none";
        anzol.area.style.left = `${aL}px`;
        anzol.area.style.top = `${aT}px`;
    }

    function atualizarPlacarVara() {
        let restante = proximoTiro - Date.now();
        if (restante > 0) {
            let progresso = 1 - restante / RECARGA_VARA;
            preenchimentoVara.style.width = `${Math.max(0, progresso) * 100}%`;
            preenchimentoVara.style.backgroundColor = "white";
        } else {
            preenchimentoVara.style.width = "100%";
            preenchimentoVara.style.backgroundColor = "#7CFC00";
        }
    }

    function alternarPausa() {
        if (!jogoPausado) {
            jogoPausado = true;
            inicioPausa = Date.now();
            telaPausa.style.display = "flex";
        } else {
            let duracaoPausa = Date.now() - inicioPausa;
            jogoPausado = false;
            tempoPausadoTotal += duracaoPausa;
            jogadores.forEach(p => {
                // o escudo não deve gastar tempo enquanto o jogo está pausado
                if (p.comEscudo) p.tempoEscudo += duracaoPausa;
                // a espera para voltar também não conta durante a pausa
                if (p.morto) p.tempoVolta += duracaoPausa;
            });
            // o evento da bolinha verde também não gasta tempo durante a pausa
            if (encolhendo) tempoEncolher += duracaoPausa;
            // a recarga da vara também não conta durante a pausa
            proximoTiro += duracaoPausa;
            telaPausa.style.display = "none";
            requestAnimationFrame(anima);
        }
    }

    function moverUm(p, cima, baixo, esquerda, direita) {
        if (p.morto) return;

        if (cima && p.y > 0) p.y -= p.speed;
        if (baixo && p.y < window.innerHeight - p.h) p.y += p.speed;
        if (esquerda && p.x > 0) p.x -= p.speed;
        if (direita && p.x < window.innerWidth - p.w) p.x += p.speed;

        atualizarPosicaoPlayer(p);
    }

    function moverPlayer() {
        if (!juegoAtivo || jogoPausado) return;

        moverUm(playerObj, teclas.w, teclas.s, teclas.a, teclas.d);
        if (multiplayer) {
            moverUm(player2, teclas.arrowup, teclas.arrowdown, teclas.arrowleft, teclas.arrowright);
        }
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function presets(item, y) {
        item.id = `${i}`;
        i++;
        item.style.position = "absolute";
        item.style.height = `${obj.h}px`;
        item.style.width = `${obj.w}px`;
        item.style.top = `${y}px`;
        item.style.left = `-${obj.w}px`;
    }

    // bônus de velocidade que cresce com o tempo (não é afetado pelas bolinhas)
    function calcularBonusBruto() {
        let tempoDecorridoEfetivo = Date.now() - tempoInicial - tempoPausadoTotal;
        let segundosPassados = Math.floor(tempoDecorridoEfetivo / 200);
        return segundosPassados * 0.1;
    }

    function ativarLentidao() {
        // nunca reduz além do bônus atual, para a bolinha não ser desperdiçada
        reducaoBonus = Math.min(reducaoBonus + REDUCAO_POR_BOLINHA, calcularBonusBruto());
    }

    // ---------- bolinha verde ----------
    function ativarEncolher() {
        encolhendo = true;
        tempoEncolher = Date.now() + DURACAO_ENCOLHER;
        // mesma lógica da laranja, mas reduz menos (não mexe no placar de tempo)
        reducaoBonus = Math.min(reducaoBonus + REDUCAO_POR_VERDE, calcularBonusBruto());
    }

    function resetarEstiloFoca(box) {
        box.style.scale = "1";
        box.style.rotate = "0deg";
        box.style.filter = "none";
    }

    function gerenciarEncolher() {
        if (encolhendo && Date.now() > tempoEncolher) {
            encolhendo = false;
            caixas.forEach(resetarEstiloFoca);
        }
    }

    function aplicarEfeitoFocas() {
        if (!encolhendo) return;
        anguloFoca = (anguloFoca + 10) % 360;
        caixas.forEach(box => {
            box.style.scale = `${ESCALA_ENCOLHIDA}`;
            box.style.rotate = `${anguloFoca}deg`;
            // sepia + hue-rotate faz até imagens cinza virarem arco-íris
            box.style.filter =
                `sepia(1) saturate(6) hue-rotate(${anguloFoca * 3}deg) ` +
                `drop-shadow(0 0 6px hsl(${anguloFoca * 3}, 100%, 50%))`;
        });
    }

    async function spawnVerde() {
        if (!juegoAtivo) return;

        let tempoEspera = Math.floor(Math.random() * 30000) + 10000; // 8 a 14s
        await delay(tempoEspera);

        if (!juegoAtivo) return;

        while (jogoPausado) {
            await delay(500);
            if (!juegoAtivo) return;
        }

        let tamanhoBolinha = 20;
        let bola = document.createElement('div');
        bola.style.position = "absolute";
        bola.style.width = `${tamanhoBolinha}px`;
        bola.style.height = `${tamanhoBolinha}px`;
        bola.style.backgroundColor = "lime";
        bola.style.borderRadius = "50%";
        bola.style.boxShadow = "0 0 10px lime";

        let angulo = Math.random() * Math.PI * 2;
        let raio = Math.random() * 700 + 300;

        let targetX = playerObj.x + (playerObj.w / 2) + Math.cos(angulo) * raio;
        let targetY = playerObj.y + (playerObj.h / 2) + Math.sin(angulo) * raio;

        targetX = Math.max(0, Math.min(window.innerWidth - tamanhoBolinha, targetX));
        targetY = Math.max(0, Math.min(window.innerHeight - tamanhoBolinha, targetY));

        bola.style.left = `${targetX}px`;
        bola.style.top = `${targetY}px`;

        document.body.appendChild(bola);
        verdesNaTela.push(bola);

        spawnVerde();
    }
    // -----------------------------------

    async function spawnLentidao() {
        if (!juegoAtivo) return;

        let tempoEspera = Math.floor(Math.random() * 4000) + 4000;
        await delay(tempoEspera);

        if (!juegoAtivo) return;

        while (jogoPausado) {
            await delay(500);
            if (!juegoAtivo) return;
        }

        let tamanhoBolinha = 20;
        let bola = document.createElement('div');
        bola.style.position = "absolute";
        bola.style.width = `${tamanhoBolinha}px`;
        bola.style.height = `${tamanhoBolinha}px`;
        bola.style.backgroundColor = "orange";
        bola.style.borderRadius = "50%";
        bola.style.boxShadow = "0 0 10px orange";

        let angulo = Math.random() * Math.PI * 2;
        let raio = Math.random() * 550 + 300;

        let targetX = playerObj.x + (playerObj.w / 2) + Math.cos(angulo) * raio;
        let targetY = playerObj.y + (playerObj.h / 2) + Math.sin(angulo) * raio;

        targetX = Math.max(0, Math.min(window.innerWidth - tamanhoBolinha, targetX));
        targetY = Math.max(0, Math.min(window.innerHeight - tamanhoBolinha, targetY));

        bola.style.left = `${targetX}px`;
        bola.style.top = `${targetY}px`;

        document.body.appendChild(bola);
        lentidoesNaTela.push(bola);

        spawnLentidao();
    }

    function move(item) {
        if (!item.velocidade) {
            let bonusVelocidade = Math.max(0, calcularBonusBruto() - reducaoBonus);
            item.velocidade = Math.ceil(Math.random() * 10 + 5) + bonusVelocidade;
        }

        let atualX = parseFloat(item.style.left) || 0;
        let novoX = atualX + item.velocidade;
        item.style.left = `${novoX}px`;

        if (novoX > window.innerWidth + obj.w) {
            item.remove();
            return true;
        }
        return false;
    }

    async function spawn() {
        if (!juegoAtivo) return;

        if (jogoPausado) {
            await delay(100);
            spawn();
            return;
        }

        let y = Math.random() * (window.innerHeight+30)-30;

        let box = document.createElement('img');
        box.src = "sea.png";
        box.alt = "Peixe";

        presets(box, y);
        document.body.appendChild(box);

        caixas.push(box);

        await delay(150);
        spawn();
    }

    async function spawnEscudo() {
        if (!juegoAtivo) return;

        let tempoEspera = Math.floor(Math.random() * 10000) + 10000;
        await delay(tempoEspera);

        if (!juegoAtivo) return;

        while (jogoPausado) {
            await delay(500);
            if (!juegoAtivo) return;
        }

        let tamanhoBolinha = 20;
        let bola = document.createElement('div');
        bola.style.position = "absolute";
        bola.style.width = `${tamanhoBolinha}px`;
        bola.style.height = `${tamanhoBolinha}px`;
        bola.style.backgroundColor = "cyan";
        bola.style.borderRadius = "50%";
        bola.style.boxShadow = "0 0 10px cyan";

        let angulo = Math.random() * Math.PI * 2;
        let raio = Math.random() * 500 + 50;

        let targetX = playerObj.x + (playerObj.w / 2) + Math.cos(angulo) * raio;
        let targetY = playerObj.y + (playerObj.h / 2) + Math.sin(angulo) * raio;

        targetX = Math.max(0, Math.min(window.innerWidth - tamanhoBolinha, targetX));
        targetY = Math.max(0, Math.min(window.innerHeight - tamanhoBolinha, targetY));

        bola.style.left = `${targetX}px`;
        bola.style.top = `${targetY}px`;

        document.body.appendChild(bola);
        escudosNaTela.push(bola);

        spawnEscudo();
    }

    function verificarColisao(box, p = playerObj) {
        let boxX = parseFloat(box.style.left) || 0;
        let boxY = parseFloat(box.style.top) || 0;

        let pMargemW = 7;
        let pMargemH = 7;
        let pX = p.x + pMargemW;
        let pY = p.y + pMargemH;
        let pW = p.w - (pMargemW * 2);
        let pH = p.h - (pMargemH * 2);

        // hitbox da foca: encolhe (centralizada) durante o evento da bolinha verde
        let escala = encolhendo ? ESCALA_ENCOLHIDA : 1;
        let bW = (obj.w - 90) * escala;
        let bH = (obj.h - 70) * escala;
        let bX = boxX + obj.w / 2 - bW / 2;
        let bY = boxY + obj.h / 2 - bH / 2;

        return (
            pX < bX + bW &&
            pX + pW > bX &&
            pY < bY + bH &&
            pY + pH > bY
        );
    }

    function verificarColisaoEscudo(bola, p = playerObj) {
        let bolaX = parseFloat(bola.style.left) || 0;
        let bolaY = parseFloat(bola.style.top) || 0;
        let bolaTamanho = 20;

        return (
            p.x < bolaX + bolaTamanho &&
            p.x + p.w > bolaX &&
            p.y < bolaY + bolaTamanho &&
            p.y + p.h > bolaY
        );
    }

    // devolve o jogador (vivo) que encostou na bolinha, ou undefined
    function quemPegou(bola) {
        return jogadores.find(p => !p.morto && verificarColisaoEscudo(bola, p));
    }

    function ativarEscudo(p = playerObj) {
        p.comEscudo = true;
        p.tempoEscudo = Date.now() + 5000;
        p.element.style.border = "3px solid cyan";
        p.element.style.boxShadow = "0 0 15px cyan";
    }

    function gerenciarTempoEscudo() {
        jogadores.forEach(p => {
            if (p.comEscudo && Date.now() > p.tempoEscudo) {
                p.comEscudo = false;
                p.element.style.border = "none";
                p.element.style.boxShadow = "none";
            }
        });
    }

    // ---------- morte e volta (multiplayer) ----------
    function matar(p) {
        if (!juegoAtivo || p.morto) return;

        // single player: morreu, acabou
        if (!multiplayer) {
            gameOver();
            return;
        }

        p.morto = true;
        p.tempoVolta = Date.now() + TEMPO_REVIVER;
        p.element.style.filter = "brightness(0.25)"; // escuro = morto

        // se os dois estiverem mortos ao mesmo tempo, fim de jogo
        if (jogadores.every(j => j.morto)) gameOver();
    }

    function reviver(p) {
        p.morto = false;
        p.element.style.filter = "none";
        ativarEscudo(p); // volta com o escudo padrão (5 segundos)
    }

    function gerenciarRevive() {
        jogadores.forEach(p => {
            if (p.morto && Date.now() > p.tempoVolta) reviver(p);
        });
    }
    // -------------------------------------------------

    function gameOver() {
        if (!juegoAtivo) return; // evita criar várias telas de game over
        juegoAtivo = false;

        let tona = document.createElement('div');
        tona.style.position = "absolute";
        tona.style.top = "0";
        tona.style.left = "0";
        tona.style.width = "100vw";
        tona.style.height = "100vh";
        tona.style.backgroundColor = "rgba(0, 0, 0, 0.85)";
        tona.style.display = "flex";
        tona.style.flexDirection = "column";
        tona.style.justifyContent = "center";
        tona.style.alignItems = "center";
        tona.style.zIndex = "100";
        tona.style.fontFamily = "sans-serif";

        let texto = document.createElement('h1');
        texto.innerText = "Você foi devorado ✌️😔, aperte 'espaço' para atacar";
        texto.style.color = "red";
        texto.style.fontSize = "48px";
        texto.style.margin = "0 0 10px 0";

        let pontuacaoFinal = document.createElement('p');
        pontuacaoFinal.innerText = placar.innerText;
        pontuacaoFinal.style.color = "white";
        pontuacaoFinal.style.fontSize = "20px";
        pontuacaoFinal.style.margin = "0 0 20px 0";

        let botao = document.createElement('button');
        botao.innerText = "Try Again (Enter)";
        botao.style.padding = "12px 24px";
        botao.style.fontSize = "18px";
        botao.style.cursor = "pointer";
        botao.style.border = "none";
        botao.style.backgroundColor = "white";
        botao.style.fontWeight = "bold";
        botao.style.borderRadius = "5px";
        const reiniciarJogo = () => location.reload();
        botao.onclick = reiniciarJogo;
        tona.appendChild(texto);
        tona.appendChild(pontuacaoFinal);
        tona.appendChild(botao);
        document.body.appendChild(tona);
    }

    function anima() {
        if (!juegoAtivo || jogoPausado) return;
        let tempoDecorridoEfetivo = Date.now() - tempoInicial - tempoPausadoTotal;
        let segundos = Math.floor(tempoDecorridoEfetivo / 1000);
        placar.innerText = `Tempo: ${segundos}s`;
        moverPlayer();
        gerenciarTempoEscudo();
        gerenciarRevive();
        gerenciarEncolher();
        atualizarAnzol();
        atualizarPlacarVara();
        escudosNaTela = escudosNaTela.filter(bola => {
            let p = quemPegou(bola);
            if (p) {
                bola.remove();
                ativarEscudo(p);
                return false;
            }
            return true;
        });
        lentidoesNaTela = lentidoesNaTela.filter(bola => {
            if (quemPegou(bola)) {
                bola.remove();
                ativarLentidao();
                return false;
            }
            return true;
        });
        verdesNaTela = verdesNaTela.filter(bola => {
            if (quemPegou(bola)) {
                bola.remove();
                ativarEncolher();
                return false;
            }
            return true;
        });
        caixas.forEach(box => {
            move(box);
            jogadores.forEach(p => {
                if (!p.morto && !p.comEscudo && verificarColisao(box, p)) {
                    matar(p);
                }
            });
        });
        aplicarEfeitoFocas();
        caixas = caixas.filter(box => document.body.contains(box));
        requestAnimationFrame(anima);
    }

    // ---------- menu inicial ----------
    function iniciarJogo(modoMultiplayer) {
        multiplayer = modoMultiplayer;
        emMenu = false;
        juegoAtivo = true;
        tempoInicial = Date.now();
        menu.remove();

        criarPlayer(playerObj);
        if (multiplayer) {
            jogadores.push(player2);
            criarPlayer(player2);
        }

        spawn();
        spawnEscudo();
        spawnLentidao();
        spawnVerde();
        anima();
    }

    function criarBotaoMenu(texto, aoClicar) {
        let botao = document.createElement('button');
        botao.innerText = texto;
        botao.style.padding = "16px 40px";
        botao.style.fontSize = "22px";
        botao.style.fontWeight = "bold";
        botao.style.cursor = "pointer";
        botao.style.border = "none";
        botao.style.backgroundColor = "white";
        botao.style.borderRadius = "5px";
        botao.style.margin = "10px";
        botao.onclick = aoClicar;
        return botao;
    }

    let menu = document.createElement('div');
    menu.style.position = "absolute";
    menu.style.top = "0";
    menu.style.left = "0";
    menu.style.width = "100vw";
    menu.style.height = "100vh";
    menu.style.backgroundColor = "rgba(0, 0, 0, 0.85)";
    menu.style.display = "flex";
    menu.style.flexDirection = "column";
    menu.style.justifyContent = "center";
    menu.style.alignItems = "center";
    menu.style.zIndex = "200";
    menu.style.fontFamily = "sans-serif";

    menu.appendChild(criarBotaoMenu("Single Player", () => iniciarJogo(false)));
    menu.appendChild(criarBotaoMenu("Multiplayer", () => iniciarJogo(true)));
    document.body.appendChild(menu);
});
