import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge-2";
import { Card, CardContent } from "@/components/ui/card";

/** Statistics Card 7 — the registry demo layout, with the cards passed as props. */
export type StatCard = {
  title: string;
  subtitle?: string;
  value: string;
  valueColor?: string;
  badge?: { color: string; icon: LucideIcon; iconColor?: string; text: string };
  subtext?: React.ReactNode;
};

export default function StatisticCard7({ cards }: { cards: StatCard[] }) {
  return (
    <div className="@container w-full grow">
      <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-border bg-background @2xl:grid-cols-2 @5xl:grid-cols-4">
        {cards.map((card, i) => (
          <Card key={i} className="rounded-none border-0 border-b border-border shadow-none last:border-b-0 @2xl:border-e @5xl:border-b-0">
            <CardContent className="flex h-full flex-col justify-between space-y-6 pt-6">
              <div className="space-y-0.5">
                <div className="text-lg font-semibold text-foreground">{card.title}</div>
                {card.subtitle && <div className="text-sm text-muted-foreground">{card.subtitle}</div>}
              </div>
              <div className="flex grow flex-1 flex-col justify-between gap-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-3xl font-bold tracking-tight ${card.valueColor ?? ""}`}>{card.value}</span>
                  {card.badge && (
                    <Badge className={`${card.badge.color} flex items-center gap-1 rounded-full px-2 py-1 text-sm font-medium shadow-none`}>
                      <card.badge.icon className={`h-3 w-3 ${card.badge.iconColor ?? ""}`} />
                      {card.badge.text}
                    </Badge>
                  )}
                </div>
                {card.subtext && <div className="text-sm">{card.subtext}</div>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
