package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"HermesDeckX/internal/web"

	"github.com/rs/zerolog/log"
)

// ---------------------------------------------------------------------------
// Shared response types
// ---------------------------------------------------------------------------

type bingImage struct {
	URLBase       string `json:"urlbase"`
	URL           string `json:"url"`
	Title         string `json:"title"`
	Copyright     string `json:"copyright"`
	StartDate     string `json:"startdate"`
	FullStartDate string `json:"fullstartdate"`
}

type bingImageArchiveResponse struct {
	Images []bingImage `json:"images"`
}

type unsplashRandomResponse struct {
	URLs struct {
		Regular string `json:"regular"`
		Full    string `json:"full"`
		Raw     string `json:"raw"`
	} `json:"urls"`
	Description    string `json:"description"`
	AltDescription string `json:"alt_description"`
	User           struct {
		Name string `json:"name"`
	} `json:"user"`
}

type wallhavenItem struct {
	ID         string `json:"id"`
	URL        string `json:"url"`
	Path       string `json:"path"`
	Resolution string `json:"resolution"`
	Ratio      string `json:"ratio"`
	Category   string `json:"category"`
	Purity     string `json:"purity"`
	Thumbs     struct {
		Large string `json:"large"`
		Small string `json:"small"`
	} `json:"thumbs"`
	Colors []string `json:"colors"`
}

type wallhavenSearchResponse struct {
	Data []wallhavenItem `json:"data"`
	Meta struct {
		CurrentPage int    `json:"current_page"`
		LastPage    int    `json:"last_page"`
		PerPage     int    `json:"per_page"`
		Total       int    `json:"total"`
		Seed        string `json:"seed"`
	} `json:"meta"`
}

// ---------------------------------------------------------------------------
// Wallhaven pool — in-memory multi-page buffer with dedup & throttle
// ---------------------------------------------------------------------------

const (
	whPoolLowWatermark   = 5               // refill when available items drop below this
	whPoolMaxServed      = 200             // max served IDs to remember per pool
	whPoolMaxRecentPages = 10              // recent pages to avoid re-fetching
	whMinFetchInterval   = 3 * time.Second // min gap between upstream requests (per pool)
	whBackoffBase        = 10 * time.Second
	whBackoffMax         = 5 * time.Minute
	whPoolExpiry         = 30 * time.Minute // discard stale pools
)

type whPoolItem struct {
	item wallhavenItem
	seed string
	page int
}

type wallhavenPool struct {
	mu           sync.Mutex
	items        []whPoolItem // available (not yet served) items
	servedIDs    map[string]struct{}
	recentPages  map[int]struct{}
	lastPage     int // last_page from most recent API response
	lastSeed     string
	lastFetch    time.Time
	backoff      time.Duration
	backoffUntil time.Time
	createdAt    time.Time
}

func newWallhavenPool() *wallhavenPool {
	return &wallhavenPool{
		servedIDs:   make(map[string]struct{}),
		recentPages: make(map[int]struct{}),
		createdAt:   time.Now(),
	}
}

// available returns items not yet served, filtering out any IDs in the
// caller-provided exclude set.
func (p *wallhavenPool) available(exclude map[string]bool) []int {
	indices := make([]int, 0, len(p.items))
	for i, item := range p.items {
		if _, served := p.servedIDs[item.item.ID]; served {
			continue
		}
		if exclude[item.item.ID] || exclude[item.item.Path] {
			continue
		}
		indices = append(indices, i)
	}
	return indices
}

// markServed records an item ID as served and trims oldest entries if needed.
func (p *wallhavenPool) markServed(id string) {
	p.servedIDs[id] = struct{}{}
	if len(p.servedIDs) > whPoolMaxServed {
		// Trim roughly half — order doesn't matter, just keep size bounded
		count := 0
		for k := range p.servedIDs {
			if count >= whPoolMaxServed/2 {
				break
			}
			delete(p.servedIDs, k)
			count++
		}
	}
}

// pickRandomPage returns a random page number avoiding recently visited pages.
func (p *wallhavenPool) pickRandomPage(rng *rand.Rand) int {
	if p.lastPage <= 0 {
		return 1
	}
	// Try up to 20 times to find an unvisited page
	for attempt := 0; attempt < 20; attempt++ {
		page := rng.Intn(p.lastPage) + 1
		if _, visited := p.recentPages[page]; !visited {
			return page
		}
	}
	// All pages visited or very few pages — clear history and pick fresh
	if len(p.recentPages) >= p.lastPage {
		p.recentPages = make(map[int]struct{})
	}
	return rng.Intn(p.lastPage) + 1
}

