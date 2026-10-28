import { getMedicalSvg } from '@/Utils/medicalIcons';

export interface TemplateTenant {
    name: string;
    phone?: string | null;
    address?: string | null;
    logo_url?: string | null;
}

export interface PageTemplateItem {
    key: string;
    label: string;
    tagline: string;
    tier: 'free' | 'premium';
    price_lkr: string;
    price_cents: number;
    badge: string;
    category: string;
    accent_color: string;
}

export const PAGE_TEMPLATES: PageTemplateItem[] = [
    {
        key: 'serene',
        label: 'Serene Medical Center',
        tagline: 'Calm, airy elegance with floating cards and soft teal accents',
        tier: 'premium',
        price_lkr: 'Free Preview',
        price_cents: 0,
        badge: 'Under Dev',
        category: 'General & Wellness',
        accent_color: '#0E9E8F',
    },
    {
        key: 'specialist',
        label: 'Specialist Hospital Suite',
        tagline: 'Commanding dark hero with interactive doctor grid & chamber booking',
        tier: 'premium',
        price_lkr: 'Free Preview',
        price_cents: 0,
        badge: 'Under Dev',
        category: 'Hospital & Specialists',
        accent_color: '#7C3AED',
    },
    {
        key: 'family-care',
        label: 'Family Care & Pediatric',
        tagline: 'Friendly, community-first with warm honey accents & child health',
        tier: 'premium',
        price_lkr: 'Free Preview',
        price_cents: 0,
        badge: 'Under Dev',
        category: 'Family & Pediatrics',
        accent_color: '#D97706',
    },
    {
        key: 'heritage',
        label: 'Heritage Ayurvedic & Wellness',
        tagline: 'Botanical serenity with deep green and gold tones for holistic care',
        tier: 'premium',
        price_lkr: 'Free Preview',
        price_cents: 0,
        badge: 'Under Dev',
        category: 'Ayurveda & Holistic',
        accent_color: '#15803D',
    },
    {
        key: 'dental-eye',
        label: 'Dental & Vision Specialty',
        tagline: 'Crisp clinical precision with procedure comparison pricing',
        tier: 'premium',
        price_lkr: 'Free Preview',
        price_cents: 0,
        badge: 'Under Dev',
        category: 'Dental & Optical',
        accent_color: '#0284C7',
    },
    {
        key: 'modern-clinic',
        label: 'MedVisit Teal Standard',
        tagline: 'Standard clinical clarity & trusted medical tone',
        tier: 'free',
        price_lkr: 'Free',
        price_cents: 0,
        badge: 'Free Preset',
        category: 'General Clinic',
        accent_color: '#0E9E8F',
    },
    {
        key: 'specialist-center',
        label: 'Royal Specialist Classic',
        tagline: 'Chamber channeling and consultant directory',
        tier: 'free',
        price_lkr: 'Free',
        price_cents: 0,
        badge: 'Free Preset',
        category: 'Specialists',
        accent_color: '#7C3AED',
    },
    {
        key: 'family-practice',
        label: 'Emerald Family Health',
        tagline: 'Community primary care with vaccination and clinic hours',
        tier: 'free',
        price_lkr: 'Free',
        price_cents: 0,
        badge: 'Free Preset',
        category: 'Primary Care',
        accent_color: '#059669',
    },
];

