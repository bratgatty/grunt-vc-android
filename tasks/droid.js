/*
 * grunt-vc-adroid
 * https://github.com/rajatpandit/grunt-vc-adroid
 *
 * Copyright (c) 2014 Rajat Pandit
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {
    grunt.registerTask('droid', "Updates android applications manifest fileinfo application version name. Supports nightly increment and also support for semver", function(file, bump_type) {
    var done                = this.async(),
        options             = this.options(),
        semver              = require('semver'),
        async               = require('async'),
        fs                  = require('fs'),
        // writes the new version in the info.plist file
        //
        write_version       = function (input, callback) {
            var new_version = '';
            switch(input.mode) {
                case 'nightly':
                    // returns back concatinated string back for version
                    new_version = bump_as_nightly(input.version, bump_type); // in this case it will be what is passed via jenkins
                    break;
                case 'semver':
                    // calls semver for new version number
                    new_version = bump_as_semver(input.version, bump_type);
                    break;
                default:
                    // default to nightly
                    new_version = bump_as_nightly(input.version, bump_type); // in this case it will be what is passed via jenkins
                    break;
            }
            grunt.log.writeln('The new version is %s', new_version);
            // update the file
            grunt.util.spawn({
                cmd: 'xmlstarlet',
                args: ['ed', '--inplace', '-u', "/manifest/@android:versionName", '-v', new_version, input.file]
            },function(err, result, code) {
                if (err) {
                    callback(err);
                }
                // write the information to the disk
                // this was added as grunt-vc-apprepo needs to know the version of the
                // build to add to the manifest.plist file
                fs.writeFileSync('.version', 'VERSION=' + new_version.trim());
                callback(null, new_version);
                // done();
            });
        },

        // updates the version number by adding the
        // build number as part of the version number
        bump_as_nightly = function(version, build) {
            version = semver.clean(version);
            return version + '+' + build;
        },

        // update the version using semver
        bump_as_semver = function(version, build) {
            var new_version = -1; // return -1 if the version number isn't valid
            version = semver.clean(version); // remove any nightly build info
            new_version = semver.inc(version, build);

            return new_version;
        },

        // get the version current stored in the info.plist
        // file
        read_version = function (input, callback) {
            grunt.util.spawn({
                cmd: 'xmlstarlet',
                args: ['sel', '-q', '-t', '-v', "/manifest/@android:versionName", input.file]
            },function (err, result, code) {
                if (err) {
                    callback(err); // callback with the error object
                    done();
                }
                result = String(result);
                grunt.log.writeln('Current version: %s', result);
                callback(null, {
                    version : result,
                    file    : input.file,
                    mode    : input.mode
                });
                // done();
            });
        },

       update_version = async.compose(write_version, read_version);
           update_version({file: file, mode: options.mode, bump_type: bump_type}, function(err, result) {
               grunt.log.writeln('The version is now updated to %s', result.toString()); //
           });
       });
};