// recordPage marks a page as recently visited and trims old entries.
func (p *wallhavenPool) recordPage(page int) {
	p.recentPages[page] = struct{}{}
	if len(p.recentPages) > whPoolMaxRecentPages {
		// Remove oldest by just clearing and keeping the latest entry
		p.recentPages = map[int]struct{}{page: {}}
	}
}

// canFetch checks whether we're allowed to make an upstream request right now.
func (p *wallhavenPool) canFetch() bool {
	now := time.Now()
	if now.Before(p.backoffUntil) {
		return false
	}
	if now.Sub(p.lastFetch) < whMinFetchInterval {
		return false
	}
	return true
}

// recordSuccess resets backoff after a successful upstream fetch.
func (p *wallhavenPool) recordSuccess() {
	p.lastFetch = time.Now()
	p.backoff = 0
	p.backoffUntil = time.Time{}
}

// recordFailure increases backoff after an upstream error.
func (p *wallhavenPool) recordFailure() {
	p.lastFetch = time.Now()
	if p.backoff == 0 {
		p.backoff = whBackoffBase
	} else {
		p.backoff *= 2
		if p.backoff > whBackoffMax {
			p.backoff = whBackoffMax
		}
	}
	p.backoffUntil = time.Now().Add(p.backoff)
}

// isExpired returns true if the pool is too old and should be recreated.
func (p *wallhavenPool) isExpired() bool {
	return time.Since(p.createdAt) > whPoolExpiry
}

// ---------------------------------------------------------------------------
// Bing cache — long-lived multi-idx cache
// ---------------------------------------------------------------------------

const (
	bingCacheTTL       = 6 * time.Hour
	bingMaxIdx         = 7 // fetch idx 0..7 for up to 16 images
	bingImagesPerBatch = 8
)

type bingCache struct {
	mu        sync.Mutex
	images    []bingImage
	fetchedAt time.Time
}

func (c *bingCache) isStale() bool {
	return time.Since(c.fetchedAt) > bingCacheTTL || len(c.images) == 0
}

// ---------------------------------------------------------------------------
// WallpaperHandler — main handler with pool management
// ---------------------------------------------------------------------------

type WallpaperHandler struct {
	apiClient   *http.Client // for API calls (search, bing archive)
	proxyClient *http.Client // for image proxying (larger timeout)
	rng         *rand.Rand

	whMu    sync.Mutex
	whPools map[string]*wallhavenPool // keyed by query fingerprint

	bingMu    sync.Mutex
	bingStore *bingCache
}

func NewWallpaperHandler() *WallpaperHandler {
	return &WallpaperHandler{
		apiClient:   &http.Client{Timeout: 15 * time.Second},
		proxyClient: &http.Client{Timeout: 60 * time.Second},
		rng:         rand.New(rand.NewSource(time.Now().UnixNano())),
		whPools:     make(map[string]*wallhavenPool),
		bingStore:   &bingCache{},
	}
}

// whPoolKey builds a deterministic cache key from the Wallhaven search parameters.
func whPoolKey(query, categories, purity, atLeast, ratios, apiKey string) string {
	return strings.Join([]string{query, categories, purity, atLeast, ratios, apiKey}, "|")
}

// getOrCreatePool returns the pool for the given key, creating one if needed.
func (h *WallpaperHandler) getOrCreatePool(key string) *wallhavenPool {
	h.whMu.Lock()
	defer h.whMu.Unlock()
	pool, ok := h.whPools[key]
	if !ok || pool.isExpired() {
		pool = newWallhavenPool()
		h.whPools[key] = pool
	}
	// Garbage-collect expired pools from other keys
	if len(h.whPools) > 20 {
		for k, p := range h.whPools {
			if p.isExpired() {
				delete(h.whPools, k)
			}
		}
	}
	return pool
}

