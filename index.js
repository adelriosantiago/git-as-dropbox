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
    timeout: 5000,
    silent: false,
  }
  Object.assign(settings, flags)
  if (!settings.path) throw "Path parameter is required"

  let gitSettings = {
    baseDir: settings.relativePath
      ? path.join(process.cwd(), settings.path)
      : settings.path,
    binary: "git",
    maxConcurrentProcesses: 6,
  }

  const git = simpleGit(gitSettings)

  const workspaceDirs = {
    git: path.join(".", folder, ".git"),
    gad: path.join(".", folder, GAD_GIT_DIR),
  }

  // 1.- If it is not already a GAD then make it GAD by copying the .git folder
  if (!fs.existsSync(workspaceDirs.gad)) {
    console.log(
      "Project is not git-as-dropbox, about to make it by cloning the original repository."
    )
    fs.copySync(workspaceDirs.git, workspaceDirs.gad)
    hidefile.hideSync(workspaceDirs.gad)
  }

  // 2.- If .gitignore is not already ignoring GAD then add it
  const gitIgnorePath = path.join(".", folder, ".gitignore")
  if (
    !(fs.readFileSync(gitIgnorePath, "UTF8").match(/^\.git-as-dropbox$/m) ===
    null
      ? false
      : true)
  ) {
    await fs.appendFileSync(gitIgnorePath, `\n${GAD_GIT_DIR}`)
    console.log(
      `Note: The path ${GAD_GIT_DIR} has been added to your .gitignore file.`
    )
  }

  // 3.- Check if GAD branch exists in remote repository
  if (
    Boolean(
      (await git.raw([WITH_GAD_GIT, "ls-remote", "--heads"])).match(
        new RegExp(`refs\\/heads\\/${BRANCH_NAME}`, "gmi")
      )
    )
  ) {
    // Remote contains a GAD branch, fetch it
    console.log(
      "Looks like this repository already has a remote git-as-dropbox branch. Fetching latest data."
    )
    await git.raw([WITH_GAD_GIT, "fetch", "origin", BRANCH_NAME])
  }

  // 4.- Check if branch exists locally, if not, then create it
  if (
    !Boolean(
      (await git.raw([WITH_GAD_GIT, "branch"])).match(
        new RegExp(BRANCH_NAME, "gmi")
      )
    )
  ) {
    // Local does not contain a GAD branch, create it
    console.log("There is no local git-as-dropbox branch. Creating it.")
    await git.raw([WITH_GAD_GIT, "checkout", "-b", BRANCH_NAME])
  }

  // 5.- Checkout the local branch
  const onRightBranch = Boolean(
    (await git.raw([WITH_GAD_GIT, "branch"])).match(
      new RegExp(`\\* ${BRANCH_NAME}`, "gmi")
    )
  )
  if (!onRightBranch) {
    console.log(
      "Switching to git-as-dropbox branch in the cloned repository. Don't worry your original repository will be left intact."
    )
    await git.raw([WITH_GAD_GIT, "checkout", BRANCH_NAME])
  }

  // 6.- Delete all other branches except GAD *only* in the GAD git folder
  splitLines(await git.raw([WITH_GAD_GIT, "branch"])).forEach(async (b) => {
    // Delete all other branchs
    b = b.trim()
    if (!b) return
    try {
      console.log(
        "Removing all other branches in the cloned repository. Don't worry your original repository will be left intact."
      )
      await git.raw([WITH_GAD_GIT, "branch", "-D", b])
    } catch (err) {
      // GAD branch will fail but we want to keep it, so do nothing
    }
  })

  // 7.- Set upstream branch
  console.log("Setting branch upstream")
  await git.raw([
    WITH_GAD_GIT,
    "branch",
    "--set-upstream-to",
    `origin/${BRANCH_NAME}`,
  ])

  // 8.- Finally start the polling timer
  console.log(`Started git-as-dropbox on ${gitSettings.baseDir}`)
  timer = setTimeout(async function myTimer() {
    try {
      await git.raw([WITH_GAD_GIT, "pull"])
    } catch (err) {
      // We want to ignore pull errors as we will simply commit the conflict so that any user can fix it.
    }

    const status = await git.raw([WITH_GAD_GIT, "status", "-s"])
    if (status.trim() !== "") {
      if (!settings.silent) console.log("Changes found, commiting and pushing")
      await git.raw([WITH_GAD_GIT, "add", "."])
      await git.raw([WITH_GAD_GIT, "commit", `-m ${settings.commitMsg}`])
      if (!settings.silent) console.log(`New commit: "${settings.commitMsg}"`)
      try {
        await git.raw([WITH_GAD_GIT, "push", "-u", "origin", BRANCH_NAME])
        if (!settings.silent) console.log("New change commited and published.")
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
