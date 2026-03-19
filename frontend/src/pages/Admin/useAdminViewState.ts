import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { clearPersistedAdminView, getPersistedAdminView, setPersistedAdminView, shareAdminViewUrl } from './adminListView';

type SortDirection = 'asc' | 'desc';

interface ExtraFilterConfig {
  key: string;
  defaultValue: string;
  aliases?: string[];
  validate?: (value: string) => boolean;
}

interface UseAdminViewStateOptions {
  storageKey: string;
  path: string;
  validStatusKeys: readonly string[];
  defaultStatus?: string;
  statusAliases?: string[];
  validSortKeys?: readonly string[];
  extraFilters?: readonly ExtraFilterConfig[];
}

const safePageFromQuery = (value: string | null) => {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
};

const normalizeDirection = (value: string | null): SortDirection => (value === 'desc' ? 'desc' : 'asc');

const pickStatusFromQuery = (
  params: URLSearchParams,
  statusParamNames: readonly string[],
  validStatusKeys: Set<string>,
  fallbackStatus: string,
) => {
  for (const name of statusParamNames) {
    const raw = params.get(name) || '';
    if (validStatusKeys.has(raw)) return raw;
  }
  return fallbackStatus;
};

const EMPTY_EXTRA_FILTERS: readonly ExtraFilterConfig[] = [];

