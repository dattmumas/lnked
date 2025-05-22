import { Card, CardContent } from '@/components/ui/card';
import {
  Users2,
  FileText,
  BookOpen,
  DollarSign,
  TrendingUp,
  Eye,
  Heart,
  Mail,
  Calendar,
  type LucideIcon,
} from 'lucide-react';

interface StatItem {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  prefix?: string;
  suffix?: string;
}

interface StatsRowProps {
  subscriberCount?: number;
  followerCount?: number;
  totalPosts?: number;
  collectiveCount?: number;
  totalViews?: number;
  totalLikes?: number;
  monthlyRevenue?: number;
  pendingPayout?: number;
  openRate?: string;
  publishedThisMonth?: number;
}

export default function StatsRow({
  subscriberCount = 0,
  followerCount = 0,
  totalPosts = 0,
  collectiveCount = 0,
  totalViews = 0,
  totalLikes = 0,
  monthlyRevenue = 0,
  pendingPayout = 0,
  openRate = '0%',
  publishedThisMonth = 0,
}: StatsRowProps) {
  const stats: StatItem[] = [
    {
      label: 'Subscribers',
      value: subscriberCount,
      icon: Users2,
    },
    {
      label: 'Followers',
      value: followerCount,
      icon: Heart,
    },
    {
      label: 'Posts',
      value: totalPosts,
      icon: FileText,
    },
    {
      label: 'Collectives',
      value: collectiveCount,
      icon: BookOpen,
    },
    {
      label: 'Total Views',
      value: totalViews.toLocaleString(),
      icon: Eye,
    },
    {
      label: 'Total Likes',
      value: totalLikes.toLocaleString(),
      icon: TrendingUp,
    },
    {
      label: 'Monthly Revenue',
      value: monthlyRevenue,
      icon: DollarSign,
      prefix: '$',
    },
    {
      label: 'Pending Payout',
      value: pendingPayout,
      icon: DollarSign,
      prefix: '$',
    },
    {
      label: 'Open Rate',
      value: openRate,
      icon: Mail,
    },
    {
      label: 'Published This Month',
      value: publishedThisMonth,
      icon: Calendar,
    },
  ];

  return (
    <Card className="w-full border-border/50">
      <CardContent className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center text-center space-y-1 min-w-0"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/10">
                <stat.icon className="h-4 w-4 text-accent-foreground/70" />
              </div>
              <div className="text-lg font-semibold tabular-nums">
                {stat.prefix}
                {stat.value}
                {stat.suffix}
              </div>
              <div className="text-xs text-muted-foreground font-medium leading-tight">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
