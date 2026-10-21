import React from 'react';
import { usePage } from '@inertiajs/react';
import { defaultPublicConfig } from '@/Config/medvisitPublic';
import LegalFooter from '@/Components/Public/LegalFooter';
import { PageProps } from '@/types';
import LandingNav from './LandingNav';
import HeroSection from './HeroSection';
import WaitingRoomStory from './WaitingRoomStory';
import HowItWorks from './HowItWorks';
import FeatureBento from './FeatureBento';
import SriLankaStrip from './SriLankaStrip';
import PricingPreview from './PricingPreview';
import LandingFaq from './LandingFaq';
import FinalCta from './FinalCta';
import './landing.css';

interface Props {
    canLogin?: boolean;
    canRegister?: boolean;
}

/** The central-domain marketing page (medvisit.lk). */
export default function LandingPage({ canLogin = true, canRegister = false }: Props) {
    const { props } = usePage<PageProps>();
    const config = props.publicConfig || defaultPublicConfig;
    const user = props.auth?.user;

    const getStartedHref = user ? route('dashboard') : canRegister ? route('register') : route('login');

    let host = 'medvisit.lk';
    try {
        host = new URL(config.business.website).host || host;
    } catch {
        // keep the default host
    }

    return (
        <div className="lp-root min-h-screen antialiased selection:bg-primary-100 selection:text-primary-800">
            <a
                href="#lp-main"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-700"
            >
                Skip to content
            </a>
            <LandingNav user={user} canLogin={canLogin} canRegister={canRegister} />

            <main id="lp-main" className="overflow-x-clip">
                <HeroSection getStartedHref={getStartedHref} />
                <WaitingRoomStory />
                <HowItWorks />
                <FeatureBento host={host} />
                <SriLankaStrip />
                <PricingPreview config={config} />
                <LandingFaq />
                <FinalCta getStartedHref={getStartedHref} />
            </main>

            <LegalFooter className="mt-20" />
        </div>
    );
}
