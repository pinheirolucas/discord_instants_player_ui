package main

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"io"
	"os"

	"github.com/leaanthony/mewn"
	"github.com/wailsapp/wails"

	"discord-instants-player/dispatcher"
	"discord-instants-player/keyboard"
)

func main() {
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

	app.Bind(dispatcher.InitKeybindings)
	app.Bind(dispatcher.SetKeybinding)
	app.Bind(dispatcher.Unbind)
	app.Bind(GetPlayableInstant)

	app.Run()
}

// TODO: implement the error handling and probably move this logic to some other package
func GetPlayableInstant(path string) string {
	w := new(bytes.Buffer)
	f, _ := os.Open(path)
	enc := base64.NewEncoder(base64.StdEncoding, w)

	if _, err := io.Copy(enc, f); err != nil {
		fmt.Println(err)
	}

	return fmt.Sprintf("data:audio/mp3;base64,%s", w.String())
}
