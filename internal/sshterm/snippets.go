package sshterm

import (
	"time"

	"HermesDeckX/internal/database"

	"gorm.io/gorm"
)

// SSHSnippet represents a saved command snippet for quick execution.
type SSHSnippet struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	HostID    uint           `gorm:"not null;index" json:"host_id"`
	Name      string         `gorm:"size:100;not null" json:"name"`
	Command   string         `gorm:"type:text;not null" json:"command"`
	SortOrder int            `gorm:"default:0" json:"sort_order"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// SSHSnippetRepo provides CRUD operations for command snippets.
type SSHSnippetRepo struct {
	db *gorm.DB
}

// NewSSHSnippetRepo creates a new snippet repository.
func NewSSHSnippetRepo() *SSHSnippetRepo {
	return &SSHSnippetRepo{db: database.DB}
}

// List returns all snippets for a given host, ordered by sort_order.
func (r *SSHSnippetRepo) List(hostID uint) ([]SSHSnippet, error) {
	var list []SSHSnippet
	if err := r.db.Where("host_id = ?", hostID).Order("sort_order asc, id asc").Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

// Create inserts a new snippet.
func (r *SSHSnippetRepo) Create(s *SSHSnippet) error {
	return r.db.Create(s).Error
}

// Update modifies an existing snippet.
func (r *SSHSnippetRepo) Update(s *SSHSnippet) error {
	return r.db.Save(s).Error
}

// Delete soft-deletes a snippet by ID.
func (r *SSHSnippetRepo) Delete(id uint) error {
	return r.db.Delete(&SSHSnippet{}, id).Error
}
