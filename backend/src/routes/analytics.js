import { matchQueryTemplate } from "../lib/prismaQueryTemplates.js";

export default async function (fastify, opts) {
    // All routes in this file require authentication
    fastify.addHook('preHandler', fastify.session.authorizeParticipant);

    // ROUTE: Get user analytics and insights
    fastify.get('/user/:userId', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    userId: { type: 'integer' }
                },
                required: ['userId']
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        overview: {
                            type: 'object',
                            properties: {
                                totalMatches: { type: 'integer' },
                                wins: { type: 'integer' },
                                losses: { type: 'integer' },
                                winRate: { type: 'number' },
                                averageScore: { type: 'number' },
                                bestScore: { type: 'integer' },
                                totalPlayTime: { type: 'integer' } // in minutes
                            }
                        },
                        performanceOverTime: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    date: { type: 'string' },
                                    wins: { type: 'integer' },
                                    losses: { type: 'integer' },
                                    winRate: { type: 'number' }
                                }
                            }
                        },
                        scoreDistribution: {
                            type: 'object',
                            properties: {
                                playerOneScores: { type: 'array', items: { type: 'integer' } },
                                playerTwoScores: { type: 'array', items: { type: 'integer' } }
                            }
                        },
                        opponentAnalysis: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    opponentId: { type: 'integer' },
                                    opponentName: { type: 'string' },
                                    matchesPlayed: { type: 'integer' },
                                    wins: { type: 'integer' },
                                    losses: { type: 'integer' },
                                    winRate: { type: 'number' }
                                }
                            }
                        },
                        tournamentStats: {
                            type: 'object',
                            properties: {
                                tournamentsParticipated: { type: 'integer' },
                                tournamentsWon: { type: 'integer' },
                                averageTournamentPosition: { type: 'number' }
                            }
                        },
                        recentTrends: {
                            type: 'object',
                            properties: {
                                last7Days: {
                                    type: 'object',
                                    properties: {
                                        matches: { type: 'integer' },
                                        wins: { type: 'integer' },
                                        losses: { type: 'integer' },
                                        winRate: { type: 'number' }
                                    }
                                },
                                last30Days: {
                                    type: 'object',
                                    properties: {
                                        matches: { type: 'integer' },
                                        wins: { type: 'integer' },
                                        losses: { type: 'integer' },
                                        winRate: { type: 'number' }
                                    }
                                }
                            }
                        }
                    }
                },
                404: { $ref: 'httpError#' },
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const userId = parseInt(request.params.userId);
            const currentUser = request.user;

            // Debug logging
            fastify.log.info({ currentUser, userId }, 'Analytics request debug');

            // Check if user is authenticated
            if (!currentUser || !currentUser.id) {
                throw fastify.httpErrors.unauthorized('User not properly authenticated.');
            }

            // Verify user can only view their own analytics
            if (currentUser.id !== userId) {
                throw fastify.httpErrors.forbidden('You can only view your own analytics.');
            }

            // Get all matches for the user
            const userMatches = await fastify.prisma.match.findMany({
                where: {
                    OR: [
                        { playerOneId: userId },
                        { playerTwoId: userId }
                    ],
                    winnerId: { not: null } // Only completed matches
                },
                ...matchQueryTemplate,
                orderBy: { playedAt: 'asc' }
            });

            if (userMatches.length === 0) {
                return {
                    overview: {
                        totalMatches: 0,
                        wins: 0,
                        losses: 0,
                        winRate: 0,
                        averageScore: 0,
                        bestScore: 0,
                        totalPlayTime: 0
                    },
                    performanceOverTime: [],
                    scoreDistribution: { playerOneScores: [], playerTwoScores: [] },
                    opponentAnalysis: [],
                    tournamentStats: {
                        tournamentsParticipated: 0,
                        tournamentsWon: 0,
                        averageTournamentPosition: 0
                    },
                    recentTrends: {
                        last7Days: { matches: 0, wins: 0, losses: 0, winRate: 0 },
                        last30Days: { matches: 0, wins: 0, losses: 0, winRate: 0 }
                    }
                };
            }

            // Calculate overview stats
            const wins = userMatches.filter(m => m.winnerId === userId).length;
            const losses = userMatches.length - wins;
            const winRate = userMatches.length > 0 ? (wins / userMatches.length) * 100 : 0;

            // Calculate score statistics
            const userScores = userMatches.map(match => {
                return match.playerOneId === userId ? match.playerOneScore : match.playerTwoScore;
            });
            const averageScore = userScores.length > 0 ? userScores.reduce((a, b) => a + b, 0) / userScores.length : 0;
            const bestScore = userScores.length > 0 ? Math.max(...userScores) : 0;

            // Calculate performance over time (daily aggregation)
            const performanceOverTime = calculatePerformanceOverTime(userMatches, userId);

            // Calculate score distribution
            const scoreDistribution = {
                playerOneScores: userMatches.filter(m => m.playerOneId === userId).map(m => m.playerOneScore),
                playerTwoScores: userMatches.filter(m => m.playerTwoId === userId).map(m => m.playerTwoScore)
            };

            // Calculate opponent analysis
            const opponentAnalysis = calculateOpponentAnalysis(userMatches, userId);

            // Calculate tournament stats
            const tournamentStats = await calculateTournamentStats(fastify.prisma, userId);

            // Calculate recent trends
            const recentTrends = calculateRecentTrends(userMatches, userId);

            return {
                overview: {
                    totalMatches: userMatches.length,
                    wins,
                    losses,
                    winRate: Math.round(winRate * 100) / 100,
                    averageScore: Math.round(averageScore * 100) / 100,
                    bestScore,
                    totalPlayTime: userMatches.length * 5 // Assuming 5 minutes per match
                },
                performanceOverTime,
                scoreDistribution,
                opponentAnalysis,
                tournamentStats,
                recentTrends
            };

        } catch (error) {
            fastify.log.error(error, `Failed to fetch analytics for user ${request.params.userId}`);
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while fetching analytics.');
        }
    });
}

