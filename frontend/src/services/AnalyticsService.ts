import { apiService } from './ApiService';

export interface AnalyticsOverview {
    totalMatches: number;
    wins: number;
    losses: number;
    winRate: number;
    averageScore: number;
    bestScore: number;
    totalPlayTime: number;
}

export interface PerformanceOverTime {
    date: string;
    wins: number;
    losses: number;
    winRate: number;
}

export interface ScoreDistribution {
    playerOneScores: number[];
    playerTwoScores: number[];
}

export interface OpponentAnalysis {
    opponentId: number;
    opponentName: string;
    matchesPlayed: number;
    wins: number;
    losses: number;
    winRate: number;
}

export interface TournamentStats {
    tournamentsParticipated: number;
    tournamentsWon: number;
    averageTournamentPosition: number;
}

export interface RecentTrends {
    last7Days: {
        matches: number;
        wins: number;
        losses: number;
        winRate: number;
    };
    last30Days: {
        matches: number;
        wins: number;
        losses: number;
        winRate: number;
    };
}

export interface UserAnalytics {
    overview: AnalyticsOverview;
    performanceOverTime: PerformanceOverTime[];
    scoreDistribution: ScoreDistribution;
    opponentAnalysis: OpponentAnalysis[];
    tournamentStats: TournamentStats;
    recentTrends: RecentTrends;
}

class AnalyticsService {
    private cache: Map<number, UserAnalytics> = new Map();
    private cacheExpiry: Map<number, number> = new Map();
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    /**
     * Fetch user analytics data
     */
    async getUserAnalytics(userId: number): Promise<UserAnalytics> {
        // Check cache first
        const cached = this.getCachedAnalytics(userId);
        if (cached) {
            return cached;
        }

        try {
            console.log('Fetching analytics for user:', userId);
            const response = await apiService.request(`/analytics/user/${userId}`, {
                method: 'GET'
            });
            console.log('Analytics response:', response);
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            const analytics: UserAnalytics = response.data;

            // Cache the result
            this.cacheAnalytics(userId, analytics);

            return analytics;
        } catch (error) {
            console.error('Failed to fetch user analytics:', error);
            throw new Error(`Failed to fetch analytics data: ${error.message || error}`);
        }
    }

    /**
     * Get cached analytics if available and not expired
     */
    private getCachedAnalytics(userId: number): UserAnalytics | null {
        const expiry = this.cacheExpiry.get(userId);
        if (expiry && Date.now() < expiry) {
            return this.cache.get(userId) || null;
        }
        return null;
    }

    /**
     * Cache analytics data with expiry
     */
    private cacheAnalytics(userId: number, analytics: UserAnalytics): void {
        this.cache.set(userId, analytics);
        this.cacheExpiry.set(userId, Date.now() + this.CACHE_DURATION);
    }

    /**
     * Clear cache for a specific user
     */
    clearUserCache(userId: number): void {
        this.cache.delete(userId);
        this.cacheExpiry.delete(userId);
    }

    /**
     * Clear all cached data
     */
    clearAllCache(): void {
        this.cache.clear();
        this.cacheExpiry.clear();
    }

    /**
     * Format win rate for display
     */
    formatWinRate(winRate: number): string {
        return `${winRate.toFixed(1)}%`;
    }

    /**
     * Format play time for display
     */
    formatPlayTime(minutes: number): string {
        if (minutes < 60) {
            return `${minutes}m`;
        }
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }

    /**
     * Get performance trend direction
     */
    getPerformanceTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
        const diff = current - previous;
        if (Math.abs(diff) < 0.1) return 'stable';
        return diff > 0 ? 'up' : 'down';
    }

    /**
     * Calculate performance grade based on win rate
     */
    getPerformanceGrade(winRate: number): { grade: string; color: string } {
        if (winRate >= 80) return { grade: 'A+', color: 'text-emerald-400' };
        if (winRate >= 70) return { grade: 'A', color: 'text-emerald-400' };
        if (winRate >= 60) return { grade: 'B+', color: 'text-cyan-400' };
        if (winRate >= 50) return { grade: 'B', color: 'text-cyan-400' };
        if (winRate >= 40) return { grade: 'C+', color: 'text-yellow-400' };
        if (winRate >= 30) return { grade: 'C', color: 'text-yellow-400' };
        if (winRate >= 20) return { grade: 'D', color: 'text-orange-400' };
        return { grade: 'F', color: 'text-red-400' };
    }

    /**
     * Get top opponents by matches played
     */
    getTopOpponents(opponentAnalysis: OpponentAnalysis[], limit: number = 5): OpponentAnalysis[] {
        return opponentAnalysis
            .sort((a, b) => b.matchesPlayed - a.matchesPlayed)
            .slice(0, limit);
    }

    /**
     * Get performance insights
     */
    getPerformanceInsights(analytics: UserAnalytics): string[] {
        const insights: string[] = [];
        const { overview, recentTrends, opponentAnalysis } = analytics;

        // Win rate insights
        if (overview.winRate >= 70) {
            insights.push("Excellent performance! You're dominating the competition.");
        } else if (overview.winRate >= 50) {
            insights.push("Good performance! You're holding your own in matches.");
        } else if (overview.winRate < 30) {
            insights.push("Keep practicing! Every match is a learning opportunity.");
        }

        // Recent trend insights
        const trend7Days = recentTrends.last7Days;
        const trend30Days = recentTrends.last30Days;
        
        if (trend7Days.winRate > trend30Days.winRate + 10) {
            insights.push("You're on fire lately! Your recent performance is much better.");
        } else if (trend7Days.winRate < trend30Days.winRate - 10) {
            insights.push("You might be in a slump. Take a break and come back refreshed.");
        }

        // Opponent insights
        if (opponentAnalysis.length > 0) {
            const topOpponent = opponentAnalysis[0];
            if (topOpponent.matchesPlayed >= 5) {
                if (topOpponent.winRate >= 70) {
                    insights.push(`You dominate against ${topOpponent.opponentName}!`);
                } else if (topOpponent.winRate <= 30) {
                    insights.push(`${topOpponent.opponentName} seems to be your nemesis.`);
                }
            }
        }

        // Activity insights
        if (overview.totalMatches === 0) {
            insights.push("Start playing matches to see your analytics!");
        } else if (overview.totalMatches < 5) {
            insights.push("Play more matches to get better insights into your performance.");
        }

        return insights;
    }
}

// Export a singleton instance
export const analyticsService = new AnalyticsService();
