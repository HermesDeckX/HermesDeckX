package secretutil

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEncryptDecryptString(t *testing.T) {
	key := "jwt-secret"
	plaintext := "secret-token"

	encrypted, err := EncryptString(plaintext, key)
	require.NoError(t, err)
	assert.NotEqual(t, plaintext, encrypted)
	assert.True(t, IsEncrypted(encrypted))

	decrypted, err := DecryptString(encrypted, key)
	require.NoError(t, err)
	assert.Equal(t, plaintext, decrypted)
}

func TestDecryptString_LegacyPlaintext(t *testing.T) {
	plaintext := "legacy-secret"
	decrypted, err := DecryptString(plaintext, "jwt-secret")
	require.NoError(t, err)
	assert.Equal(t, plaintext, decrypted)
}
