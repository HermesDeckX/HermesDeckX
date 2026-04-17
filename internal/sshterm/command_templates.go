package sshterm

import (
	"strings"
	"time"

	"HermesDeckX/internal/database"

	"gorm.io/gorm"
)

// CommandTemplate represents a reusable SSH command preset shared across hosts.
type CommandTemplate struct {
	ID          uint           `gorm:"primarykey" json:"id"`
	Label       string         `gorm:"size:100;not null" json:"label"`
	Command     string         `gorm:"type:text;not null" json:"command"`
	Description string         `gorm:"type:text;default:''" json:"description"`
	SortOrder   int            `gorm:"default:0;index" json:"sort_order"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// CommandTemplateRepo provides CRUD for command templates.
type CommandTemplateRepo struct {
	db *gorm.DB
}

// NewCommandTemplateRepo creates a new repository using the global DB.
func NewCommandTemplateRepo() *CommandTemplateRepo {
	return &CommandTemplateRepo{db: database.DB}
}

// List returns all command templates ordered by sort_order asc, id asc.
func (r *CommandTemplateRepo) List() ([]CommandTemplate, error) {
	var list []CommandTemplate
	if err := r.db.Order("sort_order asc, id asc").Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

// GetByID fetches a single template.
func (r *CommandTemplateRepo) GetByID(id uint) (*CommandTemplate, error) {
	var t CommandTemplate
	if err := r.db.First(&t, id).Error; err != nil {
		return nil, err
	}
	return &t, nil
}

// Create inserts a new template. Label and Command are required and trimmed.
func (r *CommandTemplateRepo) Create(t *CommandTemplate) error {
	t.Label = strings.TrimSpace(t.Label)
	t.Command = strings.TrimSpace(t.Command)
	t.Description = strings.TrimSpace(t.Description)
	return r.db.Create(t).Error
}

// Update saves changes to an existing template.
func (r *CommandTemplateRepo) Update(t *CommandTemplate) error {
	t.Label = strings.TrimSpace(t.Label)
	t.Command = strings.TrimSpace(t.Command)
	t.Description = strings.TrimSpace(t.Description)
	return r.db.Save(t).Error
}

// Delete soft-deletes a template by ID.
func (r *CommandTemplateRepo) Delete(id uint) error {
	return r.db.Delete(&CommandTemplate{}, id).Error
}

// Reorder updates sort_order for the provided IDs in sequence.
func (r *CommandTemplateRepo) Reorder(ids []uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		for i, id := range ids {
			if err := tx.Model(&CommandTemplate{}).Where("id = ?", id).Update("sort_order", i).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// ImportItem represents a single template payload from an import operation.
type ImportItem struct {
	Label       string
	Command     string
	Description string
	SortOrder   int
}

// ImportResult captures the outcome of a bulk import.
type ImportResult struct {
	Inserted int `json:"inserted"`
	Skipped  int `json:"skipped"`
	Replaced int `json:"replaced"`
	Total    int `json:"total"`
}

// ImportBulk inserts many templates atomically.
// Strategy:
//   - "append"         → insert all items as new rows (may create duplicates)
//   - "skip_duplicates"→ skip items where (label, command) match an existing row
//   - "replace"        → hard-delete all existing rows, then insert items
//
// Items with empty label or command after trimming are ignored. SortOrder is
// auto-assigned relative to the current max when not provided.
func (r *CommandTemplateRepo) ImportBulk(items []ImportItem, strategy string) (ImportResult, error) {
	res := ImportResult{Total: len(items)}

	// Sanitize input upfront.
	sanitized := make([]ImportItem, 0, len(items))
	for _, it := range items {
		it.Label = strings.TrimSpace(it.Label)
		it.Command = strings.TrimSpace(it.Command)
		it.Description = strings.TrimSpace(it.Description)
		if it.Label == "" || it.Command == "" {
			continue
		}
		sanitized = append(sanitized, it)
	}

	err := r.db.Transaction(func(tx *gorm.DB) error {
		if strategy == "replace" {
			// Hard-delete so sort_order starts clean.
			if err := tx.Unscoped().Where("1 = 1").Delete(&CommandTemplate{}).Error; err != nil {
				return err
			}
			res.Replaced = 1
		}

		// Determine base sort offset (after potential replace this is 0).
		var maxSort int
		if strategy != "replace" {
			row := struct{ Max int }{}
			tx.Model(&CommandTemplate{}).Select("COALESCE(MAX(sort_order), -1) as max").Scan(&row)
			maxSort = row.Max + 1
		}

		// Pre-load existing (label, command) pairs for skip_duplicates.
		type pair struct{ Label, Command string }
		existingPairs := map[pair]struct{}{}
		if strategy == "skip_duplicates" {
			var list []CommandTemplate
			if err := tx.Find(&list).Error; err != nil {
				return err
			}
			for _, t := range list {
				existingPairs[pair{t.Label, t.Command}] = struct{}{}
			}
		}

		for idx, it := range sanitized {
			if strategy == "skip_duplicates" {
				if _, ok := existingPairs[pair{it.Label, it.Command}]; ok {
					res.Skipped++
					continue
				}
			}
			sortOrder := it.SortOrder
			if sortOrder == 0 {
				sortOrder = maxSort + idx
			}
			row := &CommandTemplate{
				Label:       it.Label,
				Command:     it.Command,
				Description: it.Description,
				SortOrder:   sortOrder,
			}
			if err := tx.Create(row).Error; err != nil {
				return err
			}
			res.Inserted++
		}
		return nil
	})
	return res, err
}

// SeedDefaults inserts a built-in starter set if the table is empty.
// Safe to call on every startup.
func (r *CommandTemplateRepo) SeedDefaults() error {
	var count int64
	if err := r.db.Model(&CommandTemplate{}).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	defaults := []CommandTemplate{
		{Label: "Top", Command: "top -bn1 | head -20", SortOrder: 0},
		{Label: "Disk", Command: "df -h", SortOrder: 1},
		{Label: "Memory", Command: "free -h", SortOrder: 2},
		{Label: "Ports", Command: "ss -tlnp", SortOrder: 3},
		{Label: "PS", Command: "ps aux --sort=-%mem | head -15", SortOrder: 4},
		{Label: "Uptime", Command: "uptime", SortOrder: 5},
		{Label: "IP", Command: "ip addr show", SortOrder: 6},
		{Label: "Logs", Command: "journalctl -n 50 --no-pager", SortOrder: 7},
	}
	return r.db.Create(&defaults).Error
}
