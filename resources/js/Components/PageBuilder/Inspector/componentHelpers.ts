import { detectWidgetKind, WIDGET_LABELS, type WidgetKind } from '../lib/widgetKinds';
// Safe helpers to read/write GrapesJS component content, classes and attributes

// Safe helper to read component text/HTML content
export function getComponentContent(comp: any): string {
    if (!comp) return '';
    try {
        if (comp.view?.el?.innerHTML) {
            return comp.view.el.innerHTML;
        }
        if (typeof comp.get === 'function') {
            const content = comp.get('content');
            if (content) return content;
        }
        if (typeof comp.components === 'function') {
            const comps = comp.components();
            if (comps && typeof comps.map === 'function') {
                return comps
                    .map((c: any) =>
                        typeof c.toHTML === 'function'
                            ? c.toHTML()
                            : (typeof c.get === 'function' ? c.get('content') : '') || ''
                    )
                    .join('');
            }
        }
    } catch (err) {
        console.warn('Error reading component content', err);
    }
    return '';
}

// Safe helper to set component text/HTML content
export function setComponentContent(comp: any, value: string) {
    if (!comp) return;
    try {
        if (typeof comp.components === 'function') {
            comp.components(value);
        } else if (typeof comp.set === 'function') {
            comp.set('content', value);
        }
        if (comp.view?.el) {
            comp.view.el.innerHTML = value;
        }
    } catch (err) {
        console.warn('Error setting component content', err);
    }
}

// Safe helper to read component classes
export function getComponentClasses(comp: any): string {
    if (!comp || typeof comp.getClasses !== 'function') return '';
    try {
        const classes = comp.getClasses();
        if (Array.isArray(classes)) {
            return classes
                .map((c: any) => (typeof c === 'string' ? c : (c.get?.('name') || c.name || '')))
                .filter(Boolean)
                .join(' ');
        }
    } catch (err) {
        console.warn('Error reading component classes', err);
    }
    return '';
}

// Safe helper to read component attributes
export function getComponentAttribute(comp: any, attr: string): string {
    if (!comp || typeof comp.getAttributes !== 'function') return '';
    try {
        const attrs = comp.getAttributes();
        return attrs ? attrs[attr] || '' : '';
    } catch {
        return '';
    }
}

// Which widget the selected GrapesJS component is, and its user-facing label.
export function describeComponent(comp: any): { kind: WidgetKind; label: string } {
    if (!comp) return { kind: 'generic', label: WIDGET_LABELS.generic };
    const attributes: Record<string, string> = {};
    const raw = typeof comp.getAttributes === 'function' ? comp.getAttributes() : {};
    for (const [key, value] of Object.entries(raw || {})) attributes[key] = String(value ?? '');
    const classes: string[] =
        typeof comp.getClasses === 'function' ? comp.getClasses().map((c: any) => String(c?.name ?? c)) : [];
    const childCount = typeof comp.components === 'function' ? comp.components().length : 0;
    const kind = detectWidgetKind({ tagName: String(comp.get?.('tagName') || ''), classes, attributes, childCount });
    return { kind, label: WIDGET_LABELS[kind] };
}
