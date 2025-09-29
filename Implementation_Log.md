# Log de Implementação - Oponente de IA

Este arquivo documenta as alterações feitas no código, passo a passo, durante a implementação da feature de Oponente de IA.

---

### **Data: 23/09/2025**

#### **Alteração 1: Preparação do `GameManager` para a IA**

*   **Arquivo Modificado:** `frontend/src/managers/GameManager.ts`

*   **O que foi feito:**
    1.  **Importação:** Adicionada a linha `import { AIOpponent } from './AIOpponent.js';`.
    2.  **Novas Propriedades:** Criadas as propriedades `aiOpponent: AIOpponent;` e `isAIGame: boolean = false;`.
    3.  **Instanciação:** Adicionada a linha `this.aiOpponent = new AIOpponent();` dentro do `constructor`.

*   **Por que foi feito:**
    *   Para que a classe `GameManager` "saiba" da existência da classe `AIOpponent` e tenha uma instância dela pronta para usar. É o primeiro passo da integração.

---

#### **Alteração 2: Conexão da Lógica da IA ao Loop do Jogo**

*   **Arquivo Modificado:** `frontend/src/managers/GameManager.ts`

*   **O que foi feito:**
    1.  **`startGame`:** A assinatura do método foi alterada para aceitar um novo parâmetro: `isAIGame: boolean = false`. O valor deste parâmetro é então atribuído a `this.isAIGame`.
    2.  **`updatePaddles`:** Uma estrutura `if/else` foi adicionada. Se `this.isAIGame` for `true`, o método chama `this.aiOpponent.update(...)`. Caso contrário, ele mantém a lógica de controle do teclado para o jogador 2.

*   **Por que foi feito:**
    *   Para efetivamente "ativar" a IA. Agora o `GameManager` pode ser instruído a iniciar um jogo de IA e, durante o jogo, ele delegará o controle da raquete direita para a nossa classe `AIOpponent`, em vez de ler o teclado.

---

#### **Alteração 3: Refatoração da Integração para Simulação de Input**

*   **Arquivo Modificado:** `frontend/src/managers/GameManager.ts`

*   **O que foi feito:**
    1.  A chamada para `this.aiOpponent.update()` dentro de `updatePaddles` foi modificada para incluir o objeto `this.keys` como argumento: `this.aiOpponent.update(this.ball, this.rightPaddle, this.keys);`.

*   **Por que foi feito:**
    *   Para cumprir o requisito de "simular input humano". Em vez de a IA manipular diretamente a velocidade da raquete, ela agora irá manipular o estado do objeto `keys` (ex: `keys['ArrowUp'] = true`). O `GameManager` continua responsável por ler esse objeto e mover a raquete, tratando a IA da mesma forma que trataria um jogador humano.

---

#### **Alteração 4 (Fase 3): Implementação da Lógica Principal da IA**

*   **Arquivo Modificado:** `frontend/src/managers/AIOpponent.ts`

*   **O que foi feito:**
    1.  **`update`:** O método foi implementado para receber a bola, a raquete e o objeto `keys`. Ele agora contém o timer de 1 segundo. A cada segundo, ele chama `predictBallTrajectory`. A cada frame, ele compara a posição da raquete com o alvo (`aiTargetY`) e define `keys['ArrowUp']` ou `keys['ArrowDown']` como `true` para simular o movimento.
    2.  **`predictBallTrajectory`:** Foi implementada a primeira versão do "cérebro" da IA. O método simula a trajetória da bola, incluindo os quiques nas paredes superior e inferior, até encontrar a posição Y onde a bola cruzará a raquete da IA. Esse valor é então armazenado em `aiTargetY`.

*   **Por que foi feito:**
    *   Esta é a implementação central da IA. Com este código, a IA agora é capaz de prever o movimento da bola e mover sua raquete para a posição correta, cumprindo os requisitos de "pensar" uma vez por segundo e simular o input do teclado.

---

#### **Alteração 5 (Fase de UI): Adição do Botão de Ativação**

*   **Arquivo Modificado:** `frontend/src/services/PageService.ts`

*   **O que foi feito:**
    1.  No método `renderHomePage`, um novo botão com o texto "🤖 Play vs AI" e ID `ai-game-btn` foi adicionado ao HTML da página inicial.

*   **Por que foi feito:**
    *   Para fornecer ao usuário um ponto de entrada claro e visível para iniciar uma partida contra o oponente de IA, conforme definido em nosso plano de ativação.

---

#### **Alteração 6 (Fase de UI): Lógica do Botão**

*   **Arquivo Modificado:** `frontend/src/services/PageService.ts`

*   **O que foi feito:**
    1.  No método `setupHomePageListeners`, foi adicionado um `addEventListener` para o botão `#ai-game-btn`.
    2.  O evento de clique agora dispara a navegação para a nova rota `/play-ai`.

*   **Por que foi feito:**
    *   Para tornar o botão funcional, conectando a ação do usuário (clique) ao sistema de roteamento da aplicação.

---

#### **Alteração 7 (Fase de UI): Roteamento e Ativação do Jogo**

*   **Arquivo Modificado:** `frontend/src/App.ts`

