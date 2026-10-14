// SHARED WORKER: una única instancia compartida por TODAS las pestañas abiertas de la app.
// Sirve para avisar a las demás pestañas cuando una de ellas modifica datos (cotizaciones, clientes, tarifas).

const puertos = new Set();
let ultimoCambio = null; // estado compartido: lo último que ocurrió, aunque la pestaña se abra después

function enviarATodos(mensaje) {
  for (const puerto of puertos) puerto.postMessage(mensaje);
}

function enviarAOtros(mensaje, origen) {
  for (const puerto of puertos) {
    if (puerto !== origen) puerto.postMessage(mensaje);
  }
}

self.onconnect = (evento) => {
  const puerto = evento.ports[0];
  puertos.add(puerto);

  puerto.onmessage = (mensaje) => {
    const datos = mensaje.data || {};

    if (datos.tipo === 'cambio-datos') {
      ultimoCambio = { accion: String(datos.accion || 'cambio'), hora: Date.now() };
      enviarAOtros({ tipo: 'cambio-datos', ...ultimoCambio }, puerto);
    }

    if (datos.tipo === 'desconectar') {
      puertos.delete(puerto);
      enviarATodos({ tipo: 'pestanas', total: puertos.size });
    }
  };

  // La pestaña nueva recibe el estado actual y todas las demás se enteran de que hay una más
  puerto.postMessage({ tipo: 'inicio', total: puertos.size, ultimoCambio });
  enviarAOtros({ tipo: 'pestanas', total: puertos.size }, puerto);
};
