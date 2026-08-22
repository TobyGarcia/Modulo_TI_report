const QRCode = require('qrcode');
const os = require('os');

function getLocalIpAddress() {
  if (process.env.SERVER_HOST_IP) {
    return process.env.SERVER_HOST_IP;
  }

  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Ignorar interfaces de Docker (172.17.x.x, 172.18.x.x) e internas
      if (iface.family === 'IPv4' && !iface.internal) {
        if (!iface.address.startsWith('172.17.') && !iface.address.startsWith('172.18.')) {
          return iface.address;
        }
      }
    }
  }
  return null;
}

async function generateQRDataUrl(dataString) {
  try {
    return await QRCode.toDataURL(dataString, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 300,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Error al generar código QR:', err);
    throw err;
  }
}

module.exports = {
  getLocalIpAddress,
  generateQRDataUrl,
};
