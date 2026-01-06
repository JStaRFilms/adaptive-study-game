import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    bg: '#0B0E14',
                    surface: '#151923',
                    primary: '#8B5CF6',
                    secondary: '#3B82F6',
                    accent: '#F59E0B',
                },
            },
            fontFamily: {
                heading: ['var(--font-outfit)', 'sans-serif'],
                body: ['var(--font-inter)', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
export default config;
