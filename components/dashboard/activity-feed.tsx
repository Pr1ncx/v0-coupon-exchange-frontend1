"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Activity, Upload, Download, Trophy, Award, Coins, Calendar } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { ActivityItem } from "@/lib/gamification-service"

interface ActivityFeedProps {
  activities: ActivityItem[]
  userName: string
  userAvatar?: string
}

const ACTIVITY_ICONS = {
  coupon_claimed: Download,
  coupon_uploaded: Upload,
  badge_earned: Award,
  achievement_unlocked: Trophy,
  points_earned: Coins,
}

const ACTIVITY_COLORS = {
  coupon_claimed: "text-chart-2",
  coupon_uploaded: "text-primary",
  badge_earned: "text-accent",
  achievement_unlocked: "text-chart-4",
  points_earned: "text-chart-1",
}

export function ActivityFeed({ activities, userName, userAvatar }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No recent activity</p>
            <p className="text-sm text-muted-foreground">
              Start claiming or uploading coupons to see your activity here
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {activities.map((activity) => {
              const IconComponent = ACTIVITY_ICONS[activity.type]
              const iconColor = ACTIVITY_COLORS[activity.type]

              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className={`p-2 rounded-full bg-background border ${iconColor}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={userAvatar || "/placeholder.svg"} />
                        <AvatarFallback className="text-xs">{userName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <p className="font-medium text-sm truncate">{activity.title}</p>
                      {activity.points && (
                        <Badge variant="secondary" className="text-xs">
                          +{activity.points}
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground mb-2">{activity.description}</p>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
