package commands

import (
	"fmt"
	"os"

	"HermesDeckX/internal/database"
	"HermesDeckX/internal/i18n"
	"HermesDeckX/internal/logger"
	"HermesDeckX/internal/webconfig"
)

func ResetUsername(args []string) int {
	if len(args) < 2 {
		fmt.Fprintln(os.Stderr, i18n.T(i18n.MsgResetUsernameUsage))
		return 2
	}

	oldUsername := args[0]
	newUsername := args[1]

	if len(newUsername) < 3 {
		fmt.Fprintln(os.Stderr, i18n.T(i18n.MsgResetUsernameTooShort))
		return 1
	}

	cfg, err := webconfig.Load()
	if err != nil {
		fmt.Fprintln(os.Stderr, i18n.T(i18n.MsgResetUsernameConfigLoadFailed, map[string]interface{}{"Error": err.Error()}))
		return 1
	}

	logger.Init(cfg.Log)

	if err := database.Init(cfg.Database, false); err != nil {
		fmt.Fprintln(os.Stderr, i18n.T(i18n.MsgResetUsernameDbInitFailed, map[string]interface{}{"Error": err.Error()}))
		return 1
	}
	defer database.Close()

	repo := database.NewUserRepo()

	user, err := repo.FindByUsername(oldUsername)
	if err != nil {
		fmt.Fprintln(os.Stderr, i18n.T(i18n.MsgResetUsernameUserNotFound, map[string]interface{}{"Username": oldUsername}))
		return 1
	}

	if existing, _ := repo.FindByUsername(newUsername); existing != nil {
		fmt.Fprintln(os.Stderr, i18n.T(i18n.MsgResetUsernameExists, map[string]interface{}{"Username": newUsername}))
		return 1
	}

	if err := repo.UpdateUsername(user.ID, newUsername); err != nil {
		fmt.Fprintln(os.Stderr, i18n.T(i18n.MsgResetUsernameUpdateFailed, map[string]interface{}{"Error": err.Error()}))
		return 1
	}

	fmt.Println(i18n.T(i18n.MsgResetUsernameSuccess, map[string]interface{}{
		"OldUsername": oldUsername,
		"NewUsername": newUsername,
	}))
	return 0
}
