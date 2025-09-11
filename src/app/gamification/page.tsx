'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Trophy, Star, Medal, Crown, Zap, Target, Users, Gift, Calendar, TrendingUp, Award, Lock } from 'lucide-react'

export default function Gamification() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('achievements')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const playerStats = {
    level: 12,
    xp: 2450,
    xpToNext: 550,
    totalXp: 3000,
    rank: 'Scholar',
    globalRank: 156,
    streak: 12,
    totalAchievements: 18,
    points: 15420,
  }

  const achievements = [
    {
      id: 1,
      title: 'First Steps',
      description: 'Complete your first assignment',
      icon: Target,
      rarity: 'common',
      xp: 50,
      unlocked: true,
      unlockedAt: '2024-01-10',
      progress: 100,
    },
    {
      id: 2,
      title: 'Study Streak',
      description: 'Study for 7 consecutive days',
      icon: Zap,
      rarity: 'uncommon',
      xp: 150,
      unlocked: true,
      unlockedAt: '2024-01-12',
      progress: 100,
    },
    {
      id: 3,
      title: 'Perfect Score',
      description: 'Get 100% on an assignment',
      icon: Star,
      rarity: 'rare',
      xp: 200,
      unlocked: true,
      unlockedAt: '2024-01-14',
      progress: 100,
    },
    {
      id: 4,
      title: 'Course Master',
      description: 'Complete a full course with 90%+ average',
      icon: Crown,
      rarity: 'epic',
      xp: 500,
      unlocked: false,
      progress: 78,
    },
    {
      id: 5,
      title: 'Speed Learner',
      description: 'Complete 10 assignments in one week',
      icon: TrendingUp,
      rarity: 'rare',
      xp: 300,
      unlocked: false,
      progress: 60,
    },
    {
      id: 6,
      title: 'Collaboration Champion',
      description: 'Join 5 study groups',
      icon: Users,
      rarity: 'uncommon',
      xp: 150,
      unlocked: false,
      progress: 40,
    },
    {
      id: 7,
      title: 'Knowledge Seeker',
      description: 'Study for 100 total hours',
      icon: Award,
      rarity: 'legendary',
      xp: 1000,
      unlocked: false,
      progress: 42,
    },
  ]

  const leaderboard = [
    {
      rank: 1,
      name: 'Sarah Chen',
      level: 18,
      xp: 8750,
      points: 28450,
      avatar: 'SC',
      badge: 'Genius',
      isCurrentUser: false,
    },
    {
      rank: 2,
      name: 'Michael Rodriguez',
      level: 16,
      xp: 7200,
      points: 24680,
      avatar: 'MR',
      badge: 'Master',
      isCurrentUser: false,
    },
    {
      rank: 3,
      name: 'Emily Wang',
      level: 15,
      xp: 6800,
      points: 22150,
      avatar: 'EW',
      badge: 'Expert',
      isCurrentUser: false,
    },
    {
      rank: 4,
      name: 'David Kim',
      level: 14,
      xp: 5950,
      points: 19870,
      avatar: 'DK',
      badge: 'Scholar',
      isCurrentUser: false,
    },
    {
      rank: 5,
      name: 'Alex Johnson',
      level: 12,
      xp: 4200,
      points: 15420,
      avatar: 'AJ',
      badge: 'Scholar',
      isCurrentUser: true,
    },
  ]

  const rewards = [
    {
      id: 1,
      title: 'Extra Time',
      description: '+30 minutes on next exam',
      cost: 500,
      type: 'academic',
      icon: Calendar,
      available: true,
      owned: false,
    },
    {
      id: 2,
      title: 'Skip Assignment',
      description: 'Skip one low-weight assignment',
      cost: 1000,
      type: 'academic',
      icon: Target,
      available: true,
      owned: false,
    },
    {
      id: 3,
      title: 'Study Buddy',
      description: 'Get matched with a top performer',
      cost: 750,
      type: 'social',
      icon: Users,
      available: true,
      owned: true,
    },
    {
      id: 4,
      title: 'Custom Avatar',
      description: 'Unlock premium avatar options',
      cost: 300,
      type: 'cosmetic',
      icon: Star,
      available: true,
      owned: false,
    },
    {
      id: 5,
      title: 'Priority Support',
      description: '24/7 tutoring access for 1 week',
      cost: 2000,
      type: 'premium',
      icon: Crown,
      available: false,
      owned: false,
    },
  ]

  const tabs = [
    { id: 'achievements', label: 'Achievements', icon: Trophy },
    { id: 'leaderboard', label: 'Leaderboard', icon: Medal },
    { id: 'rewards', label: 'Rewards', icon: Gift },
  ]

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'border-gray-300 bg-gray-50'
      case 'uncommon':
        return 'border-green-300 bg-green-50'
      case 'rare':
        return 'border-blue-300 bg-blue-50'
      case 'epic':
        return 'border-purple-300 bg-purple-50'
      case 'legendary':
        return 'border-yellow-300 bg-yellow-50'
      default:
        return 'border-gray-300 bg-gray-50'
    }
  }

  const getRarityTextColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'text-gray-600'
      case 'uncommon':
        return 'text-green-600'
      case 'rare':
        return 'text-blue-600'
      case 'epic':
        return 'text-purple-600'
      case 'legendary':
        return 'text-yellow-600'
      default:
        return 'text-gray-600'
    }
  }

  const getRewardTypeColor = (type: string) => {
    switch (type) {
      case 'academic':
        return 'bg-blue-100 text-blue-700'
      case 'social':
        return 'bg-green-100 text-green-700'
      case 'cosmetic':
        return 'bg-purple-100 text-purple-700'
      case 'premium':
        return 'bg-yellow-100 text-yellow-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Player Stats */}
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-lg p-6 mb-8 text-primary-foreground">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-4 md:mb-0">
              <h1 className="text-3xl font-bold mb-2">Gamification</h1>
              <p className="opacity-90">
                Level up your learning journey
              </p>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{playerStats.level}</div>
                <div className="text-sm opacity-75">Level</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{playerStats.points.toLocaleString()}</div>
                <div className="text-sm opacity-75">Points</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">#{playerStats.globalRank}</div>
                <div className="text-sm opacity-75">Global Rank</div>
              </div>
            </div>
          </div>
          
          {/* XP Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">{playerStats.rank}</span>
              <span className="text-sm">
                {playerStats.xp} / {playerStats.totalXp} XP
              </span>
            </div>
            <div className="w-full bg-primary-foreground/20 rounded-full h-3">
              <div
                className="bg-primary-foreground h-3 rounded-full transition-all duration-300"
                style={{ width: `${(playerStats.xp / playerStats.totalXp) * 100}%` }}
              ></div>
            </div>
            <p className="text-sm opacity-75 mt-1">
              {playerStats.xpToNext} XP to next level
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8 bg-muted p-1 rounded-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Achievements Tab */}
        {activeTab === 'achievements' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {achievements.map((achievement) => {
                const Icon = achievement.icon
                return (
                  <div
                    key={achievement.id}
                    className={`relative rounded-lg border-2 p-6 transition-all duration-200 ${
                      achievement.unlocked
                        ? `${getRarityColor(achievement.rarity)} hover:shadow-lg cursor-pointer`
                        : 'border-muted bg-muted/50 opacity-75'
                    }`}
                  >
                    {!achievement.unlocked && (
                      <div className="absolute top-4 right-4">
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-lg ${
                        achievement.unlocked ? 'bg-white shadow-sm' : 'bg-muted'
                      }`}>
                        <Icon className={`h-6 w-6 ${
                          achievement.unlocked ? getRarityTextColor(achievement.rarity) : 'text-muted-foreground'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-semibold mb-1 ${
                          achievement.unlocked ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {achievement.title}
                        </h3>
                        <p className={`text-sm mb-3 ${
                          achievement.unlocked ? 'text-muted-foreground' : 'text-muted-foreground/75'
                        }`}>
                          {achievement.description}
                        </p>
                        
                        {achievement.unlocked ? (
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                              getRarityTextColor(achievement.rarity)
                            } bg-white`}>
                              {achievement.rarity}
                            </span>
                            <span className="text-sm font-medium text-foreground">
                              +{achievement.xp} XP
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="text-muted-foreground">{achievement.progress}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${achievement.progress}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {achievement.unlocked && achievement.unlockedAt && (
                      <div className="mt-4 pt-4 border-t border-white/50">
                        <p className="text-xs text-muted-foreground">
                          Unlocked on {new Date(achievement.unlockedAt).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="bg-card rounded-lg border border-border card-shadow">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-card-foreground">Global Leaderboard</h2>
              <p className="text-muted-foreground mt-1">Top performers this semester</p>
            </div>
            <div className="divide-y divide-border">
              {leaderboard.map((player) => (
                <div
                  key={player.rank}
                  className={`p-6 flex items-center justify-between transition-colors ${
                    player.isCurrentUser ? 'bg-primary/5 border-l-4 border-l-primary' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                      player.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                      player.rank === 2 ? 'bg-gray-100 text-gray-700' :
                      player.rank === 3 ? 'bg-orange-100 text-orange-700' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {player.rank <= 3 ? (
                        player.rank === 1 ? <Crown className="h-4 w-4" /> :
                        player.rank === 2 ? <Medal className="h-4 w-4" /> :
                        <Trophy className="h-4 w-4" />
                      ) : (
                        player.rank
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-medium">
                        {player.avatar}
                      </div>
                      <div>
                        <h3 className={`font-medium ${
                          player.isCurrentUser ? 'text-primary' : 'text-card-foreground'
                        }`}>
                          {player.name} {player.isCurrentUser && '(You)'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Level {player.level} • {player.badge}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-semibold text-card-foreground">
                      {player.points.toLocaleString()} pts
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {player.xp.toLocaleString()} XP
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rewards Tab */}
        {activeTab === 'rewards' && (
          <div>
            <div className="mb-6 bg-card rounded-lg border border-border card-shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-card-foreground">Your Points</h2>
                  <p className="text-muted-foreground">Earn points by completing assignments and achievements</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary">{playerStats.points.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Available Points</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rewards.map((reward) => {
                const Icon = reward.icon
                const canAfford = playerStats.points >= reward.cost
                return (
                  <div
                    key={reward.id}
                    className={`bg-card rounded-lg border border-border card-shadow p-6 transition-all duration-200 ${
                      reward.available && canAfford ? 'hover:shadow-lg cursor-pointer' : ''
                    } ${
                      !reward.available ? 'opacity-50' : ''
                    } ${
                      reward.owned ? 'ring-2 ring-success-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-2 bg-primary-100 rounded-lg">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRewardTypeColor(reward.type)}`}>
                          {reward.type}
                        </span>
                        {reward.owned && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-success-100 text-success-700">
                            Owned
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <h3 className="font-semibold text-card-foreground mb-2">{reward.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{reward.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-primary">
                        {reward.cost.toLocaleString()} pts
                      </span>
                      <button
                        disabled={!reward.available || !canAfford || reward.owned}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          reward.owned
                            ? 'bg-success-100 text-success-700 cursor-default'
                            : !reward.available || !canAfford
                            ? 'bg-muted text-muted-foreground cursor-not-allowed'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                        }`}
                      >
                        {reward.owned ? 'Owned' : !reward.available ? 'Locked' : !canAfford ? 'Not enough points' : 'Redeem'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}