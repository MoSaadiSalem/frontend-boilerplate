// Initialize modules
// Importing specific gulp API functions lets us write them below as series() instead of gulp.series()
import gulp from 'gulp';
const { src, dest, watch, series, parallel, lastRun } = gulp;

// Importing all the Gulp-related packages we want to use
import gulpSass from 'gulp-sass';
import nodeSass from 'sass';
const sass = gulpSass(nodeSass);

import concat from 'gulp-concat';
import terser from 'gulp-terser';
import postcss from 'gulp-postcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import purgecss from '@fullhuman/postcss-purgecss';
import replace from 'gulp-replace';
import stylelint from 'stylelint';
// import cssVariables from 'postcss-css-variables';
// import postcssPresetEnv from 'postcss-preset-env';

// BrowserSync
import browsersync from 'browser-sync';
const browserSync = browsersync.create();
const reload = browserSync.reload;

const baseDirectory = './docs/';
const devDir = './src/';
const distDir = './docs/';

const paths = {
  html: {
    src: `${devDir}**/*.html`,
    dest: `${distDir}`,
  },
  css: {
    src: `${devDir}css/**/*.css`,
    cssTmp: `${devDir}tmp/css/`,
    dest: `${distDir}css/`,
  },
  sass: {
    src: `${devDir}scss/**/*.scss`,
    cssTmp: `${devDir}tmp/css/`,
    dest: `${distDir}css/`,
  },
  js: {
    src: './src/js/**/*.js',
    dest: `${distDir}js/`,
  },
  img: {
    src: `${devDir}assets/img/**/*`,
    dest: `${distDir}assets/img/`,
  },
  fonts: {
    src: `${devDir}assets/fonts/**/*`,
    dest: `${distDir}assets/fonts/`,
  },
  lib: {
    src: `${devDir}lib/**/*`,
    dest: `${distDir}lib/`,
  },
};

const fileNames = {
  dist: {
    css: 'style.css',
    js: 'all.js',
  },
};

// PostCSS Plugins
const postcssPlugins = [
  autoprefixer(),
  cssnano(),
  stylelint(),
  purgecss({
    content: ['./**/*.html'],
  }),
  // postcssPresetEnv(),
  // cssVariables() // transform CSS Custom Properties (CSS variables) syntax into a static representation.
];

// HTML task
function htmlTask() {
  return src(paths.html.src, { since: lastRun(htmlTask) }).pipe(
    dest(paths.html.dest),
  );
}

// Images task
function imgTask() {
  return src(paths.img.src, { since: lastRun(imgTask) }).pipe(
    dest(paths.img.dest),
  );
}

// Fonts task
function fontsTask() {
  return src(paths.fonts.src, { since: lastRun(fontsTask) }).pipe(
    dest(paths.fonts.dest),
  );
}

// Fontawesome task
function fontawesomeTask() {
  return src('node_modules/@fortawesome/fontawesome-free/webfonts/*').pipe(
    gulp.dest(`${distDir}assets/fonts/fontawesome/webfonts`),
  );
}

// Sass task: compiles the style.scss file into style.css
function scssTask() {
  // sourcemaps: set source and turn on sourcemaps
  // lastRun: enables incremental builds to speed up execution times by skipping files that haven't changed since the last successful task completion
  return src(paths.sass.src, {
    sourcemaps: true,
    // since: lastRun(scssTask),
  })
    .pipe(sass()) // compile SCSS to CSS
    .pipe(dest(paths.sass.cssTmp)) // put a dev CSS in temp folder without sourcemap in source directory
    .pipe(postcss(postcssPlugins)) // PostCSS plugins
    .pipe(
      dest(paths.sass.dest, { sourcemaps: '.' }), // put final CSS in production folder with sourcemap
    );
  // .pipe(browserSync.stream());
}

// PostCSS task: compiles the style.scss file into style.css
function cssTask() {
  return src(paths.css.src)
    .pipe(postcss(plugins)) // PostCSS plugins
    .pipe(concat('styles.css'))
    .pipe(
      dest(paths.css.dest), // put final CSS in dist folder with sourcemap
    )
    .pipe(browserSync.stream());
}

// JS task: concatenates and uglifies JS Source Files to all.js
function jsTask() {
  return src(
    [
      paths.js.src,
      //,'!' + 'includes/js/jquery.min.js', // to exclude any specific Source Files
    ],
    { sourcemaps: true },
  )
    .pipe(concat(fileNames.dist.js))
    .pipe(terser())
    .pipe(dest(paths.js.dest, { sourcemaps: '.' }));
}

// Cachebust
function cacheBustTask() {
  const cbString = new Date().getTime();
  return src(paths.html.src)
    .pipe(replace(/cb=\d+/g, 'cb=' + cbString))
    .pipe(dest(paths.html.dest));
}

// Browsersync to spin up a local server
function bsSync() {
  browserSync.init({
    open: false,
    injectChanges: true,
    server: {
      baseDir: baseDirectory,
    },
  });
}

// Watch task:
function watchTask() {
  watch(
    [
      paths.html.src,
      paths.sass.src,
      paths.js.src,
      paths.img.src,
      paths.fonts.src,
    ],
    { interval: 1000, usePolling: true }, //Makes docker work
    series(
      parallel(htmlTask, scssTask, jsTask),
      parallel(imgTask, fontsTask),
      cacheBustTask,
    ),
  );
}

// Export the default Gulp task so it can be run
const _default = series(parallel(scssTask, jsTask), cacheBustTask, watchTask);
export { _default as default };

// Browsersync Watch task
export const bs = series(
  parallel(
    htmlTask,
    scssTask,
    jsTask,
    imgTask,
    fontsTask,
    fontawesomeTask,
  ),
  cacheBustTask,
  bsSync,
  watchTask,
);

