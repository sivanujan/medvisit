import React from 'react';
import PolicyLayout from '@/Components/Public/PolicyLayout';
import { refundPolicyData } from './data/refundPolicyData';
import { defaultPublicConfig, PublicConfig } from '@/Config/medvisitPublic';

interface Props {
    config?: PublicConfig;
}

export default function RefundPolicy({ config = defaultPublicConfig }: Props) {
    return <PolicyLayout data={refundPolicyData} config={config} />;
}
