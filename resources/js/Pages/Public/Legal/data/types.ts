import React from 'react';
import { BusinessDetails, PublicPlan } from '@/Config/medvisitPublic';

export interface PolicyRenderContext {
    business: BusinessDetails;
    plans: {
        basic: PublicPlan;
        pro: PublicPlan;
        advanced: PublicPlan;
        [key: string]: PublicPlan;
    };
}

export interface PolicySection {
    id: string;
    title: string;
    render: (context: PolicyRenderContext) => React.ReactNode;
}

export interface PolicyPageData {
    title: string;
    eyebrow: string;
    description: string;
    lastUpdated: string;
    readingTime: string;
    tokenMotif: string; // e.g., '01', 'REF', 'TRM', 'PRV', 'DSP'
    keyPoints: string[];
    sections: PolicySection[];
}