// fetchWallhavenPage makes one upstream request to Wallhaven and returns the
// parsed response. The caller must NOT hold pool.mu during this call.
func (h *WallpaperHandler) fetchWallhavenPage(ctx context.Context, query, categories, purity, atLeast, ratios, apiKey string, page int) (*wallhavenSearchResponse, error) {
	params := url.Values{}
	params.Set("sorting", "random")
	params.Set("categories", categories)
	params.Set("purity", purity)
	params.Set("atleast", atLeast)
	params.Set("ratios", ratios)
	params.Set("page", strconv.Itoa(page))
	if query != "" {
		params.Set("q", query)
	}
	if apiKey != "" {
		params.Set("apikey", apiKey)
	}

	apiURL := fmt.Sprintf("https://wallhaven.cc/api/v1/search?%s", params.Encode())
	log.Debug().Str("url", apiURL).Int("page", page).Msg("wallhaven upstream request")

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, err
	}
	resp, err := h.apiClient.Do(req)
	if err != nil {
		log.Warn().Err(err).Str("url", apiURL).Msg("wallhaven upstream failed")
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Warn().Int("status", resp.StatusCode).Str("url", apiURL).Msg("wallhaven upstream non-200")
		return nil, fmt.Errorf("wallhaven returned status %d", resp.StatusCode)
	}

	var payload wallhavenSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("wallhaven response decode: %w", err)
	}
	log.Debug().Int("results", len(payload.Data)).Int("last_page", payload.Meta.LastPage).Msg("wallhaven upstream ok")
	return &payload, nil
}

func (h *WallpaperHandler) WallhavenRandom(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	atLeast := strings.TrimSpace(r.URL.Query().Get("atleast"))
	if atLeast == "" {
		atLeast = "1920x1080"
	}
	ratios := strings.TrimSpace(r.URL.Query().Get("ratios"))
	if ratios == "" {
		ratios = "16x9,16x10,21x9"
	}
	categories := strings.TrimSpace(r.URL.Query().Get("categories"))
	if categories == "" {
		categories = "110"
	}
	purity := strings.TrimSpace(r.URL.Query().Get("purity"))
	if purity == "" {
		purity = "100"
	}
	apiKey := strings.TrimSpace(r.URL.Query().Get("apikey"))

	// Build caller-provided exclude set (image IDs or URLs from frontend history)
	excludeSet := map[string]bool{}
	for _, raw := range r.URL.Query()["exclude"] {
		if v := strings.TrimSpace(raw); v != "" {
			excludeSet[v] = true
		}
	}

	key := whPoolKey(query, categories, purity, atLeast, ratios, apiKey)
	pool := h.getOrCreatePool(key)

	// --- Phase 1: try to pick from existing pool (short lock) ---
	pool.mu.Lock()
	if indices := pool.available(excludeSet); len(indices) > 0 {
		idx := indices[h.rng.Intn(len(indices))]
		picked := pool.items[idx]
		pool.markServed(picked.item.ID)

		// Trigger background refill if pool is running low
		remaining := len(pool.available(excludeSet))
		needRefill := remaining < whPoolLowWatermark && pool.canFetch()
		pool.mu.Unlock()

		if needRefill {
			go h.refillPool(key, query, categories, purity, atLeast, ratios, apiKey)
		}

		h.respondWallhaven(w, r, picked)
		return
	}

	// Pool is empty or fully exhausted — need to fetch a new page
	if !pool.canFetch() {
		pool.mu.Unlock()
		web.Fail(w, r, "WALLPAPER_RATE_LIMITED", "please wait a moment before refreshing", http.StatusTooManyRequests)
		return
	}

	page := pool.pickRandomPage(h.rng)
	pool.mu.Unlock()
	// --- Lock released: now do the slow network call outside the lock ---

	payload, err := h.fetchWallhavenPage(r.Context(), query, categories, purity, atLeast, ratios, apiKey, page)

	// --- Phase 2: re-acquire lock to update pool ---
	pool.mu.Lock()
	if err != nil {
		pool.recordFailure()
		pool.mu.Unlock()
		web.Fail(w, r, "WALLPAPER_UPSTREAM_FAILED", err.Error(), http.StatusBadGateway)
		return
	}
	if len(payload.Data) == 0 {
		pool.recordSuccess()
		pool.mu.Unlock()
		web.Fail(w, r, "WALLPAPER_NOT_FOUND", "no wallpaper matched the current filters", http.StatusNotFound)
		return
	}

	pool.recordSuccess()
	pool.lastPage = payload.Meta.LastPage
	pool.lastSeed = payload.Meta.Seed
	pool.recordPage(payload.Meta.CurrentPage)

	// Add all new items to the pool, skipping already-served ones
	for _, item := range payload.Data {
		if _, served := pool.servedIDs[item.ID]; !served {
			pool.items = append(pool.items, whPoolItem{
				item: item,
				seed: payload.Meta.Seed,
				page: payload.Meta.CurrentPage,
			})
		}
	}

	// Now pick from refreshed pool
	if indices := pool.available(excludeSet); len(indices) > 0 {
		idx := indices[h.rng.Intn(len(indices))]
		picked := pool.items[idx]
		pool.markServed(picked.item.ID)
		pool.mu.Unlock()
		h.respondWallhaven(w, r, picked)
		return
	}

	// Still nothing (extremely narrow filters) — just return the first item
	first := payload.Data[0]
	pool.markServed(first.ID)
	pool.mu.Unlock()
	h.respondWallhaven(w, r, whPoolItem{item: first, seed: payload.Meta.Seed, page: payload.Meta.CurrentPage})
}

