package sshterm

import (
	"time"

	"HermesDeckX/internal/database"

	"gorm.io/gorm"
)

// SSHHost represents a saved SSH server profile.
type SSHHost struct {
	ID                  uint           `gorm:"primarykey" json:"id"`
	Name                string         `gorm:"size:100;not null" json:"name"`
	Host                string         `gorm:"size:255;not null" json:"host"`
	Port                int            `gorm:"not null;default:22" json:"port"`
	Username            string         `gorm:"size:100;not null" json:"username"`
	AuthType            string         `gorm:"size:20;not null;default:password" json:"auth_type"` // "password" or "key"
	PasswordEncrypted   string         `gorm:"type:text" json:"-"`
	PrivateKeyEncrypted string         `gorm:"type:text" json:"-"`
	PassphraseEncrypted string         `gorm:"type:text" json:"-"`
	Fingerprint         string         `gorm:"size:255" json:"fingerprint"`
	SavePassword        bool           `gorm:"default:true" json:"save_password"`
	IsFavorite          bool           `gorm:"default:false" json:"is_favorite"`
	LastConnectedAt     *time.Time     `json:"last_connected_at,omitempty"`
	CreatedAt           time.Time      `json:"created_at"`
	UpdatedAt           time.Time      `json:"updated_at"`
	DeletedAt           gorm.DeletedAt `gorm:"index" json:"-"`
}

// SSHHostRepo provides CRUD operations for SSH host profiles.
type SSHHostRepo struct {
	db *gorm.DB
}

// NewSSHHostRepo creates a new repository using the global DB.
func NewSSHHostRepo() *SSHHostRepo {
	return &SSHHostRepo{db: database.DB}
}

// List returns all SSH hosts ordered by favorites first, then last connected.
func (r *SSHHostRepo) List() ([]SSHHost, error) {
	var list []SSHHost
	if err := r.db.Order("is_favorite desc, last_connected_at desc, updated_at desc").Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

// GetByID returns a single host by ID.
func (r *SSHHostRepo) GetByID(id uint) (*SSHHost, error) {
	var h SSHHost
	if err := r.db.First(&h, id).Error; err != nil {
		return nil, err
	}
	return &h, nil
}

// Create inserts a new SSH host.
func (r *SSHHostRepo) Create(h *SSHHost) error {
	if err := r.db.Create(h).Error; err != nil {
		return err
	}
	return nil
}

// Update saves changes to an existing SSH host.
func (r *SSHHostRepo) Update(h *SSHHost) error {
	return r.db.Save(h).Error
}

// Delete soft-deletes a host by ID.
func (r *SSHHostRepo) Delete(id uint) error {
	return r.db.Delete(&SSHHost{}, id).Error
}

// TouchLastConnected updates the last_connected_at timestamp.
func (r *SSHHostRepo) TouchLastConnected(id uint) error {
	now := time.Now()
	return r.db.Model(&SSHHost{}).Where("id = ?", id).Update("last_connected_at", &now).Error
}
