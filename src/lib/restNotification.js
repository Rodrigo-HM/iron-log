// Programa una notificación local al terminar el descanso, para que pite/vibre
// aunque la app esté minimizada o el teléfono bloqueado.

export async function ensureNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch {
    return false;
  }
}

async function getSWRegistration() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return (await navigator.serviceWorker.getRegistration()) ?? null;
  } catch {
    return null;
  }
}

export async function scheduleRestEnd(delayMs) {
  const reg = await getSWRegistration();
  if (!reg?.active) return;
  reg.active.postMessage({
    type: 'SCHEDULE_REST_END',
    delayMs,
    title: 'Descanso terminado',
    body: '¡A por la siguiente serie!',
  });
}

export async function cancelRestEnd() {
  const reg = await getSWRegistration();
  if (!reg?.active) return;
  reg.active.postMessage({ type: 'CANCEL_REST_END' });
}