// refillPool fetches a new page in the background and adds items to the pool.
func (h *WallpaperHandler) refillPool(key, query, categories, purity, atLeast, ratios, apiKey string) {
	pool := h.getOrCreatePool(key)
	pool.mu.Lock()
	if !pool.canFetch() {
		pool.mu.Unlock()
		return
	}
	page := pool.pickRandomPage(h.rng)
	pool.mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	payload, err := h.fetchWallhavenPage(ctx, query, categories, purity, atLeast, ratios, apiKey, page)

	pool.mu.Lock()
	defer pool.mu.Unlock()
	if err != nil {
		pool.recordFailure()
		log.Warn().Err(err).Str("key", key).Msg("wallhaven background refill failed")
		return
	}
	pool.recordSuccess()
	if payload.Meta.LastPage > 0 {
		pool.lastPage = payload.Meta.LastPage
	}
	pool.lastSeed = payload.Meta.Seed
	pool.recordPage(payload.Meta.CurrentPage)

	for _, item := range payload.Data {
		if _, served := pool.servedIDs[item.ID]; !served {
			pool.items = append(pool.items, whPoolItem{
				item: item,
				seed: payload.Meta.Seed,
				page: payload.Meta.CurrentPage,
			})
		}
	}
	log.Debug().Str("key", key).Int("added", len(payload.Data)).Int("pool_size", len(pool.items)).Msg("wallhaven background refill ok")
}

// respondWallhaven writes the JSON response for a picked wallhaven item.
func (h *WallpaperHandler) respondWallhaven(w http.ResponseWriter, r *http.Request, picked whPoolItem) {
	pool := h.getOrCreatePool(whPoolKey(
		strings.TrimSpace(r.URL.Query().Get("q")),
		strings.TrimSpace(r.URL.Query().Get("categories")),
		strings.TrimSpace(r.URL.Query().Get("purity")),
		strings.TrimSpace(r.URL.Query().Get("atleast")),
		strings.TrimSpace(r.URL.Query().Get("ratios")),
		strings.TrimSpace(r.URL.Query().Get("apikey")),
	))
	pool.mu.Lock()
	poolRemaining := len(pool.items) - len(pool.servedIDs)
	if poolRemaining < 0 {
		poolRemaining = 0
	}
	pool.mu.Unlock()

	web.OK(w, r, map[string]any{
		"provider":       "wallhaven",
		"id":             picked.item.ID,
		"url":            picked.item.URL,
		"image_url":      picked.item.Path,
		"thumb_url":      picked.item.Thumbs.Large,
		"resolution":     picked.item.Resolution,
		"ratio":          picked.item.Ratio,
		"category":       picked.item.Category,
		"purity":         picked.item.Purity,
		"colors":         picked.item.Colors,
		"seed":           picked.seed,
		"page":           picked.page,
		"total":          pool.lastPage * 24, // approximate total
		"pool_remaining": poolRemaining,
	})
}

// ---------------------------------------------------------------------------
// Bing Daily — cached multi-idx fetcher
// ---------------------------------------------------------------------------

// fetchBingBatch fetches one batch of Bing daily images at the given idx offset.
func (h *WallpaperHandler) fetchBingBatch(idx int) ([]bingImage, error) {
	apiURL := fmt.Sprintf("https://cn.bing.com/HPImageArchive.aspx?format=js&idx=%d&n=%d&mkt=zh-CN", idx, bingImagesPerBatch)
	resp, err := h.apiClient.Get(apiURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("bing returned status %d", resp.StatusCode)
	}

	var payload bingImageArchiveResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}
	return payload.Images, nil
}

