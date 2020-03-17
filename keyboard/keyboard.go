package keyboard

import (
	"sync"

	hook "github.com/robotn/gohook"
)

type Handler func(e hook.Event)

var listeners sync.Map

func SetEventListener(keyCode int, handler Handler) func() {
	listeners.Store(keyCode, handler)

	return func() {
		listeners.Delete(keyCode)
	}
}

func ClearEventListeners() {
	var keys []int
	listeners.Range(func(k, v interface{}) bool {
		keys = append(keys, k.(int))

		return true
	})

	for _, key := range keys {
		listeners.Delete(key)
	}
}

func Bind() {
	kchan := hook.Start()
	defer hook.End()

	for e := range kchan {
		if e.Kind != hook.KeyDown {
			continue
		}

		v, ok := listeners.Load(int(e.Keychar))
		if !ok {
			continue
		}

		handler := v.(Handler)
		handler(e)
	}
}
