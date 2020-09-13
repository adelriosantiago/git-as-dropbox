# git-as-dropbox (beta)

Convert any git repository into a cheap Dropbox-like folder. Let's say there are two users, A and B. If both run `git-as-dropbox ./my-repo` when user A adds, deletes or modifies a file, user B will receive these changes and vice versa.

![](./gifs/main.gif)

GAD (short of **git-as-dropbox**) is not a Dropbox replacement but it is good enough to sync two folders across two computers. GAD leaves your original **local** repository completely untouched. This creates a copy of your _.git_ folder called _.git-as-dropbox_. All sync operations happen on this repository. All commits are then done in the new repository and sent **to the same remote repository** as the original one under the _git-as-dropbox_ branch.

## Installation

`npm install --global git-as-dropbox`

## Usage

 - Run `git-as-dropbox <repository-path>` on two different computers. When you first run GAD both repositories better be in sync to avoid initial git conflicts.
 - Any change will now be shared across both computers.

## Features

 - GAD respects your current git workflow. You can continue adding, committing and pushing to your original repository as you normally do.
 - If two users commit the same line at the same time GAD will just commit the conflict so that any user can resolve it.
 - Tested on Windows, Linux, Mac.

## Caveats

 - GAD creates a full copy of your current _.git_ folder. This means you will see a new _.git-as-dropbox_ folder in your project. This will make your current project twice as big in terms of disk usage. This should not be a problem unless you have an extremely very big repository.
 - GAD uses polling. It is the safest way to make it work across all OS.
 - This tool is not designed to work with several users at the same time over the same file. It is merely a quick and cheap way to share files through git in a similar fashion Dropbox does.

## Special cases

There are few special cases when several users edit at the same time. These are:

 - When user A and user B edit the same line at the same time: I never really liked Dropbox's default behaviour. Dropbox creates _file.txt_ and _file.txt (user's conflicted copy <date>)_. I GAD both user A and B will receive the conflict as shown below.
![](./gifs/conflict-line.gif)
This way any user can fix the conflict.
 - When user A and B rename the same file at the same time: Both users will receive both files.
 - When multiple users edit the same file at the same time: It will very likely create an unintelligible commit diff or it may just crash. GAD is not suitable for this scenario. If you want to allow multiple users editing take a look at my other project, [boy.dog](www.boy.dog), which uses Operational Transforms to sync multiple users in real time.

## License

GNU v3.0 © [@adelriosantiago](https://twitter.com/adelriosantiago)

