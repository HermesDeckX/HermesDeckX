package sshterm

import (
	"fmt"
	"io"
	"os"
	"sort"
	"time"

	"HermesDeckX/internal/logger"

	"github.com/pkg/sftp"
	"golang.org/x/crypto/ssh"
)

// SFTPClient wraps a pkg/sftp client bound to an SSH session.
type SFTPClient struct {
	client    *sftp.Client
	sessionID string
}

// NewSFTPClient creates an SFTP subsystem on an existing SSH connection.
func NewSFTPClient(sshClient *ssh.Client, sessionID string) (*SFTPClient, error) {
	c, err := sftp.NewClient(sshClient)
	if err != nil {
		return nil, fmt.Errorf("sftp subsystem failed: %w", err)
	}
	logger.Terminal.Info().Str("sessionId", sessionID).Msg("SFTP client opened")
	return &SFTPClient{client: c, sessionID: sessionID}, nil
}

// Close closes the SFTP client.
func (s *SFTPClient) Close() {
	if s.client != nil {
		s.client.Close()
		logger.Terminal.Info().Str("sessionId", s.sessionID).Msg("SFTP client closed")
	}
}

// FileEntry represents a file or directory in a listing.
type FileEntry struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	Size    int64  `json:"size"`
	IsDir   bool   `json:"is_dir"`
	Mode    string `json:"mode"`
	ModTime int64  `json:"mod_time"`
	Owner   string `json:"owner,omitempty"`
}

// List returns the contents of a remote directory.
func (s *SFTPClient) List(path string) ([]FileEntry, error) {
	entries, err := s.client.ReadDir(path)
	if err != nil {
		return nil, fmt.Errorf("readdir %s: %w", path, err)
	}

	result := make([]FileEntry, 0, len(entries))
	for _, e := range entries {
		fullPath := path
		if fullPath != "/" {
			fullPath += "/"
		}
		fullPath += e.Name()

		result = append(result, FileEntry{
			Name:    e.Name(),
			Path:    fullPath,
			Size:    e.Size(),
			IsDir:   e.IsDir(),
			Mode:    e.Mode().String(),
			ModTime: e.ModTime().Unix(),
		})
	}

	// Sort: dirs first, then by name
	sort.Slice(result, func(i, j int) bool {
		if result[i].IsDir != result[j].IsDir {
			return result[i].IsDir
		}
		return result[i].Name < result[j].Name
	})

	return result, nil
}

// Stat returns info about a single file.
func (s *SFTPClient) Stat(path string) (*FileEntry, error) {
	info, err := s.client.Stat(path)
	if err != nil {
		return nil, err
	}
	return &FileEntry{
		Name:    info.Name(),
		Path:    path,
		Size:    info.Size(),
		IsDir:   info.IsDir(),
		Mode:    info.Mode().String(),
		ModTime: info.ModTime().Unix(),
	}, nil
}

// Mkdir creates a directory (with parents).
func (s *SFTPClient) Mkdir(path string) error {
	return s.client.MkdirAll(path)
}

// Remove deletes a file or empty directory.
func (s *SFTPClient) Remove(path string) error {
	info, err := s.client.Stat(path)
	if err != nil {
		return err
	}
	if info.IsDir() {
		return s.removeDir(path)
	}
	return s.client.Remove(path)
}

// removeDir recursively removes a directory.
func (s *SFTPClient) removeDir(path string) error {
	entries, err := s.client.ReadDir(path)
	if err != nil {
		return err
	}
	for _, e := range entries {
		child := path + "/" + e.Name()
		if e.IsDir() {
			if err := s.removeDir(child); err != nil {
				return err
			}
		} else {
			if err := s.client.Remove(child); err != nil {
				return err
			}
		}
	}
	return s.client.RemoveDirectory(path)
}

// Rename moves/renames a file or directory.
func (s *SFTPClient) Rename(oldPath, newPath string) error {
	return s.client.Rename(oldPath, newPath)
}

// ReadFile reads a remote file into memory (up to maxSize bytes).
func (s *SFTPClient) ReadFile(path string, maxSize int64) ([]byte, error) {
	f, err := s.client.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	info, err := f.Stat()
	if err != nil {
		return nil, err
	}
	if info.Size() > maxSize {
		return nil, fmt.Errorf("file too large: %d > %d", info.Size(), maxSize)
	}

	return io.ReadAll(f)
}

// WriteFile writes data to a remote file.
func (s *SFTPClient) WriteFile(path string, data []byte) error {
	f, err := s.client.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = f.Write(data)
	return err
}

// OpenForRead opens a remote file for streaming read (caller must close).
func (s *SFTPClient) OpenForRead(path string) (io.ReadCloser, os.FileInfo, error) {
	f, err := s.client.Open(path)
	if err != nil {
		return nil, nil, err
	}
	info, err := f.Stat()
	if err != nil {
		f.Close()
		return nil, nil, err
	}
	return f, info, nil
}

// OpenForWrite opens a remote file for streaming write (caller must close).
func (s *SFTPClient) OpenForWrite(path string) (io.WriteCloser, error) {
	return s.client.Create(path)
}

// Chmod changes file permissions.
func (s *SFTPClient) Chmod(path string, mode os.FileMode) error {
	return s.client.Chmod(path, mode)
}

// Chtimes changes file modification time.
func (s *SFTPClient) Chtimes(path string, mtime time.Time) error {
	return s.client.Chtimes(path, mtime, mtime)
}

// Getwd returns the current working directory (home dir).
func (s *SFTPClient) Getwd() (string, error) {
	return s.client.Getwd()
}
