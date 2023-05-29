function getPluginVersion() {
	const manifest = require('../../public/manifest.json');
	const { version } = manifest;
	const { major, minor, patch } = version;
	return `${major}.${minor}.${patch}`;
}
export { getPluginVersion };
