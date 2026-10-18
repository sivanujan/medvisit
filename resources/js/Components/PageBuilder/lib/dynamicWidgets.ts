import { escapeHtml } from './contentHelpers.ts';

// Builds the saved snapshot HTML of the MedVisit Doctors / Sessions widgets from clinic data.
type DoctorLike = { id: number; name: string; specialty: string; slmc_number?: string; doctor_fee?: number; clinic_fee?: number };
type SessionLike = {
    id: number;
    doctor?: { name: string; specialty: string };
    session_date: string;
    start_time: string;
    room_number?: string;
};

export type DoctorsOptions = { limit: number; layout: 'grid' | 'list'; showFee: boolean };
export type SessionsOptions = { daysAhead: 7 | 14; max: number; today: string };

function formatRupees(cents: number): string {
    const [whole, fraction] = (cents / 100).toFixed(2).split('.');
    return `Rs. ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction}`;
}

export function renderDoctorsHtml(doctors: DoctorLike[], o: DoctorsOptions): string {
    const columns = o.layout === 'grid' ? 'repeat(3, 1fr)' : '1fr';
    const cards = doctors.slice(0, Math.max(1, o.limit)).map((d) => {
        const fee =
            o.showFee && (d.doctor_fee || d.clinic_fee)
                ? `<p style="margin: 0 0 12px 0; font-size: 0.85rem; font-weight: 700; color: #0f172a;">${formatRupees((d.doctor_fee || 0) + (d.clinic_fee || 0))}</p>`
                : '';
        return `<div style="padding: 20px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; text-align: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
<div style="width: 64px; height: 64px; border-radius: 50%; background: #e6fffa; color: #0E9E8F; font-size: 24px; font-weight: bold; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto;">${escapeHtml(d.name.replace(/^Dr\.?\s*/i, '').charAt(0))}</div>
<h4 style="margin: 0 0 4px 0; font-size: 1.05rem; font-weight: 700; color: #0f172a;">${escapeHtml(d.name)}</h4>
<span style="display: inline-block; padding: 2px 10px; background: #f0fdfa; color: #0f766e; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; margin-bottom: 8px;">${escapeHtml(d.specialty)}</span>
<p style="margin: 0 0 12px 0; font-size: 0.8rem; color: #64748b;">SLMC Reg: ${escapeHtml(d.slmc_number || 'Verified')}</p>
${fee}<a href="/book" style="display: inline-block; width: 100%; padding: 8px 12px; background: #0E9E8F; color: #ffffff; border-radius: 8px; font-size: 0.85rem; font-weight: 700; text-decoration: none;">Book Token</a>
</div>`;
    });
    const body = cards.length
        ? cards.join('')
        : '<div style="padding: 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; text-align: center;"><p style="color: #64748b; margin: 0;">No active doctors yet.</p></div>';
    return `<div class="medvisit-doctors-grid" style="display: grid; grid-template-columns: ${columns}; gap: 24px;">${body}</div>`;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function dayNumber(date: string): number {
    const [y, m, d] = date.slice(0, 10).split('-').map(Number);
    return Date.UTC(y, (m || 1) - 1, d || 1) / 86400000;
}

function formatTime(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${String(hour).padStart(2, '0')}:${String(m || 0).padStart(2, '0')} ${suffix}`;
}

export function renderSessionsHtml(sessions: SessionLike[], o: SessionsOptions): string {
    const today = dayNumber(o.today);
    const rows = sessions
        .filter((s) => {
            const diff = dayNumber(s.session_date) - today;
            return diff >= 0 && diff <= o.daysAhead;
        })
        .slice(0, Math.max(1, o.max))
        .map((s) => {
            const date = new Date(dayNumber(s.session_date) * 86400000);
            const label = `${WEEKDAYS[date.getUTCDay()]}, ${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()} • ${formatTime(s.start_time)}`;
            return `<tr style="border-bottom: 1px solid #f1f5f9;">
<td style="padding: 16px 20px; font-weight: 700; color: #0f172a;">${escapeHtml(s.doctor?.name || 'Doctor')} <br/><span style="font-size: 0.75rem; color: #64748b; font-weight: normal;">${escapeHtml(s.doctor?.specialty || '')}</span></td>
<td style="padding: 16px 20px; color: #334155;">${escapeHtml(label)}</td>
<td style="padding: 16px 20px; color: #64748b;">${escapeHtml(s.room_number || '')}</td>
<td style="padding: 16px 20px;"><span style="color: #059669; font-weight: 700;">Tokens Available</span></td>
<td style="padding: 16px 20px; text-align: right;"><a href="/book" style="display: inline-block; padding: 6px 14px; background: #0E9E8F; color: #ffffff; border-radius: 8px; font-size: 0.8rem; font-weight: 700; text-decoration: none;">Book</a></td>
</tr>`;
        });
    return rows.length
        ? rows.join('')
        : '<tr><td colspan="5" style="padding: 20px; text-align: center; color: #64748b;">No channeling sessions scheduled in this period.</td></tr>';
}
