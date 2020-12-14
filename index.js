#!/usr/bin/env node
const fs = require('fs-extra')
const program = require('commander')
const execFile = require('child_process').execFile
const grib2jsonCommand = process.env.GRIB2JSON || 'grib_dump'

const INTERNAL_OPTIONS = ['output', 'bufferSize', 'version', 'precision', 'verbose']

var grib2json = function (filePath, options) {
  var numberFormatter = function (key, value) {
    return (value.toFixed && (options.precision >= 0)) ? Number(value.toFixed(options.precision)) : value
  }

  let promise = new Promise(function (resolve, reject) {
    let optionsNames = Object.keys(options)
    optionsNames = optionsNames.filter(arg => options[arg] &&
      // These ones are used internally
      !INTERNAL_OPTIONS.includes(arg))
    let args = []
    optionsNames.forEach(name => {
      if (typeof options[name] === 'boolean') {
        args.push('-' + name)
      } else {
        args.push('-' + name)
        args.push(options[name].toString())
      }
    })
    // Force export to JSON
    args.push('-j')
    // Last to come the file name
    args.push(filePath)
    execFile(grib2jsonCommand, args, { maxBuffer: options.bufferSize || 8 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.error(stderr)
        reject(error)
        return
      }
      let json = JSON.parse(stdout)
      /*
      if (options.verbose) {
        json.forEach(variable => console.log('Generated ' + variable.data.length + ' points in memory for variable ', variable.header))
      }
      */
      // Does not make really sense except as CLI
      if (require.main === module) console.log(stdout)
      if (options.output) {
        fs.writeFile(options.output, JSON.stringify(json, numberFormatter), function (err) {
          if (err) {
            console.error('Writing output file failed : ', err)
            return
          }
          resolve(json)
        })
      } else {
        resolve(json)
      }
    })
  })

  return promise
}

if (require.main === module) {
  program
    .version(require('./package.json').version)
    .usage('[options] <file>')
    .option('-o, --output <file>', 'Output in a file instead of stdout')
    .option('-p, --precision <precision>', 'Limit precision in output file using the given number of digits after the decimal point', -1)
    .option('-v, --verbose', 'Enable logging to stdout')
    .option('-bs, --bufferSize <value>', 'Largest amount of data in bytes allowed on stdout or stderr')
    .parse(process.argv)

  program.precision = parseInt(program.precision)

  var inputFile = program.args[program.args.length - 1]
  grib2json(inputFile, program.opts())
  .catch(function (err) {
    console.log(err)
  })
} else {
  module.exports = grib2json
}
