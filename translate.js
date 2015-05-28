String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

if (typeof require !== 'undefined') {
    var XLSX = require('xlsx'),
        fs = require('fs'),
        https = require('https'),
        config = require('./config.json'),
        args = process.argv.slice(2),
        lang = args[0];
}

if (typeof config[lang] === 'undefined' || !config[lang]) {
    throw new Error("Configuration for this language (" + lang + ") not found!");
} else if (args[1] !== 'undefined' && args[1]) {
    config.tranlationsFile.local = args[1];
    generatePoFile();
} else {
    downloadTranslationFile();
}

function downloadTranslationFile() {
    var options = {
        hostname: config.tranlationsFile.remote.hostName,
        port: 443,
        path: config.tranlationsFile.remote.path,
        method: config.tranlationsFile.remote.method
    };

    var file = fs.createWriteStream(config.tranlationsFile.local);

    var req = https.request(options, function(res) {
        console.log("Status: " + res.statusCode + ", downloading...");
        res.on('data', function(d) {
            process.stdout.write("#");
            file.write(d);
        });

        res.on('end', function() {
            file.end();
            setTimeout(generatePoFile, 2000);
        });

    });

    req.end();

    req.on('error', function(e) {
        console.error(e);
    });
};

function generatePoFile() {
    console.log('\r\n\r\nGenerating PO file...');

    var output = fs.readFileSync(config.templatesPath + config[lang].template, 'utf8'),
        workbook = XLSX.readFile(config.tranlationsFile.local),
        worksheet = workbook.Sheets[workbook.SheetNames[0]],
        data = [],
        tmpData = [];

    for (z in worksheet) {
        if (z[0] === '!' || z === "A1" || z === config[lang].langDefineCell) continue;

        if (z.substring(0, 1) === "A") {
            if (worksheet[z].v.endsWith("'")) {
                worksheet[z].v = worksheet[z].v.substr(0, worksheet[z].v.length - 1);
            };
            tmpData.push('# ' + z + '\r\nmsgid ' + JSON.stringify(worksheet[z].v) + '\r\n');
            if (typeof worksheet[config[lang].langDefineCell.substring(0, 1) + z.substring(1)] === 'undefined') {
                tmpData.push('msgstr ""\r\n\r\n');
            }
        }

        if (z.substring(0, 1) === config[lang].langDefineCell.substring(0, 1)) {
            tmpData.push('msgstr ' + JSON.stringify(worksheet[z].v) + '\r\n\r\n');
        }

        if (tmpData.length === 2) {
            var duplicateFound = false;
            
            if (data.length === 0 ) {
                data.push(tmpData);
            }

            for (var i = 0; i < data.length; i++) {
                var tmpStart = tmpData[0].indexOf("\r");
                var dataStart = data[i][0].indexOf("\r");
                if (tmpData[0].substring(tmpStart) === data[i][0].substring(dataStart)) {
                    duplicateFound = true;
                    break;
                }
            }

            if (!duplicateFound) data.push(tmpData);
            
            tmpData = [];
        }
    }

    for (var i = 0; i < data.length; i++) {
        for (var y = 0; y < data[i].length; y++) {
            output += data[i][y];
        }
    }

    fs.writeFile('./PO/' + config[lang].outputFile, output, function(err) {
        if (err) throw err;
        console.log(config[lang].outputFile + ' generated!');
    });
};