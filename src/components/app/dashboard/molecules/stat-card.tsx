import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: number; // percentage e.g. 12 => +12%
  className?: string;
}

export default function StatCard({
  label,
  value,
  icon = <TrendingUp className="h-4 w-4" />,
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border shadow-sm bg-card text-card-foreground p-4 flex flex-col gap-2",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        {icon}
      </div>
      <div className="text-3xl font-bold font-serif">{value}</div>
      {typeof trend === "number" && (
        <span
          className={cn(
            "text-xs font-medium",
            trend >= 0 ? "text-primary" : "text-destructive"
          )}
        >
          {trend >= 0 ? "+" : ""}
          {trend}% from last week
        </span>
      )}
    </div>
  );
}
