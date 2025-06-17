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

import { MetricCard } from '@/components/primitives/Card';


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
  // Organize stats into primary and secondary for better visual hierarchy
  const primaryStats: StatItem[] = [
    {
      label: 'Subscribers',
      value: subscriberCount.toLocaleString(),
      icon: Users2,
    },
    {
      label: 'Followers',
      value: followerCount.toLocaleString(),
      icon: Heart,
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
  ];

  const secondaryStats: StatItem[] = [
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
      label: 'Published This Month',
      value: publishedThisMonth,
      icon: Calendar,
    },
    {
      label: 'Open Rate',
      value: openRate,
      icon: Mail,
    },
  ];

  const revenueStats: StatItem[] = [
    {
      label: 'Monthly Revenue',
      value: monthlyRevenue.toLocaleString(),
      icon: DollarSign,
      prefix: '$',
    },
    {
      label: 'Pending Payout',
      value: pendingPayout.toLocaleString(),
      icon: DollarSign,
      prefix: '$',
    },
  ];

  return (
    <div className="pattern-stack gap-section">
      {/* Primary metrics - most important KPIs */}
      <div className="dashboard-grid dashboard-grid-primary">
        {primaryStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <MetricCard
              key={stat.label}
              label={stat.label}
              value={`${stat.prefix || ''}${stat.value}${stat.suffix || ''}`}
              icon={<Icon className="h-5 w-5" />}
              className="micro-interaction card-lift"
            />
          );
        })}
      </div>

      {/* Secondary metrics - content and engagement */}
      <div className="dashboard-grid dashboard-grid-secondary">
        {secondaryStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <MetricCard
              key={stat.label}
              label={stat.label}
              value={`${stat.prefix || ''}${stat.value}${stat.suffix || ''}`}
              icon={<Icon className="h-4 w-4" />}
              className="micro-interaction card-lift"
            />
          );
        })}
      </div>

      {/* Revenue metrics - financial data */}
      {(monthlyRevenue > 0 || pendingPayout > 0) && (
        <div className="dashboard-grid dashboard-grid-revenue">
          {revenueStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <MetricCard
                key={stat.label}
                label={stat.label}
                value={`${stat.prefix || ''}${stat.value}${stat.suffix || ''}`}
                icon={<Icon className="h-4 w-4" />}
                className="micro-interaction card-lift"
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
