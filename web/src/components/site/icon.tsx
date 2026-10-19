import { Check, Clock, Gift, Heart, MapPin, Phone, ShieldCheck, Sparkles, Star, Truck, type LucideIcon } from "lucide-react";

export const ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  shield: { icon: ShieldCheck, label: "سپر (اعتماد)" },
  check: { icon: Check, label: "تیک" },
  clock: { icon: Clock, label: "ساعت (سرعت)" },
  star: { icon: Star, label: "ستاره" },
  truck: { icon: Truck, label: "ارسال" },
  heart: { icon: Heart, label: "قلب" },
  map: { icon: MapPin, label: "مکان" },
  phone: { icon: Phone, label: "تلفن" },
  gift: { icon: Gift, label: "هدیه" },
  sparkles: { icon: Sparkles, label: "درخشش" },
};

export function SiteIcon({ name, className }: { name: string | null | undefined; className?: string }) {
  const Icon = (name && ICONS[name]?.icon) || Sparkles;
  return <Icon className={className} aria-hidden />;
}
