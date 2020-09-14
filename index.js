"use strict"

const path = require("path")
const fs = require("fs-extra")
const hidefile = require("hidefile")
const splitLines = require("split-lines")
const simpleGit = require("simple-git")
const BRANCH_NAME = "git-as-dropbox"
const GAD_GIT_DIR = ".git-as-dropbox"
const WITH_GAD_GIT = `--git-dir=${GAD_GIT_DIR}` // With git-as-dropbox (GAD) git repo (for example: git --git-dir=.git-as-dropbox status)

let timer

const run = async (folder, flags) => {
  let settings = {
    path: folder,
    commitMsg: "Via git-as-dropbox",
    absolutePath: false,
    timeout: 3000,
    silent: false,
  }
  Object.assign(settings, flags)
  if (!settings.path) throw "Path parameter is required"

  let gitSettings = {
    baseDir: settings.relativePath ? path.join(process.cwd(), settings.path) : settings.path,
    binary: "git",
    maxConcurrentProcesses: 6,
  }

  const git = simpleGit(gitSettings)

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
    if (!(fs.readFileSync(gitIgnorePath, "UTF8").match(/^\.git-as-dropbox$/m) === null ? false : true)) {
      await fs.appendFileSync(gitIgnorePath, `\n# The next line was added automatically by git-as-dropbox\n${GAD_GIT_DIR}`)
      console.log(`Note: The path ${GAD_GIT_DIR} has been added to your .gitignore file`)
    }
  }

  console.log(`Started git-as-dropbox on path: ${gitSettings.baseDir}`)
  timer = setTimeout(async function myTimer() {
    try {
      await git.raw([WITH_GAD_GIT, "pull"])
    } catch (err) {
      // We want to ignore pull errors as we will simply commit the conflict so that any user can fix it.
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
          "Unable to push changes to external repository. Make sure you are able to `git push` from a your computer's command line. Or just try again."
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
