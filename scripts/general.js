const fs = require('fs')
const path = require('path')
module.exports.projects = function () {
  return fs
    .readdirSync(path.resolve(__dirname, '../packages'))
    .map((folder) => path.resolve(__dirname, '../packages/' + folder))
}

module.exports.bump = function (folder, bump = [0, 0, 1]) {
  let pkg = require(folder + '/package.json')
  let version = pkg.version
  let currentVersions = version.split('.')

  pkg.version = currentVersions
    .map((el, i) => {
      return Number(el) + bump[i]
    })
    .join('.')

  fs.writeFileSync(folder + '/package.json', JSON.stringify(pkg, null, 2))
}
