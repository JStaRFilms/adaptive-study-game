// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    };
    removeItem: (key: string) => {
      delete store[key];
    };
    clear: () => {
      store = {};
    };
  };
})();

// Add to global scope
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock Date
const mockDate = new Date('2023-01-01T00:00:00Z');
const RealDate = Date;

global.Date = class extends RealDate {
  constructor() {
    super();
    return mockDate;
  }
  
  static now() {
    return mockDate.getTime();
  }
} as DateConstructor;
