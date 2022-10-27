const { execSync, exec } = require('child_process')
const { projects, bump } = require('./general')

function execAsync(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, result) => {
      if (err) {
        reject(err)
      } else {
        resolve(result)
      }
    })
  })
}

execSync(`npm run prod`)

bump(require('path').resolve(__dirname, '..'))

projects().map(async (folder) => {
  bump(folder)
  await execAsync(`cd ${folder} && npm run publish`).catch((err) => {
    console.error(err)
  })
})