// refreshBingCache fetches multiple idx batches and merges them into the cache.
func (h *WallpaperHandler) refreshBingCache() error {
	seen := map[string]bool{}
	var all []bingImage

	for idx := 0; idx <= bingMaxIdx; idx++ {
		images, err := h.fetchBingBatch(idx)
		if err != nil {
			// Partial failure is OK — keep what we have
			if len(all) > 0 {
				break
			}
			return err
		}
		for _, img := range images {
			key := strings.TrimSpace(img.URLBase)
			if key == "" {
				key = strings.TrimSpace(img.URL)
			}
			if key != "" && !seen[key] {
				seen[key] = true
				all = append(all, img)
			}
		}
	}

	h.bingMu.Lock()
	h.bingStore.images = all
	h.bingStore.fetchedAt = time.Now()
	h.bingMu.Unlock()
	return nil
}

func (h *WallpaperHandler) BingDaily(w http.ResponseWriter, r *http.Request) {
	h.bingMu.Lock()
	stale := h.bingStore.isStale()
	h.bingMu.Unlock()

	if stale {
		if err := h.refreshBingCache(); err != nil {
			web.Fail(w, r, "WALLPAPER_UPSTREAM_FAILED", err.Error(), http.StatusBadGateway)
			return
		}
	}

	h.bingMu.Lock()
	images := make([]bingImage, len(h.bingStore.images))
	copy(images, h.bingStore.images)
	h.bingMu.Unlock()

	if len(images) == 0 {
		web.Fail(w, r, "WALLPAPER_NOT_FOUND", "no bing wallpaper found", http.StatusNotFound)
		return
	}

	excluded := map[string]bool{}
	for _, raw := range r.URL.Query()["exclude"] {
		value := strings.TrimSpace(raw)
		if value != "" {
			excluded[value] = true
		}
	}

	// Filter candidates, resolving full URLs
	type candidate struct {
		image    bingImage
		imageURL string
	}
	var candidates []candidate
	for _, img := range images {
		imageURL := normalizeBingURL(img.URL, img.URLBase)
		if imageURL == "" || excluded[imageURL] {
			continue
		}
		candidates = append(candidates, candidate{image: img, imageURL: imageURL})
	}

	// If all excluded, fall back to full set
	if len(candidates) == 0 {
		for _, img := range images {
			imageURL := normalizeBingURL(img.URL, img.URLBase)
			if imageURL != "" {
				candidates = append(candidates, candidate{image: img, imageURL: imageURL})
			}
		}
	}

	if len(candidates) == 0 {
		web.Fail(w, r, "WALLPAPER_NOT_FOUND", "bing wallpaper url is empty", http.StatusNotFound)
		return
	}

	picked := candidates[h.rng.Intn(len(candidates))]
	web.OK(w, r, map[string]any{
		"provider":        "bing",
		"image_url":       picked.imageURL,
		"title":           picked.image.Title,
		"copyright":       picked.image.Copyright,
		"start_date":      picked.image.StartDate,
		"full_start_date": picked.image.FullStartDate,
		"pool_size":       len(images),
	})
}

// normalizeBingURL resolves a Bing image URL from the raw url / urlbase fields.
func normalizeBingURL(rawURL, urlBase string) string {
	imageURL := strings.TrimSpace(rawURL)
	if imageURL == "" {
		imageURL = strings.TrimSpace(urlBase)
		if imageURL != "" {
			imageURL += "_UHD.jpg"
		}
	}
	if imageURL == "" {
		return ""
	}
	if strings.HasPrefix(imageURL, "/") {
		imageURL = "https://cn.bing.com" + imageURL
	}
	return imageURL
}

// ---------------------------------------------------------------------------
// Unsplash (unchanged — already returns random from upstream each call)
// ---------------------------------------------------------------------------

