#!/bin/bash
# Modified by Neil Manfred, 2026: updated symlink targets from waveterm to hatterm.

if type update-alternatives 2>/dev/null >&1; then
    if [ -L '/usr/bin/hatterm' -a -e '/usr/bin/hatterm' -a "`readlink '/usr/bin/hatterm'`" != '/etc/alternatives/hatterm' ]; then
        rm -f '/usr/bin/hatterm'
    fi
    update-alternatives --install '/usr/bin/hatterm' 'hatterm' '/opt/hatterm/hatterm' 100 || ln -sf '/opt/hatterm/hatterm' '/usr/bin/hatterm'
else
    ln -sf '/opt/hatterm/hatterm' '/usr/bin/hatterm'
fi

chmod 4755 '/opt/hatterm/chrome-sandbox' || true

if hash update-mime-database 2>/dev/null; then
    update-mime-database /usr/share/mime || true
fi

if hash update-desktop-database 2>/dev/null; then
    update-desktop-database /usr/share/applications || true
fi
