package localapi

import (
	"encoding/json"
)

// GetGatewayIdentity returns agent identity info derived from config.yaml.
// This is the local equivalent of the "gateway.identity.get" RPC.
func GetGatewayIdentity() (json.RawMessage, error) {
	config, _, err := ReadConfig()
	if err != nil {
		return nil, err
	}

	model, _ := config["model"].(string)

	// Extract provider info
	providers, _ := config["providers"].(map[string]interface{})
	var providerList []string
	for k := range providers {
		providerList = append(providerList, k)
	}

	// Extract agent config
	agentCfg, _ := config["agent"].(map[string]interface{})
	maxTurns := 90
	if agentCfg != nil {
		if mt, ok := agentCfg["max_turns"].(float64); ok {
			maxTurns = int(mt)
		} else if mt, ok := agentCfg["max_turns"].(int); ok {
			maxTurns = mt
		}
	}

	identity := map[string]interface{}{
		"type":      "hermes-agent",
		"model":     model,
		"providers": providerList,
		"maxTurns":  maxTurns,
	}

	// Include delegation config if present
	if delegation, ok := config["delegation"].(map[string]interface{}); ok {
		delegationModel, _ := delegation["model"].(string)
		delegationProvider, _ := delegation["provider"].(string)
		if delegationModel != "" || delegationProvider != "" {
			identity["delegation"] = map[string]interface{}{
				"model":    delegationModel,
				"provider": delegationProvider,
			}
		}
	}

	data, err := json.Marshal(identity)
	if err != nil {
		return nil, err
	}
	return data, nil
}

// GetAgentsList returns a single-agent list for hermes-agent.
// hermes-agent doesn't have multi-agent support like OpenClaw,
// so we return a synthetic "main" agent entry derived from config.
func GetAgentsList() (json.RawMessage, error) {
	config, _, err := ReadConfig()
	if err != nil {
		return nil, err
	}

	model, _ := config["model"].(string)

	agent := map[string]interface{}{
		"id":     "main",
		"name":   "Hermes Agent",
		"model":  model,
		"status": "active",
	}

	agents := []interface{}{agent}
	data, err := json.Marshal(agents)
	if err != nil {
		return nil, err
	}
	return data, nil
}
