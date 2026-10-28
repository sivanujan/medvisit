import React from 'react';
import PolicyLayout from '@/Components/Public/PolicyLayout';
import { termsData } from './data/termsData';
import { defaultPublicConfig, PublicConfig } from '@/Config/medvisitPublic';

interface Props {
    config?: PublicConfig;
}

export default function Terms({ config = defaultPublicConfig }: Props) {
    return <PolicyLayout data={termsData} config={config} />;
}
