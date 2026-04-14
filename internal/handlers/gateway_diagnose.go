package handlers

import (
	"net/http"

	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/web"
)

// GatewayDiagnoseHandler handles gateway diagnosis.
type GatewayDiagnoseHandler struct {
	svc *hermes.Service
}

// NewGatewayDiagnoseHandler creates a new GatewayDiagnoseHandler.
func NewGatewayDiagnoseHandler(svc *hermes.Service) *GatewayDiagnoseHandler {
	return &GatewayDiagnoseHandler{svc: svc}
}

// Diagnose runs gateway diagnostics.
// POST /api/v1/gateway/diagnose
func (h *GatewayDiagnoseHandler) Diagnose(w http.ResponseWriter, r *http.Request) {
	host := h.svc.GatewayHost
	port := h.svc.GatewayPort
	result := hermes.DiagnoseGateway(host, port)
	web.OK(w, r, result)
}
