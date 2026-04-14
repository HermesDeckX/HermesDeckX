package snapshots

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"

	"golang.org/x/crypto/argon2"
)

type KDFParams struct {
	Memory      uint32 `json:"memory"`
	Iterations  uint32 `json:"iterations"`
	Parallelism uint8  `json:"parallelism"`
	KeyLen      uint32 `json:"key_len"`
}

func defaultKDFParams() KDFParams {
	return KDFParams{Memory: 64 * 1024, Iterations: 3, Parallelism: 1, KeyLen: 32}
}

func deriveKEK(password string, salt []byte, p KDFParams) []byte {
	return argon2.IDKey([]byte(password), salt, p.Iterations, p.Memory, p.Parallelism, p.KeyLen)
}

func encryptBundleWithEnvelope(password string, bundle []byte) (kdfJSON string, saltB64, wrappedDEKB64, wrapNonceB64, dataNonceB64 string, ciphertext []byte, err error) {
	params := defaultKDFParams()
	salt := make([]byte, 16)
	if _, err = io.ReadFull(rand.Reader, salt); err != nil {
		return
	}
	kek := deriveKEK(password, salt, params)
	dek := make([]byte, 32)
	if _, err = io.ReadFull(rand.Reader, dek); err != nil {
		return
	}
	ciphertext, dataNonce, err := aesGCMEncrypt(dek, bundle)
	if err != nil {
		return
	}
	wrappedDEK, wrapNonce, err := aesGCMEncrypt(kek, dek)
	if err != nil {
		return
	}
	pj, _ := json.Marshal(params)
	kdfJSON = string(pj)
	saltB64 = base64.StdEncoding.EncodeToString(salt)
	wrappedDEKB64 = base64.StdEncoding.EncodeToString(wrappedDEK)
	wrapNonceB64 = base64.StdEncoding.EncodeToString(wrapNonce)
	dataNonceB64 = base64.StdEncoding.EncodeToString(dataNonce)
	return
}

func decryptBundleWithEnvelope(password, kdfJSON, saltB64, wrappedDEKB64, wrapNonceB64, dataNonceB64 string, ciphertext []byte) ([]byte, error) {
	var p KDFParams
	if err := json.Unmarshal([]byte(kdfJSON), &p); err != nil {
		return nil, err
	}
	salt, err := base64.StdEncoding.DecodeString(saltB64)
	if err != nil {
		return nil, err
	}
	wrappedDEK, err := base64.StdEncoding.DecodeString(wrappedDEKB64)
	if err != nil {
		return nil, err
	}
	wrapNonce, err := base64.StdEncoding.DecodeString(wrapNonceB64)
	if err != nil {
		return nil, err
	}
	dataNonce, err := base64.StdEncoding.DecodeString(dataNonceB64)
	if err != nil {
		return nil, err
	}
	kek := deriveKEK(password, salt, p)
	dek, err := aesGCMDecrypt(kek, wrappedDEK, wrapNonce)
	if err != nil {
		return nil, fmt.Errorf("unwrap dek failed: %w", err)
	}
	bundle, err := aesGCMDecrypt(dek, ciphertext, dataNonce)
	if err != nil {
		return nil, fmt.Errorf("decrypt bundle failed: %w", err)
	}
	return bundle, nil
}

func aesGCMEncrypt(key, plaintext []byte) (ciphertext []byte, nonce []byte, err error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, nil, err
	}
	nonce = make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, nil, err
	}
	ciphertext = gcm.Seal(nil, nonce, plaintext, nil)
	return ciphertext, nonce, nil
}

func aesGCMDecrypt(key, ciphertext, nonce []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	return gcm.Open(nil, nonce, ciphertext, nil)
}

// EncryptSchedulePassword encrypts a schedule password using a key derived
// from the device identity. The result is a base64 string containing
// nonce + ciphertext that can be stored safely in the settings DB.
func EncryptSchedulePassword(password string, deviceID string) (string, error) {
	key := deriveScheduleKey(deviceID)
	ct, nonce, err := aesGCMEncrypt(key, []byte(password))
	if err != nil {
		return "", err
	}
	combined := append(nonce, ct...)
	return base64.StdEncoding.EncodeToString(combined), nil
}

// DecryptSchedulePassword reverses EncryptSchedulePassword.
func DecryptSchedulePassword(encoded string, deviceID string) (string, error) {
	combined, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", fmt.Errorf("base64 decode failed: %w", err)
	}
	if len(combined) < 12 {
		return "", fmt.Errorf("encrypted password too short")
	}
	nonce := combined[:12]
	ct := combined[12:]
	key := deriveScheduleKey(deviceID)
	plain, err := aesGCMDecrypt(key, ct, nonce)
	if err != nil {
		return "", fmt.Errorf("decrypt failed: %w", err)
	}
	return string(plain), nil
}

func deriveScheduleKey(deviceID string) []byte {
	h := sha256.Sum256([]byte("hermesdeckx-schedule-key:" + deviceID))
	return h[:]
}
