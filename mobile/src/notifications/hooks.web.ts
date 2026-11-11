// Browsers get no push notifications: the web build (for trying the app on a
// computer) uses these no-op versions of ./hooks.ts.

export function usePushRegistration(): void {}

export function useNotificationRouting(): void {}

export function useInboxSync(_unread: number, _enabled: boolean): void {}
