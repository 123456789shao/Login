import { authHttp, http } from './http';

export async function loginRequest(credentials) {
  const { data } = await authHttp.post('/auth/login', credentials, {
    skipAuthRefresh: true,
  });
  return data;
}

export async function refreshRequest() {
  const { data } = await authHttp.post(
    '/auth/refresh',
    {},
    {
      skipAuthRefresh: true,
    }
  );
  return data;
}

export async function logoutRequest() {
  const { data } = await authHttp.post(
    '/auth/logout',
    {},
    {
      skipAuthRefresh: true,
    }
  );
  return data;
}

export async function logoutAllRequest() {
  const { data } = await http.post('/auth/logout-all');
  return data;
}

export async function getMyProfile(options = {}) {
  const { skipAuthRefresh = false } = options;
  const { data } = await http.get('/auth/me', {
    skipAuthRefresh,
  });
  return data;
}