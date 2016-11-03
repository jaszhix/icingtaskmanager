var gulp = require('gulp');
var zip = require('gulp-zip');
var del = require('del');
var babel = require('gulp-babel');
var clear = require('clear');
var exec = require('child_process').exec;

gulp.task('package', ()=> {
  return gulp.src('./IcingTaskManager@json/**/**/*')
    .pipe(zip('ITM-dist-' + Date.now() + '.zip'))
    .pipe(gulp.dest('./builds'));
});

gulp.task('copy', ()=> {
  del.sync(['./IcingTaskManager@json/**/**/*']);
  return gulp.src('./src/**/**/*')
    .pipe(gulp.dest('./IcingTaskManager@json/'));
});

gulp.task('transpile', ['copy'], () =>
  gulp.src('./src/*.js')
    .pipe(babel({
      presets: ['es2015', 'es2016', 'es2017'],
      ast: false
    }))
    .pipe(gulp.dest('IcingTaskManager@json'))
);

gulp.task('install', ['transpile'], (cb)=>{
  exec('cp -avrf  IcingTaskManager@json ~/.local/share/cinnamon/applets/ && ./locale.sh', function (err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
})

gulp.task('watch', ()=> {
  //gulp.watch('./app/scripts/components/**/*.{js,jsx,es6}', ['build']);
  gulp.watch('./src/*.js', ['install']);
});

gulp.task('clear-terminal', ()=> {
  clear();
});

gulp.task('spawn-watch', ['clear-terminal'], ()=> {
 var spawnWatch = ()=> {
    var proc = require('child_process').spawn('gulp', ['watch'], {stdio: 'inherit'});
    proc.on('close', function (code) {
      spawnWatch();
    });
  };
  spawnWatch();
});
gulp.task('default', ['spawn-watch'], ()=> {});