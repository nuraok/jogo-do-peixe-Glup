document.addEventListener('DOMContentLoaded', () => {
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.overflow = "hidden";
    document.body.style.width = "100vw";
    document.body.style.height = "100vh";
    document.body.style.position = "relative";
    document.body.style.background = "linear-gradient(to bottom, #2a8fd6, #0a2a4a)";

    // cenário simples de oceano (fica atrás dos elementos do jogo)
    (function criarCenario() {
        function decor(css) {
            let d = document.createElement('div');
            d.style.position = "absolute";
            d.style.pointerEvents = "none";
            d.style.zIndex = "0";
            Object.assign(d.style, css);
            document.body.appendChild(d);
            return d;
        }

        // linhas de ondas perto da superfície
        for (let n = 0; n < 4; n++) {
            decor({
                top: `${4 + n * 5}vh`,
                left: `${Math.random() * 70}vw`,
                width: `${10 + Math.random() * 15}vw`,
                height: "3px",
                borderRadius: "3px",
                backgroundColor: "rgba(255,255,255,0.25)"
            });
        }

        // chão de areia
        decor({
            bottom: "0",
            left: "0",
            width: "100vw",
            height: "7vh",
            backgroundColor: "#c9ae78"
        });

        // algumas pedras
        for (let n = 0; n < 5; n++) {
            let largura = 40 + Math.random() * 50;
            decor({
                bottom: "6vh",
                left: `${5 + Math.random() * 90}vw`,
                width: `${largura}px`,
                height: `${largura * 0.5}px`,
                borderRadius: "50% 50% 0 0",
                backgroundColor: "#5f6b73"
            });
        }

        // bolhas subindo
        for (let n = 0; n < 10; n++) {
            let tamanho = 6 + Math.random() * 8;
            let bolha = decor({
                bottom: "0",
                left: `${Math.random() * 98}vw`,
                width: `${tamanho}px`,
                height: `${tamanho}px`,
                borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.6)"
            });
            let duracao = 6000 + Math.random() * 6000;
            bolha.animate(
                [
                    { transform: "translateY(0)", opacity: 0.7 },
                    { transform: `translateY(-${window.innerHeight}px)`, opacity: 0 }
                ],
                { duration: duracao, iterations: Infinity, delay: -Math.random() * duracao }
            );
        }
    })();

    let i = 1;
    let juegoAtivo = true;
    let jogoPausado = false;
    let tempoInicial = Date.now();
    let tempoPausadoTotal = 0;
    let inicioPausa = 0;
    let caixas = [];
    let escudosNaTela = [];
    let lentidoesNaTela = [];

    // quanto cada bolinha de lentidão reduz do bônus de velocidade
    const REDUCAO_POR_BOLINHA = 1.5;
    // quanto de bônus já foi "descontado" pelas bolinhas
    let reducaoBonus = 0;

    // vara de pesca
    const RECARGA_VARA = 3000;      // ms entre um tiro e outro
    const VELOCIDADE_ANZOL = 20;    // pixels por frame
    let proximoTiro = 0;
    let anzol = null;
    const ALCANCE_VARA = 200;       // distância máxima do ataque (px)
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
        comEscudo: false,
        tempoEscudo: 0
    };

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

    function criarPlayer() {
        playerObj.element.style.position = "absolute";
        playerObj.element.style.width = `${playerObj.w}px`;
        playerObj.element.style.height = `${playerObj.h}px`;
        playerObj.element.style.backgroundColor = "red";
        playerObj.element.style.borderRadius = "4px";
        playerObj.element.style.boxSizing = "border-box";
        document.body.appendChild(playerObj.element);
        atualizarPosicaoPlayer();
    }

    function atualizarPosicaoPlayer() {
        playerObj.element.style.left = `${playerObj.x}px`;
        playerObj.element.style.top = `${playerObj.y}px`;
    }

    let teclas = { w: false, a: false, s: false, d: false };
    window.addEventListener('keydown', (e) => {
        let key = e.key.toLowerCase();
        if (key in teclas) teclas[key] = true;
        if (key === "a") direcaoVara = -1;
        if (key === "d") direcaoVara = 1;

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
            if (!juegoAtivo) {
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
            // o escudo não deve gastar tempo enquanto o jogo está pausado
            if (playerObj.comEscudo) playerObj.tempoEscudo += duracaoPausa;
            // a recarga da vara também não conta durante a pausa
            proximoTiro += duracaoPausa;
            telaPausa.style.display = "none";
            requestAnimationFrame(anima);
        }
    }

    function moverPlayer() {
        if (!juegoAtivo || jogoPausado) return;

        if (teclas.w && playerObj.y > 0) playerObj.y -= playerObj.speed;
        if (teclas.s && playerObj.y < window.innerHeight - playerObj.h) playerObj.y += playerObj.speed;
        if (teclas.a && playerObj.x > 0) playerObj.x -= playerObj.speed;
        if (teclas.d && playerObj.x < window.innerWidth - playerObj.w) playerObj.x += playerObj.speed;

        atualizarPosicaoPlayer();
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
        let raio = Math.random() * 150 + 100;

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

        let y = Math.random() * (window.innerHeight - obj.h);

        let box = document.createElement('img');
        box.src = "../light.png";

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
        let raio = Math.random() * 150 + 100;

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

    function verificarColisao(box) {
        let boxX = parseFloat(box.style.left) || 0;
        let boxY = parseFloat(box.style.top) || 0;

        let pMargemW = 7;
        let pMargemH = 7;
        let pX = playerObj.x + pMargemW;
        let pY = playerObj.y + pMargemH;
        let pW = playerObj.w - (pMargemW * 2);
        let pH = playerObj.h - (pMargemH * 2);

        let bMargemW = 45;
        let bMargemH = 35;
        let bX = boxX + bMargemW;
        let bY = boxY + bMargemH;
        let bW = obj.w - (bMargemW * 2);
        let bH = obj.h - (bMargemH * 2);

        return (
            pX < bX + bW &&
            pX + pW > bX &&
            pY < bY + bH &&
            pY + pH > bY
        );
    }

    function verificarColisaoEscudo(bola) {
        let bolaX = parseFloat(bola.style.left) || 0;
        let bolaY = parseFloat(bola.style.top) || 0;
        let bolaTamanho = 20;

        return (
            playerObj.x < bolaX + bolaTamanho &&
            playerObj.x + playerObj.w > bolaX &&
            playerObj.y < bolaY + bolaTamanho &&
            playerObj.y + playerObj.h > bolaY
        );
    }

    function ativarEscudo() {
        playerObj.comEscudo = true;
        playerObj.tempoEscudo = Date.now() + 5000;
        playerObj.element.style.border = "3px solid cyan";
        playerObj.element.style.boxShadow = "0 0 15px cyan";
    }

    function gerenciarTempoEscudo() {
        if (playerObj.comEscudo && Date.now() > playerObj.tempoEscudo) {
            playerObj.comEscudo = false;
            playerObj.element.style.border = "none";
            playerObj.element.style.boxShadow = "none";
        }
    }

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
        atualizarAnzol();
        atualizarPlacarVara();
        escudosNaTela = escudosNaTela.filter(bola => {
            if (verificarColisaoEscudo(bola)) {
                bola.remove();
                ativarEscudo();
                return false;
            }
            return true;
        });
        lentidoesNaTela = lentidoesNaTela.filter(bola => {
            if (verificarColisaoEscudo(bola)) {
                bola.remove();
                ativarLentidao();
                return false;
            }
            return true;
        });
        caixas.forEach(box => {
            move(box);
            if (verificarColisao(box) && !playerObj.comEscudo) {
                gameOver();
            }
        });
        caixas = caixas.filter(box => document.body.contains(box));
        requestAnimationFrame(anima);
    }

    criarPlayer();
    spawn();
    spawnEscudo();
    spawnLentidao();
    anima();
});