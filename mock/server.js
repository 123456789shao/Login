import crypto from 'node:crypto';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';

const app = express();
const PORT = Number(process.env.MOCK_PORT || 3000);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

const users = [
  {
    id: 'u_admin',
    email: 'admin@corp.com',
    password: 'Admin@123',
    name: 'System Admin',
    roles: ['admin'],
    permissions: ['dashboard:read', 'admin:access', 'users:write', 'billing:read'],
  },
  {
    id: 'u_viewer',
    email: 'viewer@corp.com',
    password: 'Viewer@123',
    name: 'Data Viewer',
    roles: ['viewer'],
    permissions: ['dashboard:read'],
  },
];

const refreshSessions = new Map();
const userRefreshIndex = new Map();
const accessTokens = new Map();

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

function now() {
  return Date.now();
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function getUserById(userId) {
  return users.find((user) => user.id === userId) || null;
}

function findUserByCredentials(email, password) {
  return users.find((user) => user.email === email && user.password === password) || null;
}

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

function addRefreshToIndex(userId, refreshToken) {
  const tokenSet = userRefreshIndex.get(userId) ?? new Set();
  tokenSet.add(refreshToken);
  userRefreshIndex.set(userId, tokenSet);
}

function removeRefreshFromIndex(userId, refreshToken) {
  const tokenSet = userRefreshIndex.get(userId);
  if (!tokenSet) {
    return;
  }

  tokenSet.delete(refreshToken);
  if (!tokenSet.size) {
    userRefreshIndex.delete(userId);
  }
}

function issueAccessToken(userId) {
  const token = randomToken(24);
  accessTokens.set(token, {
    userId,
    expiresAt: now() + ACCESS_TOKEN_TTL_SECONDS * 1000,
  });
  return token;
}

function issueRefreshToken(userId, sessionGroup = randomToken(8)) {
  const refreshToken = randomToken(32);
  refreshSessions.set(refreshToken, {
    userId,
    sessionGroup,
    expiresAt: now() + REFRESH_TOKEN_TTL_SECONDS * 1000,
  });
  addRefreshToIndex(userId, refreshToken);
  return refreshToken;
}

function revokeRefreshToken(refreshToken) {
  const existing = refreshSessions.get(refreshToken);
  if (!existing) {
    return;
  }

  refreshSessions.delete(refreshToken);
  removeRefreshFromIndex(existing.userId, refreshToken);
}

function revokeAllRefreshTokens(userId) {
  const tokenSet = userRefreshIndex.get(userId);
  if (!tokenSet) {
    return;
  }

  for (const token of tokenSet) {
    refreshSessions.delete(token);
  }

  userRefreshIndex.delete(userId);
}

function setRefreshCookie(res, refreshToken) {
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie('refresh_token', {
    path: '/api/auth',
  });
}

function getAccessSession(token) {
  const session = accessTokens.get(token);
  if (!session) {
    return null;
  }

  if (session.expiresAt < now()) {
    accessTokens.delete(token);
    return null;
  }

  return session;
}

function parseBearerToken(headerValue = '') {
  if (!headerValue.startsWith('Bearer ')) {
    return null;
  }
  return headerValue.slice(7).trim();
}

function requireAccessToken(req, res, next) {
  const token = parseBearerToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing access token.' });
  }

  const session = getAccessSession(token);
  if (!session) {
    return res.status(401).json({ code: 'TOKEN_EXPIRED', message: 'Access token expired.' });
  }

  req.userId = session.userId;
  return next();
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, at: new Date().toISOString() });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body ?? {};
  const user = findUserByCredentials(email, password);

  if (!user) {
    return res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' });
  }

  const sessionGroup = randomToken(8);
  const refreshToken = issueRefreshToken(user.id, sessionGroup);
  const accessToken = issueAccessToken(user.id);

  setRefreshCookie(res, refreshToken);

  return res.json({
    accessToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    tokenType: 'Bearer',
  });
});

app.post('/api/auth/refresh', (req, res) => {
  const currentRefreshToken = req.cookies.refresh_token;
  if (!currentRefreshToken) {
    return res.status(401).json({ code: 'NO_REFRESH_TOKEN', message: 'Missing refresh token.' });
  }

  const session = refreshSessions.get(currentRefreshToken);
  if (!session || session.expiresAt < now()) {
    revokeRefreshToken(currentRefreshToken);
    clearRefreshCookie(res);
    return res.status(401).json({ code: 'REFRESH_EXPIRED', message: 'Refresh token expired.' });
  }

  // Rotate refresh token to limit replay risk.
  revokeRefreshToken(currentRefreshToken);
  const rotatedRefreshToken = issueRefreshToken(session.userId, session.sessionGroup);
  const newAccessToken = issueAccessToken(session.userId);
  setRefreshCookie(res, rotatedRefreshToken);

  return res.json({
    accessToken: newAccessToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    tokenType: 'Bearer',
  });
});

app.get('/api/auth/me', requireAccessToken, (req, res) => {
  const user = getUserById(req.userId);
  if (!user) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid user session.' });
  }

  return res.json({
    user: toPublicUser(user),
    roles: user.roles,
    permissions: user.permissions,
  });
});

app.post('/api/auth/logout', (req, res) => {
  const refreshToken = req.cookies.refresh_token;
  if (refreshToken) {
    revokeRefreshToken(refreshToken);
  }

  clearRefreshCookie(res);
  return res.json({ success: true });
});

app.post('/api/auth/logout-all', requireAccessToken, (req, res) => {
  revokeAllRefreshTokens(req.userId);
  clearRefreshCookie(res);
  return res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`[mock-auth] running on http://localhost:${PORT}`);
  console.log(`[mock-auth] allowed origin: ${FRONTEND_ORIGIN}`);
});