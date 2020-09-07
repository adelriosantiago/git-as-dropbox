# git-as-dropbox (beta)

Convert any git repository into a cheap Dropbox-like folder. Let's say there are two users, A and B. If both run `git-as-dropbox ./my-repo` when user A adds, deletes or modifies a file, user B will receive these changes and vice versa.

GAD (short of **git-as-dropbox**) is not a Dropbox replacement but it is good enough to sync two folders across two computers. GAD leaves your original **local** repository completely untouched. This creates a copy of your _.git_ folder called _.git-as-dropbox_. All sync operations happen on this repository. All commits are then done in the new repository and sent **to the same remote repository** as the original one under the _git-as-dropbox_ branch.

## Installation

`npm install --global git-as-dropbox`

## Usage

 - Run `git-as-dropbox <repository-path>` on two different computers.
 - Any change will now be shared across both computers.

## Pros of using GAD

 - Tested on Windows, Linux, Mac.
 - Your GIT repository is left intact. You can continue adding, committing and pushing to your original repository as you normally do.
 - If two users commit the same line at the same time GAD will just commit the conflict so that any user can resolve it.

## Cons of using GAD

 - Be careful of what you put into your repo. If GAD is running, it will commit and push any file that lands inside. Just like a Dropbox folder.
 - GAD creates a full copy of your current _.git_ folder. You will see a new _.git-as-dropbox_ folder in your project. This will make your current project twice as big in disk usage. This should not be a problem unless you have an extremely very big repository.
 - GAD uses polling. It is the safest way to make it work across al OS.
 - GAD is not designed to work with several users at the same time over the same file.

## License

GNU v3.0 © [@adelriosantiago](https://twitter.com/adelriosantiago)