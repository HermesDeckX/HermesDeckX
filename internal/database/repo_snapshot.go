package database

import "gorm.io/gorm"

type SnapshotRepo struct {
	db *gorm.DB
}

func NewSnapshotRepo() *SnapshotRepo {
	return &SnapshotRepo{db: DB}
}

func (r *SnapshotRepo) Create(record *SnapshotRecord) error {
	return r.db.Create(record).Error
}

func (r *SnapshotRepo) List() ([]SnapshotRecord, error) {
	var records []SnapshotRecord
	err := r.db.Order("created_at desc").Find(&records).Error
	return records, err
}

func (r *SnapshotRepo) ListByTrigger(trigger string) ([]SnapshotRecord, error) {
	var records []SnapshotRecord
	err := r.db.Where("trigger = ?", trigger).Order("created_at desc").Find(&records).Error
	return records, err
}

func (r *SnapshotRepo) FindBySnapshotID(id string) (*SnapshotRecord, error) {
	var record SnapshotRecord
	err := r.db.Where("snapshot_id = ?", id).First(&record).Error
	if err != nil {
		return nil, err
	}
	return &record, nil
}

func (r *SnapshotRepo) DeleteBySnapshotID(id string) error {
	return r.db.Where("snapshot_id = ?", id).Delete(&SnapshotRecord{}).Error
}
