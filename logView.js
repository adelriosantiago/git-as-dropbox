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
      // App rendering
      var app = new Reef("#app", {
        data: {
          todos: [],
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

      // Get log data
      setInterval(async () => {
        app.data.todos = JSON.parse(await (await fetch("/details")).text())
        console.log("logJson", logJson)
      }, 1000)
    </script>
  </body>
</html>
`; module.exports = logView;