import { getMedicalSvg } from '@/Utils/medicalIcons';
import type { DoctorItem, Editor } from '../types';

// Register Blocks: Layout, Core Widgets, MedVisit Dynamic Widgets
export function registerBlocks(editor: Editor, doctors: DoctorItem[] = []): void {
    const bm = editor.BlockManager;

    // 1. LAYOUT & COLUMNS
    const catLayout = { id: 'layout', label: 'Layout & Grid', open: true };

    bm.add('layout-1-col', {
        label: '<div style="font-size: 20px; margin-bottom: 4px;">⏹️</div><b>1 Column</b><div style="font-size: 10px; color: #64748b;">Full Width Section</div>',
        category: catLayout,
        content: `
            <section class="medvisit-section" data-mv-widget="container" style="background-color: #ffffff; padding: 60px 20px;">
                <div class="medvisit-container" style="max-width: 1200px; margin: 0 auto;">
                    <div style="min-height: 80px; padding: 20px; border: 1px dashed #cbd5e1; border-radius: 12px; text-align: center;">
                        <p style="color: #64748b; margin: 0;">Drop widgets here</p>
                    </div>
                </div>
            </section>
        `,
    });

    bm.add('layout-2-col', {
        label: '<div style="font-size: 20px; margin-bottom: 4px;">◫</div><b>2 Columns</b><div style="font-size: 10px; color: #64748b;">50% / 50% Grid</div>',
        category: catLayout,
        content: `
            <section class="medvisit-section" data-mv-widget="container" style="background-color: #f8fafc; padding: 60px 20px;">
                <div class="medvisit-container medvisit-grid-2" style="max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px;">
                    <div style="min-height: 80px; padding: 20px; border: 1px dashed #cbd5e1; border-radius: 12px; background: #ffffff;">
                        <h3 style="margin: 0 0 8px 0; font-size: 1.25rem; font-weight: 700; color: #0f172a;">Column 1</h3>
                        <p style="color: #64748b; margin: 0; font-size: 0.9rem;">Add content or widgets</p>
                    </div>
                    <div style="min-height: 80px; padding: 20px; border: 1px dashed #cbd5e1; border-radius: 12px; background: #ffffff;">
                        <h3 style="margin: 0 0 8px 0; font-size: 1.25rem; font-weight: 700; color: #0f172a;">Column 2</h3>
                        <p style="color: #64748b; margin: 0; font-size: 0.9rem;">Add content or widgets</p>
                    </div>
                </div>
            </section>
        `,
    });

    bm.add('layout-3-col', {
        label: '<div style="font-size: 20px; margin-bottom: 4px;">☷</div><b>3 Columns</b><div style="font-size: 10px; color: #64748b;">Feature Cards Grid</div>',
        category: catLayout,
        content: `
            <section class="medvisit-section" data-mv-widget="container" style="background-color: #ffffff; padding: 60px 20px;">
                <div class="medvisit-container medvisit-grid-3" style="max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;">
                    <div style="padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                        <h4 style="margin: 0 0 8px 0; font-size: 1.1rem; font-weight: 700; color: #0f172a;">Feature One</h4>
                        <p style="color: #64748b; margin: 0; font-size: 0.85rem;">Clinical excellence and specialized patient diagnostics.</p>
                    </div>
                    <div style="padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                        <h4 style="margin: 0 0 8px 0; font-size: 1.1rem; font-weight: 700; color: #0f172a;">Feature Two</h4>
                        <p style="color: #64748b; margin: 0; font-size: 0.85rem;">Digital token queuing with real-time room updates.</p>
                    </div>
                    <div style="padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                        <h4 style="margin: 0 0 8px 0; font-size: 1.1rem; font-weight: 700; color: #0f172a;">Feature Three</h4>
                        <p style="color: #64748b; margin: 0; font-size: 0.85rem;">Convenient pharmacist counter and prescription delivery.</p>
                    </div>
                </div>
            </section>
        `,
    });

    // 2. CORE WIDGETS
    const catCore = { id: 'core-widgets', label: 'Core Widgets', open: true };

    bm.add('widget-heading', {
        label: '<div style="font-size: 20px; margin-bottom: 4px;">🔤</div><b>Heading</b><div style="font-size: 10px; color: #64748b;">H1 – H4 Title</div>',
        category: catCore,
        content: '<h2 data-mv-widget="heading" style="font-size: 2.25rem; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; line-height: 1.2;">Your Health, Our Priority</h2>',
    });

    bm.add('widget-paragraph', {
        label: '<div style="font-size: 20px; margin-bottom: 4px;">📝</div><b>Rich Text</b><div style="font-size: 10px; color: #64748b;">Body Paragraph</div>',
        category: catCore,
        content: '<p data-mv-widget="text" style="font-size: 1rem; color: #475569; line-height: 1.7; margin: 0 0 16px 0;">Providing state-of-the-art specialist channeling, laboratory diagnostics, and compassionate family healthcare in Sri Lanka.</p>',
    });

    bm.add('widget-button', {
        label: '<div style="font-size: 20px; margin-bottom: 4px;">🔘</div><b>Action Button</b><div style="font-size: 10px; color: #64748b;">Channeling Link</div>',
        category: catCore,
        content: `
            <div style="padding: 8px 0;">
                <a href="/book" data-mv-widget="button" style="display: inline-flex; align-items: center; gap: 8px; background: #0E9E8F; color: #ffffff; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 0.95rem; text-decoration: none; box-shadow: 0 4px 14px rgba(14, 158, 143, 0.35);">
                    Book Appointment Online →
                </a>
            </div>
        `,
    });

    bm.add('widget-image', {
        label: '<div style="font-size: 20px; margin-bottom: 4px;">🖼️</div><b>Image</b><div style="font-size: 10px; color: #64748b;">Photo or Graphic</div>',
        category: catCore,
        content: `
            <div style="padding: 12px 0;">
                <img data-mv-widget="image" src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&auto=format&fit=crop&q=80" alt="Clinic Interior" style="width: 100%; max-height: 480px; object-fit: cover; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);" />
            </div>
        `,
    });

    bm.add('widget-icon-list', {
        label: '<div style="font-size: 20px; margin-bottom: 4px;">📋</div><b>Icon List</b><div style="font-size: 10px; color: #64748b;">Bullet Features</div>',
        category: catCore,
        content: `
            <ul data-mv-widget="icon-list" style="list-style: none; padding: 0; margin: 16px 0; space-y: 12px;">
                <li style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; font-size: 0.95rem; color: #334155;">
                    <span style="color: #0E9E8F; font-weight: bold; font-size: 1.1rem;">✓</span> Verified SLMC Registered Medical Consultants
                </li>
                <li style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; font-size: 0.95rem; color: #334155;">
                    <span style="color: #0E9E8F; font-weight: bold; font-size: 1.1rem;">✓</span> Instant Live Token Tracking (Zero Lounge Delay)
                </li>
                <li style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; font-size: 0.95rem; color: #334155;">
                    <span style="color: #0E9E8F; font-weight: bold; font-size: 1.1rem;">✓</span> Automated Diagnostic Blood &amp; Lipid Profiles
                </li>
            </ul>
        `,
    });

    bm.add('widget-medical-icon', {
        label: '<div style="font-size: 20px; margin-bottom: 4px;">🩺</div><b>Medical Icon</b><div style="font-size: 10px; color: #0E9E8F; font-weight: bold;">Lucide SVG</div>',
        category: catCore,
        content: `
            <div class="medvisit-medical-icon" data-mv-widget="icon" style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: 14px; background: #ecfdf5; color: #059669; margin: 12px 0;">
                ${getMedicalSvg('Stethoscope', { size: 32, color: '#059669' })}
            </div>
        `,
    });

    bm.add('widget-video', {
        label: '<div style="font-size: 20px; margin-bottom: 4px;">🎬</div><b>Video Embed</b><div style="font-size: 10px; color: #64748b;">YouTube / Vimeo</div>',
        category: catCore,
        content: `
            <div data-mv-widget="video" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 16px; margin: 20px 0;">
                <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" style="position: absolute; top:0; left: 0; width: 100%; height: 100%; border: 0;" allowfullscreen></iframe>
            </div>
        `,
    });

    bm.add('widget-faq', {
        label: '<div style="font-size: 20px; margin-bottom: 4px;">❓</div><b>FAQ Accordion</b><div style="font-size: 10px; color: #64748b;">Patient Q&amp;A</div>',
        category: catCore,
        content: `
            <div data-mv-widget="faq" style="margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
                <details style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; background: #ffffff;">
                    <summary style="font-weight: 700; color: #0f172a; cursor: pointer;">How do I check my live queue number?</summary>
                    <p style="margin: 8px 0 0 0; color: #64748b; font-size: 0.9rem;">You can monitor the real-time consultation status from your mobile token SMS link or the waiting lounge display.</p>
                </details>
                <details style="padding: 16px 20px; background: #ffffff;">
                    <summary style="font-weight: 700; color: #0f172a; cursor: pointer;">What payment methods are accepted at cashier?</summary>
                    <p style="margin: 8px 0 0 0; color: #64748b; font-size: 0.9rem;">We accept Cash, LankaQR, Visa, MasterCard, and direct insurance claims.</p>
                </details>
            </div>
        `,
    });

    bm.add('widget-map', {
        label: '<div style="font-size: 20px; margin-bottom: 4px;">🗺️</div><b>Location Map</b><div style="font-size: 10px; color: #64748b;">Google Maps Embed</div>',
        category: catCore,
        content: `
            <div data-mv-widget="map" style="margin: 20px 0; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
                <iframe src="https://maps.google.com/maps?q=Colombo,%20Sri%20Lanka&t=&z=13&ie=UTF8&iwloc=&output=embed" style="width: 100%; height: 320px; border: 0;" allowfullscreen loading="lazy"></iframe>
            </div>
        `,
    });

    // 3. MEDVISIT DYNAMIC CLINIC WIDGETS
    const catDynamic = { id: 'dynamic-medvisit', label: 'MedVisit Dynamic Widgets', open: true };

    // Dynamic Doctors Widget
    const doctorsHtml = doctors.length > 0
        ? doctors.slice(0, 3).map((d) => `
            <div style="padding: 20px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; text-align: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <div style="width: 64px; height: 64px; border-radius: 50%; background: #e6fffa; color: #0E9E8F; font-size: 24px; font-weight: bold; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto;">
                    ${d.name.charAt(0)}
                </div>
                <h4 style="margin: 0 0 4px 0; font-size: 1.05rem; font-weight: 700; color: #0f172a;">${d.name}</h4>
                <span style="display: inline-block; padding: 2px 10px; background: #f0fdfa; color: #0f766e; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; margin-bottom: 8px;">
                    ${d.specialty}
                </span>
                <p style="margin: 0 0 12px 0; font-size: 0.8rem; color: #64748b;">SLMC Reg: ${d.slmc_number || 'Verified'}</p>
                <a href="/book" style="display: inline-block; width: 100%; padding: 8px 12px; background: #0E9E8F; color: #ffffff; border-radius: 8px; font-size: 0.85rem; font-weight: 700; text-decoration: none;">
                    Book Token
                </a>
            </div>
        `).join('')
        : `
            <div style="padding: 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; text-align: center;">
                <p style="color: #64748b; margin: 0;">Specialist Doctors will be dynamically rendered here</p>
            </div>
        `;

    bm.add('medvisit-doctors', {
        label: '<div style="font-size: 20px; margin-bottom: 4px;">👨‍⚕️</div><b>Doctors List</b><div style="font-size: 10px; color: #0E9E8F; font-weight: bold;">Live Roster</div>',
        category: catDynamic,
        content: `
            <section class="medvisit-section" data-widget="doctors-list" data-mv-widget="doctors" style="background: #f8fafc; padding: 60px 20px;">
                <div class="medvisit-container" style="max-width: 1200px; margin: 0 auto;">
                    <div style="text-align: center; max-width: 600px; margin: 0 auto 40px auto;">
                        <span style="font-size: 0.8rem; font-weight: 700; color: #0E9E8F; text-transform: uppercase; letter-spacing: 0.05em;">Our Medical Specialists</span>
                        <h2 style="font-size: 2rem; font-weight: 800; color: #0f172a; margin: 6px 0 12px 0;">Consultant Physicians &amp; Surgeons</h2>
                        <p style="color: #64748b; font-size: 0.95rem; margin: 0;">Consult Sri Lanka’s leading specialists with direct digital appointments.</p>
                    </div>
                    <div class="medvisit-grid-3" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;">
                        ${doctorsHtml}
                    </div>
                </div>
            </section>
        `,
    });

    // Dynamic Sessions This Week Widget
    bm.add('medvisit-sessions', {
        label: '<div style="font-size: 20px; margin-bottom: 4px;">📅</div><b>Sessions This Week</b><div style="font-size: 10px; color: #0E9E8F; font-weight: bold;">Channeling Timetable</div>',
        category: catDynamic,
        content: `
            <section class="medvisit-section" data-widget="channeling-sessions" data-mv-widget="sessions" style="background: #ffffff; padding: 60px 20px;">
                <div class="medvisit-container" style="max-width: 1200px; margin: 0 auto;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 32px; flex-wrap: wrap; gap: 16px;">
                        <div>
                            <span style="font-size: 0.8rem; font-weight: 700; color: #0E9E8F; text-transform: uppercase; letter-spacing: 0.05em;">Upcoming Schedules</span>
                            <h2 style="font-size: 1.85rem; font-weight: 800; color: #0f172a; margin: 4px 0 0 0;">Channeling Sessions This Week</h2>
                        </div>
                        <a href="/book" data-mv-widget="button" style="display: inline-flex; align-items: center; gap: 6px; color: #0E9E8F; font-weight: 700; text-decoration: none; font-size: 0.9rem;">
                            View Full Calendar →
                        </a>
                    </div>
                    <div style="border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background: #ffffff;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem; text-align: left;">
                            <thead>
                                <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 700;">
                                    <th style="padding: 14px 20px;">Doctor &amp; Specialty</th>
                                    <th style="padding: 14px 20px;">Day &amp; Time</th>
                                    <th style="padding: 14px 20px;">Suite</th>
                                    <th style="padding: 14px 20px;">Availability</th>
                                    <th style="padding: 14px 20px; text-align: right;">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                    <td style="padding: 16px 20px; font-weight: 700; color: #0f172a;">
                                        Dr. Priyantha Silva <br/><span style="font-size: 0.75rem; color: #64748b; font-weight: normal;">Consultant Physician</span>
                                    </td>
                                    <td style="padding: 16px 20px; color: #334155;">Today • 04:30 PM</td>
                                    <td style="padding: 16px 20px; color: #64748b;">Suite 2</td>
                                    <td style="padding: 16px 20px;"><span style="color: #059669; font-weight: 700;">Tokens Available</span></td>
                                    <td style="padding: 16px 20px; text-align: right;">
                                        <a href="/book" style="display: inline-block; padding: 6px 14px; background: #0E9E8F; color: #ffffff; border-radius: 8px; font-size: 0.8rem; font-weight: 700; text-decoration: none;">Book</a>
                                    </td>
                                </tr>
                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                    <td style="padding: 16px 20px; font-weight: 700; color: #0f172a;">
                                        Dr. Anoma Jayawardena <br/><span style="font-size: 0.75rem; color: #64748b; font-weight: normal;">Consultant Paediatrician</span>
                                    </td>
                                    <td style="padding: 16px 20px; color: #334155;">Tomorrow • 05:00 PM</td>
                                    <td style="padding: 16px 20px; color: #64748b;">Suite 1</td>
                                    <td style="padding: 16px 20px;"><span style="color: #059669; font-weight: 700;">Tokens Available</span></td>
                                    <td style="padding: 16px 20px; text-align: right;">
                                        <a href="/book" style="display: inline-block; padding: 6px 14px; background: #0E9E8F; color: #ffffff; border-radius: 8px; font-size: 0.8rem; font-weight: 700; text-decoration: none;">Book</a>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        `,
    });

    // Dynamic Book-a-Token Widget
    bm.add('medvisit-book-token', {
        label: '<div style="font-size: 20px; margin-bottom: 4px;">🎟️</div><b>Book-a-Token Box</b><div style="font-size: 10px; color: #0E9E8F; font-weight: bold;">Patient CTA</div>',
        category: catDynamic,
        content: `
            <section class="medvisit-section" data-widget="book-token-box" data-mv-widget="book-token" style="background: linear-gradient(135deg, #0E9E8F 0%, #087066 100%); padding: 60px 20px; color: #ffffff; border-radius: 24px; margin: 40px auto; max-width: 1200px;">
                <div style="display: flex; flex-direction: column; align-items: center; text-align: center; max-width: 700px; margin: 0 auto;">
                    <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 14px; background: rgba(255,255,255,0.2); border-radius: 9999px; font-size: 0.8rem; font-weight: 700; margin-bottom: 16px;">
                        ⚡ Real-Time Digital Token Desk
                    </span>
                    <h2 style="font-size: 2.2rem; font-weight: 800; margin: 0 0 12px 0;">Book Channeling Tokens Instantly</h2>
                    <p style="font-size: 1rem; opacity: 0.9; line-height: 1.6; margin: 0 0 28px 0;">
                        Select your specialist, choose a date, and reserve your guaranteed token with live estimated consultation time.
                    </p>
                    <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;">
                        <a href="/book" data-mv-widget="button" style="display: inline-flex; align-items: center; gap: 8px; background: #ffffff; color: #0E9E8F; padding: 14px 32px; border-radius: 12px; font-size: 1rem; font-weight: 800; text-decoration: none; box-shadow: 0 4px 14px rgba(0,0,0,0.15);">
                            Reserve Token Now →
                        </a>
                        <a href="/clinic/live-queue" style="display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.4); color: #ffffff; padding: 14px 24px; border-radius: 12px; font-size: 1rem; font-weight: 700; text-decoration: none;">
                            Track Live Queue
                        </a>
                    </div>
                </div>
            </section>
        `,
    });

    // Dynamic Announcement Banner Widget
    bm.add('medvisit-announcement', {
        label: '<div style="font-size: 20px; margin-bottom: 4px;">📢</div><b>Announcement Banner</b><div style="font-size: 10px; color: #f59e0b; font-weight: bold;">Emergency / Alert</div>',
        category: catDynamic,
        content: `
            <div data-widget="announcement-banner" data-mv-widget="announcement" style="background: #fffbeb; border: 1px solid #fde68a; padding: 14px 20px; border-radius: 12px; margin: 20px 0; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 1.25rem;">📢</span>
                    <div>
                        <strong style="color: #92400e; font-size: 0.9rem;">Specialist Announcement:</strong>
                        <span style="color: #78350f; font-size: 0.85rem; margin-left: 6px;">Visiting Paediatric Neurologist sessions open this Saturday morning. Limited tokens.</span>
                    </div>
                </div>
                <a href="/book" style="display: inline-block; padding: 6px 14px; background: #92400e; color: #ffffff; border-radius: 8px; font-size: 0.8rem; font-weight: 700; text-decoration: none;">
                    Book Token
                </a>
            </div>
        `,
    });
}
