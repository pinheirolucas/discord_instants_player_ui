const { execFileSync } = require("node:child_process")

function hasUsableIdentity(name) {
  try {
    const output = execFileSync("security", ["find-identity", "-v", "-p", "codesigning"], { encoding: "utf8" })
    return output.includes(`"${name}"`)
  } catch {
    return false
  }
}

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return

  const identity = context.packager.platformSpecificBuildOptions.identity
  if (!identity || !hasUsableIdentity(identity)) {
    throw new Error(
      `No usable macOS code-signing identity found (expected "${identity}"). ` +
        `Run "security find-identity -v -p codesigning" to see what's present and trusted.`
    )
  }
}
