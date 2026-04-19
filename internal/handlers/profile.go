package handlers

import (
	"encoding/json"
	"net/http"

	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/web"
)

// ProfileHandler manages hermes-agent named profiles (~/.hermes/profiles/<name>/).
// Profile selection is persisted in <base>/active_profile so that every
// subsequent `hermes` CLI invocation and every Resolve* call honors it,
// matching hermes-agent's sticky-profile semantics in hermes_cli/main.py.
type ProfileHandler struct{}

func NewProfileHandler() *ProfileHandler {
	return &ProfileHandler{}
}

type profileActiveResponse struct {
	Active   string   `json:"active"`
	Profiles []string `json:"profiles"`
	Base     string   `json:"base"`
}

// Get returns the currently active profile name and the list of available
// profiles (always including "default").
func (h *ProfileHandler) Get(w http.ResponseWriter, r *http.Request) {
	active := hermes.GetActiveProfile()
	if active == "" {
		active = "default"
	}
	web.OK(w, r, profileActiveResponse{
		Active:   active,
		Profiles: hermes.ListProfiles(),
		Base:     hermes.ResolveBaseHome(),
	})
}

type profileActiveSetRequest struct {
	Name string `json:"name"`
}

// SetActive switches the active profile. Passing "" or "default" clears the
// pointer (equivalent to using the base ~/.hermes home).
func (h *ProfileHandler) SetActive(w http.ResponseWriter, r *http.Request) {
	var req profileActiveSetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.FailErr(w, r, web.ErrInvalidParam, err.Error())
		return
	}
	if err := hermes.SetActiveProfile(req.Name); err != nil {
		web.FailErr(w, r, web.ErrInvalidParam, err.Error())
		return
	}
	h.Get(w, r)
}
