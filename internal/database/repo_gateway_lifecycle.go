package database

import (
	"time"

	"gorm.io/gorm"
)

type GatewayLifecycleRepo struct {
	db *gorm.DB
}

func NewGatewayLifecycleRepo() *GatewayLifecycleRepo {
	return &GatewayLifecycleRepo{db: DB}
}

func (r *GatewayLifecycleRepo) Create(record *GatewayLifecycle) error {
	return r.db.Create(record).Error
}

func (r *GatewayLifecycleRepo) Recent(limit int) ([]GatewayLifecycle, error) {
	if limit <= 0 {
		limit = 20
	}
	var records []GatewayLifecycle
	err := r.db.Order("timestamp desc").Limit(limit).Find(&records).Error
	return records, err
}

func (r *GatewayLifecycleRepo) List(filter GatewayLifecycleFilter) ([]GatewayLifecycle, int64, error) {
	var records []GatewayLifecycle
	var total int64

	q := r.db.Model(&GatewayLifecycle{})
	if filter.EventType != "" {
		q = q.Where("event_type = ?", filter.EventType)
	}
	if filter.GatewayHost != "" {
		q = q.Where("gateway_host = ?", filter.GatewayHost)
	}
	if filter.Since != "" {
		q = q.Where("timestamp >= ?", filter.Since)
	}
	if filter.Until != "" {
		q = q.Where("timestamp <= ?", filter.Until)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := q.Order("timestamp desc").
		Offset(filter.Offset()).
		Limit(filter.PageSize).
		Find(&records).Error
	return records, total, err
}

// LastByType returns the most recent record of the given event type.
func (r *GatewayLifecycleRepo) LastByType(eventType string) (*GatewayLifecycle, error) {
	var record GatewayLifecycle
	err := r.db.Where("event_type = ?", eventType).Order("timestamp desc").First(&record).Error
	if err != nil {
		return nil, err
	}
	return &record, nil
}

// LastStarted returns the most recent "started" or "recovered" record.
func (r *GatewayLifecycleRepo) LastStarted() (*GatewayLifecycle, error) {
	var record GatewayLifecycle
	err := r.db.Where("event_type IN ?", []string{"started", "recovered"}).
		Order("timestamp desc").First(&record).Error
	if err != nil {
		return nil, err
	}
	return &record, nil
}

// Cleanup removes records older than the given duration, keeping at most maxKeep records.
func (r *GatewayLifecycleRepo) Cleanup(olderThan time.Duration, maxKeep int) error {
	cutoff := time.Now().Add(-olderThan)
	// Keep recent maxKeep records, delete anything older than cutoff beyond that
	var count int64
	r.db.Model(&GatewayLifecycle{}).Count(&count)
	if count <= int64(maxKeep) {
		return nil
	}
	return r.db.Where("timestamp < ?", cutoff).Delete(&GatewayLifecycle{}).Error
}

type GatewayLifecycleFilter struct {
	Page        int
	PageSize    int
	EventType   string
	GatewayHost string
	Since       string
	Until       string
}

func (f *GatewayLifecycleFilter) Offset() int {
	if f.Page <= 0 {
		f.Page = 1
	}
	if f.PageSize <= 0 {
		f.PageSize = 20
	}
	return (f.Page - 1) * f.PageSize
}
