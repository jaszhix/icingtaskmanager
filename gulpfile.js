var gulp = require('gulp');
var zip = require('gulp-zip');
var del = require('del');
var babel = require('gulp-babel');

gulp.task('package', function() {
  return gulp.src('./IcingTaskManager@json/**/**/*')
    .pipe(zip('ITM-dist-' + Date.now() + '.zip'))
    .pipe(gulp.dest('./builds'));
});

gulp.task('copy', function() {
  del.sync(['./IcingTaskManager@json/**/**/*']);
  return gulp.src('./src/**/**/*')
    .pipe(gulp.dest('./IcingTaskManager@json/'));
});

gulp.task('transpile', () =>
  gulp.src('./src/*.js')
    .pipe(babel({
      presets: ['es2015', 'es2016', 'es2017']
    }))
    .pipe(gulp.dest('IcingTaskManager@json'))
);