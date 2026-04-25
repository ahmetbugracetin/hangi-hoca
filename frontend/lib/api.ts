const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Bir hata oluştu' }));
    throw new Error(error.error || 'Bir hata oluştu');
  }
  return res.json();
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// Auth
export const api = {
  auth: {
    register: (email: string, password: string) =>
      fetcher('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
    login: (email: string, password: string) =>
      fetcher<{ token: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    me: (token: string) =>
      fetcher<{ user: import('@/types').User }>('/auth/me', { headers: authHeaders(token) }),
  },
  instructors: {
    list: (params?: { search?: string; department?: string; page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.set('search', params.search);
      if (params?.department) searchParams.set('department', params.department);
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.limit) searchParams.set('limit', String(params.limit));
      return fetcher<{ data: import('@/types').Instructor[]; total: number; page: number; totalPages: number }>(
        `/instructors?${searchParams}`
      );
    },
    getBySlug: (slug: string) =>
      fetcher<import('@/types').Instructor>(`/instructors/${slug}`),
    getReviews: (slug: string, page?: number) =>
      fetcher<{ data: import('@/types').Review[]; total: number }>(`/instructors/${slug}/reviews?page=${page || 1}`),
  },
  courses: {
    list: (params?: { search?: string; department?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.set('search', params.search);
      if (params?.department) searchParams.set('department', params.department);
      return fetcher<{ data: import('@/types').Course[] }>(`/courses?${searchParams}`);
    },
    getByCode: (code: string) =>
      fetcher<import('@/types').Course>(`/courses/${code}`),
  },
  reviews: {
    create: (token: string, data: {
      instructorId: number; courseId: number; semester: string;
      clarity: number; fairness: number; workload: number;
      attendance: boolean; wouldRetake: boolean; comment: string;
    }) =>
      fetcher('/reviews', { method: 'POST', body: JSON.stringify(data), headers: authHeaders(token) }),
    vote: (token: string, id: number, type: 'up' | 'down') =>
      fetcher(`/reviews/${id}/vote`, { method: 'POST', body: JSON.stringify({ type }), headers: authHeaders(token) }),
    delete: (token: string, id: number) =>
      fetcher(`/reviews/${id}`, { method: 'DELETE', headers: authHeaders(token) }),
  },
  departments: {
    list: () => fetcher<import('@/types').Department[]>('/departments'),
  },
  stats: {
    get: () => fetcher<import('@/types').Stats>('/stats'),
  },
};
