import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface FormErrorProps {
    message?: string | null;
    id?: string;
    className?: string;
}

export function FormError({ message, id, className = '' }: FormErrorProps) {
    if (!message) return null;

    return (
        <p
            id={id}
            role="alert"
            className={`mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5 animate-fadeIn ${className}`}
        >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{message}</span>
        </p>
    );
}

export default FormError;
