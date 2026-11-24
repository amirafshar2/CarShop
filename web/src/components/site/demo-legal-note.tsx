"use client";

import { useEffect, useState } from "react";
import { getDemoInfo } from "@/lib/api";

/** Public demo only: the real legal notice and privacy policy live on the portfolio website. */
export default function DemoLegalNote() {
  const [demo, setDemo] = useState(false);
  useEffect(() => { void getDemoInfo().then((d) => setDemo(d.enabled && !d.requiresKey)); }, []);
  if (!demo) return null;
  return (
    <p data-testid="demo-legal" className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground">
      Demo-Projekt – fiktives Unternehmen, es werden keine persönlichen Daten erhoben ·{" "}
      <a href="https://amirrezaafshar.de/impressum" target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">Impressum</a> ·{" "}
      <a href="https://amirrezaafshar.de/datenschutz" target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">Datenschutz</a>
    </p>
  );
}
