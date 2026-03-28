import { apiRequest } from '../../services/apiClient';

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  count: number;
  status: 'visible' | 'hidden';
  order: number;
  showOnMenu: boolean;
  image: string;
  description: string;
}

export const adminCategoryService = {
  getAll: async (): Promise<Category[]> => {
    return apiRequest<Category[]>('/api/categories/admin/all', {}, { auth: true });
  },

  create: async (data: Partial<Category>): Promise<Category> => {
    const body = {
      ...data,
      isVisible: data.status === 'visible'
    };
    return apiRequest<Category>('/api/categories/admin', {
      method: 'POST',
      body: JSON.stringify(body),
    }, { auth: true });
  },

  update: async (id: string, data: Partial<Category>): Promise<Category> => {
    const body = {
      ...data,
      ...(data.status ? { isVisible: data.status === 'visible' } : {})
    };
    return apiRequest<Category>(`/api/categories/admin/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }, { auth: true });
  },

  updateStatus: async (id: string, status: 'visible' | 'hidden', showOnMenu: boolean): Promise<Category> => {
    return apiRequest<Category>(`/api/categories/admin/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isVisible: status === 'visible', showOnMenu }),
    }, { auth: true });
  },

  delete: async (id: string): Promise<void> => {
    return apiRequest<void>(`/api/categories/admin/${id}`, {
      method: 'DELETE',
    }, { auth: true });
  },
};
