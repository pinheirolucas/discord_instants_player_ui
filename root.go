package main

import (
	"os"
	"strings"
	"time"

	"github.com/leaanthony/mewn"
	"github.com/mitchellh/go-homedir"
	"github.com/pkg/errors"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"github.com/wailsapp/wails"

	"discord-instants-player/bot"
	"discord-instants-player/instant"
	"discord-instants-player/keyboard"
)

var cfgFile string

var rootCmd = &cobra.Command{
	Use:           "discord_instants_player",
	Short:         "Run the discord instants player app",
	SilenceErrors: true,
	SilenceUsage:  true,
	RunE:          runRootCmd,
}

func init() {
	cobra.OnInitialize(initConfig)

	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default is $HOME/.discord_instants_player.yaml)")

	rootCmd.PersistentFlags().String("owner", "", "username for the bot owner")
	viper.BindPFlag("discord_instants_player_owner", rootCmd.PersistentFlags().Lookup("owner"))

	rootCmd.PersistentFlags().String("token", "", "bot token to bind the application")
	viper.BindPFlag("discord_instants_player_token", rootCmd.PersistentFlags().Lookup("token"))

	rootCmd.PersistentFlags().Bool("no-ui", false, "run only the bot and the http server")
	viper.BindPFlag("discord_instants_player_noui", rootCmd.PersistentFlags().Lookup("no-ui"))
}

func runRootCmd(cmd *cobra.Command, args []string) error {
	token := viper.GetString("discord_instants_player_token")
	if strings.TrimSpace(token) == "" {
		return errors.New("token not provided")
	}

	owner := viper.GetString("discord_instants_player_owner")

	errchan := make(chan error, 1)
	defer close(errchan)

	playchan := make(chan string, 1)
	defer close(playchan)

	audioEndedChan := make(chan bool, 1)
	defer close(audioEndedChan)

	b, err := bot.New(token, playchan, audioEndedChan, bot.WithOwner(owner))
	if err != nil {
		return errors.Wrap(err, "failed to create a bot")
	}

	go func() {
		if err := b.Start(); err != nil {
			errchan <- err
		}
	}()

	go func() {
		if err := runUI(playchan, audioEndedChan); err != nil {
			errchan <- err
		}
	}()

	err = <-errchan

	log.Info().Msg(err.Error())
	time.Sleep(time.Second * 3)

	return nil
}

func initConfig() {
	log.Logger = log.Output(zerolog.ConsoleWriter{
		Out:        os.Stdout,
		TimeFormat: "2006-01-02 15:04:05",
	})

	if cfgFile != "" {
		viper.SetConfigFile(cfgFile)
	} else {
		home, err := homedir.Dir()
		if err != nil {
			log.Fatal().Err(err).Msg("find homedir")
		}

		cwd, err := os.Getwd()
		if err != nil {
			log.Fatal().Err(err).Msg("find cwd")
		}

		viper.AddConfigPath(home)
		viper.AddConfigPath(cwd)
		viper.SetConfigName(".discord_instants_player")
	}

	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err == nil {
		log.Info().Str("configFile", viper.ConfigFileUsed()).Msg("using config file")
	}
}

func runUI(playchan chan string, audioEndedChan chan bool) error {
	js := mewn.String("./frontend/build/static/js/main.js")
	css := mewn.String("./frontend/build/static/css/main.css")

	defer keyboard.ClearEventListeners()
	go func() {
		keyboard.Bind()
	}()

	app := wails.CreateApp(&wails.AppConfig{
		Width:  1024,
		Height: 768,
		Title:  "Discord Instants Player",
		JS:     js,
		CSS:    css,
		Colour: "#131313",
	})

	player := instant.NewPlayer(playchan, audioEndedChan)

	app.Bind(keyboard.InitKeybindings)
	app.Bind(keyboard.SetKeybinding)
	app.Bind(keyboard.Unbind)
	app.Bind(instant.GetPlayableInstant)
	app.Bind(player)

	return app.Run()
}
