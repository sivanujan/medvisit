import { createContext, useContext } from 'react';
import type { SiteKit } from '../lib/kit';

// The resolved site kit (including unsaved Site Settings edits) for controls that link to or list kit values.
export const KitContext = createContext<SiteKit | null>(null);
export const useKit = (): SiteKit | null => useContext(KitContext);