// Helper function to calculate performance over time
function calculatePerformanceOverTime(matches, userId) {
    const dailyStats = new Map();
    
    matches.forEach(match => {
        const date = new Date(match.playedAt).toISOString().split('T')[0];
        if (!dailyStats.has(date)) {
            dailyStats.set(date, { wins: 0, losses: 0 });
        }
        
        const stats = dailyStats.get(date);
        if (match.winnerId === userId) {
            stats.wins++;
        } else {
            stats.losses++;
        }
    });

    return Array.from(dailyStats.entries()).map(([date, stats]) => ({
        date,
        wins: stats.wins,
        losses: stats.losses,
        winRate: stats.wins + stats.losses > 0 ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100 * 100) / 100 : 0
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Helper function to calculate opponent analysis
function calculateOpponentAnalysis(matches, userId) {
    const opponentStats = new Map();
    
    matches.forEach(match => {
        const opponentId = match.playerOneId === userId ? match.playerTwoId : match.playerOneId;
        const opponentName = match.playerOneId === userId ? match.playerTwo.displayName : match.playerOne.displayName;
        
        if (!opponentStats.has(opponentId)) {
            opponentStats.set(opponentId, {
                opponentId,
                opponentName,
                matchesPlayed: 0,
                wins: 0,
                losses: 0
            });
        }
        
        const stats = opponentStats.get(opponentId);
        stats.matchesPlayed++;
        
        if (match.winnerId === userId) {
            stats.wins++;
        } else {
            stats.losses++;
        }
    });

    return Array.from(opponentStats.values()).map(stats => ({
        ...stats,
        winRate: stats.matchesPlayed > 0 ? Math.round((stats.wins / stats.matchesPlayed) * 100 * 100) / 100 : 0
    })).sort((a, b) => b.matchesPlayed - a.matchesPlayed);
}

// Helper function to calculate tournament stats
async function calculateTournamentStats(prisma, userId) {
    const tournamentParticipations = await prisma.tournamentParticipant.findMany({
        where: { userId },
        include: {
            tournament: {
                select: {
                    id: true,
                    status: true,
                    winnerId: true
                }
            }
        }
    });

    const tournamentsParticipated = tournamentParticipations.length;
    const tournamentsWon = tournamentParticipations.filter(tp => 
        tp.tournament.status === 'COMPLETED' && tp.tournament.winnerId === userId
    ).length;

    return {
        tournamentsParticipated,
        tournamentsWon,
        averageTournamentPosition: tournamentsParticipated > 0 ? 2.5 : 0 // Simplified calculation
    };
}

// Helper function to calculate recent trends
function calculateRecentTrends(matches, userId) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const last7DaysMatches = matches.filter(m => new Date(m.playedAt) >= sevenDaysAgo);
    const last30DaysMatches = matches.filter(m => new Date(m.playedAt) >= thirtyDaysAgo);

    const calculateTrend = (matchList) => {
        const wins = matchList.filter(m => m.winnerId === userId).length;
        const losses = matchList.length - wins;
        return {
            matches: matchList.length,
            wins,
            losses,
            winRate: matchList.length > 0 ? Math.round((wins / matchList.length) * 100 * 100) / 100 : 0
        };
    };

    return {
        last7Days: calculateTrend(last7DaysMatches),
        last30Days: calculateTrend(last30DaysMatches)
    };
}
