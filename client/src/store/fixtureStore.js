import { create } from 'zustand';

export const useFixtureStore = create((set, get) => ({
  // State
  fixtures: [],
  previewFixtures: [],
  calendarData: {},
  isLoading: false,
  isGenerating: false,
  error: null,
  selectedFixture: null,
  filters: {
    status: '',
    sport_type: '',
    from_date: '',
    to_date: ''
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  },
  generationConfig: {
    sport_type: 'football',
    hall_id: '',
    start_date: '',
    match_time: '15:00',
    match_days: ['saturday'],
    matches_per_week: 2,
    include_return_leg: false,
    return_leg_gap_days: 7
  },
  generationSummary: null,

  // Actions
  setFixtures: (fixtures) => set({ fixtures }),
  setPreviewFixtures: (previewFixtures) => set({ previewFixtures }),
  setLoading: (isLoading) => set({ isLoading }),
  setGenerating: (isGenerating) => set({ isGenerating }),
  setError: (error) => set({ error }),
  setSelectedFixture: (selectedFixture) => set({ selectedFixture }),

  setFilters: (filters) => set((state) => ({ 
    filters: { ...state.filters, ...filters },
    pagination: { ...state.pagination, page: 1 }
  })),

  setPagination: (pagination) => set((state) => ({ 
    pagination: { ...state.pagination, ...pagination } 
  })),

  setGenerationConfig: (config) => set((state) => ({ 
    generationConfig: { ...state.generationConfig, ...config } 
  })),

  setGenerationSummary: (generationSummary) => set({ generationSummary }),

  resetPreview: () => set({ previewFixtures: [], generationSummary: null }),

  // Computed
  getFilteredFixtures: () => {
    const { fixtures, filters } = get();
    return fixtures.filter(fixture => {
      if (filters.status && fixture.status !== filters.status) return false;
      if (filters.sport_type && fixture.homeTeam?.sport_type !== filters.sport_type) return false;
      return true;
    });
  },

  getUpcomingFixtures: () => {
    const { fixtures } = get();
    const now = new Date();
    return fixtures
      .filter(f => new Date(f.match_date) > now && f.status === 'scheduled')
      .sort((a, b) => new Date(a.match_date) - new Date(b.match_date))
      .slice(0, 5);
  },

  getFixturesByDate: (date) => {
    const { fixtures } = get();
    const dateStr = new Date(date).toISOString().split('T')[0];
    return fixtures.filter(f => {
      const fixtureDate = new Date(f.match_date).toISOString().split('T')[0];
      return fixtureDate === dateStr;
    });
  }
}));
