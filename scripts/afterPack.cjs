const { execFileSync } = require("node:child_process")
const crypto = require("node:crypto")
const fs = require("node:fs")
const path = require("node:path")

function hasUsableIdentity(name) {
  try {
    const output = execFileSync("security", ["find-identity", "-v", "-p", "codesigning"], { encoding: "utf8" })
    return output.includes(`"${name}"`)
  } catch {
    return false
  }
}

// RFC 4122 UUIDv5 — deterministic: the same (namespace, name) pair always
// hashes to the same bytes. The namespace is the DNS namespace from the
// RFC's own example appendix, used here only as a fixed anchor; the name is
// the app's own bundle id, so every build of this app produces the same
// UUID, and only a change to the bundle id itself would produce a different
// one.
const DNS_NAMESPACE = Buffer.from("6ba7b8109dad11d180b400c04fd430c8", "hex")

function uuidv5(name) {
  const hash = crypto
    .createHash("sha1")
    .update(Buffer.concat([DNS_NAMESPACE, Buffer.from(name, "utf8")]))
    .digest()
  const bytes = Buffer.from(hash.subarray(0, 16))
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  return bytes
}

// Electron ships one prebuilt main executable to everyone who depends on a
// given release — electron-builder renames it but never relinks it, so its
// Mach-O LC_UUID load command is byte-identical across every app built from
// that Electron version, this app included. macOS's Local Network privacy
// check keys off that UUID rather than the bundle id, so it misattributes
// this app's traffic to whatever the OS last associated with the shared
// UUID — stock Electron, another local Electron project, even Claude
// Desktop, all of which carry the exact same UUID on this machine. See
// electron-userland/electron-builder#9158 and Agent-Clubhouse/Clubhouse#1849
// for the same bug in other projects.
//
// This overwrites the executable's LC_UUID with one derived from this app's
// own bundle id, so it's stable across every build of this app but no
// longer collides with Electron's stock UUID or any other app's. It must
// happen here, before electron-builder's own signing step runs — modifying
// a Mach-O binary after it's signed invalidates that signature; signing
// after this hook returns re-signs over the patched bytes instead.
const LC_UUID = 0x1b
const MH_MAGIC_64 = 0xfeedfacf

function patchMachOUUID(binaryPath, newUuid) {
  const buf = fs.readFileSync(binaryPath)
  const magic = buf.readUInt32LE(0)
  if (magic !== MH_MAGIC_64) {
    throw new Error(
      `${binaryPath}: expected a thin 64-bit Mach-O (magic 0x${MH_MAGIC_64.toString(16)}), got 0x${magic.toString(16)}`
    )
  }

  const ncmds = buf.readUInt32LE(16)
  let offset = 32 // sizeof(mach_header_64)

  for (let i = 0; i < ncmds; i++) {
    const cmd = buf.readUInt32LE(offset)
    const cmdsize = buf.readUInt32LE(offset + 4)
    if (cmd === LC_UUID) {
      newUuid.copy(buf, offset + 8)
      fs.writeFileSync(binaryPath, buf)
      return
    }
    offset += cmdsize
  }

  throw new Error(`${binaryPath}: no LC_UUID load command found`)
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

  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
  const infoPlistPath = path.join(appPath, "Contents", "Info.plist")
  const bundleId = execFileSync("plutil", ["-extract", "CFBundleIdentifier", "raw", "-o", "-", infoPlistPath], {
    encoding: "utf8"
  }).trim()

  const executablePath = path.join(appPath, "Contents", "MacOS", context.packager.appInfo.productFilename)
  patchMachOUUID(executablePath, uuidv5(bundleId))
}
