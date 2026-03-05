const CHANNEL_NAME = 'enterprise-auth-events';
const STORAGE_KEY = '__enterprise_auth_event__';

function createAuthEvent(type, payload = {}) {
  return {
    type,
    payload,
    at: Date.now(),
  };
}

export function publishAuthEvent(type, payload = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  const event = createAuthEvent(type, payload);

  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage(event);
    channel.close();
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(event));
  window.localStorage.removeItem(STORAGE_KEY);
}

export function setupAuthSync(authStore) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  let channel;

  const onEvent = (event) => {
    if (!event || !event.type) {
      return;
    }
    authStore.handleExternalEvent(event.type, event.payload);
  };

  if ('BroadcastChannel' in window) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener('message', (messageEvent) => {
      onEvent(messageEvent.data);
    });
  }

  const onStorage = (storageEvent) => {
    if (storageEvent.key !== STORAGE_KEY || !storageEvent.newValue) {
      return;
    }

    try {
      const event = JSON.parse(storageEvent.newValue);
      onEvent(event);
    } catch {
      // Ignore malformed events.
    }
  };

  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener('storage', onStorage);
    if (channel) {
      channel.close();
    }
  };
}