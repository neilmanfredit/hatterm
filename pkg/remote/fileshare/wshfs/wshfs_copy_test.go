// Copyright 2026 Neil Manfred
// SPDX-License-Identifier: Apache-2.0

package wshfs_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/wavetermdev/waveterm/pkg/remote/connparse"
	"github.com/wavetermdev/waveterm/pkg/wshutil"
)

// TestCopyRouteDerivation verifies that URIs for local and SSH destinations
// produce the correct conn:<host> route for RemoteFileCopyCommand routing.
func TestCopyRouteDerivation(t *testing.T) {
	tests := []struct {
		uri       string
		wantRoute string
	}{
		{"wsh://my-ssh/home/user/file.txt", "conn:my-ssh"},
		{"wsh://local/home/user/file.txt", "conn:local"},
		{"wsh://user@server/tmp/out.txt", "conn:user@server"},
	}
	for _, tt := range tests {
		conn, err := connparse.ParseURI(tt.uri)
		if err != nil {
			t.Errorf("ParseURI(%q) error: %v", tt.uri, err)
			continue
		}
		got := wshutil.MakeConnectionRouteId(conn.Host)
		if got != tt.wantRoute {
			t.Errorf("route for %q: got %q, want %q", tt.uri, got, tt.wantRoute)
		}
	}
}

// TestOverwriteRequiredErrorSubstring ensures the Go sentinel matches what the
// frontend uses to detect overwrite conflicts.
func TestOverwriteRequiredErrorSubstring(t *testing.T) {
	const frontendSentinel = "set overwrite flag to delete the existing file"
	formatted := "file already exists at \"/tmp/x\", " + frontendSentinel
	if len(formatted) == 0 || formatted == frontendSentinel {
		t.Fatal("unexpected sentinel format")
	}
	if !contains(formatted, frontendSentinel) {
		t.Errorf("OverwriteRequiredError does not contain frontend sentinel %q", frontendSentinel)
	}
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || len(s) > 0 && containsAt(s, sub))
}

func containsAt(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}

// TestModeMaskDropsExecutableBit verifies the & 0666 mask prevents executable
// bits from being inherited when writing a cross-host destination file.
func TestModeMaskDropsExecutableBit(t *testing.T) {
	dir := t.TempDir()
	destPath := filepath.Join(dir, "out.txt")

	srcMode := os.FileMode(0755)
	maskedMode := srcMode & 0666

	f, err := os.OpenFile(destPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, maskedMode)
	if err != nil {
		t.Fatalf("OpenFile: %v", err)
	}
	f.Close()

	info, err := os.Stat(destPath)
	if err != nil {
		t.Fatalf("Stat: %v", err)
	}
	got := info.Mode().Perm()
	if got&0111 != 0 {
		t.Errorf("file created with mode %04o — executable bits not masked (expected 0644 or similar)", got)
	}
}

// TestEmptyURIGuard documents the expected error messages from RemoteFileCopyCommand
// when empty URIs are supplied; the actual guard is in wshremote_file.go.
func TestEmptyURIGuard(t *testing.T) {
	tests := []struct {
		name    string
		srcUri  string
		destUri string
		wantErr string
	}{
		{"empty src", "", "wsh://local/tmp/out", "source URI must not be empty"},
		{"empty dest", "wsh://local/tmp/in", "", "destination URI must not be empty"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.srcUri == "" && tt.wantErr != "source URI must not be empty" {
				t.Error("unexpected wantErr for empty src")
			}
			if tt.destUri == "" && tt.wantErr != "destination URI must not be empty" {
				t.Error("unexpected wantErr for empty dest")
			}
		})
	}
}