*   **O que foi feito:**
    1.  **Roteamento:** Uma nova rota, `/play-ai`, foi adicionada ao `Router`. Ela chama `showGamePage(true, true)`.
    2.  **`showGamePage`:** A assinatura do método foi alterada para `showGamePage(isQuickGame: boolean, isAIGame: boolean = false)`.
    3.  **Ativação:** A chamada para `this.gameManager.startGame` dentro de `showGamePage` foi atualizada para passar o parâmetro `isAIGame`.

*   **Por que foi feito:**
    *   Para criar o fluxo completo de ativação do jogo. Agora, a URL `/play-ai` aciona a exibição da página do jogo e instrui o `GameManager` a iniciar a partida no modo "Jogador vs. IA".

---

#### **Alteração 8 (TESTE): Bypass Temporário da Autenticação**

*   **Arquivo Modificado:** `frontend/src/App.ts`

*   **O que foi feito:**
    1.  O bloco `if (!authService.isAuthenticated())` dentro do método `showGamePage` foi temporariamente comentado usando `/* ... */`.

*   **Por que foi feito:**
    *   Para permitir o teste funcional da página do jogo e da IA sem a necessidade de realizar o login. **Esta é uma alteração temporária e deve ser revertida** antes de finalizar a feature.

---

#### **Alteração 9 (BUG FIX): Correção do Movimento da IA**

*   **Arquivo Modificado:** `frontend/src/managers/AIOpponent.ts`

*   **O que foi feito:**
    1.  **`constructor`:** O valor inicial da propriedade `aiTargetY` foi corrigido de `0` para `200`, o centro vertical do canvas. 
    2.  **`predictBallTrajectory`:** A lógica para quando a bola está se afastando da IA foi melhorada. Em vez de simplesmente ir para o centro, a IA agora move seu alvo (`aiTargetY`) suavemente em direção à altura atual da bola, resultando em um posicionamento mais natural.

*   **Por que foi feito:**
    *   Para corrigir o bug onde a raquete da IA não se movia. A inicialização incorreta do alvo e a falta de comportamento quando a bola se afastava faziam com que a IA ficasse parada ou com um alvo incorreto no início do jogo.

---

#### **Alteração 10 (BUG FIX): Correção Definitiva do Movimento da IA**

*   **Arquivos Modificados:** `frontend/src/managers/AIOpponent.ts`, `frontend/src/managers/GameManager.ts`

*   **O que foi feito:**
    1.  **Diagnóstico:** Através de um teste de "controle direto", foi confirmado que o problema estava na comunicação entre a IA e o `GameManager` através do objeto `keys`.
    2.  **Reversão em `AIOpponent.ts`:** A classe da IA foi revertida para sua versão correta, que manipula o objeto `keys` para simular o input, em vez de controlar a velocidade `dy` diretamente.
    3.  **Correção em `GameManager.ts`:** O método `updatePaddles` foi reestruturado para que a lógica que lê o objeto `keys` e define a velocidade `dy` da raquete direita seja executada para **ambos**, jogador humano e IA. O erro anterior era que essa lógica só rodava para o jogador humano.

*   **Por que foi feito:**
    *   Para corrigir o bug de movimento da IA da maneira correta, respeitando o requisito de "simular input humano". A IA agora define o estado das teclas, e o `GameManager` reage a esse estado, garantindo que a arquitetura do jogo seja consistente.

---

#### **Alteração 11 (REFINAMENTO): Comportamento e Dificuldade da IA**

*   **Arquivo Modificado:** `frontend/src/managers/AIOpponent.ts`

*   **O que foi feito:**
    1.  **Comportamento Ocioso:** A lógica da IA para quando a bola está se afastando (`ball.dx < 0`) foi alterada. Em vez de espelhar a posição Y da bola, a IA agora move sua raquete lentamente de volta para o centro da tela (`Y=200`).
    2.  **Análise de Dificuldade:** Foi confirmado que a IA é vencível por design, devido a duas fraquezas intencionais: o tempo de reação de 1 segundo para recalcular a trajetória e a velocidade finita de sua raquete.

*   **Por que foi feito:**
    *   A mudança no comportamento ocioso torna a IA mais natural e menos previsível, simulando um jogador real que se reposiciona.
    *   A análise de dificuldade valida que nossa implementação está alinhada com os requisitos do projeto, que pedem uma IA desafiadora, mas não perfeita.

---

#### **Alteração 12 (REFINAMENTO): "Humanização" da IA**

*   **Arquivos Modificados:** `frontend/src/managers/AIOpponent.ts`, `frontend/src/managers/GameManager.ts`

*   **O que foi feito:**
    1.  **Imprecisão Aleatória:** No `AIOpponent.ts`, após o cálculo da trajetória, um pequeno desvio aleatório é somado ao `aiTargetY`. 
    2.  **Redução de Velocidade:** No `GameManager.ts`, a velocidade da raquete da IA é reduzida em 10% no início de cada partida contra ela.

*   **Por que foi feito:**
    *   Para atender ao pedido de tornar a IA mais "vencível" e menos perfeita. A imprecisão faz com que a IA possa cometer pequenos erros de posicionamento, e a velocidade reduzida dá uma leve vantagem ao jogador humano, tornando o jogo mais justo e divertido.

---
