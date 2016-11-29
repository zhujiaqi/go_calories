package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"github.com/go-martini/martini"
	"github.com/martini-contrib/cors"
	"github.com/martini-contrib/render"
	"github.com/martini-contrib/secure"
	"html/template"
	"index/suffixarray"
	"log"
	"os"
	"regexp"
	"strings"
	"time"
)

type Item struct {
	Values [][]string `json:"values"`
	Name   string     `json:"name"`
	Alters []string   `json:"alters"`
}

type Index struct {
	Words string
	SA    *suffixarray.Index
}

type QueryResult struct {
	Items    []Item
	HitWords []string
}

type CountResult struct {
	Total    int
}

var Data map[string]*Item
var SAIndex Index
var IDs map[string]int

func usage() string {
	if len(os.Args) < 2 {
		fmt.Fprintf(os.Stderr, "usage: %s [inputfile]\n", os.Args[0])
		os.Exit(2)
	}
	return os.Args[1]
}

func check(e error) {
	if e != nil {
		panic(e)
	}
}

func readData(path string) ([]string, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()
	words := []string{}
	scanner := bufio.NewScanner(file)
	count := 0
	for scanner.Scan() {
		text := scanner.Text()
		text = strings.TrimRight(text, "\n")
		//log.Print(text)
		var item Item
		err := json.Unmarshal([]byte(text), &item)
		if err != nil {
			panic(err)
		}
		words = append(words, item.Name)
		Data[item.Name] = &item
		for _, alter := range item.Alters {
			words = append(words, alter)
			Data[alter] = &item
		}
		IDs[item.Name] = count
		count++
	}
	return words, scanner.Err()
}

func init() {
	Data = make(map[string]*Item)
	IDs = make(map[string]int)
	filename := usage()
	log.Print(filename)
	words, err := readData(filename)
	check(err)
	joinedWords := "\x00" + strings.Join(words, "\x00")
	sa := suffixarray.New([]byte(joinedWords))
	SAIndex = Index{Words: joinedWords, SA: sa}
}

func main() {
	m := martini.Classic()
	martini.Env = martini.Prod

	m.Use(secure.Secure(secure.Options{
		//AllowedHosts: []string{"example.com", "ssl.example.com"},
		FrameDeny:             true,
		ContentTypeNosniff:    true,
		BrowserXssFilter:      true,
		//ContentSecurityPolicy: "default-src 'self'",
	}))

	m.Use(cors.Allow(&cors.Options{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET"},
		AllowHeaders:     []string{"Origin"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	m.Use(render.Renderer(render.Options{
		Directory: "templates", // Specify what path to load the templates from.
		Layout:    "layout",    // Specify a layout template. Layouts can call {{ yield }} to render the current template.
		Funcs: []template.FuncMap{
			{
				"formatTime": func(args ...interface{}) string {
					t1 := time.Unix(args[0].(int64), 0)
					return t1.Format(time.Stamp)
				},
				"unescaped": func(args ...interface{}) template.HTML {
					return template.HTML(args[0].(string))
				},
			},
		},
	}))

	m.Get("/", func(r render.Render) {
		r.HTML(200, "home", nil)
	})

	m.Get("/query/:name", func(params martini.Params, r render.Render) {
		matches := []Item{}
		hitwords := []string{}
		duplicates := map[int]int{}
		match, err := regexp.Compile(fmt.Sprintf("\x00%s[^\x00]*", params["name"]))
		if err != nil {
			panic(err)
		}
		ms := SAIndex.SA.FindAllIndex(match, -1)
		for _, m := range ms {
			start, end := m[0], m[1]
			hit_word := SAIndex.Words[start+1 : end]
			hitwords = append(hitwords, hit_word)
			id, idExists := IDs[Data[hit_word].Name]
			if idExists && duplicates[id] == 0 {
				matches = append(matches, *Data[hit_word])
				duplicates[id] = 1
			}
		}
		log.Print(hitwords)
		qs := QueryResult{HitWords: hitwords, Items: matches}
		r.JSON(200, qs)
	})

  m.Get("/search/:name", func(params martini.Params, r render.Render) {
    r.HTML(200, "search", params["name"]);
  })

	m.Get("/count", func(params martini.Params, r render.Render) {
    qs := CountResult{Total: len(IDs)}
		r.JSON(200, qs)
  })

	m.Use(martini.Static("public"))
	m.RunOnAddr(":3001")
}
