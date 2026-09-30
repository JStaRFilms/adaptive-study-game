import { useState, useEffect } from 'react';
import { getActiveAccountId } from '../utils/activeAccount';

const storageKey = () => `adaptive-study-game-settings-account-${encodeURIComponent(getActiveAccountId())}`;

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
        const stored = localStorage.getItem(storageKey());
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
            localStorage.setItem(storageKey(), JSON.stringify(updated));
            return updated;
        });
    };

    return {
        settings,
        updateSettings,
        isLoaded
    };
}
