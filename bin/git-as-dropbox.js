#!/usr/bin/env node
const meow = require("meow")
const script = require("../index.js")

const cli = meow(
  `
    Usage
      $ git-as-dropbox <repo-path>
 
    Options
      --timeout, -t Timeout [3000]
      --commitMsg, -m Commit message ["Via git-as-dropbox"]
      --absolutePath, -a Use absolute path [false]
      --silent, -s Silent [false]
 
    Examples
      $ git-as-dropbox ./my-repository --timeout 2000 --silent
      $ git-as-dropbox C:/path/to/my-repository -t 250 -s -a -m "auto"
  `,
  {
    flags: {
      timeout: {
        type: "number",
        default: 3000,
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
    },
  }
)

script.run(cli.input[0], cli.flags)
