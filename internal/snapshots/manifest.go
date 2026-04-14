package snapshots

import (
	"archive/zip"
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"sort"

	"HermesDeckX/internal/version"
)

func buildManifest(resources []ResourceContent) (SnapshotManifest, error) {
	manifest := SnapshotManifest{
		SnapshotVersion: SnapshotVersion1,
		CreatedAt:       nowUTC(),
		AppVersion:      version.Version,
		Resources:       make([]ManifestResource, 0, len(resources)),
	}
	for _, res := range resources {
		h := sha256.Sum256(res.Content)
		manifest.Resources = append(manifest.Resources, ManifestResource{
			ID:          res.Definition.ID,
			Type:        res.Definition.Type,
			DisplayName: res.Definition.DisplayName,
			LogicalPath: res.Definition.LogicalPath,
			RestoreMode: res.Definition.RestoreMode,
			Size:        int64(len(res.Content)),
			SHA256:      hex.EncodeToString(h[:]),
		})
		if res.Definition.ID == "hermes.config" {
			fields, err := extractConfigFields(res.Content)
			if err != nil {
				return SnapshotManifest{}, err
			}
			manifest.ConfigFields = fields
		}
	}
	sort.Slice(manifest.Resources, func(i, j int) bool { return manifest.Resources[i].ID < manifest.Resources[j].ID })
	sort.Slice(manifest.ConfigFields, func(i, j int) bool { return manifest.ConfigFields[i].Path < manifest.ConfigFields[j].Path })
	return manifest, nil
}

func packBundle(manifest SnapshotManifest, resources []ResourceContent) ([]byte, error) {
	buf := &bytes.Buffer{}
	zw := zip.NewWriter(buf)
	manifestBytes, err := json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		return nil, err
	}
	mw, err := zw.Create("manifest.json")
	if err != nil {
		return nil, err
	}
	if _, err := mw.Write(manifestBytes); err != nil {
		return nil, err
	}
	for _, res := range resources {
		w, err := zw.Create(res.Definition.LogicalPath)
		if err != nil {
			return nil, err
		}
		if _, err := w.Write(res.Content); err != nil {
			return nil, err
		}
	}
	if err := zw.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func unpackBundle(bundle []byte) (SnapshotManifest, map[string][]byte, error) {
	zr, err := zip.NewReader(bytes.NewReader(bundle), int64(len(bundle)))
	if err != nil {
		return SnapshotManifest{}, nil, err
	}
	files := map[string][]byte{}
	var manifest SnapshotManifest
	for _, f := range zr.File {
		rc, err := f.Open()
		if err != nil {
			return SnapshotManifest{}, nil, err
		}
		data, err := io.ReadAll(rc)
		rc.Close()
		if err != nil {
			return SnapshotManifest{}, nil, err
		}
		if f.Name == "manifest.json" {
			if err := json.Unmarshal(data, &manifest); err != nil {
				return SnapshotManifest{}, nil, fmt.Errorf("invalid manifest: %w", err)
			}
			continue
		}
		files[f.Name] = data
	}
	if manifest.SnapshotVersion == 0 {
		return SnapshotManifest{}, nil, fmt.Errorf("manifest missing")
	}
	return manifest, files, nil
}

func extractConfigFields(configBytes []byte) ([]ConfigFieldEntry, error) {
	var v any
	if err := json.Unmarshal(configBytes, &v); err != nil {
		return nil, err
	}
	entries := make([]ConfigFieldEntry, 0, 128)
	walkConfigFields("", v, &entries)
	return entries, nil
}

func walkConfigFields(path string, v any, out *[]ConfigFieldEntry) {
	entry := ConfigFieldEntry{Path: path, Kind: jsonKind(v), Hash: hashJSONValue(v)}
	*out = append(*out, entry)
	switch t := v.(type) {
	case map[string]any:
		keys := make([]string, 0, len(t))
		for k := range t {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, k := range keys {
			next := k
			if path != "" {
				next = path + "." + k
			}
			walkConfigFields(next, t[k], out)
		}
	case []any:
		for i, item := range t {
			next := fmt.Sprintf("%s[%d]", path, i)
			if path == "" {
				next = fmt.Sprintf("[%d]", i)
			}
			walkConfigFields(next, item, out)
		}
	}
}

func jsonKind(v any) string {
	switch v.(type) {
	case map[string]any:
		return "object"
	case []any:
		return "array"
	case string:
		return "string"
	case float64:
		return "number"
	case bool:
		return "bool"
	case nil:
		return "null"
	default:
		return "unknown"
	}
}

func hashJSONValue(v any) string {
	b, _ := json.Marshal(v)
	h := sha256.Sum256(b)
	return hex.EncodeToString(h[:])
}
