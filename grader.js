#!/usr/bin/env node
/*
  Automatically grade files for the presence of specified HTML
  tags/attributes. Uses commander.js and cheerio. Teaches command line
  application development and basic DOM parsing.

  References:
   + cheerio
     - https://github.com/MatthewMueller/cheerio
     - https://encosia.com/cheerio-faster-windows-friendly-alternative-jsdom/
     - https://maxogden.com/scraping-with-node.html

   + commander.js
     - https://github.com/visionmedia/commander.js
     - http://tjholowaychuk.com/post/9103188408/commander-js-nodejs-command-line-interfaces-made-easy

   + JSON
     - http://en.wikipedia.org/wiki/JSON
     - https://developer.mozilla.org/en-US/docs/JSON
     - https://developer.mozilla.org/en-US/docs/JSON#JSON_in_Firefox_2

  Changes:-
   + DRY!
   + Handle URLs asynchronously
  
 */
var fs = require('fs');
var program = require('commander');
var cheerio = require('cheerio');
var restler = require('restler');
var HTMLFILE_DEFAULT = "index.html";
var CHECKSFILE_DEFAULT = "checks.json";

var assertFileExists = function(infile) {
    var instr = infile.toString();
    if (!fs.existsSync(instr)) {
	console.log("%s does not exist. Exiting.", instr);
	process.exit(1); // https://nodejs.org/api/process.html#process_process_exit_code
    }
    return instr;
};

var cheerioHtmlFile = function(htmlfile) {
    return cheerio.load(fs.readFileSync(htmlfile));
};

var loadChecks = function(checksfile) {
    return JSON.parse(fs.readFileSync(checksfile));
};

var doChecks = function(data, checksfile) {
    $ = data;
    var checks = loadChecks(checksfile).sort();
    var out = {};
    for (var ii in checks) {
	var present = $(checks[ii]).length > 0;
	out[checks[ii]] = present;
    }
    return out;
};    

var checkHtmlFile = function(htmlfile, checksfile) {
    return doChecks(cheerioHtmlFile(htmlfile), checksfile);
};

var outJson = function(json) {
    console.log(JSON.stringify(json, null, 4));
};

var checkURL = function(url, checksfile) {
    restler.get(url).on('success', function(data) {
	outJson(doChecks(cheerio.load(data), checksfile));
    }).on('fail', function(data, response) {
	console.log("GET %s failed with %s", url, response.statusCode);
	process.exit(1);
    }).on('error', function(err, response) {
	console.log("Error during GET %s: %s", url, err.message);
	process.exit(1);
    });

};

var clone = function(fn) {
    // Workaround for commander.js issue
    // http://stackoverflow.com/a/6772648
    return fn.bind({});
};

if (require.main == module) {
    program
	.option('-c, --checks <check_file>', 'Path to checks.json', clone(assertFileExists), CHECKSFILE_DEFAULT)
        .option('-f, --file <html_file>', 'Path to index.html', clone(assertFileExists), HTMLFILE_DEFAULT)
        .option('-u, --url <url>', 'URL to test')
        .parse(process.argv);
    if (program.url) {
	checkURL(program.url, program.checks);
    } else {
	outJson(checkHtmlFile(program.file, program.checks));
    }
} else {
    exports.checkHtmlFile = checkHtmlFile;
    exports.checkURL = checkURL;
}