/**
 * @lexical/code zieht prismjs-Grammatiken ein; die erwarten eine globale Variable `Prism`.
 * Im gebündelten Workers-Code existiert die sonst nicht → vor Lexical/Code setzen.
 */
import Prism from 'prismjs';

const g = globalThis as typeof globalThis & { Prism: typeof Prism };
g.Prism = Prism;

import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-css';

export {};
