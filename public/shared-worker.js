// SHARED WORKER: a single instance shared by ALL the open tabs of the app.
// It tells the other tabs when one of them changes data (quotes, rates).

const ports = new Set();
let lastChange = null; // shared state: the last thing that happened, even for tabs opened later

function sendToAll(message) {
  for (const port of ports) port.postMessage(message);
}

function sendToOthers(message, origin) {
  for (const port of ports) {
    if (port !== origin) port.postMessage(message);
  }
}

self.onconnect = (event) => {
  const port = event.ports[0];
  ports.add(port);

  port.onmessage = (message) => {
    const data = message.data || {};

    if (data.type === 'data-changed') {
      lastChange = { action: String(data.action || 'change'), at: Date.now() };
      sendToOthers({ type: 'data-changed', ...lastChange }, port);
    }

    if (data.type === 'disconnect') {
      ports.delete(port);
      sendToAll({ type: 'tabs', total: ports.size });
    }
  };

  // The new tab gets the current state and every other tab learns there is one more
  port.postMessage({ type: 'hello', total: ports.size, lastChange });
  sendToOthers({ type: 'tabs', total: ports.size }, port);
};
