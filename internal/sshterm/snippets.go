package sshterm

import (
	"strings"
	"time"

	"HermesDeckX/internal/database"

	"gorm.io/gorm"
)

const maxCommandHistory = 100

// SSHSnippet represents a command history entry for quick re-execution.
type SSHSnippet struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	HostID     uint           `gorm:"not null;index" json:"host_id"`
	Command    string         `gorm:"type:text;not null" json:"command"`
	IsFavorite bool           `gorm:"default:false" json:"is_favorite"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

// SSHSnippetRepo provides CRUD operations for command history.
type SSHSnippetRepo struct {
	db *gorm.DB
}

// NewSSHSnippetRepo creates a new snippet repository.
func NewSSHSnippetRepo() *SSHSnippetRepo {
	return &SSHSnippetRepo{db: database.DB}
}

// List returns all snippets for a given host: favorites first, then newest first.
func (r *SSHSnippetRepo) List(hostID uint) ([]SSHSnippet, error) {
	var list []SSHSnippet
	if err := r.db.Where("host_id = ?", hostID).Order("is_favorite desc, id desc").Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

// RecordCommand auto-records a command. If the same command exists for this host,
// the old entry is deleted and a new one is created (dedup, keep newest).
// Then trims non-favorite entries to maxCommandHistory.
func (r *SSHSnippetRepo) RecordCommand(hostID uint, command string) (*SSHSnippet, error) {
	command = strings.TrimSpace(command)
	if command == "" {
		return nil, nil
	}

	// Delete existing duplicate (non-favorite)
	r.db.Where("host_id = ? AND command = ? AND is_favorite = ?", hostID, command, false).Delete(&SSHSnippet{})

	// Check if a favorite duplicate exists — if so, just touch updated_at
	var existing SSHSnippet
	if err := r.db.Where("host_id = ? AND command = ? AND is_favorite = ?", hostID, command, true).First(&existing).Error; err == nil {
		r.db.Model(&existing).Update("updated_at", time.Now())
		return &existing, nil
	}

	// Create new entry
	s := &SSHSnippet{HostID: hostID, Command: command}
	if err := r.db.Create(s).Error; err != nil {
		return nil, err
	}

	// Trim: keep only maxCommandHistory non-favorite entries
	var nonFavCount int64
	r.db.Model(&SSHSnippet{}).Where("host_id = ? AND is_favorite = ? AND deleted_at IS NULL", hostID, false).Count(&nonFavCount)
	if nonFavCount > maxCommandHistory {
		excess := nonFavCount - maxCommandHistory
		var oldest []SSHSnippet
		r.db.Where("host_id = ? AND is_favorite = ? AND deleted_at IS NULL", hostID, false).
			Order("id asc").Limit(int(excess)).Find(&oldest)
		for _, o := range oldest {
			r.db.Delete(&o)
		}
	}

	return s, nil
}

// ToggleFavorite toggles the is_favorite flag on a snippet.
func (r *SSHSnippetRepo) ToggleFavorite(id uint) (*SSHSnippet, error) {
	var s SSHSnippet
	if err := r.db.First(&s, id).Error; err != nil {
		return nil, err
	}
	s.IsFavorite = !s.IsFavorite
	if err := r.db.Save(&s).Error; err != nil {
		return nil, err
	}
	return &s, nil
}

// Delete soft-deletes a snippet by ID.
func (r *SSHSnippetRepo) Delete(id uint) error {
	return r.db.Delete(&SSHSnippet{}, id).Error
}
