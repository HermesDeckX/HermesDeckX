// Package remote contains the OpenClaw Gateway WebSocket JSON-RPC client
// used by the migration wizard. It speaks the public Gateway protocol
// documented in OpenClaw's protocol/schema/frames.ts and never relies on
// private APIs or upstream patches.
package remote

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// Device is an ephemeral device identity used to perform scope upgrades
// (operator.read → operator.admin) against the OpenClaw Gateway. The
// migration wizard re-creates a fresh identity on each session so there
// is no long-lived credential stored on disk.
type Device struct {
	ID         string
	PublicKey  ed25519.PublicKey
	PrivateKey ed25519.PrivateKey
}

// NewDevice generates a fresh ed25519 keypair and a stable device ID.
func NewDevice() (*Device, error) {
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, err
	}
	return &Device{
		ID:         "hermesdeckx-migrate-" + uuid.NewString(),
		PublicKey:  pub,
		PrivateKey: priv,
	}, nil
}

// DeviceAuthPayload is the `device` object embedded in ConnectParams.
type DeviceAuthPayload struct {
	ID        string `json:"id"`
	PublicKey string `json:"publicKey"`
	Signature string `json:"signature"`
	SignedAt  int64  `json:"signedAt"`
	Nonce     string `json:"nonce"`
}

// Sign produces a DeviceAuthPayload signed with the device's private key.
// The signed message follows OpenClaw's schema: the nonce, signedAt, and
// client id joined by "|", which matches what the Gateway verifies
// against the embedded publicKey.
func (d *Device) Sign(clientID string) (DeviceAuthPayload, error) {
	if d == nil {
		return DeviceAuthPayload{}, fmt.Errorf("nil device")
	}
	nonceBytes := make([]byte, 16)
	if _, err := rand.Read(nonceBytes); err != nil {
		return DeviceAuthPayload{}, err
	}
	nonce := base64.RawStdEncoding.EncodeToString(nonceBytes)
	signedAt := time.Now().UnixMilli()
	msg := fmt.Sprintf("%s|%d|%s", nonce, signedAt, clientID)
	sig := ed25519.Sign(d.PrivateKey, []byte(msg))
	return DeviceAuthPayload{
		ID:        d.ID,
		PublicKey: base64.StdEncoding.EncodeToString(d.PublicKey),
		Signature: base64.StdEncoding.EncodeToString(sig),
		SignedAt:  signedAt,
		Nonce:     nonce,
	}, nil
}
