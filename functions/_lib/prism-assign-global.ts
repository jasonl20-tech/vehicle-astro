/**
 * Muss allein zuerst geladen werden, bevor irgendein `prismjs/components/*`-Modul importiert wird.
 * ESM führt sonst die Komponenten-Imports vor diesem Zuweisungs-Statement aus.
 */
import Prism from 'prismjs';

const g = globalThis as typeof globalThis & { Prism: typeof Prism };
g.Prism = Prism;

export {};
