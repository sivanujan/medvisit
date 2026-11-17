/**
 * Sri Lankan National Identity Card (NIC) parser and validator.
 *
 * Supports:
 * - Old 9-digit format: 9 digits followed by 'V' or 'X' (e.g., 901234567V)
 * - New 12-digit format: 12 digits (e.g., 199012345678)
 *
 * Calculates:
 * - Date of birth (YYYY-MM-DD and DD/MM/YYYY)
 * - Gender ('male' | 'female')
 * - Current age in years and human-readable age text
 */

export interface NicParseResult {
    isValid: boolean;
    format?: 'old' | 'new';
    gender?: 'male' | 'female';
    dateOfBirth?: string; // YYYY-MM-DD
    dateOfBirthLK?: string; // DD/MM/YYYY
    age?: number;
    ageText?: string;
    error?: string;
}

// Days in each month for a leap year (Sri Lankan NIC standard calculation uses 366 days)
const LEAP_YEAR_MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Given day of the year (1 - 366), return { month: 1..12, day: 1..31 }
 */
function dayOfYearToMonthDay(dayOfYear: number): { month: number; day: number } | null {
    if (dayOfYear < 1 || dayOfYear > 366) {
        return null;
    }

    let remainingDays = dayOfYear;
    for (let m = 0; m < 12; m++) {
        const daysInMonth = LEAP_YEAR_MONTH_DAYS[m];
        if (remainingDays <= daysInMonth) {
            return { month: m + 1, day: remainingDays };
        }
        remainingDays -= daysInMonth;
    }
    return null;
}

/**
 * Calculate age in full years from a YYYY-MM-DD birthdate.
 */
export function calculateAge(dateOfBirth: string): { age: number; ageText: string } | null {
    if (!dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
        return null;
    }

    const [yearStr, monthStr, dayStr] = dateOfBirth.split('-');
    const birthYear = parseInt(yearStr, 10);
    const birthMonth = parseInt(monthStr, 10);
    const birthDay = parseInt(dayStr, 10);

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    if (birthYear > currentYear) {
        return null;
    }

    let age = currentYear - birthYear;
    if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
        age -= 1;
    }

    if (age < 0) {
        return null;
    }

    const ageText = age === 1 ? '1 year' : `${age} years`;
    return { age, ageText };
}

/**
 * Parse and validate a Sri Lankan NIC number.
 */
export function parseSriLankanNIC(rawNic: string): NicParseResult {
    if (!rawNic) {
        return { isValid: false };
    }

    const trimmed = rawNic.trim().toUpperCase();

    // Check old format: 9 digits followed by V or X
    const oldRegex = /^(\d{2})(\d{3})(\d{4})([VX])$/;
    const oldMatch = trimmed.match(oldRegex);

    if (oldMatch) {
        const yearPart = parseInt(oldMatch[1], 10);
        let daysPart = parseInt(oldMatch[2], 10);

        // 1900s
        const fullYear = 1900 + yearPart;

        let gender: 'male' | 'female' = 'male';
        if (daysPart > 500) {
            gender = 'female';
            daysPart -= 500;
        }

        const monthDay = dayOfYearToMonthDay(daysPart);
        if (!monthDay) {
            return {
                isValid: false,
                format: 'old',
                error: 'Invalid day of year in NIC',
            };
        }

        const monthPadded = String(monthDay.month).padStart(2, '0');
        const dayPadded = String(monthDay.day).padStart(2, '0');
        const dateOfBirth = `${fullYear}-${monthPadded}-${dayPadded}`;
        const dateOfBirthLK = `${dayPadded}/${monthPadded}/${fullYear}`;

        const ageInfo = calculateAge(dateOfBirth);

        return {
            isValid: true,
            format: 'old',
            gender,
            dateOfBirth,
            dateOfBirthLK,
            age: ageInfo?.age,
            ageText: ageInfo?.ageText,
        };
    }

    // Check new format: 12 digits
    const newRegex = /^(\d{4})(\d{3})(\d{5})$/;
    const newMatch = trimmed.match(newRegex);

    if (newMatch) {
        const fullYear = parseInt(newMatch[1], 10);
        let daysPart = parseInt(newMatch[2], 10);

        const currentYear = new Date().getFullYear();
        if (fullYear < 1900 || fullYear > currentYear) {
            return {
                isValid: false,
                format: 'new',
                error: 'Invalid birth year in NIC',
            };
        }

        let gender: 'male' | 'female' = 'male';
        if (daysPart > 500) {
            gender = 'female';
            daysPart -= 500;
        }

        const monthDay = dayOfYearToMonthDay(daysPart);
        if (!monthDay) {
            return {
                isValid: false,
                format: 'new',
                error: 'Invalid day of year in NIC',
            };
        }

        const monthPadded = String(monthDay.month).padStart(2, '0');
        const dayPadded = String(monthDay.day).padStart(2, '0');
        const dateOfBirth = `${fullYear}-${monthPadded}-${dayPadded}`;
        const dateOfBirthLK = `${dayPadded}/${monthPadded}/${fullYear}`;

        const ageInfo = calculateAge(dateOfBirth);

        return {
            isValid: true,
            format: 'new',
            gender,
            dateOfBirth,
            dateOfBirthLK,
            age: ageInfo?.age,
            ageText: ageInfo?.ageText,
        };
    }

    return {
        isValid: false,
        error: 'NIC must be 9 digits with V/X or 12 digits',
    };
}
