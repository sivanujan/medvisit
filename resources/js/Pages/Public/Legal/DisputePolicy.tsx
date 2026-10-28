import React from 'react';
import PolicyLayout from '@/Components/Public/PolicyLayout';
import { disputePolicyData } from './data/disputePolicyData';
import { defaultPublicConfig, PublicConfig } from '@/Config/medvisitPublic';

interface Props {
    config?: PublicConfig;
}

export default function DisputePolicy({ config = defaultPublicConfig }: Props) {
    return <PolicyLayout data={disputePolicyData} config={config} />;
}
