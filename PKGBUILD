# Maintainer: Neil Manfred <neil.manfred@fredianshield.com>
# SPDX-License-Identifier: Apache-2.0
# hatterm — fork of Wave Terminal with extended AI providers, drag-and-drop file copy, and AI usage counter.

pkgname=hatterm
pkgver=0.1.0
pkgrel=1
pkgdesc="Open-Source AI-Native Terminal — hatterm fork of Wave Terminal"
arch=('x86_64' 'aarch64')
url="https://github.com/neilmanfredit/hatterm"
license=('Apache-2.0')
depends=('gtk3' 'nss' 'alsa-lib' 'libnotify' 'libxss' 'libxtst' 'xdg-utils')
optdepends=(
    'kwallet: system keyring on KDE'
    'gnome-keyring: system keyring on GNOME'
    'python: for hatterm-counter statusline'
)
provides=('hatterm')
conflicts=('hatterm-bin')

# Source is the .pacman archive produced by `task package`.
# When building from a release tag, replace the URL below with the GitHub Releases asset URL.
source_x86_64=("${pkgname}-${pkgver}-x86_64.pacman")
source_aarch64=("${pkgname}-${pkgver}-aarch64.pacman")
noextract=("${pkgname}-${pkgver}-x86_64.pacman" "${pkgname}-${pkgver}-aarch64.pacman")

sha256sums_x86_64=('SKIP')
sha256sums_aarch64=('SKIP')

package() {
    local _arch
    case "$CARCH" in
        x86_64)  _arch="x86_64" ;;
        aarch64) _arch="aarch64" ;;
    esac

    bsdtar -xf "${pkgname}-${pkgver}-${_arch}.pacman" -C "${pkgdir}"

    # Ensure the binary is executable and symlinked to /usr/bin
    chmod 755 "${pkgdir}/opt/${pkgname}/${pkgname}" || true
    install -dm755 "${pkgdir}/usr/bin"
    ln -sf "/opt/${pkgname}/${pkgname}" "${pkgdir}/usr/bin/${pkgname}"

    # chrome-sandbox needs setuid
    chmod 4755 "${pkgdir}/opt/${pkgname}/chrome-sandbox" || true
}
