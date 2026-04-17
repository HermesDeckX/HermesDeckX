package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"HermesDeckX/internal/database"
	"HermesDeckX/internal/secretutil"
	"HermesDeckX/internal/sshterm"
	"HermesDeckX/internal/web"
	"HermesDeckX/internal/webconfig"

	"golang.org/x/crypto/ssh"
)

// SSHHostsHandler provides REST endpoints for SSH host profile management.
type SSHHostsHandler struct {
	repo *sshterm.SSHHostRepo
}

// NewSSHHostsHandler creates a new handler.
func NewSSHHostsHandler() *SSHHostsHandler {
	return &SSHHostsHandler{repo: sshterm.NewSSHHostRepo()}
}

type sshHostRequest struct {
	ID           uint   `json:"id,omitempty"`
	Name         string `json:"name"`
	Host         string `json:"host"`
	Port         int    `json:"port"`
	Username     string `json:"username"`
	AuthType     string `json:"auth_type"`
	Password     string `json:"password,omitempty"`
	PrivateKey   string `json:"private_key,omitempty"`
	Passphrase   string `json:"passphrase,omitempty"`
	IsFavorite   bool   `json:"is_favorite"`
	GroupName    string `json:"group_name"`
	SavePassword *bool  `json:"save_password,omitempty"`
}

