import { useEffect, useMemo, useState } from 'react';

interface UseAdminPaginationOptions {
  pageValue?: number;
  onPageChange?: (nextPage: number) => void;
}

export const useAdminPagination = <T,>(items: T[], pageSize = 10, options?: UseAdminPaginationOptions) => {
  const [internalPage, setInternalPage] = useState(1);
  const isPageControlled = typeof options?.pageValue === 'number';
  const page = isPageControlled ? Math.max(1, options?.pageValue || 1) : internalPage;

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const setPage = (nextPage: number | ((prevPage: number) => number)) => {
    const current = page;
    const resolved = typeof nextPage === 'function' ? nextPage(current) : nextPage;
    const safePage = Number.isFinite(resolved) ? Math.max(1, Math.floor(resolved)) : 1;
    if (safePage === page) return; // Prevent unnecessary page updates and infinite loops
    if (isPageControlled) {
      options?.onPageChange?.(safePage);
      return;
    }
    setInternalPage(safePage);
  };

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [items]);

  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  const pagedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const next = () => setPage((p) => Math.min(totalPages, p + 1));
  const prev = () => setPage((p) => Math.max(1, p - 1));

  return {
    page,
    setPage,
    total,
    totalPages,
    startIndex,
    endIndex,
    pagedItems,
    next,
    prev,
  };
};
