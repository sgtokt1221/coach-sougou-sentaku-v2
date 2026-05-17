/**
 * Consulting Deck — Icon PNG generator
 * Usage: NODE_PATH=<path-to-node_modules> node generate-icons.js <output-dir> [color]
 * Generates a standard set of consulting-style icons as PNG files.
 */
const React = require('react');
const ReactDOMServer = require('react-dom/server');
const sharp = require('sharp');
const path = require('path');
const {
  FaShieldAlt, FaServer, FaLaptopCode, FaExchangeAlt, FaChartLine,
  FaRobot, FaCogs, FaCheckCircle, FaFileAlt, FaSync, FaUsers,
  FaLock, FaBolt, FaGlobe, FaDatabase, FaCloud, FaCode,
  FaHandshake, FaChartBar, FaClipboardCheck
} = require('react-icons/fa');

async function rasterize(Icon, color, size, filepath) {
  const svg = ReactDOMServer.renderToStaticMarkup(
    React.createElement(Icon, { color: '#' + color, size: String(size) })
  );
  await sharp(Buffer.from(svg)).png().toFile(filepath);
}

const dir = process.argv[2] || '.';
const accent = process.argv[3] || '2563eb';
const green = '059669';
const red = 'dc2626';

(async () => {
  const icons = [
    [FaShieldAlt, accent, 64, 'icon-shield.png'],
    [FaSync, accent, 64, 'icon-sync.png'],
    [FaCogs, accent, 64, 'icon-cogs.png'],
    [FaServer, red, 48, 'icon-server-red.png'],
    [FaLaptopCode, green, 48, 'icon-browser-green.png'],
    [FaExchangeAlt, accent, 48, 'icon-exchange.png'],
    [FaRobot, accent, 48, 'icon-robot.png'],
    [FaCheckCircle, green, 48, 'icon-check-green.png'],
    [FaFileAlt, accent, 48, 'icon-file.png'],
    [FaChartLine, accent, 48, 'icon-chart.png'],
    [FaUsers, accent, 48, 'icon-users.png'],
    [FaLock, accent, 48, 'icon-lock.png'],
    [FaBolt, accent, 48, 'icon-bolt.png'],
    [FaGlobe, accent, 48, 'icon-globe.png'],
    [FaDatabase, accent, 48, 'icon-database.png'],
    [FaCloud, accent, 48, 'icon-cloud.png'],
    [FaCode, accent, 48, 'icon-code.png'],
    [FaHandshake, accent, 48, 'icon-handshake.png'],
    [FaChartBar, accent, 48, 'icon-bar-chart.png'],
    [FaClipboardCheck, accent, 48, 'icon-clipboard.png'],
  ];
  for (const [Icon, color, size, name] of icons) {
    await rasterize(Icon, color, size, path.join(dir, name));
  }
  console.log(`Generated ${icons.length} icons in ${dir}/`);
})();
