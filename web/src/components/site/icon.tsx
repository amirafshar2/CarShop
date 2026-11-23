import { Check, Clock, Gift, Heart, MapPin, Phone, ShieldCheck, Sparkles, Star, Truck, type LucideIcon } from "lucide-react";

export const ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  shield: { icon: ShieldCheck, label: "Schild (Vertrauen)" },
  check: { icon: Check, label: "Haken" },
  clock: { icon: Clock, label: "Uhr (Tempo)" },
  star: { icon: Star, label: "Stern" },
  truck: { icon: Truck, label: "Versand" },
  heart: { icon: Heart, label: "Herz" },
  map: { icon: MapPin, label: "Ort" },
  phone: { icon: Phone, label: "Telefon" },
  gift: { icon: Gift, label: "Geschenk" },
  sparkles: { icon: Sparkles, label: "Glanz" },
};

export function SiteIcon({ name, className }: { name: string | null | undefined; className?: string }) {
  const Icon = (name && ICONS[name]?.icon) || Sparkles;
  return <Icon className={className} aria-hidden />;
}
