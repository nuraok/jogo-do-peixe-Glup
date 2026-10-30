document.addEventListener('DOMContentLoaded', () => {
    let i = 1;
    let juegoAtivo = false;
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

    const REDUCAO_POR_BOLINHA = 6;
    let reducaoBonus = 0;

    const REDUCAO_POR_VERDE = 10;
    const DURACAO_ENCOLHER = 10000;
    const ESCALA_ENCOLHIDA = 0.5;
    let encolhendo = false;
    let tempoEncolher = 0;
    let anguloFoca = 0;

    const TEMPO_REVIVER = 10000;

    // Vara de pesca
    const RECARGA_VARA = 3000;
    const VELOCIDADE_ANZOL = 20;
    const ALCANCE_VARA = 500;
    const HITBOX_W = 100;
    const HITBOX_H = 140;
    let direcaoVara = -1;

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
        tempoVolta: 0,
        proximoTiro: 0,
        anzol: null
    };

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
        tempoVolta: 0,
        proximoTiro: 0,
        anzol: null
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

    // Barra de recarga do arpão
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
        arrowup: false, arrowdown: false,
        arrowleft: false, arrowright: false
    };

    // REGISTRO DAS TECLAS
    window.addEventListener('keydown', (e) => {
        let key = e.key.toLowerCase();

        if (key.startsWith("arrow")) e.preventDefault();

        if (key in teclas) teclas[key] = true;

        if (key === "a") direcaoVara = -1;
        if (key === "d") direcaoVara = -1;

        // Jogador vermelho: ESPAÇO
        if (e.key === " ") {
            e.preventDefault();
            atirar(playerObj);
        }

        // Jogador azul: ENTER
        if (e.key === "Enter" && juegoAtivo && multiplayer) {
            e.preventDefault();
            atirar(player2);
        }

        if (e.key === "Escape") {
            if (juegoAtivo) {
                alternarPausa();
            }
        }

        // Reiniciar depois do game over
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

    // CORREÇÃO: LIMPA TODAS AS TECLAS PRESAS
    function limparTeclas() {
        Object.keys(teclas).forEach(tecla => {
            teclas[tecla] = false;
        });
    }

    // Se a janela perder o foco, solta todas as teclas
    window.addEventListener('blur', limparTeclas);

    // Se a página ficar em segundo plano, solta todas as teclas
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            limparTeclas();
        }
    });

    // Cada jogador possui seu próprio arpão e recarga
    function atirar(p = playerObj) {
        if (!juegoAtivo || jogoPausado || p.anzol) return;
        if (p.morto) return;
        if (Date.now() < p.proximoTiro) return;

        p.proximoTiro = Date.now() + RECARGA_VARA;

        let cx = p.x + p.w / 2;
        let cy = p.y + p.h / 2;

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

        p.anzol = {
            x: cx,
            y: cy,
            vx: direcaoVara * VELOCIDADE_ANZOL,
            percorrido: 0,
            element: elAnzol,
            linha: elLinha,
            area: elArea
        };
    }

    function removerAnzol(p) {
        if (!p.anzol) return;

        p.anzol.element.remove();
        p.anzol.linha.remove();
        p.anzol.area.remove();

        p.anzol = null;
    }

    function atualizarAnzol(p) {
        let anzol = p.anzol;
        if (!anzol) return;

        anzol.x += anzol.vx;
        anzol.percorrido += Math.abs(anzol.vx);

        let cx = p.x + p.w / 2;
        let cy = p.y + p.h / 2;

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

        if (
            anzol.percorrido >= ALCANCE_VARA ||
            anzol.x < -20 ||
            anzol.x > window.innerWidth + 20
        ) {
            removerAnzol(p);
            return;
        }

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
        let restante = playerObj.proximoTiro - Date.now();

        if (restante > 0) {
            let progresso = 1 - restante / RECARGA_VARA;
            preenchimentoVara.style.width =
                `${Math.max(0, progresso) * 100}%`;
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

            limparTeclas();
        } else {
            let duracaoPausa = Date.now() - inicioPausa;

            jogoPausado = false;
            tempoPausadoTotal += duracaoPausa;

            jogadores.forEach(p => {
                if (p.comEscudo) p.tempoEscudo += duracaoPausa;
                if (p.morto) p.tempoVolta += duracaoPausa;
            });

            if (encolhendo) tempoEncolher += duracaoPausa;

            // A recarga de cada jogador pausa individualmente
            jogadores.forEach(p => {
                if (p.proximoTiro) p.proximoTiro += duracaoPausa;
            });

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
            moverUm(
                player2,
                teclas.arrowup,
                teclas.arrowdown,
                teclas.arrowleft,
                teclas.arrowright
            );
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

    function calcularBonusBruto() {
        let tempoDecorridoEfetivo =
            Date.now() - tempoInicial - tempoPausadoTotal;

        let segundosPassados = Math.floor(tempoDecorridoEfetivo / 200);

        return segundosPassados * 0.1;
    }

    function ativarLentidao() {
        reducaoBonus = Math.min(
            reducaoBonus + REDUCAO_POR_BOLINHA,
            calcularBonusBruto()
        );
    }

    function ativarEncolher() {
        encolhendo = true;
        tempoEncolher = Date.now() + DURACAO_ENCOLHER;

        reducaoBonus = Math.min(
            reducaoBonus + REDUCAO_POR_VERDE,
            calcularBonusBruto()
        );
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

            box.style.filter =
                `sepia(1) saturate(6) hue-rotate(${anguloFoca * 3}deg) ` +
                `drop-shadow(0 0 6px hsl(${anguloFoca * 3}, 100%, 50%))`;
        });
    }

    async function spawnVerde() {
        if (!juegoAtivo) return;

        let tempoEspera = Math.floor(Math.random() * 30000) + 10000;
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

        let targetX =
            playerObj.x + (playerObj.w / 2) + Math.cos(angulo) * raio;

        let targetY =
            playerObj.y + (playerObj.h / 2) + Math.sin(angulo) * raio;

        targetX = Math.max(
            0,
            Math.min(window.innerWidth - tamanhoBolinha, targetX)
        );

        targetY = Math.max(
            0,
            Math.min(window.innerHeight - tamanhoBolinha, targetY)
        );

        bola.style.left = `${targetX}px`;
        bola.style.top = `${targetY}px`;

        document.body.appendChild(bola);
        verdesNaTela.push(bola);

        spawnVerde();
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
        let raio = Math.random() * 550 + 300;

        let targetX =
            playerObj.x + (playerObj.w / 2) + Math.cos(angulo) * raio;

        let targetY =
            playerObj.y + (playerObj.h / 2) + Math.sin(angulo) * raio;

        targetX = Math.max(
            0,
            Math.min(window.innerWidth - tamanhoBolinha, targetX)
        );

        targetY = Math.max(
            0,
            Math.min(window.innerHeight - tamanhoBolinha, targetY)
        );

        bola.style.left = `${targetX}px`;
        bola.style.top = `${targetY}px`;

        document.body.appendChild(bola);
        lentidoesNaTela.push(bola);

        spawnLentidao();
    }

    function move(item) {
        if (!item.velocidade) {
            let bonusVelocidade =
                Math.max(0, calcularBonusBruto() - reducaoBonus);

            item.velocidade =
                Math.ceil(Math.random() * 10 + 5) + bonusVelocidade;
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

        let y = Math.random() * (window.innerHeight + 30) - 30;

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

        let targetX =
            playerObj.x + (playerObj.w / 2) + Math.cos(angulo) * raio;

        let targetY =
            playerObj.y + (playerObj.h / 2) + Math.sin(angulo) * raio;

        targetX = Math.max(
            0,
            Math.min(window.innerWidth - tamanhoBolinha, targetX)
        );

        targetY = Math.max(
            0,
            Math.min(window.innerHeight - tamanhoBolinha, targetY)
        );

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

    function quemPegou(bola) {
        return jogadores.find(
            p => !p.morto && verificarColisaoEscudo(bola, p)
        );
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

    function matar(p) {
        if (!juegoAtivo || p.morto) return;

        if (!multiplayer) {
            gameOver();
            return;
        }

        p.morto = true;
        p.tempoVolta = Date.now() + TEMPO_REVIVER;
        p.element.style.filter = "brightness(0.25)";

        if (jogadores.every(j => j.morto)) gameOver();
    }

    function reviver(p) {
        p.morto = false;
        p.element.style.filter = "none";
        ativarEscudo(p);
    }

    function gerenciarRevive() {
        jogadores.forEach(p => {
            if (p.morto && Date.now() > p.tempoVolta) {
                reviver(p);
            }
        });
    }

    function gameOver() {
        if (!juegoAtivo) return;

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
        texto.innerText =
            "Você foi devorado ✌️😔, aperte 'espaço' para atacar";
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

        let tempoDecorridoEfetivo =
            Date.now() - tempoInicial - tempoPausadoTotal;

        let segundos = Math.floor(tempoDecorridoEfetivo / 1000);

        placar.innerText = `Tempo: ${segundos}s`;

        moverPlayer();
        gerenciarTempoEscudo();
        gerenciarRevive();
        gerenciarEncolher();

        // Atualiza o arpão de cada jogador separadamente
        jogadores.forEach(p => atualizarAnzol(p));

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
                if (
                    !p.morto &&
                    !p.comEscudo &&
                    verificarColisao(box, p)
                ) {
                    matar(p);
                }
            });
        });

        aplicarEfeitoFocas();

        caixas = caixas.filter(
            box => document.body.contains(box)
        );

        requestAnimationFrame(anima);
    }

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

    menu.appendChild(
        criarBotaoMenu("Single Player", () => iniciarJogo(false))
    );

    menu.appendChild(
        criarBotaoMenu("Multiplayer", () => iniciarJogo(true))
    );

    document.body.appendChild(menu);
});
