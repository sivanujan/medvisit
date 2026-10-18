export type Device = 'desktop' | 'tablet' | 'mobile';

const CHAIN: Record<Device, Device[]> = {
    mobile: ['mobile', 'tablet', 'desktop'],
    tablet: ['tablet', 'desktop'],
    desktop: ['desktop'],
};

export function resolveResponsive<T>(
    values: Partial<Record<Device, T>>,
    device: Device,
): { value: T | undefined; inheritedFrom: Device | null } {
    for (const d of CHAIN[device]) {
        const v = values[d];
        if (v !== undefined) {
            return { value: v, inheritedFrom: d === device ? null : d };
        }
    }
    return { value: undefined, inheritedFrom: null };
}
