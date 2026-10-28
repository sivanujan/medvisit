import React from 'react';
import PolicyLayout from '@/Components/Public/PolicyLayout';
import { privacyPolicyData } from './data/privacyPolicyData';
import { defaultPublicConfig, PublicConfig } from '@/Config/medvisitPublic';

interface Props {
    config?: PublicConfig;
}

export default function PrivacyPolicy({ config = defaultPublicConfig }: Props) {
    return <PolicyLayout data={privacyPolicyData} config={config} />;
}
