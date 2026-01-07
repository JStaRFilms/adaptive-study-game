import { useState, useEffect } from 'react';

const STORAGE_KEY = 'adaptive-study-game-settings';

export interface AppSettings {
    enableConfidenceCheck: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
    enableConfidenceCheck: true,
};

export function useSettings() {
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
            } catch (e) {
                console.error("Failed to parse settings", e);
            }
        }
        setIsLoaded(true);
    }, []);

    const updateSettings = (newSettings: Partial<AppSettings>) => {
        setSettings(prev => {
            const updated = { ...prev, ...newSettings };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    };

    return {
        settings,
        updateSettings,
        isLoaded
    };
}