export function getTemplateHtml(templateId: string, tenant: TemplateTenant): string {
    if (templateId === 'blank') {
        return '';
    }

    if (templateId === 'text-image') {
        return `
            <article style="max-width: 900px; margin: 40px auto; padding: 0 20px; font-family: ui-sans-serif, system-ui, sans-serif;">
                <header style="margin-bottom: 32px;">
                    <h1 style="font-size: 2.25rem; font-weight: 700; color: #0f172a; margin-bottom: 12px; line-height: 1.25;">Information &amp; Guidance</h1>
                    <p style="font-size: 1.1rem; color: #64748b; line-height: 1.6;">Essential details for patients and visitors.</p>
                </header>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 32px; align-items: start; margin-bottom: 32px;">
                    <div style="color: #334155; line-height: 1.7; font-size: 1rem;">
                        <p style="margin-bottom: 16px;">Welcome to our patient resources. We are dedicated to providing timely healthcare information and clear guidance for your visit.</p>
                        <p style="margin-bottom: 16px;">Please arrive 15 minutes before your scheduled appointment time to complete registration and vital checks at the front desk.</p>
                    </div>
                    <div style="background: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 16px; padding: 40px 20px; text-align: center; color: #64748b;">
                        <span style="font-size: 2rem; display: block; margin-bottom: 8px;">📷</span>
                        <p style="margin: 0; font-size: 0.9rem;">Add an illustrative photo or diagram in the visual builder.</p>
                    </div>
                </div>
            </article>
        `;
    }

    if (templateId === 'faq') {
        return `
            <section style="max-width: 800px; margin: 40px auto; padding: 0 20px; font-family: ui-sans-serif, system-ui, sans-serif;">
                <header style="text-align: center; margin-bottom: 36px;">
                    <h1 style="font-size: 2.25rem; font-weight: 700; color: #0f172a; margin-bottom: 12px;">Frequently Asked Questions</h1>
                    <p style="font-size: 1.05rem; color: #64748b;">Find answers to common questions about clinic appointments and services.</p>
                </header>
                <div data-mv-widget="faq" style="border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
                    <details style="padding: 18px 22px; border-bottom: 1px solid #e2e8f0; background: #ffffff;">
                        <summary style="font-weight: 600; color: #0f172a; cursor: pointer;">How do I book an appointment online?</summary>
                        <p style="margin: 10px 0 0 0; color: #64748b; font-size: 0.95rem; line-height: 1.6;">You can browse our doctors and upcoming sessions on the home page and reserve an online token in a few clicks.</p>
                    </details>
                    <details style="padding: 18px 22px; border-bottom: 1px solid #e2e8f0; background: #ffffff;">
                        <summary style="font-weight: 600; color: #0f172a; cursor: pointer;">What should I bring to my consultation?</summary>
                        <p style="margin: 10px 0 0 0; color: #64748b; font-size: 0.95rem; line-height: 1.6;">Please bring your National Identity Card (NIC) or passport, any previous medical records, and your current medications.</p>
                    </details>
                    <details style="padding: 18px 22px; background: #ffffff;">
                        <summary style="font-weight: 600; color: #0f172a; cursor: pointer;">Can I cancel or reschedule my token?</summary>
                        <p style="margin: 10px 0 0 0; color: #64748b; font-size: 0.95rem; line-height: 1.6;">Yes, use the cancellation link in your SMS confirmation or contact the reception hotline before your scheduled session.</p>
                    </details>
                </div>
            </section>
        `;
    }

    if (templateId === 'serene') {
        return `
            <!-- Serene Medical Center Header -->
            <header style="background: #ffffff; border-bottom: 1px solid #e0f2fe; padding: 18px 24px; position: sticky; top: 0; z-index: 100;">
                <div style="max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        ${
                            tenant.logo_url
                                ? `<img src="${tenant.logo_url}" alt="${tenant.name}" style="height: 40px; border-radius: 10px;" />`
                                : `<div style="width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, #0E9E8F 0%, #14b8a6 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px; box-shadow: 0 4px 12px rgba(14, 158, 143, 0.25);">${tenant.name.charAt(0)}</div>`
                        }
                        <div>
                            <span style="font-size: 1.25rem; font-weight: 800; color: #0f172a; display: block; line-height: 1.2;">${tenant.name}</span>
                            <span style="font-size: 0.75rem; color: #0E9E8F; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;">Wellness &amp; Medical Center</span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 18px;">
                        <span style="color: #64748b; font-size: 0.85rem; font-weight: 600;">Desk: ${tenant.phone || '070 129 1688'}</span>
                        <a href="/book" style="background: #0E9E8F; color: #ffffff; padding: 12px 24px; border-radius: 12px; font-size: 0.9rem; font-weight: 700; text-decoration: none; box-shadow: 0 4px 14px rgba(14, 158, 143, 0.35);">
                            Reserve Token →
                        </a>
                    </div>
                </div>
            </header>

            <!-- Serene Hero Section -->
            <section class="medvisit-section" style="background: linear-gradient(180deg, #f0fdfa 0%, #ffffff 100%); padding: 90px 20px; text-align: center;">
                <div class="medvisit-container" style="max-width: 1000px; margin: 0 auto;">
                    <span style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 20px; background: #ccfbf1; color: #0f766e; border-radius: 9999px; font-size: 0.8rem; font-weight: 700; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(15, 118, 110, 0.1);">
                        🌿 Peaceful Atmosphere • Real-Time Waiting Room Queue
                    </span>
                    <h1 style="font-size: 3.5rem; font-weight: 800; color: #0f172a; line-height: 1.15; margin: 0 auto 24px auto; letter-spacing: -0.02em;">
                        Calm, Mindful Healthcare for You and Your Loved Ones
                    </h1>
                    <p style="font-size: 1.25rem; color: #475569; line-height: 1.7; max-width: 750px; margin: 0 auto 40px auto;">
                        Experience stress-free consultations with live token updates. Arrive at your exact appointment time without crowded waiting rooms.
                    </p>
                    <div style="display: flex; justify-content: center; gap: 16px; flex-wrap: wrap;">
                        <a href="/book" style="background: #0E9E8F; color: #ffffff; padding: 16px 40px; border-radius: 14px; font-size: 1.05rem; font-weight: 700; text-decoration: none; box-shadow: 0 8px 24px rgba(14, 158, 143, 0.35);">
                            Book Consultation Online
                        </a>
                        <a href="#services" style="background: #ffffff; color: #334155; border: 1px solid #cbd5e1; padding: 16px 32px; border-radius: 14px; font-size: 1.05rem; font-weight: 700; text-decoration: none; box-shadow: 0 2px 6px rgba(0,0,0,0.05);">
                            View Services
                        </a>
                    </div>
                </div>
            </section>

            <!-- Floating Highlights Bento -->
            <section class="medvisit-section" style="padding: 20px 20px 80px 20px; background: #ffffff;">
                <div class="medvisit-container" style="max-width: 1200px; margin: 0 auto;">
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;">
                        <div style="padding: 32px; border-radius: 24px; background: #f0fdfa; border: 1px solid #ccfbf1; box-shadow: 0 10px 30px rgba(14, 158, 143, 0.06);">
                            <div style="font-size: 2rem; margin-bottom: 12px;">⏱️</div>
                            <h3 style="font-size: 1.3rem; font-weight: 800; color: #0f172a; margin: 0 0 8px 0;">Zero Waiting Lounge Delay</h3>
                            <p style="color: #64748b; font-size: 0.95rem; line-height: 1.6; margin: 0;">Live SMS and mobile screen updates tell you exactly when your doctor begins consultation.</p>
                        </div>
                        <div style="padding: 32px; border-radius: 24px; background: #f8fafc; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(0,0,0,0.03);">
                            <div style="font-size: 2rem; margin-bottom: 12px;">🩺</div>
                            <h3 style="font-size: 1.3rem; font-weight: 800; color: #0f172a; margin: 0 0 8px 0;">SLMC Senior Specialists</h3>
                            <p style="color: #64748b; font-size: 0.95rem; line-height: 1.6; margin: 0;">Access certified physicians, pediatricians, cardiologists, and gynecologists under one roof.</p>
                        </div>
                        <div style="padding: 32px; border-radius: 24px; background: #f0fdfa; border: 1px solid #ccfbf1; box-shadow: 0 10px 30px rgba(14, 158, 143, 0.06);">
                            <div style="font-size: 2rem; margin-bottom: 12px;">💊</div>
                            <h3 style="font-size: 1.3rem; font-weight: 800; color: #0f172a; margin: 0 0 8px 0;">Integrated In-House Pharmacy</h3>
                            <p style="color: #64748b; font-size: 0.95rem; line-height: 1.6; margin: 0;">Digital prescriptions sent directly to the counter so your medicines are ready upon exit.</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Footer -->
            <footer style="background: #0f172a; color: #94a3b8; padding: 60px 20px 30px 20px; font-size: 0.9rem;">
                <div style="max-width: 1200px; margin: 0 auto; text-align: center;">
                    <h3 style="color: #ffffff; font-size: 1.3rem; font-weight: 700; margin: 0 0 10px 0;">${tenant.name}</h3>
                    <p style="margin: 0 0 16px 0; color: #94a3b8;">${tenant.address || 'Colombo, Sri Lanka'} • Tel: ${tenant.phone || '070 129 1688'}</p>
                    <p style="font-size: 0.8rem; color: #64748b; margin: 0;">© ${new Date().getFullYear()} ${tenant.name}. Powered by MedVisit.</p>
                </div>
            </footer>
        `;
    }

    if (templateId === 'heritage') {
        return `
            <!-- Heritage Ayurvedic Header -->
            <header style="background: #14532d; border-bottom: 1px solid #166534; padding: 18px 24px; position: sticky; top: 0; z-index: 100;">
                <div style="max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        ${
                            tenant.logo_url
                                ? `<img src="${tenant.logo_url}" alt="${tenant.name}" style="height: 40px; border-radius: 10px;" />`
                                : `<div style="width: 42px; height: 42px; border-radius: 12px; background: #d97706; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px;">${tenant.name.charAt(0)}</div>`
                        }
                        <div>
                            <span style="font-size: 1.25rem; font-weight: 800; color: #ffffff; display: block; line-height: 1.2;">${tenant.name}</span>
                            <span style="font-size: 0.75rem; color: #fde047; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;">Ayurvedic &amp; Holistic Wellness Sanctuary</span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 18px;">
                        <span style="color: #bbf7d0; font-size: 0.85rem; font-weight: 600;">Sanctuary Desk: ${tenant.phone || '070 129 1688'}</span>
                        <a href="/book" style="background: #d97706; color: #ffffff; padding: 12px 24px; border-radius: 12px; font-size: 0.9rem; font-weight: 700; text-decoration: none;">
                            Book Veda Consultation →
                        </a>
                    </div>
                </div>
            </header>

            <!-- Heritage Hero -->
            <section class="medvisit-section" style="background: linear-gradient(180deg, #14532d 0%, #166534 60%, #15803d 100%); padding: 90px 20px; color: #ffffff; text-align: center;">
                <div class="medvisit-container" style="max-width: 1000px; margin: 0 auto;">
                    <span style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 20px; background: rgba(253, 224, 71, 0.15); border: 1px solid rgba(253, 224, 71, 0.4); color: #fef08a; border-radius: 9999px; font-size: 0.8rem; font-weight: 700; margin-bottom: 24px;">
                        🌿 Traditional Sri Lankan Healing Arts &amp; Modern Pulse Diagnosis
                    </span>
                    <h1 style="font-size: 3.5rem; font-weight: 800; color: #ffffff; line-height: 1.15; margin: 0 auto 24px auto;">
                        Ancient Wisdom for Modern Vitality
                    </h1>
                    <p style="font-size: 1.25rem; color: #bbf7d0; line-height: 1.7; max-width: 750px; margin: 0 auto 40px auto;">
                        Personalized herbal therapies, Panchakarma rejuvenation, and authentic Ayurvedic doctor channeling in a serene setting.
                    </p>
                    <div style="display: flex; justify-content: center; gap: 16px; flex-wrap: wrap;">
                        <a href="/book" style="background: #d97706; color: #ffffff; padding: 16px 40px; border-radius: 14px; font-size: 1.05rem; font-weight: 700; text-decoration: none; box-shadow: 0 8px 24px rgba(217, 119, 6, 0.4);">
                            Reserve Doctor Session
                        </a>
                    </div>
                </div>
            </section>

            <!-- Footer -->
            <footer style="background: #052e16; color: #86efac; padding: 60px 20px 30px 20px; font-size: 0.9rem; text-align: center;">
                <div style="max-width: 1200px; margin: 0 auto;">
                    <h3 style="color: #ffffff; font-size: 1.3rem; font-weight: 700; margin: 0 0 10px 0;">${tenant.name}</h3>
                    <p style="margin: 0 0 16px 0; color: #86efac;">${tenant.address || 'Sri Lanka'} • Hotline: ${tenant.phone || '070 129 1688'}</p>
                    <p style="font-size: 0.8rem; color: #4ade80; margin: 0;">© ${new Date().getFullYear()} ${tenant.name}. Powered by MedVisit.</p>
                </div>
            </footer>
        `;
    }

    if (templateId === 'dental-eye') {
        return `
            <!-- Dental & Eye Specialty Header -->
            <header style="background: #ffffff; border-bottom: 1px solid #e2e8f0; padding: 18px 24px; position: sticky; top: 0; z-index: 100;">
                <div style="max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        ${
                            tenant.logo_url
                                ? `<img src="${tenant.logo_url}" alt="${tenant.name}" style="height: 40px; border-radius: 10px;" />`
                                : `<div style="width: 42px; height: 42px; border-radius: 12px; background: #0284c7; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px;">${tenant.name.charAt(0)}</div>`
                        }
                        <div>
                            <span style="font-size: 1.25rem; font-weight: 800; color: #0f172a; display: block; line-height: 1.2;">${tenant.name}</span>
                            <span style="font-size: 0.75rem; color: #0284c7; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;">Dental Surgery &amp; Eye Specialty Care</span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 18px;">
                        <span style="color: #64748b; font-size: 0.85rem; font-weight: 600;">Desk: ${tenant.phone || '070 129 1688'}</span>
                        <a href="/book" style="background: #0284c7; color: #ffffff; padding: 12px 24px; border-radius: 12px; font-size: 0.9rem; font-weight: 700; text-decoration: none;">
                            Book Specialist Visit →
                        </a>
                    </div>
                </div>
            </header>

            <!-- Dental & Eye Hero -->
            <section class="medvisit-section" style="background: linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%); padding: 90px 20px; text-align: center;">
                <div class="medvisit-container" style="max-width: 1000px; margin: 0 auto;">
                    <span style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 20px; background: #e0f2fe; color: #0369a1; border-radius: 9999px; font-size: 0.8rem; font-weight: 700; margin-bottom: 24px;">
                        ✦ Precision Laser Diagnostics • Pain-Free Dentistry • Optical Channeling
                    </span>
                    <h1 style="font-size: 3.5rem; font-weight: 800; color: #0f172a; line-height: 1.15; margin: 0 auto 24px auto;">
                        Crisp Vision &amp; Confident Smiles
                    </h1>
                    <p style="font-size: 1.25rem; color: #475569; line-height: 1.7; max-width: 750px; margin: 0 auto 40px auto;">
                        Advanced orthodontic alignment, digital dental imaging, refractive eye examinations, and surgeon-led outpatient care.
                    </p>
                    <div style="display: flex; justify-content: center; gap: 16px; flex-wrap: wrap;">
                        <a href="/book" style="background: #0284c7; color: #ffffff; padding: 16px 40px; border-radius: 14px; font-size: 1.05rem; font-weight: 700; text-decoration: none; box-shadow: 0 8px 24px rgba(2, 132, 199, 0.35);">
                            Reserve Chair Appointment
                        </a>
                    </div>
                </div>
            </section>

            <!-- Footer -->
            <footer style="background: #0f172a; color: #94a3b8; padding: 60px 20px 30px 20px; font-size: 0.9rem; text-align: center;">
                <div style="max-width: 1200px; margin: 0 auto;">
                    <h3 style="color: #ffffff; font-size: 1.3rem; font-weight: 700; margin: 0 0 10px 0;">${tenant.name}</h3>
                    <p style="margin: 0 0 16px 0;">${tenant.address || 'Colombo, Sri Lanka'} • Tel: ${tenant.phone || '070 129 1688'}</p>
                    <p style="font-size: 0.8rem; color: #64748b; margin: 0;">© ${new Date().getFullYear()} ${tenant.name}. Powered by MedVisit.</p>
                </div>
            </footer>
        `;
    }

    if (templateId === 'specialist' || templateId === 'specialist-center') {
        return `
            <!-- Specialist Suites Header -->
            <header style="background: #0f172a; border-bottom: 1px solid #1e293b; padding: 16px 24px; position: sticky; top: 0; z-index: 100;">
                <div style="max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        ${
                            tenant.logo_url
                                ? `<img src="${tenant.logo_url}" alt="${tenant.name}" style="height: 38px; border-radius: 8px;" />`
                                : `<div style="width: 40px; height: 40px; border-radius: 10px; background: #7C3AED; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px;">${tenant.name.charAt(0)}</div>`
                        }
                        <div>
                            <span style="font-size: 1.25rem; font-weight: 800; color: #ffffff; display: block; line-height: 1.2;">${tenant.name}</span>
                            <span style="font-size: 0.75rem; color: #a78bfa; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Consultant Specialist Suites</span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 20px;">
                        <span style="color: #cbd5e1; font-size: 0.85rem; font-weight: 600;">Direct Channeling: ${tenant.phone || '070 129 1688'}</span>
                        <a href="/book" style="background: #7C3AED; color: #ffffff; padding: 12px 24px; border-radius: 10px; font-size: 0.85rem; font-weight: 700; text-decoration: none; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4);">
                            Book Consultant Chamber →
                        </a>
                    </div>
                </div>
            </header>

            <!-- Specialist Hero -->
            <section class="medvisit-section" style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%); padding: 90px 20px; color: #ffffff;">
                <div class="medvisit-container" style="max-width: 1200px; margin: 0 auto; text-align: center;">
                    <span style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 18px; background: rgba(124, 58, 237, 0.2); border: 1px solid rgba(167, 139, 250, 0.3); color: #c4b5fd; border-radius: 9999px; font-size: 0.8rem; font-weight: 700; margin-bottom: 24px;">
                        ★ Premier Medical Specialist Chambers • SLMC Accredited
                    </span>
                    <h1 style="font-size: 3.25rem; font-weight: 800; color: #ffffff; line-height: 1.15; margin: 0 auto 24px auto; max-width: 900px;">
                        Sri Lanka's Leading Medical Specialists Under One Roof
                    </h1>
                    <p style="font-size: 1.2rem; color: #94a3b8; line-height: 1.7; max-width: 750px; margin: 0 auto 40px auto;">
                        Consult senior hospital consultants in private clinical chambers with real-time queue synchronization. Zero lounge congestion and guaranteed consultation tokens.
                    </p>
                    <div style="display: flex; justify-content: center; gap: 16px; flex-wrap: wrap;">
                        <a href="/book" style="background: #7C3AED; color: #ffffff; padding: 16px 36px; border-radius: 12px; font-size: 1rem; font-weight: 700; text-decoration: none; box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4);">
                            Reserve Channeling Token
                        </a>
                        <a href="#chambers" style="background: rgba(255, 255, 255, 0.05); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.2); padding: 16px 28px; border-radius: 12px; font-size: 1rem; font-weight: 700; text-decoration: none;">
                            View Specialty Chambers
                        </a>
                    </div>
                </div>
            </section>

            <!-- Chambers Grid -->
            <section id="chambers" class="medvisit-section" style="background: #ffffff; padding: 80px 20px;">
                <div class="medvisit-container" style="max-width: 1200px; margin: 0 auto;">
                    <div style="text-align: center; max-width: 650px; margin: 0 auto 48px auto;">
                        <span style="font-size: 0.8rem; font-weight: 700; color: #7C3AED; text-transform: uppercase; letter-spacing: 0.05em;">Clinical Divisions</span>
                        <h2 style="font-size: 2.25rem; font-weight: 800; color: #0f172a; margin: 8px 0 12px 0;">Specialized Consultation Chambers</h2>
                        <p style="color: #64748b; font-size: 1rem; margin: 0;">Comprehensive outpatient care covering major adult and pediatric medical sub-specialties.</p>
                    </div>
                    <div class="medvisit-grid-3" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;">
                        <div style="padding: 28px; border: 1px solid #e2e8f0; border-radius: 20px; background: #faf5ff; text-align: left;">
                            <div style="margin-bottom: 14px; color: #7C3AED;">${getMedicalSvg('HeartPulse', { size: 36, color: '#7C3AED' })}</div>
                            <h4 style="margin: 0 0 6px 0; font-size: 1.2rem; font-weight: 700; color: #0f172a;">Cardiology &amp; Cardiac Health</h4>
                            <p style="color: #64748b; font-size: 0.85rem; margin: 0 0 16px 0;">Echocardiography, ECG, cardiac risk profiles, and hypertension management.</p>
                            <a href="/book" style="color: #7C3AED; font-weight: 700; font-size: 0.85rem; text-decoration: none;">Book Cardiologist →</a>
                        </div>
                        <div style="padding: 28px; border: 1px solid #e2e8f0; border-radius: 20px; background: #f0fdf4; text-align: left;">
                            <div style="margin-bottom: 14px; color: #059669;">${getMedicalSvg('Brain', { size: 36, color: '#059669' })}</div>
                            <h4 style="margin: 0 0 6px 0; font-size: 1.2rem; font-weight: 700; color: #0f172a;">Neurology &amp; Neuro-Medicine</h4>
                            <p style="color: #64748b; font-size: 0.85rem; margin: 0 0 16px 0;">Stroke assessment, headache clinics, migraine therapy, and peripheral nerve diagnostics.</p>
                            <a href="/book" style="color: #059669; font-weight: 700; font-size: 0.85rem; text-decoration: none;">Book Neurologist →</a>
                        </div>
                        <div style="padding: 28px; border: 1px solid #e2e8f0; border-radius: 20px; background: #eff6ff; text-align: left;">
                            <div style="margin-bottom: 14px; color: #2563eb;">${getMedicalSvg('Activity', { size: 36, color: '#2563eb' })}</div>
                            <h4 style="margin: 0 0 6px 0; font-size: 1.2rem; font-weight: 700; color: #0f172a;">Orthopaedics &amp; Joint Surgery</h4>
                            <p style="color: #64748b; font-size: 0.85rem; margin: 0 0 16px 0;">Arthritis clinics, joint injections, sports trauma recovery, and spine evaluations.</p>
                            <a href="/book" style="color: #2563eb; font-weight: 700; font-size: 0.85rem; text-decoration: none;">Book Orthopaedic →</a>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Fast-track Token CTA -->
            <section class="medvisit-section" style="background: #7C3AED; padding: 70px 20px; color: #ffffff;">
                <div class="medvisit-container" style="max-width: 900px; margin: 0 auto; text-align: center;">
                    <h2 style="font-size: 2.25rem; font-weight: 800; margin: 0 0 16px 0;">Fast-Track Consultation Tokens</h2>
                    <p style="font-size: 1.05rem; opacity: 0.9; margin: 0 0 28px 0;">Reserve an exact consultation token and track live doctor arrivals from your mobile phone.</p>
                    <a href="/book" style="display: inline-block; background: #ffffff; color: #7C3AED; padding: 14px 36px; border-radius: 12px; font-size: 1rem; font-weight: 800; text-decoration: none; box-shadow: 0 6px 20px rgba(0,0,0,0.2);">
                        Book Channeling Appointment →
                    </a>
                </div>
            </section>

            <!-- Footer -->
            <footer style="background: #0f172a; color: #94a3b8; padding: 60px 20px 30px 20px; font-size: 0.9rem;">
                <div style="max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; margin-bottom: 40px;">
                    <div>
                        <h3 style="color: #ffffff; font-size: 1.15rem; font-weight: 700; margin: 0 0 12px 0;">${tenant.name}</h3>
                        <p style="line-height: 1.6; margin: 0 0 16px 0;">${tenant.address || 'Specialist Hospital Suites, Colombo, Sri Lanka'}</p>
                        <p style="margin: 0;">Hotline: <strong style="color: #ffffff;">${tenant.phone || '070 129 1688'}</strong></p>
                    </div>
                    <div>
                        <h4 style="color: #ffffff; font-size: 1rem; font-weight: 700; margin: 0 0 12px 0;">Consultant Hours</h4>
                        <p style="margin: 0 0 6px 0;">Daily: 08:00 AM – 10:00 PM</p>
                        <p style="margin: 0;">Emergency Outpatient Desk: 24/7 Active</p>
                    </div>
                    <div>
                        <h4 style="color: #ffffff; font-size: 1rem; font-weight: 700; margin: 0 0 12px 0;">Quick Links</h4>
                        <p style="margin: 0 0 8px 0;"><a href="/book" style="color: #a78bfa; text-decoration: none; font-weight: 700;">Book Channeling Online</a></p>
                        <p style="margin: 0 0 8px 0;"><a href="/login" style="color: #94a3b8; text-decoration: none;">Staff Workspace</a></p>
                        <p style="margin: 0;"><a href="/clinic/live-queue" style="color: #94a3b8; text-decoration: none;">Live Waiting Queue</a></p>
                    </div>
                </div>
                <div style="max-width: 1200px; margin: 0 auto; border-top: 1px solid #1e293b; padding-top: 24px; text-align: center; font-size: 0.8rem; color: #64748b;">
                    © ${new Date().getFullYear()} ${tenant.name}. Powered by MedVisit.
                </div>
            </footer>
        `;
    }

    if (templateId === 'family-care' || templateId === 'family-practice') {
        return `
            <!-- Family Practice Header -->
            <header style="background: #ffffff; border-bottom: 1px solid #e2e8f0; padding: 16px 24px; position: sticky; top: 0; z-index: 100;">
                <div style="max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        ${
                            tenant.logo_url
                                ? `<img src="${tenant.logo_url}" alt="${tenant.name}" style="height: 38px; border-radius: 8px;" />`
                                : `<div style="width: 40px; height: 40px; border-radius: 10px; background: #059669; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px;">${tenant.name.charAt(0)}</div>`
                        }
                        <div>
                            <span style="font-size: 1.25rem; font-weight: 800; color: #0f172a; display: block; line-height: 1.2;">${tenant.name}</span>
                            <span style="font-size: 0.75rem; color: #059669; font-weight: 700;">Family Medical &amp; Preventive Clinic</span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <span style="color: #475569; font-size: 0.85rem; font-weight: 600;">Clinic Hotline: ${tenant.phone || '070 129 1688'}</span>
                        <a href="/book" style="background: #059669; color: #ffffff; padding: 10px 22px; border-radius: 10px; font-size: 0.85rem; font-weight: 700; text-decoration: none; box-shadow: 0 4px 10px rgba(5, 150, 105, 0.25);">
                            Book Appointment
                        </a>
                    </div>
                </div>
            </header>

            <!-- Family Practice Hero -->
            <section class="medvisit-section" style="background: linear-gradient(180deg, #ecfdf5 0%, #ffffff 100%); padding: 80px 20px;">
                <div class="medvisit-container" style="max-width: 1200px; margin: 0 auto; text-align: center;">
                    <span style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 16px; background: #d1fae5; color: #065f46; border-radius: 9999px; font-size: 0.8rem; font-weight: 700; margin-bottom: 20px;">
                        ✦ Caring for All Generations • Open 7 Days a Week
                    </span>
                    <h1 style="font-size: 3rem; font-weight: 800; color: #0f172a; line-height: 1.2; margin: 0 auto 20px auto; max-width: 850px;">
                        Compassionate Healthcare for Your Entire Family
                    </h1>
                    <p style="font-size: 1.15rem; color: #475569; line-height: 1.7; max-width: 700px; margin: 0 auto 36px auto;">
                        From newborn health checks and routine family medicine to senior chronic care and certified outpatient lab tests.
                    </p>
                    <div style="display: flex; justify-content: center; gap: 14px; flex-wrap: wrap;">
                        <a href="/book" style="background: #059669; color: #ffffff; padding: 16px 36px; border-radius: 12px; font-size: 1rem; font-weight: 700; text-decoration: none; box-shadow: 0 6px 20px rgba(5, 150, 105, 0.35);">
                            Schedule a Doctor Visit
                        </a>
                        <a href="#services" style="background: #ffffff; color: #334155; border: 1px solid #cbd5e1; padding: 16px 28px; border-radius: 12px; font-size: 1rem; font-weight: 700; text-decoration: none;">
                            Our Family Services
                        </a>
                    </div>
                </div>
            </section>

            <!-- Services Grid -->
            <section id="services" class="medvisit-section" style="background: #ffffff; padding: 70px 20px;">
                <div class="medvisit-container" style="max-width: 1200px; margin: 0 auto;">
                    <div style="text-align: center; max-width: 600px; margin: 0 auto 48px auto;">
                        <h2 style="font-size: 2.2rem; font-weight: 800; color: #0f172a; margin: 0 0 12px 0;">Primary &amp; Preventive Care</h2>
                        <p style="color: #64748b; font-size: 1rem; margin: 0;">Comprehensive clinical support tailored for patients of every age.</p>
                    </div>
                    <div class="medvisit-grid-4" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;">
                        <div style="padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
                            <div style="margin-bottom: 12px; color: #059669;">${getMedicalSvg('Baby', { size: 32, color: '#059669' })}</div>
                            <h4 style="margin: 0 0 8px 0; font-size: 1.1rem; font-weight: 700; color: #0f172a;">Child Health &amp; Vaccines</h4>
                            <p style="color: #64748b; font-size: 0.85rem; margin: 0;">Growth monitoring, pediatric wellness, and immunization schedules.</p>
                        </div>
                        <div style="padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
                            <div style="margin-bottom: 12px; color: #059669;">${getMedicalSvg('Stethoscope', { size: 32, color: '#059669' })}</div>
                            <h4 style="margin: 0 0 8px 0; font-size: 1.1rem; font-weight: 700; color: #0f172a;">General Consultations</h4>
                            <p style="color: #64748b; font-size: 0.85rem; margin: 0;">Experienced family physicians for acute fever, infections, and common illnesses.</p>
                        </div>
                        <div style="padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
                            <div style="margin-bottom: 12px; color: #059669;">${getMedicalSvg('Droplet', { size: 32, color: '#059669' })}</div>
                            <h4 style="margin: 0 0 8px 0; font-size: 1.1rem; font-weight: 700; color: #0f172a;">Diabetes &amp; Chronic Care</h4>
                            <p style="color: #64748b; font-size: 0.85rem; margin: 0;">Regular glucose screening, blood pressure monitoring, and prescription renewals.</p>
                        </div>
                        <div style="padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
                            <div style="margin-bottom: 12px; color: #059669;">${getMedicalSvg('FlaskConical', { size: 32, color: '#059669' })}</div>
                            <h4 style="margin: 0 0 8px 0; font-size: 1.1rem; font-weight: 700; color: #0f172a;">Diagnostic Laboratory</h4>
                            <p style="color: #64748b; font-size: 0.85rem; margin: 0;">Complete blood count, urine analysis, and rapid same-day test results.</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Book Token Banner -->
            <section class="medvisit-section" style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 60px 20px; color: #ffffff;">
                <div class="medvisit-container" style="max-width: 900px; margin: 0 auto; text-align: center;">
                    <h2 style="font-size: 2.2rem; font-weight: 800; margin: 0 0 16px 0;">Reserve Your Token Online Before Leaving Home</h2>
                    <p style="font-size: 1rem; opacity: 0.9; margin: 0 0 28px 0;">Avoid crowded waiting rooms with live digital queuing.</p>
                    <a href="/book" style="display: inline-block; background: #ffffff; color: #059669; padding: 14px 36px; border-radius: 12px; font-size: 1rem; font-weight: 800; text-decoration: none;">
                        Book Token Now →
                    </a>
                </div>
            </section>

            <!-- Footer -->
            <footer style="background: #0f172a; color: #94a3b8; padding: 50px 20px 30px 20px; font-size: 0.9rem;">
                <div style="max-width: 1200px; margin: 0 auto; text-align: center;">
                    <h3 style="color: #ffffff; font-size: 1.2rem; font-weight: 700; margin: 0 0 8px 0;">${tenant.name}</h3>
                    <p style="margin: 0 0 16px 0;">${tenant.address || 'Colombo, Sri Lanka'} • Tel: ${tenant.phone || '070 129 1688'}</p>
                    <p style="font-size: 0.8rem; color: #64748b; margin: 0;">© ${new Date().getFullYear()} ${tenant.name}. Powered by MedVisit.</p>
                </div>
            </footer>
        `;
    }

    // Default: modern-clinic
    return `
        <!-- Navbar -->
        <header style="background: #ffffff; border-bottom: 1px solid #e2e8f0; padding: 16px 24px; position: sticky; top: 0; z-index: 100;">
            <div style="max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    ${
                        tenant.logo_url
                            ? `<img src="${tenant.logo_url}" alt="${tenant.name}" style="height: 36px; border-radius: 8px;" />`
                            : `<div style="width: 36px; height: 36px; border-radius: 8px; background: #0E9E8F; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px;">${tenant.name.charAt(0)}</div>`
                    }
                    <div>
                        <span style="font-size: 1.15rem; font-weight: 800; color: #0f172a; display: block; line-height: 1.2;">${tenant.name}</span>
                        <span style="font-size: 0.75rem; color: #0E9E8F; font-weight: 600;">Specialist Medical Center</span>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 16px;">
                    <span style="color: #475569; font-size: 0.85rem; font-weight: 600;">Hotline: ${tenant.phone || '070 129 1688'}</span>
                    <a href="/book" style="background: #0E9E8F; color: #ffffff; padding: 10px 20px; border-radius: 10px; font-size: 0.85rem; font-weight: 700; text-decoration: none; box-shadow: 0 4px 10px rgba(14, 158, 143, 0.25);">
                        Book Token Online
                    </a>
                </div>
            </div>
        </header>

        <!-- Hero Section -->
        <section class="medvisit-section" style="background: linear-gradient(180deg, #f0fdfa 0%, #ffffff 100%); padding: 80px 20px;">
            <div class="medvisit-container" style="max-width: 1200px; margin: 0 auto; text-align: center;">
                <span style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 16px; background: #ccfbf1; color: #0f766e; border-radius: 9999px; font-size: 0.8rem; font-weight: 700; margin-bottom: 20px;">
                    ✦ Open Daily • SLMC Verified Specialist Channeling
                </span>
                <h1 style="font-size: 3rem; font-weight: 800; color: #0f172a; line-height: 1.15; margin: 0 auto 20px auto; max-width: 850px;">
                    Compassionate Care, Specialist Excellence
                </h1>
                <p style="font-size: 1.15rem; color: #475569; line-height: 1.7; max-width: 700px; margin: 0 auto 36px auto;">
                    Consult top Sri Lankan medical specialists with live digital queue tracking. Reserve your token online and avoid waiting lounge congestion.
                </p>
                <div style="display: flex; justify-content: center; gap: 14px; flex-wrap: wrap;">
                    <a href="/book" style="background: #0E9E8F; color: #ffffff; padding: 16px 36px; border-radius: 14px; font-size: 1.05rem; font-weight: 700; text-decoration: none; box-shadow: 0 6px 20px rgba(14, 158, 143, 0.35);">
                        Book Appointment Online
                    </a>
                    <a href="#services" style="background: #ffffff; color: #334155; border: 1px solid #cbd5e1; padding: 16px 28px; border-radius: 14px; font-size: 1.05rem; font-weight: 700; text-decoration: none;">
                        Explore Clinical Services
                    </a>
                </div>
            </div>
        </section>

        <!-- Announcement Banner -->
        <div class="medvisit-container" style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px 24px; border-radius: 16px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="display: flex; align-items: center; color: #065f46;">${getMedicalSvg('Hospital', { size: 22, color: '#065f46' })}</span>
                    <span style="font-size: 0.9rem; font-weight: 600; color: #065f46;">
                        Real-Time Waiting Room Queue Monitoring is active for all current doctor sessions.
                    </span>
                </div>
                <a href="/book" style="color: #047857; font-weight: 700; font-size: 0.85rem; text-decoration: underline;">
                    Book Token →
                </a>
            </div>
        </div>

        <!-- Doctors Roster -->
        <section class="medvisit-section" style="background: #ffffff; padding: 80px 20px;">
            <div class="medvisit-container" style="max-width: 1200px; margin: 0 auto;">
                <div style="text-align: center; max-width: 600px; margin: 0 auto 48px auto;">
                    <span style="font-size: 0.8rem; font-weight: 700; color: #0E9E8F; text-transform: uppercase;">Medical Practitioners</span>
                    <h2 style="font-size: 2.25rem; font-weight: 800; color: #0f172a; margin: 8px 0 12px 0;">Meet Our Medical Specialists</h2>
                    <p style="color: #64748b; font-size: 1rem; margin: 0;">Board certified consultants practicing at our modern medical center.</p>
                </div>
                <div class="medvisit-grid-3" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;">
                    <div style="padding: 24px; border: 1px solid #e2e8f0; border-radius: 20px; background: #ffffff; text-align: center;">
                        <div style="width: 72px; height: 72px; border-radius: 50%; background: #ccfbf1; color: #0E9E8F; font-size: 28px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">S</div>
                        <h4 style="margin: 0 0 4px 0; font-size: 1.2rem; font-weight: 700; color: #0f172a;">Dr. Priyantha Silva</h4>
                        <span style="display: inline-block; padding: 4px 12px; background: #f0fdfa; color: #0f766e; border-radius: 9999px; font-size: 0.8rem; font-weight: 700; margin-bottom: 12px;">Consultant Physician</span>
                        <p style="color: #64748b; font-size: 0.85rem; margin: 0 0 16px 0;">Specialized in adult internal medicine, diabetes management, and preventive wellness.</p>
                        <a href="/book" style="display: block; width: 100%; padding: 10px; background: #0E9E8F; color: #ffffff; border-radius: 10px; font-weight: 700; text-decoration: none; font-size: 0.9rem;">Book Token</a>
                    </div>
                    <div style="padding: 24px; border: 1px solid #e2e8f0; border-radius: 20px; background: #ffffff; text-align: center;">
                        <div style="width: 72px; height: 72px; border-radius: 50%; background: #ccfbf1; color: #0E9E8F; font-size: 28px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">A</div>
                        <h4 style="margin: 0 0 4px 0; font-size: 1.2rem; font-weight: 700; color: #0f172a;">Dr. Anoma Jayawardena</h4>
                        <span style="display: inline-block; padding: 4px 12px; background: #f0fdfa; color: #0f766e; border-radius: 9999px; font-size: 0.8rem; font-weight: 700; margin-bottom: 12px;">Consultant Paediatrician</span>
                        <p style="color: #64748b; font-size: 0.85rem; margin: 0 0 16px 0;">Expert pediatric care, newborn screening, and child growth and immunization.</p>
                        <a href="/book" style="display: block; width: 100%; padding: 10px; background: #0E9E8F; color: #ffffff; border-radius: 10px; font-weight: 700; text-decoration: none; font-size: 0.9rem;">Book Token</a>
                    </div>
                    <div style="padding: 24px; border: 1px solid #e2e8f0; border-radius: 20px; background: #ffffff; text-align: center;">
                        <div style="width: 72px; height: 72px; border-radius: 50%; background: #ccfbf1; color: #0E9E8F; font-size: 28px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">R</div>
                        <h4 style="margin: 0 0 4px 0; font-size: 1.2rem; font-weight: 700; color: #0f172a;">Dr. Rohan Senanayake</h4>
                        <span style="display: inline-block; padding: 4px 12px; background: #f0fdfa; color: #0f766e; border-radius: 9999px; font-size: 0.8rem; font-weight: 700; margin-bottom: 12px;">Consultant Cardiologist</span>
                        <p style="color: #64748b; font-size: 0.85rem; margin: 0 0 16px 0;">Cardiac assessment, digital ECG interpretation, and cardiovascular health management.</p>
                        <a href="/book" style="display: block; width: 100%; padding: 10px; background: #0E9E8F; color: #ffffff; border-radius: 10px; font-weight: 700; text-decoration: none; font-size: 0.9rem;">Book Token</a>
                    </div>
                </div>
            </div>
        </section>

        <!-- Clinical Services Section -->
        <section id="services" class="medvisit-section" style="background: #f8fafc; padding: 80px 20px;">
            <div class="medvisit-container" style="max-width: 1200px; margin: 0 auto;">
                <div style="text-align: center; max-width: 600px; margin: 0 auto 48px auto;">
                    <span style="font-size: 0.8rem; font-weight: 700; color: #0E9E8F; text-transform: uppercase;">Comprehensive Care</span>
                    <h2 style="font-size: 2.25rem; font-weight: 800; color: #0f172a; margin: 8px 0 12px 0;">Our Clinical Services</h2>
                    <p style="color: #64748b; font-size: 1rem; margin: 0;">Full outpatient diagnostics and pharmacy services under one roof.</p>
                </div>
                <div class="medvisit-grid-4" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;">
                    <div style="padding: 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; text-align: left;">
                        <div style="margin-bottom: 12px; color: #0E9E8F;">${getMedicalSvg('Stethoscope', { size: 32, color: '#0E9E8F' })}</div>
                        <h4 style="margin: 0 0 8px 0; font-size: 1.1rem; font-weight: 700; color: #0f172a;">Specialist Channeling</h4>
                        <p style="color: #64748b; font-size: 0.85rem; margin: 0;">Direct consultations with verified senior SLMC specialist doctors.</p>
                    </div>
                    <div style="padding: 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; text-align: left;">
                        <div style="margin-bottom: 12px; color: #0E9E8F;">${getMedicalSvg('FlaskConical', { size: 32, color: '#0E9E8F' })}</div>
                        <h4 style="margin: 0 0 8px 0; font-size: 1.1rem; font-weight: 700; color: #0f172a;">Clinical Laboratory</h4>
                        <p style="color: #64748b; font-size: 0.85rem; margin: 0;">Automated blood screening, biochemistry, and rapid diagnostic tests.</p>
                    </div>
                    <div style="padding: 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; text-align: left;">
                        <div style="margin-bottom: 12px; color: #0E9E8F;">${getMedicalSvg('HeartPulse', { size: 32, color: '#0E9E8F' })}</div>
                        <h4 style="margin: 0 0 8px 0; font-size: 1.1rem; font-weight: 700; color: #0f172a;">Digital ECG &amp; Vitals</h4>
                        <p style="color: #64748b; font-size: 0.85rem; margin: 0;">Rapid cardiovascular monitoring and doctor-certified reports.</p>
                    </div>
                    <div style="padding: 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; text-align: left;">
                        <div style="margin-bottom: 12px; color: #0E9E8F;">${getMedicalSvg('Pill', { size: 32, color: '#0E9E8F' })}</div>
                        <h4 style="margin: 0 0 8px 0; font-size: 1.1rem; font-weight: 700; color: #0f172a;">Certified Pharmacy</h4>
                        <p style="color: #64748b; font-size: 0.85rem; margin: 0;">Licensed pharmaceuticals and experienced pharmacist counseling.</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Book Token Banner -->
        <section class="medvisit-section" style="background: linear-gradient(135deg, #0E9E8F 0%, #065f46 100%); padding: 70px 20px; color: #ffffff;">
            <div class="medvisit-container" style="max-width: 900px; margin: 0 auto; text-align: center;">
                <h2 style="font-size: 2.5rem; font-weight: 800; margin: 0 0 16px 0;">Reserve Your Channeling Token Online</h2>
                <p style="font-size: 1.1rem; opacity: 0.9; margin: 0 0 32px 0;">Experience peaceful doctor consultations with our atomic queue number system.</p>
                <a href="/book" style="display: inline-block; background: #ffffff; color: #0E9E8F; padding: 16px 40px; border-radius: 14px; font-size: 1.1rem; font-weight: 800; text-decoration: none; box-shadow: 0 6px 20px rgba(0,0,0,0.2);">
                    Book Appointment Now →
                </a>
            </div>
        </section>

        <!-- Footer -->
        <footer style="background: #0f172a; color: #94a3b8; padding: 60px 20px 30px 20px; font-size: 0.9rem;">
            <div style="max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; margin-bottom: 40px;">
                <div>
                    <h3 style="color: #ffffff; font-size: 1.15rem; font-weight: 700; margin: 0 0 12px 0;">${tenant.name}</h3>
                    <p style="line-height: 1.6; margin: 0 0 16px 0;">${tenant.address || 'Colombo, Sri Lanka'}</p>
                    <p style="margin: 0;">Hotline: <strong style="color: #ffffff;">${tenant.phone || '070 129 1688'}</strong></p>
                </div>
                <div>
                    <h4 style="color: #ffffff; font-size: 1rem; font-weight: 700; margin: 0 0 12px 0;">Clinical Hours</h4>
                    <p style="margin: 0 0 6px 0;">Monday – Friday: 07:30 AM – 10:00 PM</p>
                    <p style="margin: 0 0 6px 0;">Saturday: 07:30 AM – 10:00 PM</p>
                    <p style="margin: 0;">Sunday: 08:00 AM – 08:00 PM</p>
                </div>
                <div>
                    <h4 style="color: #ffffff; font-size: 1rem; font-weight: 700; margin: 0 0 12px 0;">Quick Navigation</h4>
                    <p style="margin: 0 0 8px 0;"><a href="/book" style="color: #0E9E8F; text-decoration: none; font-weight: 700;">Book Token Online</a></p>
                    <p style="margin: 0 0 8px 0;"><a href="/login" style="color: #94a3b8; text-decoration: none;">Staff Workspace Login</a></p>
                    <p style="margin: 0;"><a href="/clinic/live-queue" style="color: #94a3b8; text-decoration: none;">Live Waiting Queue</a></p>
                </div>
            </div>
            <div style="max-width: 1200px; margin: 0 auto; border-top: 1px solid #1e293b; padding-top: 24px; text-align: center; font-size: 0.8rem; color: #64748b;">
                © ${new Date().getFullYear()} ${tenant.name}. Certified by Ministry of Health &amp; PHSRC Sri Lanka. Powered by MedVisit.
            </div>
        </footer>
    `;
}
