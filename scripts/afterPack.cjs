const { execFileSync } = require("node:child_process")
const path = require("node:path")

// mac.identity is null (no Apple Developer ID), so electron-builder skips
// signing entirely. An ad-hoc signature is not a substitute for a real
// certificate — Gatekeeper still shows the "unidentified developer"
// warning on first launch — but macOS requires *some* signature just to
// execute an arm64 binary, so without this the packaged app fails to
// launch on Apple Silicon with "app is damaged". This has to run here,
// before electron-builder wraps the .app into the .dmg/.zip, since
// signing after packaging never touches what actually ships.
module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return

  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
  execFileSync("codesign", ["--force", "--deep", "--sign", "-", appPath], { stdio: "inherit" })
}
