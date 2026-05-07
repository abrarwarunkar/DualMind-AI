import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    timeout: 120000,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('researchmind_token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('researchmind_token');
                localStorage.removeItem('researchmind_user');
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                }
            }
        }
        if (error.code === 'ECONNABORTED') {
            console.error('Request timeout - please try again');
        }
        return Promise.reject(error);
    }
);

export default api;