// sshHostResponse is the public representation (no secrets).
type sshHostResponse struct {
	ID              uint       `json:"id"`
	Name            string     `json:"name"`
	Host            string     `json:"host"`
	Port            int        `json:"port"`
	Username        string     `json:"username"`
	AuthType        string     `json:"auth_type"`
	HasPassword     bool       `json:"has_password"`
	HasKey          bool       `json:"has_key"`
	Fingerprint     string     `json:"fingerprint"`
	SavePassword    bool       `json:"save_password"`
	IsFavorite      bool       `json:"is_favorite"`
	GroupName       string     `json:"group_name"`
	LastConnectedAt *time.Time `json:"last_connected_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

func toHostResponse(h *sshterm.SSHHost) sshHostResponse {
	return sshHostResponse{
		ID:              h.ID,
		Name:            h.Name,
		Host:            h.Host,
		Port:            h.Port,
		Username:        h.Username,
		AuthType:        h.AuthType,
		HasPassword:     h.PasswordEncrypted != "",
		HasKey:          h.PrivateKeyEncrypted != "",
		Fingerprint:     h.Fingerprint,
		SavePassword:    h.SavePassword,
		IsFavorite:      h.IsFavorite,
		GroupName:       h.GroupName,
		LastConnectedAt: h.LastConnectedAt,
		CreatedAt:       h.CreatedAt,
		UpdatedAt:       h.UpdatedAt,
	}
}

// List returns all SSH hosts.
func (h *SSHHostsHandler) List(w http.ResponseWriter, r *http.Request) {
	hosts, err := h.repo.List()
	if err != nil {
		web.Fail(w, r, "SSH_HOSTS_LIST_FAILED", err.Error(), http.StatusInternalServerError)
		return
	}
	result := make([]sshHostResponse, len(hosts))
	for i := range hosts {
		result[i] = toHostResponse(&hosts[i])
	}
	web.OK(w, r, result)
}

// Create adds a new SSH host.
func (h *SSHHostsHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req sshHostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.Fail(w, r, "INVALID_REQUEST", "invalid request body", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.Host) == "" || strings.TrimSpace(req.Username) == "" {
		web.Fail(w, r, "INVALID_REQUEST", "name, host, username are required", http.StatusBadRequest)
		return
	}
	if req.Port <= 0 {
		req.Port = 22
	}
	if req.AuthType == "" {
		req.AuthType = "password"
	}

	key := secretKey()
	savePass := req.SavePassword == nil || *req.SavePassword
	host := &sshterm.SSHHost{
		Name:         req.Name,
		Host:         req.Host,
		Port:         req.Port,
		Username:     req.Username,
		AuthType:     req.AuthType,
		IsFavorite:   req.IsFavorite,
		GroupName:    req.GroupName,
		SavePassword: savePass,
	}
	if savePass {
		if req.Password != "" {
			enc, _ := secretutil.EncryptString(req.Password, key)
			host.PasswordEncrypted = enc
		}
		if req.PrivateKey != "" {
			enc, _ := secretutil.EncryptString(req.PrivateKey, key)
			host.PrivateKeyEncrypted = enc
		}
		if req.Passphrase != "" {
			enc, _ := secretutil.EncryptString(req.Passphrase, key)
			host.PassphraseEncrypted = enc
		}
	}

	if err := h.repo.Create(host); err != nil {
		web.Fail(w, r, "SSH_HOST_CREATE_FAILED", err.Error(), http.StatusInternalServerError)
		return
	}

	database.NewAuditLogRepo().Create(&database.AuditLog{
		Action: "ssh_host_create",
		Detail: fmt.Sprintf("created SSH host: %s (%s@%s:%d)", host.Name, host.Username, host.Host, host.Port),
		Result: "success",
		IP:     r.RemoteAddr,
	})

	web.OK(w, r, toHostResponse(host))
}

// Update modifies an existing SSH host.
func (h *SSHHostsHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil || id == 0 {
		web.Fail(w, r, "INVALID_REQUEST", "invalid host id", http.StatusBadRequest)
		return
	}

	existing, err := h.repo.GetByID(uint(id))
	if err != nil {
		web.Fail(w, r, "SSH_HOST_NOT_FOUND", "host not found", http.StatusNotFound)
		return
	}

	var req sshHostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.Fail(w, r, "INVALID_REQUEST", "invalid request body", http.StatusBadRequest)
		return
	}

	key := secretKey()
	if req.Name != "" {
		existing.Name = req.Name
	}
	if req.Host != "" {
		existing.Host = req.Host
	}
	if req.Port > 0 {
		existing.Port = req.Port
	}
	if req.Username != "" {
		existing.Username = req.Username
	}
	if req.AuthType != "" {
		existing.AuthType = req.AuthType
	}
	existing.IsFavorite = req.IsFavorite
	existing.GroupName = req.GroupName

	savePassUpdate := req.SavePassword == nil || *req.SavePassword
	existing.SavePassword = savePassUpdate

	if savePassUpdate {
		if req.Password != "" {
			enc, _ := secretutil.EncryptString(req.Password, key)
			existing.PasswordEncrypted = enc
		}
		if req.PrivateKey != "" {
			enc, _ := secretutil.EncryptString(req.PrivateKey, key)
			existing.PrivateKeyEncrypted = enc
		}
		if req.Passphrase != "" {
			enc, _ := secretutil.EncryptString(req.Passphrase, key)
			existing.PassphraseEncrypted = enc
		}
	} else {
		// Clear saved credentials from DB
		existing.PasswordEncrypted = ""
		existing.PrivateKeyEncrypted = ""
		existing.PassphraseEncrypted = ""
	}

	if err := h.repo.Update(existing); err != nil {
		web.Fail(w, r, "SSH_HOST_UPDATE_FAILED", err.Error(), http.StatusInternalServerError)
		return
	}
	web.OK(w, r, toHostResponse(existing))
}

// Delete removes an SSH host.
func (h *SSHHostsHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil || id == 0 {
		web.Fail(w, r, "INVALID_REQUEST", "invalid host id", http.StatusBadRequest)
		return
	}
	if err := h.repo.Delete(uint(id)); err != nil {
		web.Fail(w, r, "SSH_HOST_DELETE_FAILED", err.Error(), http.StatusInternalServerError)
		return
	}
	web.OK(w, r, map[string]bool{"deleted": true})
}

// TestConnection tests SSH connectivity to a host.
func (h *SSHHostsHandler) TestConnection(w http.ResponseWriter, r *http.Request) {
	var req sshHostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.Fail(w, r, "INVALID_REQUEST", "invalid request body", http.StatusBadRequest)
		return
	}

	password := req.Password
	privateKey := req.PrivateKey
	passphrase := req.Passphrase

	// If editing an existing host and a credential field is left blank,
	// fall back to the encrypted value stored in the database so the
	// "leave blank to keep current value" UX also works for Test Connection.
	if req.ID != 0 {
		if existing, err := h.repo.GetByID(req.ID); err == nil {
			if password == "" && existing.PasswordEncrypted != "" {
				if dec, derr := decryptField(existing.PasswordEncrypted); derr == nil {
					password = dec
				}
			}
			if privateKey == "" && existing.PrivateKeyEncrypted != "" {
				if dec, derr := decryptField(existing.PrivateKeyEncrypted); derr == nil {
					privateKey = dec
				}
			}
			if passphrase == "" && existing.PassphraseEncrypted != "" {
				if dec, derr := decryptField(existing.PassphraseEncrypted); derr == nil {
					passphrase = dec
				}
			}
		}
	}

	authMethod, err := sshterm.BuildAuthMethod(req.AuthType, password, privateKey, passphrase)
	if err != nil {
		web.OK(w, r, map[string]interface{}{"success": false, "error": err.Error()})
		return
	}

	cfg := &ssh.ClientConfig{
		User:            req.Username,
		Auth:            []ssh.AuthMethod{authMethod},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         10 * time.Second,
	}

	addr := fmt.Sprintf("%s:%d", req.Host, req.Port)
	client, err := ssh.Dial("tcp", addr, cfg)
	if err != nil {
		web.OK(w, r, map[string]interface{}{"success": false, "error": err.Error()})
		return
	}
	client.Close()
	web.OK(w, r, map[string]interface{}{"success": true})
}

// decryptField decrypts an encrypted field value. Returns empty string on error.
func decryptField(encrypted string) (string, error) {
	if encrypted == "" {
		return "", nil
	}
	return secretutil.DecryptString(encrypted, secretKey())
}

func secretKey() string {
	cfg, err := webconfig.Load()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(cfg.Auth.JWTSecret)
}
