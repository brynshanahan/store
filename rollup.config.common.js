import babel from '@rollup/plugin-babel'
import builtins from 'rollup-plugin-node-builtins'
import commonjs from '@rollup/plugin-commonjs'
import globals from 'rollup-plugin-node-globals'
import json from '@rollup/plugin-json'
import replace from '@rollup/plugin-replace'
import resolve from '@rollup/plugin-node-resolve'
import typescript from 'rollup-plugin-typescript2'
import { terser } from 'rollup-plugin-terser'
import { startCase } from 'lodash'
import Fs from 'fs'
import Path from 'path'
/**
 * Return a Rollup configuration for a `pkg` with `env` and `target`.
 */

function configure(pkg, env, target) {
  const isProd = env === 'production'
  const isUmd = target === 'umd'
  const isModule = target === 'module'
  const isCommonJs = target === 'cjs'
  let name = pkg.name.replace('@selkt/', '')
  const input = `packages/${name}/src/index.ts`
  const deps = []
    .concat(pkg.dependencies ? Object.keys(pkg.dependencies) : [])
    .concat(pkg.peerDependencies ? Object.keys(pkg.peerDependencies) : [])

  // Stop Rollup from warning about circular dependencies.
  const onwarn = (warning) => {
    if (warning.code !== 'CIRCULAR_DEPENDENCY') {
      console.warn(`(!) ${warning.message}`) // eslint-disable-line no-console
    }
  }

  const plugins = [
    // Allow Rollup to resolve modules from `node_modules`, since it only
    // resolves local modules by default.
    resolve({
      browser: true,
    }),

    typescript({
      abortOnError: true,
      tsconfig: `./packages/${name}/tsconfig.json`,
      // COMPAT: Without this flag sometimes the declarations are not updated.
      clean: true,
      check: false,
      // Increase to 3 if having issues with types
      verbosity: 1,
      useTsconfigDeclarationDir: false,
    }),

    // Allow Rollup to resolve CommonJS modules, since it only resolves ES2015
    // modules by default.
    commonjs({
      exclude: [`packages/${name}/src/**`],
    }),

    // Convert JSON imports to ES6 modules.
    json(),

    // Replace `process.env.NODE_ENV` with its value, which enables some modules
    // like React and Slate to use their production variant.
    replace({
      'process.env.NODE_ENV': JSON.stringify(env),
    }),

    // Register Node.js builtins for browserify compatibility.
    // builtins(),

    // Use Babel to transpile the result, limiting it to the source code.
    babel({
      include: [`packages/${name}/src/**`],
      extensions: ['.js', '.ts', '.tsx'],
      babelHelpers: 'runtime',
      presets: [
        '@babel/preset-typescript',
        [
          '@babel/preset-env',
          isUmd
            ? { modules: false }
            : {
                exclude: [
                  '@babel/plugin-transform-regenerator',
                  '@babel/transform-async-to-generator',
                ],
                modules: false,
                targets: {
                  esmodules: isModule,
                },
              },
        ],
        '@babel/preset-react',
      ],
      plugins: [
        [
          '@babel/plugin-transform-runtime',
          isUmd
            ? {}
            : {
                regenerator: false,
                useESModules: isModule,
              },
        ],
        '@babel/plugin-proposal-class-properties',
      ],
    }),

    // Register Node.js globals for browserify compatibility.
    globals(),

    // Only minify the output in production, since it is very slow. And only
    // for UMD builds, since modules will be bundled by the consumer.
    isUmd && isProd && terser(),
  ].filter(Boolean)

  if (isUmd) {
    return {
      plugins,
      input,
      onwarn,
      output: {
        format: 'umd',
        file: `packages/${name}/${isProd ? pkg.umdMin : pkg.umd}`,
        exports: 'named',
        name: startCase(name).replace(/ /g, ''),
        globals: pkg.umdGlobals,
      },
      external: (id) => {
        return !!deps.find((dep) => dep === id || id.startsWith(`${dep}/`))
      },
    }
  }

  if (isCommonJs) {
    return {
      plugins,
      input,
      onwarn,
      output: [
        {
          file: `packages/${name}/${pkg.main}`,
          format: 'cjs',
          exports: 'named',
          sourcemap: true,
        },
      ],
      // We need to explicitly state which modules are external, meaning that
      // they are present at runtime. In the case of non-UMD configs, this means
      // all non-Slate packages.
      external: (id) => {
        return !!deps.find((dep) => dep === id || id.startsWith(`${dep}/`))
      },
    }
  }

  if (isModule) {
    return {
      plugins,
      input,
      onwarn,
      output: [
        {
          file: `packages/${name}/${pkg.module}`,
          format: 'es',
          sourcemap: true,
        },
      ],
      // We need to explicitly state which modules are external, meaning that
      // they are present at runtime. In the case of non-UMD configs, this means
      // all non-Slate packages.
      external: (id) => {
        return !!deps.find((dep) => dep === id || id.startsWith(`${dep}/`))
      },
    }
  }
}

/**
 * Return a Rollup configuration for a `pkg`.
 */

function factory(src, options = {}) {
  const isProd = options.env === 'production'
  let pkg = require(`${__dirname}/packages/${src}/package.json`)
  return [
    configure(pkg, 'development', 'cjs', options),
    configure(pkg, 'development', 'module', options),
    isProd && configure(pkg, 'development', 'umd', options),
    isProd && configure(pkg, 'production', 'umd', options),
  ].filter(Boolean)
}

const mods = (env) =>
  [].concat(
    ...Fs.readdirSync('./packages').map((folder) => {
      let folderName = folder.split(Path.sep).pop()
      return factory(folderName, { env })
    })
  )

// console.log(mods('production').map((mod) => mod.output))
// process.exit()

export default mods
