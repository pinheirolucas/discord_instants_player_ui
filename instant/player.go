package instant

import (
	"github.com/pkg/errors"

	"discord-instants-player/fsutil"
)

type Player struct {
	playchan       chan string
	audioEndedChan chan bool
}

func NewPlayer(playchan chan string, audioEndedChan chan bool) *Player {
	return &Player{
		playchan:       playchan,
		audioEndedChan: audioEndedChan,
	}
}

func (p *Player) Play(link string) (bool, error) {
	if !IsLinkValid(link) {
		return false, errors.Errorf("invalid link: %s", link)
	}

	f, err := fsutil.GetFromCache(link)
	switch err {
	case nil:
		// continue
	case fsutil.ErrNotFound:
		return false, nil
	default:
		return false, err
	}
	defer f.Close()

	p.playchan <- f.Name()
	<-p.audioEndedChan

	return true, nil
}
