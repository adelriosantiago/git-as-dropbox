#!/usr/bin/env node
const meow = require("meow")
const script = require("../index.js")

const cli = meow(
  `
    Usage
      $ git-as-dropbox <repo-path>
 
    Options
      --timeout, -t Timeout [1000]
      --commitMsg, -m Commit message ["Via git-as-dropbox"]
      --absolutePath, -a Use absolute path [false]
      --guiPort, -p (Experimental) Show a GAD \`git log\` timeline at defined port. Must be between 8000 and 65000 [0]
      --silent, -s Silent [false]
 
    Examples
      $ git-as-dropbox ./my-repository --timeout 2000 --silent
      $ git-as-dropbox C:/path/to/my-repository -t 250 -s -a -m "auto"
      $ git-as-dropbox ./my-repository --guiPort 8080
  `,
  {
    flags: {
      timeout: {
        type: "number",
        default: 1000,
        alias: "t",
      },
      commitMsg: {
        type: "string",
        default: "Via git-as-dropbox",
        alias: "m",
      },
      absolutePath: {
        type: "boolean",
        default: false,
        alias: "a",
      },
      silent: {
        type: "boolean",
        default: false,
        alias: "s",
      },
      guiPort: {
        type: "number",
        default: 0,
        alias: "p",
      },
    },
  }
)

script.run(cli.input[0], cli.flags)
