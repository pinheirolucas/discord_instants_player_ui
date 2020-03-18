package bot

import (
	"github.com/rs/zerolog/log"

	"discord-instants-player/command"
)

func (b *Bot) ping(ctx *command.Context) {
	m := ctx.Message
	s := ctx.Session

	if _, err := s.ChannelMessageSend(m.ChannelID, "Pong!"); err != nil {
		log.Error().Err(err).Msg("failed to send help message")
	}
}
