// Package retry provides a generic retry-with-backoff utility.
// Inspired by hermesagent's retry.ts and backoff.ts.
//
// Usage:
//
//	result, err := retry.Do(ctx, retry.Config{Attempts: 3}, func() (T, error) {
//	    return callAPI()
//	})
package retry

import (
	"context"
	"math"
	"math/rand"
	"time"
)

// Config controls retry behavior.
type Config struct {
	// Attempts is the maximum number of attempts (including the first).
	Attempts int
	// MinDelay is the initial delay before the first retry.
	MinDelay time.Duration
	// MaxDelay caps the backoff delay.
	MaxDelay time.Duration
	// Jitter adds randomness to the delay (0.0 = none, 1.0 = full).
	Jitter float64
	// ShouldRetry decides whether to retry on a given error.
	// If nil, all errors are retried.
	ShouldRetry func(err error) bool
}

// DefaultConfig provides sensible defaults.
var DefaultConfig = Config{
	Attempts: 3,
	MinDelay: 300 * time.Millisecond,
	MaxDelay: 30 * time.Second,
	Jitter:   0.1,
}

// Do executes fn up to cfg.Attempts times, backing off on failure.
// Returns the result of the first successful call or the last error.
func Do[T any](ctx context.Context, cfg Config, fn func() (T, error)) (T, error) {
	if cfg.Attempts <= 0 {
		cfg.Attempts = DefaultConfig.Attempts
	}
	if cfg.MinDelay <= 0 {
		cfg.MinDelay = DefaultConfig.MinDelay
	}
	if cfg.MaxDelay <= 0 {
		cfg.MaxDelay = DefaultConfig.MaxDelay
	}

	var lastErr error
	var zero T

	for attempt := 0; attempt < cfg.Attempts; attempt++ {
		result, err := fn()
		if err == nil {
			return result, nil
		}
		lastErr = err

		// Check if we should retry this error
		if cfg.ShouldRetry != nil && !cfg.ShouldRetry(err) {
			return zero, err
		}

		// Don't sleep after the last attempt
		if attempt == cfg.Attempts-1 {
			break
		}

		delay := backoff(cfg.MinDelay, cfg.MaxDelay, attempt, cfg.Jitter)

		select {
		case <-ctx.Done():
			return zero, ctx.Err()
		case <-time.After(delay):
		}
	}

	return zero, lastErr
}

// Run is like Do but for functions that return only an error.
func Run(ctx context.Context, cfg Config, fn func() error) error {
	_, err := Do(ctx, cfg, func() (struct{}, error) {
		return struct{}{}, fn()
	})
	return err
}

// backoff computes exponential backoff with optional jitter.
func backoff(minDelay, maxDelay time.Duration, attempt int, jitter float64) time.Duration {
	delay := float64(minDelay) * math.Pow(2, float64(attempt))
	if delay > float64(maxDelay) {
		delay = float64(maxDelay)
	}
	if jitter > 0 {
		delay = delay * (1 - jitter + rand.Float64()*jitter*2)
	}
	if delay < 0 {
		delay = float64(minDelay)
	}
	return time.Duration(delay)
}
