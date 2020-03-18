package bot

import (
	"github.com/rs/zerolog/log"

	"discord-instants-player/command"
)

func (b *Bot) help(ctx *command.Context) {
	d := ctx.Dispatcher
	m := ctx.Message
	s := ctx.Session

	if _, err := s.ChannelMessageSend(m.ChannelID, d.GetHelp()); err != nil {
		log.Error().Err(err).Msg("failed to send help message")
	}
}
