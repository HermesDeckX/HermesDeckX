// Package safego provides a panic-safe goroutine launcher that catches panics,
// logs them, and optionally restarts the goroutine instead of crashing the process.
//
// Inspired by hermesagent's unhandled-rejections.ts error classification.
package safego

import (
	"fmt"
	"net"
	"runtime/debug"
	"strings"
	"time"

	"HermesDeckX/internal/logger"
)

// Go launches fn in a new goroutine with panic recovery.
// If the goroutine panics, the error is logged and the goroutine is NOT restarted.
func Go(name string, fn func()) {
	go func() {
		defer recoverAndLog(name, false, nil)
		fn()
	}()
}

// GoLoop launches fn in a new goroutine with panic recovery and auto-restart.
// If the goroutine panics with a non-fatal error, it is restarted after a cooldown.
// Fatal panics (OOM, stack overflow) cause the process to exit.
func GoLoop(name string, fn func()) {
	go func() {
		for {
			func() {
				defer func() {
					if r := recover(); r != nil {
						if isFatalPanic(r) {
							logger.Log.Fatal().
								Str("goroutine", name).
								Interface("panic", r).
								Str("stack", string(debug.Stack())).
								Msg("FATAL panic in goroutine, exiting")
							return
						}
						logger.Log.Error().
							Str("goroutine", name).
							Interface("panic", r).
							Bool("transient", isTransientError(r)).
							Str("stack", string(debug.Stack())).
							Msg("panic recovered in goroutine, restarting after cooldown")
					}
				}()
				fn()
			}()

			// If fn returned normally (not via panic), don't restart
			return
		}
	}()
}

// GoLoopWithCooldown is like GoLoop but always restarts after cooldown on panic.
func GoLoopWithCooldown(name string, cooldown time.Duration, fn func()) {
	go func() {
		for {
			panicked := false
			func() {
				defer func() {
					if r := recover(); r != nil {
						panicked = true
						if isFatalPanic(r) {
							logger.Log.Fatal().
								Str("goroutine", name).
								Interface("panic", r).
								Str("stack", string(debug.Stack())).
								Msg("FATAL panic in goroutine, exiting")
							return
						}
						logger.Log.Error().
							Str("goroutine", name).
							Interface("panic", r).
							Str("stack", string(debug.Stack())).
							Msg("panic recovered, restarting after cooldown")
					}
				}()
				fn()
			}()

			if !panicked {
				return
			}
			time.Sleep(cooldown)
		}
	}()
}

func recoverAndLog(name string, restart bool, restartFn func()) {
	if r := recover(); r != nil {
		if isFatalPanic(r) {
			logger.Log.Fatal().
				Str("goroutine", name).
				Interface("panic", r).
				Str("stack", string(debug.Stack())).
				Msg("FATAL panic in goroutine, exiting")
			return
		}

		logger.Log.Error().
			Str("goroutine", name).
			Interface("panic", r).
			Bool("transient", isTransientError(r)).
			Str("stack", string(debug.Stack())).
			Msg("panic recovered in goroutine")
	}
}

// isFatalPanic returns true for panics that indicate unrecoverable state.
func isFatalPanic(r interface{}) bool {
	msg := fmt.Sprintf("%v", r)
	lower := strings.ToLower(msg)
	return strings.Contains(lower, "out of memory") ||
		strings.Contains(lower, "stack overflow") ||
		strings.Contains(lower, "runtime: out of memory")
}

// IsTransientError returns true for errors that are temporary network issues.
// Exported so RecoveryMiddleware and other callers can use it.
func IsTransientError(err interface{}) bool {
	return isTransientError(err)
}

func isTransientError(err interface{}) bool {
	if err == nil {
		return false
	}

	// Check net.Error (timeout, temporary)
	if netErr, ok := err.(net.Error); ok {
		return netErr.Timeout()
	}

	msg := fmt.Sprintf("%v", err)
	lower := strings.ToLower(msg)

	transientPatterns := []string{
		"connection reset",
		"connection refused",
		"broken pipe",
		"eof",
		"timeout",
		"timed out",
		"temporary failure",
		"network is unreachable",
		"no route to host",
		"connection aborted",
		"i/o timeout",
		"use of closed network connection",
	}

	for _, p := range transientPatterns {
		if strings.Contains(lower, p) {
			return true
		}
	}
	return false
}
