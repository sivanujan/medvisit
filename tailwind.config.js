import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.{ts,tsx,js,jsx}',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Poppins', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                primary: {
                    DEFAULT: '#1E6FD9',
                    50: '#F0F6FE',
                    100: '#DBE9FD',
                    200: '#BED6FB',
                    300: '#91BCF8',
                    400: '#5C9DF4',
                    500: '#1E6FD9',
                    600: '#1557B2',
                    700: '#11448C',
                    800: '#103972',
                    900: '#12315E',
                    950: '#0B1E3B',
                },
                secondary: {
                    DEFAULT: '#0E9E8F',
                    50: '#E6F8F6',
                    100: '#C2EFEA',
                    200: '#8FE2D8',
                    300: '#55CEC2',
                    400: '#27B5A7',
                    500: '#0E9E8F',
                    600: '#0A7E73',
                    700: '#0C645C',
                    800: '#0E504A',
                    900: '#10433E',
                    950: '#062623',
                },
                accent: {
                    DEFAULT: '#FF7A59',
                    50: '#FFF2EE',
                    100: '#FFE2DA',
                    200: '#FFC8B9',
                    300: '#FFA38C',
                    400: '#FF7A59',
                    500: '#F7542C',
                    600: '#E6390F',
                    700: '#C12B08',
                    800: '#99240C',
                    900: '#7E220F',
                    950: '#481005',
                },
                slate: {
                    850: '#141d2e',
                },
            },
        },
    },

    plugins: [forms],
};
