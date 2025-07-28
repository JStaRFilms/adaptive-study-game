import { GoogleGenAI } from "@google/genai";
import { modelFor, modelLimits, ModelIdentifier } from './aiConstants';

const API_KEY_COOLDOWN_MS = 60 * 1000; // 1 minute for RPM or quota failures
const getTodayKey = () => new Date().toISOString().split('T')[0];

interface KeyUsageInMinute {
  requests: number;
  lastRequest: number; // timestamp
}

interface DailyKeyUsage {
  requests: number;
}

interface CooldownInfo {
  until: number;
}

class ApiKeyManager {
  private keys: string[] = [];
  private clients: Map<string, GoogleGenAI> = new Map();

  // Session state (for RPM and short-term cooldowns)
  private keyUsagePerMinute: Map<string, KeyUsageInMinute[]> = new Map();
  private keyCooldowns: Map<string, CooldownInfo> = new Map();

  constructor() {
    const keyPoolEnv = process.env.API_KEY_POOL || process.env.API_KEY;
    if (!keyPoolEnv) {
      console.error("API_KEY_POOL or API_KEY environment variable not set.");
      return;
    }
    this.keys = keyPoolEnv.split(',').map(k => k.trim()).filter(Boolean);
    this.keys.forEach(key => {
      this.clients.set(key, new GoogleGenAI({ apiKey: key }));
    });
    console.log(`API Key Manager initialized with ${this.keys.length} keys.`);
  }

  private getDailyUsage(): Record<string, DailyKeyUsage> {
    try {
      const todayKey = getTodayKey();
      const stored = localStorage.getItem('apiKeyDailyUsage');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.date === todayKey) {
          return data.usage || {};
        }
      }
    } catch (e) {
      console.error("Could not read daily usage from localStorage", e);
    }
    return {};
  }

  private saveDailyUsage(usage: Record<string, DailyKeyUsage>) {
    try {
      const data = {
        date: getTodayKey(),
        usage,
      };
      localStorage.setItem('apiKeyDailyUsage', JSON.stringify(data));
    } catch (e) {
      console.error("Could not save daily usage to localStorage", e);
    }
  }

  public async getClient(modelIdentifier: ModelIdentifier): Promise<{ client: GoogleGenAI | null; key: string | null; model: string | null }> {
    const model = modelFor[modelIdentifier];
    const limits = modelLimits[model];

    if (!this.keys.length) {
      throw new Error("No API keys are configured in the key pool.");
    }

    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const dailyUsage = this.getDailyUsage();

    // Prune old per-minute usage data from session state
    this.keyUsagePerMinute.forEach((usages, key) => {
      this.keyUsagePerMinute.set(key, usages.filter(u => u.lastRequest > oneMinuteAgo));
    });

    const eligibleKeys = this.keys
      // Shuffle keys to distribute load randomly across users
      .map(value => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value)
      .filter(key => {
        // 1. Check daily limit (RPD)
        const rpd = (dailyUsage[key]?.requests || 0);
        if (rpd >= limits.rpd) {
          return false;
        }

        // 2. Check short-term cooldown
        const cooldown = this.keyCooldowns.get(key);
        if (cooldown && now < cooldown.until) {
          return false;
        }

        // 3. Check minute limit (RPM)
        const rpm = (this.keyUsagePerMinute.get(key) || []).length;
        if (rpm >= limits.rpm) {
          return false;
        }
        
        return true;
      });

    const selectedKey = eligibleKeys[0];

    if (!selectedKey) {
      return { client: null, key: null, model: null }; // No keys available right now
    }

    const client = this.clients.get(selectedKey);
    return { client: client!, key: selectedKey, model };
  }

  public logSuccess(key: string) {
    if (!key) return;
    const now = Date.now();
    
    // Log for RPM tracking (session)
    const minuteUsage = this.keyUsagePerMinute.get(key) || [];
    minuteUsage.push({ requests: 1, lastRequest: now });
    this.keyUsagePerMinute.set(key, minuteUsage);

    // Log for RPD tracking (persistent)
    const dailyUsage = this.getDailyUsage();
    if (!dailyUsage[key]) {
      dailyUsage[key] = { requests: 0 };
    }
    dailyUsage[key].requests++;
    this.saveDailyUsage(dailyUsage);
  }

  public logFailure(key: string, error: Error) {
    if (!key) return;
    const message = error.message.toLowerCase();
    
    // Heuristic: if the error contains "quota", "limit", or is a 429, it's a rate limit error.
    if (message.includes('quota') || message.includes('limit') || message.includes('429')) {
      this.keyCooldowns.set(key, { until: Date.now() + API_KEY_COOLDOWN_MS });
      console.log(`Key ${key.substring(0,4)}... placed on a ${API_KEY_COOLDOWN_MS/1000}s cooldown due to rate-limit error.`);
    }
  }
}

// Singleton instance to be used across the application
export const apiKeyManager = new ApiKeyManager();
