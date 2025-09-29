# Guia de Implementação: Oponente de IA

Este documento detalha o plano de arquitetura e implementação para o módulo de Oponente de IA do projeto Transcendence.

## 1. Visão Geral e Objetivo

O objetivo é introduzir no jogo um oponente controlado por Inteligência Artificial (IA) que seja autônomo, desafiador e que proporcione uma experiência de jogo engajante. A IA deve operar sob restrições específicas que a forçam a "pensar" de forma preditiva, emulando um jogador humano.

## 2. Requisitos do Projeto (Extraído do PDF)

Analisamos os requisitos oficiais do projeto para garantir total conformidade.

| Requisito | Como Nosso Plano Atende |
| :--- | :--- |
| **Proibido usar o algoritmo A\*** | Nossa abordagem **não usa A\***. Usaremos um algoritmo de **cálculo de trajetória** baseado na física do jogo (posição e velocidade da bola). |
| **Simular Input Humano** | A IA não irá manipular diretamente as coordenadas da sua raquete. Em vez disso, ela irá **simular o pressionar das teclas** (ex: `ArrowUp`, `ArrowDown`) para se mover. |
| **Refresh de Visão de 1s** | A lógica principal de decisão da IA (o cálculo de trajetória) será executada apenas **uma vez por segundo**. Um timestamp (`aiLastUpdateTime`) irá garantir essa restrição. Nos intervalos, a IA apenas executa o movimento já decidido. |
| **Uso de Power-Ups** | A IA será programada para ser ciente dos power-ups no mapa. A lógica de mira será desenvolvida para, quando possível, interceptar a bola de uma maneira que também ative um power-up. |
| **Capacidade de Vencer** | A base do nosso algoritmo é preditiva, o que a torna inerentemente competente. A dificuldade poderá ser ajustada, mas o objetivo é uma IA que joga para vencer. |
| **Lógica Explicável** | A abordagem é baseada em geometria e física simples, tornando-a clara e fácil de ser explicada em detalhes durante a avaliação do projeto. |

## 3. Arquitetura Escolhida

Conforme documentado em `AI_Architecture_Decision.md` e alinhado com a equipe:

- **Modularidade é Prioridade:** Para evitar sobrecarregar a classe `GameManager` e para manter o código organizado, toda a lógica da IA será isolada.
- **Novo Arquivo:** Criaremos a classe `AIOpponent` dentro de um novo arquivo: `frontend/src/managers/AIOpponent.ts`.
- **Comunicação entre Classes:**
    - O `GameManager` será o "dono" da instância da IA. Ele irá criá-la.
    - A cada ciclo do jogo (no método `update`), o `GameManager` irá:
        1. Verificar se é um jogo contra IA (`this.isAIGame`).
        2. Chamar o método `AIOpponent.update()`, passando o estado atual do jogo (bola, raquetes, etc.).
    - A classe `AIOpponent` recebe os dados, decide o que fazer, e executa a simulação de input.

### 3.5 Mecanismo de Ativação (Como Iniciar um Jogo de IA)

Como o PDF do projeto não especifica como um jogo contra a IA deve ser iniciado, definimos a seguinte abordagem:

1.  **Interface do Usuário (UI):** Um novo botão, "Jogar contra IA", será adicionado à página inicial.
2.  **Roteamento:** Será criada uma nova rota, `/play-ai`, no `Router` localizado em `App.ts`.
3.  **Lógica de Ativação:**
    - O clique no botão levará o usuário para a rota `/play-ai`.
    - O `Router` chamará o método `showGamePage()` com um novo parâmetro booleano para indicar que se trata de um jogo contra a IA. Ex: `showGamePage(isQuickGame: true, isAIGame: true)`.
    - Esse parâmetro `isAIGame` será propagado para o método `gameManager.startGame()`.
    - O `GameManager` armazenará esse estado em uma propriedade `this.isAIGame` e a usará para decidir se deve acionar os controles do Jogador 2 ou a lógica do `AIOpponent` a cada frame.

## 4. Lógica Principal da IA: Como a IA "Pensa"

A IA opera em um ciclo de "percepção-decisão-ação":

1.  **Percepção (1 vez por segundo):**
    - O método `predictBallTrajectory()` é ativado.
    - Ele lê a posição atual da bola (`ball.x`, `ball.y`) e sua velocidade (`ball.vx`, `ball.vy`).

2.  **Decisão (Cálculo Preditivo):**
    - O algoritmo projeta a trajetória futura da bola.
    - Ele calcula em quanto tempo a bola alcançará a linha vertical da raquete da IA.
    - Usando esse tempo, ele calcula a altura (`Y`) em que a bola chegará.
    - **Importante:** O cálculo deve levar em conta as colisões com as paredes superior e inferior, invertendo o vetor de velocidade vertical (`vy = -vy`) a cada colisão.
    - O resultado final é armazenado na variável `this.aiTargetY`.

3.  **Ação (A cada frame):**
    - O método `update()` compara a posição atual da raquete da IA com o `this.aiTargetY`.
    - Se `aiTargetY` for mais alto que o centro da raquete, a IA simula um "pressionar da tecla para cima".
    - Se `aiTargetY` for mais baixo, ela simula um "pressionar da tecla para baixo".
    - Se a raquete já estiver alinhada, nenhuma tecla é pressionada.

## 5. Plano de Implementação Detalhado

| Fase | Tarefa | Arquivos Afetados |
| :--- | :--- | :--- |
| **1. Estrutura** | 1. Criar o arquivo `AIOpponent.ts` com a classe `AIOpponent`. <br> 2. Adicionar a propriedade `isAIGame: boolean` ao `GameManager`. | `AIOpponent.ts` (novo), `GameManager.ts` |
| **2. Integração** | 1. Importar e instanciar `AIOpponent` no construtor do `GameManager`. <br> 2. No `update()` do `GameManager`, adicionar a chamada para `AIOpponent.update()` se `isAIGame` for `true`. | `GameManager.ts` |
| **3. Lógica da IA** | 1. Implementar as propriedades `aiLastUpdateTime` e `aiTargetY` em `AIOpponent`. <br> 2. Implementar o método `predictBallTrajectory()`. <br> 3. Implementar a lógica de movimento no `update()` do `AIOpponent`. | `AIOpponent.ts` |
| **4. Power-Ups** | (Após a Fase 3 estar funcional) <br> 1. Passar a lista de power-ups para a IA. <br> 2. Modificar `predictBallTrajectory()` para que a IA possa, opcionalmente, mirar em um power-up em vez de apenas na bola. | `AIOpponent.ts`, `GameManager.ts` |
| **5. Testes** | Jogar contra a IA em diferentes cenários para validar o comportamento e ajustar a dificuldade. | - |