func (h *WallpaperHandler) UnsplashRandom(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	if query == "" {
		query = "wallpaper landscape"
	}

	apiURL := fmt.Sprintf("https://unsplash.com/napi/photos/random?orientation=landscape&query=%s", url.QueryEscape(query))
	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, apiURL, nil)
	if err != nil {
		web.Fail(w, r, "WALLPAPER_UPSTREAM_FAILED", err.Error(), http.StatusInternalServerError)
		return
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Referer", "https://unsplash.com/")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	resp, err := h.apiClient.Do(req)
	if err != nil {
		web.Fail(w, r, "WALLPAPER_UPSTREAM_FAILED", err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		web.Fail(w, r, "WALLPAPER_UPSTREAM_FAILED", fmt.Sprintf("unsplash returned status %d", resp.StatusCode), http.StatusBadGateway)
		return
	}

	var payload unsplashRandomResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		web.Fail(w, r, "WALLPAPER_INVALID_RESPONSE", err.Error(), http.StatusBadGateway)
		return
	}

	imageURL := strings.TrimSpace(payload.URLs.Regular)
	if imageURL == "" {
		imageURL = strings.TrimSpace(payload.URLs.Full)
	}
	if imageURL == "" {
		imageURL = strings.TrimSpace(payload.URLs.Raw)
	}
	if imageURL == "" {
		web.Fail(w, r, "WALLPAPER_NOT_FOUND", "no unsplash wallpaper found", http.StatusNotFound)
		return
	}

	title := strings.TrimSpace(payload.Description)
	if title == "" {
		title = strings.TrimSpace(payload.AltDescription)
	}

	web.OK(w, r, map[string]any{
		"provider":     "unsplash",
		"image_url":    imageURL,
		"title":        title,
		"photographer": payload.User.Name,
	})
}

// ---------------------------------------------------------------------------
// Image proxy (unchanged)
// ---------------------------------------------------------------------------

// allowedProxyHosts is the set of upstream hosts we allow proxying images from.
var allowedProxyHosts = map[string]bool{
	"w.wallhaven.cc":      true,
	"th.wallhaven.cc":     true,
	"cn.bing.com":         true,
	"bing.com":            true,
	"images.unsplash.com": true,
}

// ImageProxy fetches a remote wallpaper image server-side, adding the correct
// Referer and User-Agent headers that Wallhaven's CDN requires. Only whitelisted
// hosts are proxied to prevent open-redirect / SSRF issues.
func (h *WallpaperHandler) ImageProxy(w http.ResponseWriter, r *http.Request) {
	rawURL := strings.TrimSpace(r.URL.Query().Get("url"))
	if rawURL == "" {
		web.Fail(w, r, "WALLPAPER_PROXY_MISSING_URL", "url query parameter is required", http.StatusBadRequest)
		return
	}

	parsed, err := url.Parse(rawURL)
	if err != nil || (parsed.Scheme != "https" && parsed.Scheme != "http") {
		web.Fail(w, r, "WALLPAPER_PROXY_INVALID_URL", "invalid image URL", http.StatusBadRequest)
		return
	}

	if !allowedProxyHosts[parsed.Host] {
		web.Fail(w, r, "WALLPAPER_PROXY_HOST_DENIED", fmt.Sprintf("host %q is not allowed", parsed.Host), http.StatusForbidden)
		return
	}

	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, rawURL, nil)
	if err != nil {
		web.Fail(w, r, "WALLPAPER_PROXY_FAILED", err.Error(), http.StatusInternalServerError)
		return
	}
	req.Header.Set("Referer", "https://wallhaven.cc/")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	log.Debug().Str("url", rawURL).Str("host", parsed.Host).Msg("wallpaper proxy request")
	resp, err := h.proxyClient.Do(req)
	if err != nil {
		log.Warn().Err(err).Str("url", rawURL).Msg("wallpaper proxy failed")
		web.Fail(w, r, "WALLPAPER_PROXY_FAILED", err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Warn().Int("status", resp.StatusCode).Str("url", rawURL).Msg("wallpaper proxy upstream non-200")
		web.Fail(w, r, "WALLPAPER_PROXY_UPSTREAM", fmt.Sprintf("upstream returned %d", resp.StatusCode), http.StatusBadGateway)
		return
	}

	ct := resp.Header.Get("Content-Type")
	if ct == "" {
		ct = "image/jpeg"
	}
	w.Header().Set("Content-Type", ct)
	w.Header().Set("Cache-Control", "public, max-age=86400")
	if cl := resp.Header.Get("Content-Length"); cl != "" {
		w.Header().Set("Content-Length", cl)
	}

	io.Copy(w, resp.Body)
}
