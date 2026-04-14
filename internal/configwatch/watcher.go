// Package configwatch provides hot-reload capability for configuration files.
package configwatch

import (
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
)

type ReloadMode string

const (
	ModeHot     ReloadMode = "hot"     // Hot reload without restart
	ModeRestart ReloadMode = "restart" // Trigger restart
	ModeHybrid  ReloadMode = "hybrid"  // Hot reload if possible, restart otherwise
)

type Config struct {
	Path         string
	DebounceMs   int
	Mode         ReloadMode
	OnReload     func() error
	OnNeedRestart func()
}

type Watcher struct {
	cfg      Config
	watcher  *fsnotify.Watcher
	stopCh   chan struct{}
	debounce *time.Timer
	mu       sync.Mutex
}

func New(cfg Config) (*Watcher, error) {
	if cfg.DebounceMs <= 0 {
		cfg.DebounceMs = 300
	}
	if cfg.Mode == "" {
		cfg.Mode = ModeHot
	}

	w, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, err
	}

	if err := w.Add(cfg.Path); err != nil {
		w.Close()
		return nil, err
	}

	return &Watcher{
		cfg:     cfg,
		watcher: w,
		stopCh:  make(chan struct{}),
	}, nil
}

func (w *Watcher) Start() {
	go w.loop()
}

func (w *Watcher) Stop() {
	close(w.stopCh)
	w.watcher.Close()
}

func (w *Watcher) loop() {
	for {
		select {
		case <-w.stopCh:
			return
		case event := <-w.watcher.Events:
			if event.Op&(fsnotify.Write|fsnotify.Create) != 0 {
				w.scheduleReload()
			}
		case <-w.watcher.Errors:
			// Ignore errors
		}
	}
}

func (w *Watcher) scheduleReload() {
	w.mu.Lock()
	defer w.mu.Unlock()

	if w.debounce != nil {
		w.debounce.Stop()
	}
	w.debounce = time.AfterFunc(time.Duration(w.cfg.DebounceMs)*time.Millisecond, w.reload)
}

func (w *Watcher) reload() {
	if w.cfg.OnReload != nil {
		if err := w.cfg.OnReload(); err != nil && w.cfg.OnNeedRestart != nil {
			w.cfg.OnNeedRestart()
		}
	}
}
