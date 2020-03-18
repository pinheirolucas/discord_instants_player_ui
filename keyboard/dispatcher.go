package keyboard

import (
	"fmt"
	"strconv"
	"sync"

	"github.com/pkg/errors"
	hook "github.com/robotn/gohook"
)

var initialized bool
var clearFuncs sync.Map

func InitKeybindings(data map[string]interface{}) error {
	if initialized {
		return errors.New("bindings already initialized")
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

		clear := SetEventListener(keyCode, buildPathHandler(path))
		clearFuncs.Store(keyCode, clear)
	}

	initialized = true
	return nil
}

func SetKeybinding(keyCode int, path string) {
	if f, ok := clearFuncs.Load(keyCode); ok {
		clearLast := f.(func())
		clearLast()
	}

	clear := SetEventListener(keyCode, buildPathHandler(path))
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

func buildPathHandler(path string) func(e hook.Event) {
	return func(e hook.Event) {
		fmt.Println("path:", path)
	}
}
