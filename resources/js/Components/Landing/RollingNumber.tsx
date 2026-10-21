import React, { useEffect, useRef, useState } from 'react';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

/**
 * One odometer column. Going 9 → 0 rolls forward onto a trailing "0" and then
 * snaps back to the top without a transition, so the roll always moves upwards.
 */
function RollingDigit({ value }: { value: number }) {
    const [index, setIndex] = useState(value);
    const [snapping, setSnapping] = useState(false);
    const previous = useRef(value);

    useEffect(() => {
        const from = previous.current;
        previous.current = value;
        if (from === 9 && value === 0) {
            setSnapping(false);
            setIndex(10);
            return;
        }
        setIndex(value);
    }, [value]);

    const onTransitionEnd = () => {
        if (index === 10) {
            setSnapping(true);
            setIndex(0);
            requestAnimationFrame(() => requestAnimationFrame(() => setSnapping(false)));
        }
    };

    return (
        <span className="lp-digit">
            <span
                className={`lp-digit-strip ${snapping ? 'is-snapping' : ''}`}
                style={{ transform: `translateY(-${index}em)` }}
                onTransitionEnd={onTransitionEnd}
            >
                {DIGITS.map((d, i) => (
                    <span key={i}>{d}</span>
                ))}
            </span>
        </span>
    );
}

interface Props {
    value: number;
    minDigits?: number;
    className?: string;
}

/** A token number whose digits roll like a mechanical display board. Decorative. */
export default function RollingNumber({ value, minDigits = 2, className = '' }: Props) {
    const digits = String(Math.max(0, value)).padStart(minDigits, '0').split('').map(Number);

    return (
        <span aria-hidden="true" className={`inline-flex lp-tabular ${className}`}>
            {digits.map((d, i) => (
                <RollingDigit key={digits.length - i} value={d} />
            ))}
        </span>
    );
}
