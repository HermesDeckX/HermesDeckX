package commands

import (
	"fmt"
	"os"
	"time"

	"HermesDeckX/internal/constants"
	"HermesDeckX/internal/database"
	"HermesDeckX/internal/logger"
	"HermesDeckX/internal/webconfig"
)

func Unlock(args []string) int {
	if len(args) < 1 {
		fmt.Fprintln(os.Stderr, "Usage: hermesdeckx unlock <username>")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "Unlock a user account that has been locked due to failed login attempts.")
		fmt.Fprintln(os.Stderr, "This command clears the account lock and resets the failed login attempt counter.")
		return 2
	}

	username := args[0]

	// Load config
	cfg, err := webconfig.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to load config: %v\n", err)
		return 1
	}

	// Initialize logger
	logger.Init(cfg.Log)

	// Initialize database
	if err := database.Init(cfg.Database, false); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to initialize database: %v\n", err)
		return 1
	}
	defer database.Close()

	// Initialize repositories
	userRepo := database.NewUserRepo()
	auditRepo := database.NewAuditLogRepo()

	// Find user
	user, err := userRepo.FindByUsername(username)
	if err != nil {
		fmt.Fprintf(os.Stderr, "User '%s' not found\n", username)
		return 1
	}

	// Check if user is locked
	now := time.Now().UTC()
	isLocked := user.LockedUntil != nil && user.LockedUntil.After(now)

	if !isLocked && user.FailedAttempts == 0 {
		logger.Log.Info().Str("username", username).Msg("user is not locked")
		fmt.Printf("User '%s' is not locked.\n", username)
		return 0
	}

	// Unlock user (reset failed attempts and clear lock)
	if err := userRepo.ResetFailedAttempts(user.ID); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to unlock user: %v\n", err)
		return 1
	}

	// Create audit log
	auditRepo.Create(&database.AuditLog{
		UserID:   user.ID,
		Username: user.Username,
		Action:   constants.ActionAccountUnlocked,
		Result:   "success",
		Detail:   "unlocked via CLI",
		IP:       "127.0.0.1",
	})

	logger.Log.Info().Str("username", username).Msg("user unlocked successfully")

	if isLocked {
		fmt.Printf("User '%s' has been unlocked successfully.\n", username)
		fmt.Printf("Lock time remaining: %s\n", user.LockedUntil.Sub(now).Round(time.Second))
	} else {
		fmt.Printf("User '%s' failed attempts counter has been reset.\n", username)
	}

	fmt.Println("The user can now log in normally.")

	return 0
}
