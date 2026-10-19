import type { Component, DoctorItem, Editor, SessionItem } from '../../types';

// Live clinic data used to regenerate the MedVisit dynamic widget snapshots.
export interface ClinicData {
    doctors: DoctorItem[];
    sessions: SessionItem[];
}

export interface ContentPanelProps {
    clinicData?: ClinicData;
    editor: Editor;
    component: Component;
    setIsDirty: (dirty: boolean) => void;
    onOpenMedia: (currentValue: string, onPick?: (url: string) => void) => void;
    // Switches the inspector to the Style tab (e.g. Container "Layout settings").
    onOpenStyle?: () => void;
}
