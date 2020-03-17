package dispatcher

import (
	"fmt"
	"strconv"
	"sync"

	"github.com/pkg/errors"
	hook "github.com/robotn/gohook"

	"discord-instants-player/keyboard"
)

var clearFuncs sync.Map

func InitKeybindings(data map[string]interface{}) error {
	for k, v := range data {
		keyCode, err := strconv.Atoi(k)
		if err != nil {
			return err
		}

		path, ok := v.(string)
		if !ok {
			return errors.Errorf("invalid value %v", v)
		}

		clear := keyboard.SetEventListener(keyCode, buildPathHandler(path))
		clearFuncs.Store(keyCode, clear)
	}

	return nil
}

func SetKeybinding(keyCode int, path string) {
	keyboard.SetEventListener(keyCode, buildPathHandler(path))
}

func Unbind(keyCode int) {
	f, ok := clearFuncs.Load(keyCode)
	if !ok {
		return
	}

	clear := f.(func())
	clear()
}

func buildPathHandler(path string) func(e hook.Event) {
	return func(e hook.Event) {
		fmt.Println("path:", path)
	}
}
