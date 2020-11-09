const logView = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="author" content="git-as-dropbox" />
    <title>git-as-dropbox</title>
    <link rel="stylesheet" href="https://unpkg.com/spectre.css/dist/spectre.min.css" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/spectre.css/0.5.6/spectre-exp.min.css" />
    <script src="https://cdn.jsdelivr.net/npm/reefjs@7.4.1/dist/reef.min.js"></script>
  </head>
  <body>
    <pre id="logs"></pre>
    <div class="container">
      <div class="columns">
        <div class="column col-1"></div>
        <div class="column col-10">
          <div class="timeline">
            <h1>GAD log (git-as-dropbox)</h1>
            <p>
              This is the <code>git log</code> of the <code>git-as-dropbox</code> branch from the <em>.git-as-dropbox</em> GIT repository. All changes done
              through GAD appear here. <br /><small
                >Note: Make sure this port is not visible to the world as it may contain sensitive data of your project. You can always disable this log view by
                starting GAD with <code>git-as-dropbox [path] -g 0</code></small
              >
            </p>
            <br />
            <div id="app"></div>
          </div>
        </div>
        <div class="column col-1"></div>
      </div>
    </div>

    <script>
      document.addEventListener("DOMContentLoaded", async (event) => {
        //setInterval(async () => {
        //setTimeout(async () => {
        const logJson = JSON.parse(await (await fetch("/details")).text())
        //}, 5000)
        //}, 1000)
      })

      // Parent component
      var app = new Reef("#app", {
        data: {
          todos: [
            {
              tags: " (HEAD -> refs/heads/git-as-dropbox, refs/remotes/origin/git-as-dropbox, refs/heads/master)",
              change: [
                {
                  change: ".gitignore | 2 ++",
                },
              ],
              summary: "1 file changed, 2 insertions(+)",
            },
            {
              tags: "",
              change: [
                {
                  change: "data.json      | 4 ++--",
                },
                {
                  change: "other file.txt | 3 +++",
                },
                {
                  change: "sample.txt     | 3 +++",
                },
              ],
              summary: "3 files changed, 8 insertions(+), 2 deletions(-)",
            },
            {
              tags: "",
              change: [
                {
                  change: "data.json | 2 +-",
                },
              ],
              summary: "1 file changed, 1 insertion(+), 1 deletion(-)",
            },
            {
              tags: "",
              change: [
                {
                  change: "data.json | 48 ++++++++++++++++++++++++++++++++++++++++++++++++",
                },
              ],
              summary: "1 file changed, 48 insertions(+)",
            },
            {
              tags: "",
              change: [
                {
                  change: ".gitignore | 85 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++",
                },
                {
                  change: "LICENSE    | 21 ++++++++++++++++",
                },
                {
                  change: "README.md  |  1 +",
                },
              ],
              summary: "3 files changed, 107 insertions(+)",
            },
          ],
        },
        template: function (props) {
          return \`
            <div>
              \${props.todos
                .map((todo, i) => {
                  return \`
                    <div class="timeline-item">
                      <div class="timeline-left">
                        <a class="timeline-icon icon-lg" href="#timeline-example-2">
                          <small>\${props.todos.length - i}</small>
                        </a>
                      </div>
                      <div class="timeline-content">
                        <p>\${todo.summary}</p>
                        <p>
                          \${todo.change
                            .map((entry, i) => {
                              return \`
                                <div>
                                  \${entry.change}
                                </div>
                              \`
                            })
                            .join("")}
                        </p>
                        <p>Tags: \${todo.tags}</p>
                      </div>
                    </div>
                  \`
                })
                .join("")}
            </div>
            \`
        },
      })

      app.render()
    </script>
  </body>
</html>
`; module.exports = logView;