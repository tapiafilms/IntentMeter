// Module-level store for PWA beforeinstallprompt event
let _prompt = null
const _listeners = new Set()

export function setInstallPrompt(e) {
  _prompt = e
  _listeners.forEach(fn => fn(e))
}

export function getInstallPrompt() {
  return _prompt
}

export function onInstallPromptChange(fn) {
  _listeners.add(fn)
  return () => _listeners.delete(fn)
}
