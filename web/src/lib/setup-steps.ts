import type { AdminSite } from "@/lib/admin-site";

export type StepKey = "type" | "brand" | "look" | "contact" | "home" | "items" | "services" | "publish";

export type StepInfo = { key: StepKey; title: string; why: string; done: (s: AdminSite) => boolean; optional?: boolean };

/** The assistant's steps, in order. `done` looks at real data, so the checklist is right even after edits elsewhere. */
export function setupSteps(s: AdminSite | null): StepInfo[] {
  const L = s?.content.labels;
  const has = (k: string) => !!s?.completedSteps.includes(k);
  return [
    { key: "type", title: "Unternehmensart", why: "Bereiche, Felder und Menü werden passend zur Unternehmensart eingerichtet.", done: () => has("type") },
    { key: "brand", title: "Name und Logo", why: "Ihr Name erscheint oben auf der Website, im Browser-Tab und bei Google.", done: (x) => x.progress.hasName },
    { key: "look", title: "Farbe und Aussehen", why: "Die Hauptfarbe sitzt auf Buttons und Links; stimmen Sie sie mit Ihrem Logo ab.", done: () => has("look") },
    { key: "contact", title: "Kontaktwege", why: "Kunden sollen mit einem Klick anrufen oder schreiben können.", done: (x) => x.progress.hasContact },
    { key: "home", title: "Startseite", why: "Das Erste, was Besucher sehen: eine klare Überschrift und ein gutes Bild.", done: (x) => x.progress.hasHero && has("home") },
    { key: "items", title: `${L?.itemPlural ?? "Einträge"} anlegen`, why: `Legen Sie mindestens einen Eintrag an, damit die Seite „${L?.itemPlural ?? "Einträge"}“ nicht leer ist.`, done: (x) => x.progress.listings > 0 },
    { key: "services", title: "Leistungen und Preise", why: "Optional: eine Liste der Leistungen mit Preisen, für Kunden, die nach Preisen suchen.", done: (x) => x.progress.services > 0 || has("services"), optional: true },
    { key: "publish", title: "Website veröffentlichen", why: "Solange Sie nicht veröffentlichen, sehen Besucher die Seite „Bald für Sie da“.", done: (x) => x.isPublished },
  ];
}