export const useAdminViewState = ({
  storageKey,
  path,
  validStatusKeys,
  defaultStatus = 'all',
  statusAliases = [],
  validSortKeys,
  extraFilters = EMPTY_EXTRA_FILTERS,
}: UseAdminViewStateOptions) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const lastCommittedQueryRef = useRef<string | null>(null);
  
  const validStatusStr = validStatusKeys.join(',');
  const validStatusSet = useMemo(() => new Set(validStatusStr.split(',').filter(Boolean)), [validStatusStr]);
  
  const validSortStr = (validSortKeys || []).join(',');
  const validSortSet = useMemo(() => new Set(validSortStr ? validSortStr.split(',') : []), [validSortStr]);
  
  const statusParamNamesStr = ['status', ...(statusAliases || [])].join(',');
  const statusParamNames = useMemo(() => statusParamNamesStr.split(','), [statusParamNamesStr]);

  const [status, setStatusState] = useState<string>(() => {
    const fromQuery = pickStatusFromQuery(searchParams, statusParamNames, validStatusSet, '');
    if (fromQuery) return fromQuery;
    const persisted = getPersistedAdminView(storageKey);
    return validStatusSet.has(persisted) ? persisted : defaultStatus;
  });

  const [search, setSearchState] = useState<string>(() => searchParams.get('q') || '');
  const [page, setPageState] = useState<number>(() => safePageFromQuery(searchParams.get('page')));
  const [sortKey, setSortKeyState] = useState<string | null>(() => {
    const rawSort = searchParams.get('sort') || '';
    if (!rawSort) return null;
    if (validSortSet.size > 0 && !validSortSet.has(rawSort)) return null;
    return rawSort;
  });
  const [sortDirection, setSortDirectionState] = useState<SortDirection>(() => normalizeDirection(searchParams.get('dir')));
  const [extras, setExtras] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    extraFilters.forEach((config) => {
      const keys = [config.key, ...(config.aliases || [])];
      let candidate = '';
      for (const key of keys) {
        const value = searchParams.get(key);
        if (value !== null) {
          candidate = value;
          break;
        }
      }
      if (!candidate) {
        next[config.key] = config.defaultValue;
        return;
      }
      if (config.validate && !config.validate(candidate)) {
        next[config.key] = config.defaultValue;
        return;
      }
      next[config.key] = candidate;
    });
    return next;
  });

  const buildParamsFromState = (state: {
    status: string;
    search: string;
    page: number;
    sortKey: string | null;
    sortDirection: SortDirection;
    extras: Record<string, string>;
  }) => {
    const params = new URLSearchParams();
    if (state.status !== defaultStatus) params.set('status', state.status);
    if (state.search.trim()) params.set('q', state.search.trim());
    if (state.page > 1) params.set('page', String(state.page));
    if (state.sortKey) {
      params.set('sort', state.sortKey);
      params.set('dir', state.sortDirection);
    }
    extraFilters.forEach((config) => {
      const value = state.extras[config.key];
      if (value && value !== config.defaultValue) params.set(config.key, value);
    });
    return params;
  };

  const commitQuery = (state: {
    status: string;
    search: string;
    page: number;
    sortKey: string | null;
    sortDirection: SortDirection;
    extras: Record<string, string>;
  }) => {
    const params = buildParamsFromState(state);
    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();
    if (nextQuery === currentQuery) return;
    if (lastCommittedQueryRef.current !== null && lastCommittedQueryRef.current === nextQuery) return;
    lastCommittedQueryRef.current = nextQuery;
    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    if (lastCommittedQueryRef.current !== null && lastCommittedQueryRef.current === searchParams.toString()) {
      lastCommittedQueryRef.current = null;
    }

    const fromQuery = pickStatusFromQuery(searchParams, statusParamNames, validStatusSet, defaultStatus);
    setStatusState((prev) => (prev === fromQuery ? prev : fromQuery));

    const nextSearch = searchParams.get('q') || '';
    setSearchState((prev) => (prev === nextSearch ? prev : nextSearch));

    const nextPage = safePageFromQuery(searchParams.get('page'));
    setPageState((prev) => (prev === nextPage ? prev : nextPage));

    const rawSort = searchParams.get('sort') || '';
    const nextSortKey = rawSort && (validSortSet.size === 0 || validSortSet.has(rawSort)) ? rawSort : null;
    setSortKeyState((prev) => (prev === nextSortKey ? prev : nextSortKey));

    const nextSortDirection = normalizeDirection(searchParams.get('dir'));
    setSortDirectionState((prev) => (prev === nextSortDirection ? prev : nextSortDirection));

    let shouldUpdateExtras = false;
    const nextExtras: Record<string, string> = {};
    extraFilters.forEach((config) => {
      const keys = [config.key, ...(config.aliases || [])];
      let candidate = '';
      for (const key of keys) {
        const value = searchParams.get(key);
        if (value !== null) {
          candidate = value;
          break;
        }
      }
      if (!candidate) candidate = config.defaultValue;
      if (config.validate && !config.validate(candidate)) candidate = config.defaultValue;
      nextExtras[config.key] = candidate;
    });
    setExtras((prev) => {
      for (const key of Object.keys(nextExtras)) {
        if (prev[key] !== nextExtras[key]) {
          shouldUpdateExtras = true;
          break;
        }
      }
      if (!shouldUpdateExtras) return prev;
      return nextExtras;
    });
  }, [searchParams, statusParamNames, validStatusSet, defaultStatus, validSortSet, extraFilters]);

  useEffect(() => {
    setPersistedAdminView(storageKey, status);
  }, [storageKey, status]);

  const setStatus = (nextStatus: string) => {
    const normalized = validStatusSet.has(nextStatus) ? nextStatus : defaultStatus;
    const nextPage = 1;
    if (normalized !== status) setStatusState(normalized);
    if (page !== nextPage) setPageState(nextPage);
    commitQuery({ status: normalized, search, page: nextPage, sortKey, sortDirection, extras });
  };

  const setSearch = (value: string) => {
    const nextPage = 1;
    if (value !== search) setSearchState(value);
    if (page !== nextPage) setPageState(nextPage);
    commitQuery({ status, search: value, page: nextPage, sortKey, sortDirection, extras });
  };

  const setPage = (nextPage: number) => {
    const normalized = Number.isFinite(nextPage) ? Math.max(1, Math.floor(nextPage)) : 1;
    if (normalized !== page) setPageState(normalized);
    commitQuery({ status, search, page: normalized, sortKey, sortDirection, extras });
  };

  const setSort = (nextSortKey: string | null, nextDirection: SortDirection = 'asc') => {
    if (!nextSortKey) {
      const nextDirection: SortDirection = 'asc';
      const nextPage = 1;
      if (sortKey !== null) setSortKeyState(null);
      if (sortDirection !== nextDirection) setSortDirectionState(nextDirection);
      if (page !== nextPage) setPageState(nextPage);
      commitQuery({ status, search, page: nextPage, sortKey: null, sortDirection: nextDirection, extras });
      return;
    }
    if (validSortSet.size > 0 && !validSortSet.has(nextSortKey)) return;
    const nextPage = 1;
    if (nextSortKey !== sortKey) setSortKeyState(nextSortKey);
    if (nextDirection !== sortDirection) setSortDirectionState(nextDirection);
    if (page !== nextPage) setPageState(nextPage);
    commitQuery({ status, search, page: nextPage, sortKey: nextSortKey, sortDirection: nextDirection, extras });
  };

  const toggleSort = (key: string) => {
    if (validSortSet.size > 0 && !validSortSet.has(key)) return;
    if (sortKey !== key) {
      setSort(key, 'asc');
      return;
    }
    setSort(key, sortDirection === 'asc' ? 'desc' : 'asc');
  };

  const setExtra = (key: string, value: string) => {
    const config = extraFilters.find((item) => item.key === key);
    if (!config) return;
    const normalized = config.validate && !config.validate(value) ? config.defaultValue : value;
    const nextExtras = { ...extras, [key]: normalized };
    if (extras[key] !== normalized) {
      setExtras(nextExtras);
    }
    const nextPage = 1;
    if (page !== nextPage) setPageState(nextPage);
    commitQuery({ status, search, page: nextPage, sortKey, sortDirection, extras: nextExtras });
  };

  const shareCurrentView = async () => {
    await shareAdminViewUrl(`${path}${window.location.search}`);
  };

  const resetCurrentView = () => {
    const nextExtras = extraFilters.reduce<Record<string, string>>((acc, config) => {
      acc[config.key] = config.defaultValue;
      return acc;
    }, {});
    setStatusState(defaultStatus);
    setSearchState('');
    setPageState(1);
    setSortKeyState(null);
    setSortDirectionState('asc');
    setExtras(nextExtras);
    commitQuery({ status: defaultStatus, search: '', page: 1, sortKey: null, sortDirection: 'asc', extras: nextExtras });
    clearPersistedAdminView(storageKey);
  };

  const hasViewContext =
    status !== defaultStatus ||
    Boolean(search.trim()) ||
    page > 1 ||
    Boolean(sortKey) ||
    extraFilters.some((config) => extras[config.key] !== config.defaultValue);

  return {
    status,
    setStatus,
    search,
    setSearch,
    page,
    setPage,
    sortKey,
    sortDirection,
    setSort,
    toggleSort,
    extras,
    setExtra,
    shareCurrentView,
    resetCurrentView,
    hasViewContext,
  };
};
