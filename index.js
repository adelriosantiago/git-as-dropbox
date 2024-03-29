"use strict"

const path = require("path")
const fs = require("fs-extra")
const hidefile = require("hidefile")
const splitLines = require("split-lines")
const simpleGit = require("simple-git")
const computerName = require("computer-name")
const slug = require("slug")
const logView = require("./logView")
const BRANCH_NAME = "git-as-dropbox"
const GAD_GIT_DIR = ".git-as-dropbox"
const UP_TO_DATE = "Already up to date.\n"
const WITH_GAD_GIT = `--git-dir=${GAD_GIT_DIR}` // With git-as-dropbox (GAD) git repo (for example: git --git-dir=.git-as-dropbox status)

const tagName = `GAD@${slug(computerName()) || `unknown`}-${Math.floor(Math.random() * 999)}`
let git
let timer
let logs = "No logs available"

const _runLogServer = (port) => {
  const http = require("http")
  const express = require("express")
  const bodyParser = require("body-parser")

  const app = express()
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: true }))

  app.get("/", (req, res) => {
    return res.send(logView)
  })
  app.get("/details", (req, res) => {
    return res.json(logs)
  })

  // Init server
  const server = http.createServer(app)

  server.listen(port, () => {
    console.log(
      `git-as-dropbox info: Log server visible at http://localhost:${port}. IMPORTANT: If you are running GAD in a server, please double check that this port is not open to the world as git log may contain sensitive commit information about your code.`
    )
  })
}

const _updateLogs = async () => {
  logs = await git.raw([WITH_GAD_GIT, "log", "--pretty='%d'", "--decorate=full", "--stat"])
  logs = logs
    .replace(/^'(.*)'/gm, '{"tags":"$1"}')
    .replace(/^\n/gm, "")
    .replace(/^\s(.*\|.*)/gm, '{"change":"$1"}')
    .replace(/^\s(.*)/gm, '{"summary":"$1"}')
  logs = logs
    .split("\n")
    .filter((l) => l !== "")
    .map((l) => JSON.parse(l))
    .reduce((acc, cur) => {
      const cc = Object.assign({}, cur)
      const i = acc.length - 1

      if (cc.tags !== undefined) {
        acc.push(cc)
      } else if (cc.change !== undefined) {
        if (!Array.isArray(acc[i].change)) acc[i].change = []
        acc[i].change.push(cc)
      } else {
        acc[i] = { ...acc[i], ...cc }
      }

      return acc
    }, [])
}

