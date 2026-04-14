package secretutil

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"io"
	"strings"
)

const encryptedPrefix = "enc:v1:"

// IsEncrypted reports whether the value already uses the encrypted storage format.
func IsEncrypted(v string) bool {
	return strings.HasPrefix(v, encryptedPrefix)
}

// EncryptString encrypts plaintext with AES-GCM. Empty values are preserved.
func EncryptString(plaintext, key string) (string, error) {
	if plaintext == "" || IsEncrypted(plaintext) {
		return plaintext, nil
	}
	if strings.TrimSpace(key) == "" {
		return "", errors.New("encryption key is required")
	}

	block, err := aes.NewCipher(deriveKey(key))
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := gcm.Seal(nil, nonce, []byte(plaintext), nil)
	payload := append(nonce, ciphertext...)
	return encryptedPrefix + base64.RawStdEncoding.EncodeToString(payload), nil
}

// DecryptString decrypts an encrypted value and passes legacy plaintext through unchanged.
func DecryptString(value, key string) (string, error) {
	if value == "" || !IsEncrypted(value) {
		return value, nil
	}
	if strings.TrimSpace(key) == "" {
		return "", errors.New("encryption key is required")
	}

	raw, err := base64.RawStdEncoding.DecodeString(strings.TrimPrefix(value, encryptedPrefix))
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(deriveKey(key))
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	if len(raw) < gcm.NonceSize() {
		return "", errors.New("encrypted payload is too short")
	}

	nonce := raw[:gcm.NonceSize()]
	ciphertext := raw[gcm.NonceSize():]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}
	return string(plaintext), nil
}

func deriveKey(key string) []byte {
	sum := sha256.Sum256([]byte(key))
	return sum[:]
}
