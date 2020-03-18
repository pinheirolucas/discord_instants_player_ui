package keyboard

import (
	"strconv"
	"sync"

	"github.com/pkg/errors"

	"discord-instants-player/instant"
)

var clearFuncs sync.Map

func InitKeybindings(data map[string]interface{}) error {
	var keys []interface{}
	clearFuncs.Range(func(key interface{}, value interface{}) bool {
		keys = append(keys, key)
		return true
	})

	for _, key := range keys {
		Unbind(key.(int))
	}

	for k, v := range data {
		keyCode, err := strconv.Atoi(k)
		if err != nil {
			return err
		}

		path, ok := v.(string)
		if !ok {
			return errors.Errorf("invalid value %v", v)
		}

		clear := SetEventListener(keyCode, instant.BuildKeyboardHandler(path))
		clearFuncs.Store(keyCode, clear)
	}

	return nil
}

func SetKeybinding(keyCode int, path string) {
	if f, ok := clearFuncs.Load(keyCode); ok {
		clearLast := f.(func())
		clearLast()
	}

	clear := SetEventListener(keyCode, instant.BuildKeyboardHandler(path))
	clearFuncs.Store(keyCode, clear)
}

func Unbind(keyCode int) {
	f, ok := clearFuncs.Load(keyCode)
	if !ok {
		return
	}

	clear := f.(func())
	clear()
	clearFuncs.Delete(keyCode)
}
