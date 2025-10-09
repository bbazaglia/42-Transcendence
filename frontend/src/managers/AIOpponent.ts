/**
 * @class AIOpponent
 * @description Gerencia toda a lógica e comportamento do oponente de Inteligência Artificial.
 * Esta classe é responsável por decidir para onde a raquete da IA deve se mover.
 */
export class AIOpponent {
  // --- Propriedades de Estado da IA ---

  /**
   * @property {number} aiTargetY
   * @description A coordenada Y que a IA está tentando alcançar com sua raquete.
   * Este valor é calculado pelo método predictBallTrajectory().
   * 'private' significa que esta propriedade só pode ser acessada de dentro desta classe.
   */
  private aiTargetY: number;

  /**
   * @property {number} aiLastUpdateTime
   * @description Timestamp da última vez que a IA calculou a trajetória da bola.
   * Usado para garantir que a IA "pense" apenas uma vez por segundo.
   */
  private aiLastUpdateTime: number;

  /**
   * O 'constructor' é um método especial que é chamado quando uma nova instância da classe é criada.
   * Usamos ele para inicializar as propriedades da classe.
   */
  constructor() {
    // Inicializamos o target Y no meio da tela (uma suposição inicial segura).
    this.aiTargetY = 200; // Centro do canvas de 400px de altura

    // Inicializa o tempo de atualização para 0, para que a IA possa pensar no primeiro frame.
    this.aiLastUpdateTime = 0;
  }

  /**
   * @method update
   * @description O método principal que é chamado a cada frame pelo GameManager.
   * Ele orquestra a lógica de "pensar" e "agir" da IA.
   * @param {any} ball - O objeto da bola, contendo sua posição e velocidade.
   * @param {any} aiPaddle - O objeto da raquete da IA.
   * @param {any} keys - O objeto de estado do teclado, para simular o input.
   */
  public update(ball: any, aiPaddle: any, keys: { [key: string]: boolean }): void {
    const now = Date.now();

    // Regra: A IA só pode "ver" o jogo e recalcular a trajetória 1 vez por segundo.
    if (now - this.aiLastUpdateTime > 1000) {
      this.predictBallTrajectory(ball, aiPaddle); // Passa a raquete para o cálculo
      this.aiLastUpdateTime = now;
    }

    // Lógica de movimento contínuo em direção ao alvo (aiTargetY)
    const paddleCenter = aiPaddle.y + aiPaddle.height / 2;

    // Zera as teclas antes de decidir a próxima ação
    keys['ArrowUp'] = false;
    keys['ArrowDown'] = false;

    // Move a raquete para cima se o alvo estiver acima do centro
    if (this.aiTargetY < paddleCenter - aiPaddle.height * 0.1) { // Adiciona uma pequena zona morta para evitar trepidação
      keys['ArrowUp'] = true;
    }
    // Move a raquete para baixo se o alvo estiver abaixo do centro
    else if (this.aiTargetY > paddleCenter + aiPaddle.height * 0.1) {
      keys['ArrowDown'] = true;
    }
  }

  /**
   * @method predictBallTrajectory
   * @description Calcula a trajetória futura da bola para prever onde interceptá-la.
   * Esta é a parte "inteligente" da IA.
   * @param {any} ball - O objeto da bola.
   */
  private predictBallTrajectory(ball: any, aiPaddle: any): void {
    // Apenas calcula a predição se a bola estiver vindo em direção à IA
    if (ball.dx < 0) {
      // Se a bola está indo para longe, a IA lentamente volta para o centro.
      const centerY = 200;
      this.aiTargetY = this.aiTargetY + (centerY - this.aiTargetY) * 0.02;
      return;
    }

    let futureX = ball.x;
    let futureY = ball.y;
    let futureDX = ball.dx;
    let futureDY = ball.dy;

    // Simula o movimento da bola frame a frame até cruzar a linha da raquete da IA
    while (futureX < 780) { // 780 é a posição X da raquete direita
      futureX += futureDX;
      futureY += futureDY;

      // Verifica colisão com as paredes superior e inferior
      if (futureY <= 0 || futureY >= 400) {
        futureDY = -futureDY; // Inverte a direção vertical
      }
    }

    // Define o alvo da IA para a posição Y prevista
    this.aiTargetY = futureY;

    // Adiciona uma imprecisão humana para tornar a IA vencível
    const maxInaccuracy = aiPaddle.height * 0.25; // A IA pode errar em até 25% da altura da raquete
    const inaccuracy = (Math.random() - 0.5) * 2 * maxInaccuracy; // Valor entre -maxInaccuracy e +maxInaccuracy
    this.aiTargetY += inaccuracy;
  }
}
