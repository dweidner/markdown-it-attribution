var pkg = require('./package.json');
var browserify = require('browserify');
var del = require('del');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var gulp = require('gulp');
var filter = require('gulp-filter');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');

/**
 * Generate a preamble for the file header of the distributed script.
 *
 * @param {Objet} pkg The package information of a module.
 * @param {string} [separator=' '] A separator to add between each item.
 * @return {string}
 */
function preamble (pkg, separator) {
  var items = [
    pkg.name,
    pkg.version,
    'https://github.com/' + pkg.repository,
    '@license ' + pkg.license
  ];

  return items.join(separator || ' ');
}

// Remove previous versions of the current package.
gulp.task('clean', function () {
  return del(['dist']);
});

// Generate a version of the package that can be used in a browser context.
gulp.task('build', function () {
  return browserify({
    entries: './index.js',
    debug: true,
    standalone: 'markdownitAttribution'
  })
    .bundle()
    .pipe(source('index.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(rename({ basename: pkg.name }))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./dist'))
    .pipe(filter('**/*.js'))
    .pipe(uglify({
      output: {
        beautify: false,
        preamble: '/*! ' + preamble(pkg) + ' */'
      }
    }))
    .pipe(rename({ suffix: '.min' }))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./dist'));
});

// (Re-)generate the distributed bundle by default.
gulp.task('default', gulp.series('clean', 'build'));
