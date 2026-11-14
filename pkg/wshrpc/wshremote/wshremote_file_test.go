// Copyright 2026 Neil Manfred
// SPDX-License-Identifier: Apache-2.0

package wshremote

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/wavetermdev/waveterm/pkg/wshrpc"
)

func makeTestImpl() *ServerImpl {
	return &ServerImpl{
		IsLocal:       true,
		JobManagerMap: make(map[string]*JobManagerConnection),
	}
}

// TestRemoteFileCopyCommand_EmptyURIs verifies the guard rejects empty src/dest
// before any URI parsing occurs.
func TestRemoteFileCopyCommand_EmptyURIs(t *testing.T) {
	impl := makeTestImpl()
	ctx := context.Background()

	_, err := impl.RemoteFileCopyCommand(ctx, wshrpc.CommandFileCopyData{SrcUri: "", DestUri: "wsh://local/tmp/out"})
	if err == nil || err.Error() != "source URI must not be empty" {
		t.Errorf("empty src: got %v, want 'source URI must not be empty'", err)
	}

	_, err = impl.RemoteFileCopyCommand(ctx, wshrpc.CommandFileCopyData{SrcUri: "wsh://local/tmp/in", DestUri: ""})
	if err == nil || err.Error() != "destination URI must not be empty" {
		t.Errorf("empty dest: got %v, want 'destination URI must not be empty'", err)
	}
}

// TestRemoteCopyFileInternal_ModeMask verifies that the local→local copy path
// strips executable bits from the destination file.
func TestRemoteCopyFileInternal_ModeMask(t *testing.T) {
	dir := t.TempDir()
	srcPath := filepath.Join(dir, "src.bin")
	destPath := filepath.Join(dir, "dest.bin")

	if err := os.WriteFile(srcPath, []byte("hello"), 0755); err != nil {
		t.Fatalf("write src: %v", err)
	}

	err := remoteCopyFileInternal("wsh://local"+srcPath, "wsh://local"+destPath, srcPath, destPath, false, false)
	if err != nil {
		t.Fatalf("remoteCopyFileInternal: %v", err)
	}

	info, err := os.Stat(destPath)
	if err != nil {
		t.Fatalf("stat dest: %v", err)
	}
	if info.Mode().Perm()&0111 != 0 {
		t.Errorf("dest has executable bits set: %04o", info.Mode().Perm())
	}
}
