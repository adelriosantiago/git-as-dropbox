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
    return res.json(logs) // TODO: Continue here, get logs in JSON and send them to the front-end
  })

  // Init server
  const server = http.createServer(app)

  server.listen(port, () => {
    console.log(
      `Log server visible at http://localhost:${port}. IMPORTANT: If you are running GAD in a server, please double check that this port is not open to the world as git log may contain sensitive commit information about your code.`
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

const run = async (folder, flags = {}) => {
  const exposeLogs = flags.guiPort !== 0
  if (exposeLogs) _runLogServer(flags.guiPort)

  let settings = { path: folder }
  Object.assign(settings, flags)
  if (!settings.path) throw "Path parameter is required"

  let gitSettings = {
    baseDir: settings.relativePath ? path.join(process.cwd(), settings.path) : settings.path,
    binary: "git",
    maxConcurrentProcesses: 6,
  }

  git = simpleGit(gitSettings)

  const workspaceDirs = {
    git: path.join(".", folder, ".git"),
    gad: path.join(".", folder, GAD_GIT_DIR),
  }

  if (!fs.existsSync(workspaceDirs.gad)) {
    console.log("Project is not git-as-dropbox, let's make it by cloning the original repository")
    fs.copySync(workspaceDirs.git, workspaceDirs.gad)
    hidefile.hideSync(workspaceDirs.gad)
  }

  if (Boolean((await git.raw([WITH_GAD_GIT, "ls-remote", "--heads"])).match(new RegExp(`refs\\/heads\\/${BRANCH_NAME}`, "gmi")))) {
    console.log("Fetching remote since it looks like remote repo has a git-as-dropbox branch")

    await git.raw([WITH_GAD_GIT, "fetch", "origin", BRANCH_NAME])
    // TODO: When the next line executes first time, it erases all uncommitted changes this user had. This needs to be fixed by creating a commit first.
    await git.raw([WITH_GAD_GIT, "checkout", BRANCH_NAME])
  } else {
    console.log("Remote repository does not have a git-as-dropbox branch")
    if (!Boolean((await git.raw([WITH_GAD_GIT, "branch"])).match(new RegExp(BRANCH_NAME, "gmi")))) {
      console.log("Local branch git-as-dropbox was created because it didn't exist")
      await git.raw([WITH_GAD_GIT, "checkout", "-b", BRANCH_NAME])
      await git.raw([WITH_GAD_GIT, "push", "-u", "origin", BRANCH_NAME])
    }

    const gitIgnorePath = path.join(".", folder, ".gitignore")
    if (!fs.existsSync(gitIgnorePath)) {
      fs.writeFileSync(gitIgnorePath, GAD_GIT_DIR, { encoding: "UTF8" })
      console.log(`Note: Repo didn't have a .gitignore file, it has been created`)
    }
    if (!(fs.readFileSync(gitIgnorePath, "UTF8").match(new RegExp(`^\\${GAD_GIT_DIR}$`, "m")) === null ? false : true)) {
      await fs.appendFileSync(gitIgnorePath, `\n# The next line was added automatically by git-as-dropbox\n${GAD_GIT_DIR}`)
      console.log(`Note: The path ${GAD_GIT_DIR} has been added to your .gitignore file`)
    }
  }

  if (exposeLogs) await _updateLogs()

  console.log(`Started git-as-dropbox on path: ${gitSettings.baseDir}`)

  timer = setTimeout(async function myTimer() {
    try {
      const pullRes = await git.raw([WITH_GAD_GIT, "pull"])
      if (pullRes !== UP_TO_DATE) console.log("Received new changes")
      if (exposeLogs) await _updateLogs()
    } catch (err) {
      // Do nothing: We commit the conflict itself so that any user can fix it.
    }

    const status = await git.raw([WITH_GAD_GIT, "status", "-s"])
    if (status.trim() !== "") {
      if (!settings.silent) console.log("Changes found, committing and pushing")
      await git.raw([WITH_GAD_GIT, "add", "."])
      await git.raw([WITH_GAD_GIT, "commit", `-m ${settings.commitMsg}`])
      if (!settings.silent) console.log(`New commit with message: "${settings.commitMsg}"`)
      try {
        await git.raw([WITH_GAD_GIT, "push", "-u", "origin", BRANCH_NAME])
        if (!settings.silent) console.log("New change committed and published")
      } catch (err) {
        console.log(
          "Unable to push changes to external repository. Make sure you are able to `git push` from a your computer's command line. Or just try again. Failed with error:",
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
