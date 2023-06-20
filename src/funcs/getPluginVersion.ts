/**
 * Returns the version number of the plugin by reading it from the manifest file.
 * @returns A string representing the version number in the format "major.minor.patch".
 */
function getPluginVersion() {
	const manifest = require('../../public/manifest.json');
	const { version } = manifest;
	const { major, minor, patch } = version;
	return `${major}.${minor}.${patch}`;
}
export { getPluginVersion };
