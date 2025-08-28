"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Trophy, Award, Lock, CheckCircle } from "lucide-react"
import type { Badge as BadgeType, Achievement } from "@/lib/gamification-service"

interface BadgesAchievementsProps {
  badges: BadgeType[]
  achievements: Achievement[]
}

const BADGE_ICONS = {
  uploader: "📤",
  claimer: "🎫",
  social: "👥",
  milestone: "🏆",
}

const ACHIEVEMENT_ICONS = {
  points: "💰",
  activity: "⚡",
  social: "🤝",
  special: "⭐",
}

export function BadgesAchievements({ badges, achievements }: BadgesAchievementsProps) {
  const unlockedBadges = badges.filter((badge) => badge.unlockedAt)
  const lockedBadges = badges.filter((badge) => !badge.unlockedAt)
  const unlockedAchievements = achievements.filter((achievement) => achievement.unlockedAt)
  const lockedAchievements = achievements.filter((achievement) => !achievement.unlockedAt)

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Badges Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Badges ({unlockedBadges.length}/{badges.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Unlocked Badges */}
            {unlockedBadges.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3 text-muted-foreground">Earned</h4>
                <div className="grid grid-cols-2 gap-3">
                  {unlockedBadges.map((badge) => (
                    <div
                      key={badge.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="text-2xl">{BADGE_ICONS[badge.category]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{badge.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{badge.description}</p>
                      </div>
                      <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Locked Badges */}
            {lockedBadges.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3 text-muted-foreground">Available</h4>
                <div className="grid grid-cols-1 gap-3">
                  {lockedBadges.slice(0, 3).map((badge) => (
                    <div
                      key={badge.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 opacity-75"
                    >
                      <div className="text-2xl grayscale">{BADGE_ICONS[badge.category]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{badge.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{badge.description}</p>
                        {badge.progress !== undefined && (
                          <div className="mt-2">
                            <Progress value={(badge.progress / badge.requirement) * 100} className="h-1" />
                            <p className="text-xs text-muted-foreground mt-1">
                              {badge.progress}/{badge.requirement}
                            </p>
                          </div>
                        )}
                      </div>
                      <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Achievements Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Achievements ({unlockedAchievements.length}/{achievements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Unlocked Achievements */}
            {unlockedAchievements.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3 text-muted-foreground">Completed</h4>
                <div className="space-y-3">
                  {unlockedAchievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="text-2xl">{ACHIEVEMENT_ICONS[achievement.category]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{achievement.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{achievement.description}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <Badge variant="secondary" className="text-xs">
                          +{achievement.points}
                        </Badge>
                        <CheckCircle className="h-4 w-4 text-primary mt-1 mx-auto" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Locked Achievements */}
            {lockedAchievements.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3 text-muted-foreground">In Progress</h4>
                <div className="space-y-3">
                  {lockedAchievements.slice(0, 3).map((achievement) => (
                    <div
                      key={achievement.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 opacity-75"
                    >
                      <div className="text-2xl grayscale">{ACHIEVEMENT_ICONS[achievement.category]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{achievement.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{achievement.description}</p>
                        {achievement.progress !== undefined && achievement.maxProgress && (
                          <div className="mt-2">
                            <Progress value={(achievement.progress / achievement.maxProgress) * 100} className="h-1" />
                            <p className="text-xs text-muted-foreground mt-1">
                              {achievement.progress}/{achievement.maxProgress}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <Badge variant="outline" className="text-xs">
                          +{achievement.points}
                        </Badge>
                        <Lock className="h-4 w-4 text-muted-foreground mt-1 mx-auto" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
