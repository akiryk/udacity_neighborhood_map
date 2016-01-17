/*
 * https://medium.com/@verpixelt/get-started-with-grunt-76d29dc25b01
 */
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    concat: {
      dist: {
        src: [ 'dev/js/libs/jquery.js', 'dev/js/libs/knockout.js', 'dev/js/main.js'],
        dest: 'prod/js/production.js',
      }
    },
    connect: {
      server: {
        options: {
          port: 8000,
          livereload: true
        }
      }
    },
    responsive_images: {
      resize: {
        options: {
          engine: 'gm', // default -- alt is 'im'
          quality: 60,
          sizes: [{
            suffix: '_small_1x', // this will result in filename-320_small_1x.jpg
            width: 320
          },{
            suffix: '_medium_1x', // this will result in filename-320_small_1x.jpg
            width: 640
          },{
            suffix: '_large_1x', // this will result in filename-320_small_1x.jpg
            width: 1023
          },{
            name: 'original', rename: false, width: '100%'
          }]
        },
        files: [{
          expand: true,
          src: ['images/**.{jpg,gif,png}'],
          cwd: 'dev/', // start images should be in dev/images
          dest: 'prod/' // end images should be in prod/images
        }]
      }
    },
    uglify: {
      build: {
        src: 'prod/js/production.js',
        dest: 'prod/js/production.min.js'
      }
    },
    processhtml: {
      dev: {
        files: {
          'index.html': ['index.html'] // 'destination.html': ['source.html']
        }
      },
    },
    sass: {                              // Task
      dist: {                            // Target
        options: {                       // Target options
          style: 'expanded'
        },
        files: {                         // Dictionary of files
          'prod/css/style.css': 'dev/scss/style.scss',
           // 'destination': 'source'
        }
      }
    },
    postcss: {
      options: {
        map: true // inline sourcemaps
      },
      dist: {
        src: '*.css'
      }
    },
    inline: {
      dist: {
        options:{
          cssmin: true,
          uglify: true
        },
        src: 'index.html',
        dest: 'prod/index.html'
      }
    },
    jshint: {
      files: ['Gruntfile.js','dev/js/main.js'], // array of files to lint
    },
    watch: {
      scripts: {
        files: [
                'dev/js/main.js',
                ],
        tasks: ['concat', 'jshint'],
        options: {
            spawn: false,
            livereload: true
        },
      },
      css: {
        files: ['dev/scss/**/*.scss',
                'dev/scss/*.scss',
                ],
        tasks: [ 'sass' ],
        options: {
          spawn: false,
          livereload: true
        }
      },
      html: {
        files: ['index.html'],
        options: {
            livereload: true
        }
      }
    }
  });

  // Load Grunt plugins
  grunt.loadNpmTasks('grunt-sass');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-processhtml');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-responsive-images');
  grunt.loadNpmTasks('grunt-postcss');
  grunt.loadNpmTasks('grunt-inline');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  // Default task(s).
  grunt.registerTask('default', [
    'connect',
    'sass',
    'watch'
    ]);

  grunt.registerTask('inlineJSCSS', ['inline']);

  grunt.registerTask('hint', ['jshint']);

  grunt.registerTask('condense', ['uglify']);

  grunt.registerTask('resize', [
    'responsive_images',
    ]);


};