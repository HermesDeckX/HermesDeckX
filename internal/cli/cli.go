package cli

import (
	"errors"
	"fmt"
	"os"
	"strings"

	"HermesDeckX/internal/appconfig"
	"HermesDeckX/internal/commands"
	"HermesDeckX/internal/i18n"
	"HermesDeckX/internal/output"
	"HermesDeckX/internal/version"
)

func Run(args []string) int {
	cfgPath := appconfig.ConfigPath()
	cfg, err := appconfig.Load(cfgPath)
	if err != nil {
		output.Printf("%s\n", i18n.T(i18n.MsgServeConfigLoadFailed, map[string]interface{}{"Error": err.Error()}))
		cfg = appconfig.Default()
	}
	output.SetDebug(cfg.IsDebug())
	output.Debugf(i18n.T(i18n.MsgCliConfigLoaded, map[string]interface{}{"Path": cfgPath, "Mode": cfg.Mode}) + "\n")

	// Initialize i18n
	i18n.Init()

	// Default CLI language to English (no interactive language countdown)
	i18n.SetLanguage("en")

	if len(args) < 2 {
		return commands.RunServe(nil)
	}

	switch args[1] {
	case "-h", "--help", "help":
		output.Println(usage())
		return 0
	case "-v", "--version", "version":
		output.Printf("HermesDeckX %s\n", version.Version)
		return 0
	case "doctor":
		return commands.Doctor(args[2:])
	case "settings":
		return handleSettings(args[2:])
	case "reset-password":
		return commands.ResetPassword(args[2:])
	case "reset-username":
		return commands.ResetUsername(args[2:])
	case "list-users":
		return commands.ListUsers(args[2:])
	case "unlock":
		return commands.Unlock(args[2:])
	default:
		return commands.RunServe(args[1:])
	}
}

func usage() string {
	b := &strings.Builder{}
	fmt.Fprintln(b, i18n.T(i18n.MsgCliAppName))
	fmt.Fprintln(b, "")
	fmt.Fprintln(b, i18n.T(i18n.MsgCliUsage))
	fmt.Fprintln(b, i18n.T(i18n.MsgCliStartWeb))
	fmt.Fprintln(b, i18n.T(i18n.MsgCliCommandUsage))
	fmt.Fprintln(b, "")
	fmt.Fprintln(b, i18n.T(i18n.MsgCliOptions))
	fmt.Fprintln(b, i18n.T(i18n.MsgCliOptPort))
	fmt.Fprintln(b, i18n.T(i18n.MsgCliOptBind))
	fmt.Fprintln(b, i18n.T(i18n.MsgCliOptUser))
	fmt.Fprintln(b, i18n.T(i18n.MsgCliOptPassword))
	fmt.Fprintln(b, i18n.T(i18n.MsgCliOptDebug))
	fmt.Fprintln(b, i18n.T(i18n.MsgCliOptHelp))
	fmt.Fprintln(b, i18n.T(i18n.MsgCliOptVersion))
	fmt.Fprintln(b, "")
	fmt.Fprintln(b, i18n.T(i18n.MsgCliCommands))
	fmt.Fprintln(b, i18n.T(i18n.MsgCliCmdDoctor))
	fmt.Fprintln(b, i18n.T(i18n.MsgCliCmdSettings))
	fmt.Fprintln(b, i18n.T(i18n.MsgCliCmdResetPassword))
	fmt.Fprintln(b, i18n.T(i18n.MsgCliCmdResetUsername))
	fmt.Fprintln(b, i18n.T(i18n.MsgCliCmdListUsers))
	fmt.Fprintln(b, i18n.T(i18n.MsgCliCmdUnlock))
	fmt.Fprintln(b, "")
	fmt.Fprintln(b, i18n.T(i18n.MsgCliExamples))
	fmt.Fprintln(b, i18n.T(i18n.MsgCliExampleStart))
	fmt.Fprintln(b, i18n.T(i18n.MsgCliExamplePort))
	fmt.Fprintln(b, i18n.T(i18n.MsgCliExampleUser))
	fmt.Fprintln(b, i18n.T(i18n.MsgCliExampleDoctor))
	return b.String()
}

func handleSettings(args []string) int {
	if len(args) == 0 {
		output.Println(settingsUsage())
		return 2
	}
	switch args[0] {
	case "show":
		return commands.SettingsShow(args[1:])
	case "set-mode":
		return commands.SettingsSetMode(args[1:])
	default:
		output.Printf("%s\n\n", i18n.T(i18n.MsgCliUnknownCommand, map[string]interface{}{"Command": args[0]}))
		output.Println(settingsUsage())
		return 2
	}
}

func settingsUsage() string {
	b := &strings.Builder{}
	fmt.Fprintln(b, i18n.T(i18n.MsgSettingsUsage))
	fmt.Fprintln(b, "")
	fmt.Fprintln(b, i18n.T(i18n.MsgSettingsSubcommands))
	fmt.Fprintln(b, i18n.T(i18n.MsgSettingsCmdShow))
	fmt.Fprintln(b, i18n.T(i18n.MsgSettingsCmdSetMode))
	return b.String()
}

var ErrInvalidArgs = errors.New(i18n.T(i18n.MsgErrInvalidArgs))

func PrintError(err error) {
	if err == nil {
		return
	}
	output.Printf("%s\n", i18n.T(i18n.MsgCliError, map[string]interface{}{"Error": err.Error()}))
	os.Exit(1)
}
