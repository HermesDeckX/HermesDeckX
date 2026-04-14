package handlers

import (
	"encoding/json"

	"HermesDeckX/internal/hermes"
)

// resolveProvidersFromGWClient fetches model provider configuration from a
// remote gateway via its config.get RPC. Returns the providers map or nil.
// This is used by SkillTranslationHandler and SelfUpdateHandler to inject
// remote gateway config resolution into the Translator's LLM engine.
func resolveProvidersFromGWClient(client *hermes.GWClient) map[string]interface{} {
	if client == nil || !client.IsConnected() {
		return nil
	}
	raw, err := client.Request("config.get", map[string]interface{}{})
	if err != nil {
		return nil
	}
	var wrapper map[string]interface{}
	if json.Unmarshal(raw, &wrapper) != nil {
		return nil
	}

	cfg := wrapper
	if parsed, ok := wrapper["parsed"].(map[string]interface{}); ok {
		cfg = parsed
	} else if conf, ok := wrapper["config"].(map[string]interface{}); ok {
		cfg = conf
	}

	models, _ := cfg["models"].(map[string]interface{})
	if models == nil {
		return nil
	}
	providers, _ := models["providers"].(map[string]interface{})
	return providers
}
