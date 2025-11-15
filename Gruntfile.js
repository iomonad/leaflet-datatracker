module.exports = function(grunt) {
    grunt.initConfig({
	pkg: grunt.file.readJSON('package.json'),
	browserify: {
	    control: {
		src: ['src/L.DataTracker.js'],
		dest: 'dist/leaflet-datatracker.js',
		options: {
		    browserifyOptions: {
			standalone: 'L.DataTracker'
		    }
		}
	    }
	},
	uglify: {
	    options: {
		banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
		    '<%= grunt.template.today("yyyy-mm-dd") %> */\n\n'
	    },
	    build: {
		src:  'dist/leaflet-datatracker.js',
		dest: 'dist/leaflet-datatracker.min.js'
	    }
	}
    });

    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.registerTask('default', ['browserify', 'uglify']);
};
