import { Chart, registerables } from "chart.js";
import { analyticsService, UserAnalytics } from "../services/AnalyticsService";

Chart.register(...registerables);

export class InsightsModal {
  private modal!: HTMLElement;
  private charts: Map<string, Chart> = new Map();
  private userId: number;
  private analytics: UserAnalytics | null = null;

  constructor(userId: number) {
    this.userId = userId;
    this.createModal();
  }

  private createModal(): void {
    this.modal = document.createElement("div");
    this.modal.className =
      "fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4";
    this.modal.innerHTML = `
            <div class="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
                <!-- Header -->
                <div class="flex items-center justify-between p-6 border-b border-white/20">
                    <h2 class="text-3xl font-bold text-cyan-400 orbitron-font">Performance Insights</h2>
                    <button id="close-insights-modal" class="text-gray-400 hover:text-white transition-colors">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <!-- Content -->
                <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                    <!-- Loading State -->
                    <div id="insights-loading" class="text-center py-12">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                        <p class="text-gray-400">Loading your performance data...</p>
                    </div>

                    <!-- Analytics Content -->
                    <div id="insights-content" class="hidden">
                        <!-- Overview Cards -->
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <div class="bg-white/5 rounded-xl p-6 border border-white/10">
                                <div class="text-2xl font-bold text-emerald-400 mb-2" id="total-matches">0</div>
                                <div class="text-gray-400 text-sm">Total Matches</div>
                            </div>
                            <div class="bg-white/5 rounded-xl p-6 border border-white/10">
                                <div class="text-2xl font-bold text-cyan-400 mb-2" id="win-rate">0%</div>
                                <div class="text-gray-400 text-sm">Win Rate</div>
                            </div>
                            <div class="bg-white/5 rounded-xl p-6 border border-white/10">
                                <div class="text-2xl font-bold text-purple-400 mb-2" id="best-score">0</div>
                                <div class="text-gray-400 text-sm">Best Score</div>
                            </div>
                            <div class="bg-white/5 rounded-xl p-6 border border-white/10">
                                <div class="text-2xl font-bold text-yellow-400 mb-2" id="play-time">0m</div>
                                <div class="text-gray-400 text-sm">Play Time</div>
                            </div>
                        </div>


                        <!-- Charts Grid -->
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            <!-- Performance Over Time Chart -->
                            <div class="bg-white/5 rounded-xl p-4 border border-white/10">
                                <h3 class="text-lg font-bold text-cyan-400 mb-3 orbitron-font">Performance Over Time</h3>
                                <div class="relative h-48">
                                    <canvas id="performance-chart"></canvas>
                                </div>
                            </div>

                            <!-- Win/Loss Distribution Chart -->
                            <div class="bg-white/5 rounded-xl p-4 border border-white/10">
                                <h3 class="text-lg font-bold text-cyan-400 mb-3 orbitron-font">Win/Loss Distribution</h3>
                                <div class="relative h-48">
                                    <canvas id="winloss-chart"></canvas>
                                </div>
                            </div>
                        </div>

                        <!-- Score Distribution Chart -->
                        <div class="bg-white/5 rounded-xl p-4 border border-white/10 mb-6">
                            <h3 class="text-lg font-bold text-cyan-400 mb-3 orbitron-font">Score Distribution</h3>
                            <div class="relative h-64">
                                <canvas id="score-chart"></canvas>
                            </div>
                        </div>

                        <!-- Opponent Analysis -->
                        <div class="bg-white/5 rounded-xl p-6 border border-white/10 mb-8">
                            <h3 class="text-xl font-bold text-cyan-400 mb-4 orbitron-font">Top Opponents</h3>
                            <div id="opponent-analysis" class="space-y-4">
                                <!-- Opponent data will be populated here -->
                            </div>
                        </div>

                        <!-- Recent Trends -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="bg-white/5 rounded-xl p-6 border border-white/10">
                                <h3 class="text-xl font-bold text-cyan-400 mb-4 orbitron-font">Last 7 Days</h3>
                                <div id="trend-7days" class="space-y-2">
                                    <!-- 7-day trend data -->
                                </div>
                            </div>
                            <div class="bg-white/5 rounded-xl p-6 border border-white/10">
                                <h3 class="text-xl font-bold text-cyan-400 mb-4 orbitron-font">Last 30 Days</h3>
                                <div id="trend-30days" class="space-y-2">
                                    <!-- 30-day trend data -->
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Error State -->
                    <div id="insights-error" class="hidden text-center py-12">
                        <div class="text-red-400 mb-4">
                            <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"></path>
                            </svg>
                        </div>
                        <p class="text-gray-400 mb-4">Failed to load analytics data</p>
                        <button id="retry-analytics" class="px-4 py-2 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-600/30 transition-colors">
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        `;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const closeBtn = this.modal.querySelector("#close-insights-modal");
    const retryBtn = this.modal.querySelector("#retry-analytics");

    closeBtn?.addEventListener("click", () => this.close());
    retryBtn?.addEventListener("click", () => this.loadAnalytics());

    // Close on backdrop click
    this.modal.addEventListener("click", (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    // Close on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.modal.parentNode) {
        this.close();
      }
    });
  }

  public async show(): Promise<void> {
    document.body.appendChild(this.modal);
    await this.loadAnalytics();
  }

  public close(): void {
    this.destroyCharts();
    if (this.modal.parentNode) {
      this.modal.parentNode.removeChild(this.modal);
    }
  }

  private async loadAnalytics(): Promise<void> {
    const loadingEl = this.modal.querySelector(
      "#insights-loading"
    ) as HTMLElement;
    const contentEl = this.modal.querySelector(
      "#insights-content"
    ) as HTMLElement;
    const errorEl = this.modal.querySelector("#insights-error") as HTMLElement;

    // Show loading state
    loadingEl.classList.remove("hidden");
    contentEl.classList.add("hidden");
    errorEl.classList.add("hidden");

    try {
      this.analytics = await analyticsService.getUserAnalytics(this.userId);
      this.renderAnalytics();

      // Show content
      loadingEl.classList.add("hidden");
      contentEl.classList.remove("hidden");
    } catch (error) {
      console.error("Failed to load analytics:", error);

      // Show error state
      loadingEl.classList.add("hidden");
      errorEl.classList.remove("hidden");
    }
  }

  private renderAnalytics(): void {
    if (!this.analytics) return;

    const {
      overview,
      performanceOverTime,
      scoreDistribution,
      opponentAnalysis,
      recentTrends,
    } = this.analytics;

    // Update overview cards
    this.updateOverviewCards(overview);

    // Create charts
    this.createPerformanceChart(performanceOverTime);
    this.createWinLossChart(overview);
    this.createScoreChart(scoreDistribution);

    // Render opponent analysis
    this.renderOpponentAnalysis(opponentAnalysis);

    // Render recent trends
    this.renderRecentTrends(recentTrends);
  }

  private updateOverviewCards(overview: any): void {
    const totalMatchesEl = this.modal.querySelector("#total-matches");
    const winRateEl = this.modal.querySelector("#win-rate");
    const bestScoreEl = this.modal.querySelector("#best-score");
    const playTimeEl = this.modal.querySelector("#play-time");

    if (totalMatchesEl)
      totalMatchesEl.textContent = overview.totalMatches.toString();
    if (winRateEl)
      winRateEl.textContent = analyticsService.formatWinRate(overview.winRate);
    if (bestScoreEl) bestScoreEl.textContent = overview.bestScore.toString();
    if (playTimeEl)
      playTimeEl.textContent = analyticsService.formatPlayTime(
        overview.totalPlayTime
      );
  }

  private createPerformanceChart(performanceOverTime: any[]): void {
    const canvas = this.modal.querySelector(
      "#performance-chart"
    ) as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: performanceOverTime.map((p) =>
          new Date(p.date).toLocaleDateString()
        ),
        datasets: [
          {
            label: "Win Rate %",
            data: performanceOverTime.map((p) => p.winRate),
            borderColor: "#06b6d4",
            backgroundColor: "rgba(6, 182, 212, 0.1)",
            tension: 0.4,
            fill: true,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            ticks: {
              color: "#9ca3af",
              maxTicksLimit: 6,
            },
            grid: { color: "rgba(255, 255, 255, 0.1)" },
          },
          y: {
            ticks: {
              color: "#9ca3af",
              maxTicksLimit: 5,
            },
            grid: { color: "rgba(255, 255, 255, 0.1)" },
            min: 0,
            max: 100,
          },
        },
      },
    });

    this.charts.set("performance", chart);
  }

  private createWinLossChart(overview: any): void {
    const canvas = this.modal.querySelector(
      "#winloss-chart"
    ) as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Wins", "Losses"],
        datasets: [
          {
            data: [overview.wins, overview.losses],
            backgroundColor: ["#10b981", "#ef4444"],
            borderWidth: 0,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#9ca3af",
              padding: 15,
              usePointStyle: true,
            },
          },
        },
      },
    });

    this.charts.set("winloss", chart);
  }

  private createScoreChart(scoreDistribution: any): void {
    const canvas = this.modal.querySelector(
      "#score-chart"
    ) as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Combine all scores and create histogram
    const allScores = [...scoreDistribution.playerOneScores];
    const scoreRanges = this.createScoreRanges(allScores);

    const chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: scoreRanges.map((range) => `${range.min}`),
        datasets: [
          {
            label: "Score Frequency",
            data: scoreRanges.map((range) => range.count),
            backgroundColor: "rgba(139, 92, 246, 0.6)",
            borderColor: "#8b5cf6",
            borderWidth: 1,
            borderRadius: 4,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            ticks: {
              color: "#9ca3af",
              maxTicksLimit: 8,
            },
            grid: { color: "rgba(255, 255, 255, 0.1)" },
          },
          y: {
            ticks: {
              color: "#9ca3af",
              maxTicksLimit: 6,
            },
            grid: { color: "rgba(255, 255, 255, 0.1)" },
            beginAtZero: true,
          },
        },
      },
    });

    this.charts.set("score", chart);
  }

  private createScoreRanges(
    scores: number[]
  ): Array<{ min: number; max: number; count: number }> {
    if (scores.length === 0) return [];

    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const rangeSize = Math.max(1, Math.ceil((max - min) / 10));

    const ranges: Array<{ min: number; max: number; count: number }> = [];

    for (let i = min; i <= max; i += rangeSize) {
      const rangeMax = Math.min(i + rangeSize - 1, max);
      const count = scores.filter(
        (score) => score >= i && score <= rangeMax
      ).length;
      ranges.push({ min: i, max: rangeMax, count });
    }

    return ranges;
  }

  private renderOpponentAnalysis(opponentAnalysis: any[]): void {
    const container = this.modal.querySelector("#opponent-analysis");
    if (!container) return;

    const topOpponents = analyticsService.getTopOpponents(opponentAnalysis, 5);

    container.innerHTML = topOpponents
      .map(
        (opponent) => `
            <div class="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                <div class="flex items-center space-x-4">
                    <div class="w-10 h-10 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-full flex items-center justify-center">
                        <span class="text-white font-bold text-sm">${opponent.opponentName
                          .charAt(0)
                          .toUpperCase()}</span>
                    </div>
                    <div>
                        <div class="text-white font-medium">${
                          opponent.opponentName
                        }</div>
                        <div class="text-gray-400 text-sm">${
                          opponent.matchesPlayed
                        } matches</div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-cyan-400 font-bold">${analyticsService.formatWinRate(
                      opponent.winRate
                    )}</div>
                    <div class="text-gray-400 text-sm">${opponent.wins}W - ${
          opponent.losses
        }L</div>
                </div>
            </div>
        `
      )
      .join("");
  }

  private renderRecentTrends(recentTrends: any): void {
    const trend7El = this.modal.querySelector("#trend-7days");
    const trend30El = this.modal.querySelector("#trend-30days");

    if (trend7El) {
      const trend7 = recentTrends.last7Days;
      trend7El.innerHTML = `
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span class="text-gray-400">Matches:</span>
                        <span class="text-white">${trend7.matches}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-400">Win Rate:</span>
                        <span class="text-cyan-400">${analyticsService.formatWinRate(
                          trend7.winRate
                        )}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-400">Record:</span>
                        <span class="text-white">${trend7.wins}W - ${
        trend7.losses
      }L</span>
                    </div>
                </div>
            `;
    }

    if (trend30El) {
      const trend30 = recentTrends.last30Days;
      trend30El.innerHTML = `
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span class="text-gray-400">Matches:</span>
                        <span class="text-white">${trend30.matches}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-400">Win Rate:</span>
                        <span class="text-cyan-400">${analyticsService.formatWinRate(
                          trend30.winRate
                        )}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-400">Record:</span>
                        <span class="text-white">${trend30.wins}W - ${
        trend30.losses
      }L</span>
                    </div>
                </div>
            `;
    }
  }

  private destroyCharts(): void {
    this.charts.forEach((chart) => chart.destroy());
    this.charts.clear();
  }
}
