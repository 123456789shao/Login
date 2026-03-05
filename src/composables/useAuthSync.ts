/** 多标签页鉴权同步：通过 BroadcastChannel 与 storage 事件同步登录态。 */
import type { AuthEvent } from '../types/auth';

const CHANNEL_NAME = 'enterprise-auth-events';
const STORAGE_KEY = '__enterprise_auth_event__';

interface AuthSyncStoreLike {
  handleExternalEvent(type: string, payload?: Record<string, unknown>): void;
}

function createAuthEvent(type: string, payload: Record<string, unknown> = {}): AuthEvent {
  return {
    type,
    payload,
    at: Date.now(),
  };
}

export function publishAuthEvent(type: string, payload: Record<string, unknown> = {}): void {
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

export function setupAuthSync(authStore: AuthSyncStoreLike): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  let channel: BroadcastChannel | undefined;

  const onEvent = (event: Partial<AuthEvent> | null | undefined): void => {
    if (!event || !event.type) {
      return;
    }

    authStore.handleExternalEvent(event.type, event.payload);
  };

  if ('BroadcastChannel' in window) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener('message', (messageEvent: MessageEvent<AuthEvent>) => {
      onEvent(messageEvent.data);
    });
  }

  const onStorage = (storageEvent: StorageEvent): void => {
    if (storageEvent.key !== STORAGE_KEY || !storageEvent.newValue) {
      return;
    }

    try {
      const event = JSON.parse(storageEvent.newValue) as Partial<AuthEvent>;
      onEvent(event);
    } catch {
      // 忽略格式异常的同步事件。
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