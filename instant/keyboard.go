package instant

import (
	hook "github.com/robotn/gohook"
)

type HandlerFunc func(e hook.Event, link string)

var handler HandlerFunc

func RegisterKeyboardHandler(h HandlerFunc) {
	handler = h
}

func BuildKeyboardHandler(link string) func(e hook.Event) {
	return func(e hook.Event) {
		if handler == nil {
			return
		}

		handler(e, link)
	}
}
