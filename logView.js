const logView = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="author" content="git-as-dropbox" />
    <title>git-as-dropbox</title>
  </head>
  <body>
    <h3>.git-as-dropbox git log</h3>
    <pre id="logs"></pre>
    <script>
      document.addEventListener("DOMContentLoaded", function (event) {
        setInterval(async () => {
          const logJson = JSON.parse(await (await fetch("/details")).text())
          document.getElementById("logs").innerHTML = JSON.stringify(logJson, null, 4)
        }, 1000)
      })
    </script>
  </body>
</html>
`

module.exports = logView