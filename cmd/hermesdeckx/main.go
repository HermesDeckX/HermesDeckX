package main

import (
	"os"

	"HermesDeckX/internal/cli"
)

func main() {
	os.Exit(cli.Run(os.Args))
}
