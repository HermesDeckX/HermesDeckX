package commands

import (
	"fmt"
	"os"

	"HermesDeckX/internal/database"
	"HermesDeckX/internal/i18n"
	"HermesDeckX/internal/logger"
	"HermesDeckX/internal/webconfig"
)

func ListUsers(args []string) int {
	cfg, err := webconfig.Load()
	if err != nil {
		fmt.Fprintln(os.Stderr, i18n.T(i18n.MsgListUsersConfigLoadFailed, map[string]interface{}{"Error": err.Error()}))
		return 1
	}

	logger.Init(cfg.Log)

	if err := database.Init(cfg.Database, false); err != nil {
		fmt.Fprintln(os.Stderr, i18n.T(i18n.MsgListUsersDbInitFailed, map[string]interface{}{"Error": err.Error()}))
		return 1
	}
	defer database.Close()

	repo := database.NewUserRepo()
	users, err := repo.List()
	if err != nil || len(users) == 0 {
		fmt.Fprintln(os.Stderr, i18n.T(i18n.MsgListUsersNoUsers))
		return 0
	}

	fmt.Println(i18n.T(i18n.MsgListUsersHeader))
	for i, u := range users {
		status := "active"
		if u.LockedUntil != nil {
			status = "locked"
		}
		fmt.Printf("  %d. %s (ID: %d, status: %s)\n", i+1, u.Username, u.ID, status)
	}

	return 0
}