const run = async (folder, options = {}) => {
  const flags = Object.assign({
    timeout: 1000,
    commitMsg: "Via git-as-dropbox",
    absolutePath: false,
    silent: false,
    guiPort: 0,
  }, options)
  const exposeLogs = (flags.guiPort && flags.guiPort >= 8000 && flags.guiPort <= 65000) ? true : false
  if (exposeLogs) _runLogServer(flags.guiPort)

  let settings = { path: folder }
  Object.assign(settings, flags)
  if (!settings.path) throw "git-as-dropbox error: Path parameter is required"

  let gitSettings = {
    baseDir: settings.relativePath ? path.join(process.cwd(), settings.path) : settings.path,
    binary: "git",
    maxConcurrentProcesses: 6,
  }

  git = simpleGit(gitSettings)

  if ((await git.status()).files.length) throw "git-as-dropbox error: The repository has uncommitted changes. Please commit or stage these changes before starting git-as-dropbox. If you had run git-as-dropbox in the past in this repository then it is time to commit the changes before running it again"
  if (!(await git.getRemotes()).length) throw "git-as-dropbox error: The repository has no configured remotes, you need to have at least one remote for sync to happen"

  const workspaceDirs = {
    git: path.join(".", folder, ".git"),
    gad: path.join(".", folder, GAD_GIT_DIR),
  }

  const gitIgnorePath = path.join(".", folder, ".gitignore")
  if (!fs.existsSync(gitIgnorePath)) {
    fs.writeFileSync(gitIgnorePath, GAD_GIT_DIR, { encoding: "UTF8" })
    console.log(`git-as-dropbox info: Repo had no .gitignore file, one has been created`)
  }
  if (!(fs.readFileSync(gitIgnorePath, "UTF8").match(new RegExp(`^\\${GAD_GIT_DIR}$`, "m")) === null ? false : true)) {
    try {
      await fs.appendFileSync(gitIgnorePath, `\n# The next line was added automatically by git-as-dropbox\n${GAD_GIT_DIR}`)
    } catch (err) {
      throw "git-as-dropbox error: Unable to change your .gitignore file. Please check file permissions"
    }
    console.log(`git-as-dropbox info: The path ${GAD_GIT_DIR} has been added to your .gitignore file`)
  }

  if (!fs.existsSync(workspaceDirs.gad)) {
    console.log("git-as-dropbox info: Project is not git-as-dropbox, let's make it by cloning the original repository")
    fs.copySync(workspaceDirs.git, workspaceDirs.gad)
    hidefile.hideSync(workspaceDirs.gad)
  }

  if (Boolean((await git.raw([WITH_GAD_GIT, "ls-remote", "--heads"])).match(new RegExp(`refs\\/heads\\/${BRANCH_NAME}`, "gmi")))) {
    console.log("git-as-dropbox info: Fetching remote since it looks like remote repo has a git-as-dropbox branch")

    await git.raw([WITH_GAD_GIT, "fetch", "origin", BRANCH_NAME])
    await git.raw([WITH_GAD_GIT, "checkout", BRANCH_NAME])
  } else {
    console.log("git-as-dropbox info: Remote repository does not have a git-as-dropbox branch")
    if (!Boolean((await git.raw([WITH_GAD_GIT, "branch"])).match(new RegExp(BRANCH_NAME, "gmi")))) {
      console.log("git-as-dropbox info: Local branch git-as-dropbox was created because it didn't exist")
      await git.raw([WITH_GAD_GIT, "checkout", "-b", BRANCH_NAME])
      await git.raw([WITH_GAD_GIT, "push", "-u", "origin", BRANCH_NAME])
    }
  }

  if (exposeLogs) await _updateLogs()

  console.log(`git-as-dropbox info: Started git-as-dropbox on path: ${gitSettings.baseDir}`)

  timer = setTimeout(async function myTimer() {
    try {
      const pullRes = await git.raw([WITH_GAD_GIT, "pull"])
      if (pullRes !== UP_TO_DATE) console.log("git-as-dropbox log: Received new changes")
      if (exposeLogs) await _updateLogs()
    } catch (err) {
      // Do nothing: We commit the conflict itself so that any user can fix it.
    }

    const status = await git.raw([WITH_GAD_GIT, "status", "-s"])
    if (status.trim() !== "") {
      if (!settings.silent) console.log("git-as-dropbox log: Changes found, committing and pushing")
      await git.raw([WITH_GAD_GIT, "add", "."])
      await git.raw([WITH_GAD_GIT, "commit", `-m ${settings.commitMsg}`])
      if (!settings.silent) console.log(`git-as-dropbox log: New commit with message: "${settings.commitMsg}"`)
      try {
        await git.raw([WITH_GAD_GIT, "push", "-u", "origin", BRANCH_NAME])
        if (!settings.silent) console.log("git-as-dropbox log: New change committed and published")
      } catch (err) {
        console.log(
          "git-as-dropbox error: Unable to push changes to external repository. Make sure you are able to `git push` from a your computer's command line. Or just try again. Git-as-dropbox will keep running. Failed with error:",
          err
        )
      }
    }

    timer = setTimeout(myTimer, settings.timeout)
  }, 0)
}

const stop = () => {
  clearTimeout(timer)
}

module.exports = { run, stop }
